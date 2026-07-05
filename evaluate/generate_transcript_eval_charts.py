import os
import json
import re
import unicodedata
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "evaluate"
os.environ.setdefault("MPLCONFIGDIR", str(OUTPUT_DIR / ".matplotlib_cache"))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from matplotlib.ticker import PercentFormatter


ORIGINAL_INPUT_CSV = (
    ROOT_DIR
    / "ai-service/storage/transcript_eval/ytseg_pipeline_300/exports/per_sample_metrics.csv"
)
PAIRED_VAD_INPUT_CSV = (
    ROOT_DIR
    / "ai-service/storage/transcript_eval/ytseg_pipeline_300/paired_vad_on_diarized_samples/exports/per_sample_metrics.csv"
)
REFERENCE_ROOT = ROOT_DIR / "ai-service/storage/transcript_eval/ytseg_pipeline_300/references"
DIRECT_TRANSCRIPT_ROOT = ROOT_DIR / "ai-service/storage/chaptering_eval/ytseg/transcripts"

PIPELINE_LABELS = {
    "vad-chunked": "VAD-Chunked",
    "diarized-turns": "Diarized-Turns",
}

PALETTE = {
    "Direct Faster-Whisper": "#16a34a",
    "VAD-Chunked": "#2563eb",
    "Diarized-Turns": "#dc2626",
}


def _normalize_metrics(df: pd.DataFrame) -> pd.DataFrame:
    df = df[df["status"] == "ok"].copy()
    df["pipeline_label"] = df["pipeline"].map(PIPELINE_LABELS)

    numeric_columns = [
        "wer",
        "cer",
        "rtf",
        "duration_seconds",
        "processing_time_seconds",
        "segments_count",
        "average_segment_duration_seconds",
        "reference_words",
        "hypothesis_words",
    ]
    for column in numeric_columns:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    return df.dropna(subset=["pipeline_label", "wer", "rtf", "duration_seconds"])


def load_split_metrics() -> pd.DataFrame:
    return _normalize_metrics(pd.read_csv(ORIGINAL_INPUT_CSV))


def load_paired_metrics() -> pd.DataFrame:
    original_df = _normalize_metrics(pd.read_csv(ORIGINAL_INPUT_CSV))
    paired_vad_df = _normalize_metrics(pd.read_csv(PAIRED_VAD_INPUT_CSV))

    diarized_df = original_df[original_df["pipeline"] == "diarized-turns"].copy()
    vad_df = paired_vad_df[paired_vad_df["pipeline"] == "vad-chunked"].copy()
    paired_ids = sorted(set(diarized_df["video_id"]) & set(vad_df["video_id"]))

    paired_df = pd.concat(
        [
            diarized_df[diarized_df["video_id"].isin(paired_ids)],
            vad_df[vad_df["video_id"].isin(paired_ids)],
        ],
        ignore_index=True,
    )
    paired_df["paired_set"] = "Diarized sample set"
    return paired_df


def load_paired_metrics_with_direct() -> pd.DataFrame:
    paired_df = load_paired_metrics()
    paired_ids = sorted(paired_df["video_id"].unique())
    direct_df = _load_direct_faster_whisper_wer(paired_ids)
    return pd.concat([direct_df, paired_df], ignore_index=True)


def _load_direct_faster_whisper_wer(video_ids: list[str]) -> pd.DataFrame:
    transcript_paths = {
        path.stem: path for path in DIRECT_TRANSCRIPT_ROOT.glob("*/*.json")
    }
    rows: list[dict[str, object]] = []
    for video_id in video_ids:
        reference_path = REFERENCE_ROOT / f"{video_id}.txt"
        transcript_path = transcript_paths.get(video_id)
        if transcript_path is None or not reference_path.exists():
            continue

        transcript = json.loads(transcript_path.read_text(encoding="utf-8"))
        hypothesis_text = " ".join(
            (segment.get("text") or "").strip()
            for segment in transcript.get("segments", [])
        )
        reference_text = reference_path.read_text(encoding="utf-8")
        rows.append(
            {
                "video_id": video_id,
                "pipeline": "direct-faster-whisper",
                "pipeline_label": "Direct Faster-Whisper",
                "wer": _word_error_rate(reference_text, hypothesis_text),
            }
        )
    return pd.DataFrame(rows)


def _normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[^0-9a-zA-Z\u00C0-\u1EF9\s']", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _word_error_rate(reference_text: str, hypothesis_text: str) -> float:
    reference_words = _normalize_text(reference_text).split()
    hypothesis_words = _normalize_text(hypothesis_text).split()
    if not reference_words:
        return 0.0 if not hypothesis_words else 1.0
    return _levenshtein_bitparallel(reference_words, hypothesis_words) / len(
        reference_words
    )


def _levenshtein_bitparallel(reference: list[str], hypothesis: list[str]) -> int:
    reference_length = len(reference)
    if reference_length == 0:
        return len(hypothesis)

    pattern_masks: dict[str, int] = {}
    for index, token in enumerate(reference):
        pattern_masks[token] = pattern_masks.get(token, 0) | (1 << index)

    mask = (1 << reference_length) - 1
    top_bit = 1 << (reference_length - 1)
    positive = mask
    negative = 0
    distance = reference_length

    for token in hypothesis:
        token_mask = pattern_masks.get(token, 0)
        x_value = token_mask | negative
        d_value = (((x_value & positive) + positive) ^ positive) | x_value
        positive_horizontal = negative | ~(d_value | positive)
        negative_horizontal = positive & d_value

        if positive_horizontal & top_bit:
            distance += 1
        elif negative_horizontal & top_bit:
            distance -= 1

        shifted_positive = ((positive_horizontal << 1) | 1) & mask
        shifted_negative = (negative_horizontal << 1) & mask
        positive = (shifted_negative | ~(d_value | shifted_positive)) & mask
        negative = d_value & shifted_positive

    return distance


def load_paired_wide_metrics() -> pd.DataFrame:
    paired_df = load_paired_metrics()
    columns = [
        "video_id",
        "pipeline_label",
        "wer",
        "cer",
        "rtf",
        "duration_seconds",
        "segments_count",
    ]
    wide_df = paired_df[columns].pivot(index="video_id", columns="pipeline_label")
    wide_df.columns = [f"{metric}_{label}" for metric, label in wide_df.columns]
    wide_df = wide_df.reset_index()

    wide_df["wer_delta_vad_minus_diarized"] = (
        wide_df["wer_VAD-Chunked"] - wide_df["wer_Diarized-Turns"]
    )
    wide_df["cer_delta_vad_minus_diarized"] = (
        wide_df["cer_VAD-Chunked"] - wide_df["cer_Diarized-Turns"]
    )
    wide_df["rtf_delta_vad_minus_diarized"] = (
        wide_df["rtf_VAD-Chunked"] - wide_df["rtf_Diarized-Turns"]
    )
    wide_df["duration_seconds"] = wide_df["duration_seconds_Diarized-Turns"]
    return wide_df


def apply_report_style() -> None:
    sns.set_theme(
        context="notebook",
        style="whitegrid",
        rc={
            "figure.dpi": 150,
            "savefig.dpi": 220,
            "axes.titlesize": 15,
            "axes.labelsize": 11,
            "xtick.labelsize": 10,
            "ytick.labelsize": 10,
            "legend.fontsize": 10,
            "font.family": "DejaVu Sans",
        },
    )


def save_figure(filename: str) -> None:
    path = OUTPUT_DIR / filename
    plt.tight_layout()
    plt.savefig(path, bbox_inches="tight")
    plt.close()
    print(f"Saved {path}")


def draw_wer_box_plot(df: pd.DataFrame, filename: str, title: str) -> None:
    fig, ax = plt.subplots(figsize=(9, 6))
    order = ["VAD-Chunked", "Diarized-Turns"]

    sns.boxplot(
        data=df,
        x="pipeline_label",
        y="wer",
        order=order,
        hue="pipeline_label",
        palette=PALETTE,
        width=0.46,
        showfliers=True,
        linewidth=1.6,
        legend=False,
        ax=ax,
    )
    sns.stripplot(
        data=df,
        x="pipeline_label",
        y="wer",
        order=order,
        color="#111827",
        alpha=0.28,
        size=3,
        jitter=0.18,
        ax=ax,
    )

    ax.set_title(title)
    ax.set_xlabel("")
    ax.set_ylabel("WER")
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.set_ylim(0, min(0.85, max(0.2, df["wer"].max() * 1.08)))
    ax.text(
        0.01,
        0.98,
        "Box shows median and IQR; points show per-file values and outliers.",
        transform=ax.transAxes,
        ha="left",
        va="top",
        fontsize=10,
        color="#4b5563",
    )

    save_figure(filename)


def draw_wer_duration_scatter(df: pd.DataFrame, filename: str, title: str) -> None:
    fig, ax = plt.subplots(figsize=(10, 6))

    sns.scatterplot(
        data=df,
        x="duration_seconds",
        y="wer",
        hue="pipeline_label",
        palette=PALETTE,
        alpha=0.72,
        s=48,
        edgecolor="white",
        linewidth=0.45,
        ax=ax,
    )

    for label, color in PALETTE.items():
        subset = df[df["pipeline_label"] == label]
        sns.regplot(
            data=subset,
            x="duration_seconds",
            y="wer",
            scatter=False,
            color=color,
            ci=None,
            line_kws={"linewidth": 1.7, "alpha": 0.8},
            ax=ax,
        )

    ax.set_title(title)
    ax.set_xlabel("Duration (seconds)")
    ax.set_ylabel("WER")
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.set_ylim(0, min(0.85, max(0.2, df["wer"].max() * 1.08)))
    ax.legend(title="")

    save_figure(filename)


def draw_wer_histogram(df: pd.DataFrame, filename: str, title: str) -> None:
    bins = [0, 0.05, 0.10, 0.15, 0.20, 0.30, 0.50, 1.00]
    labels = ["0-5%", "5-10%", "10-15%", "15-20%", "20-30%", "30-50%", "50%+"]
    histogram_df = df.copy()
    histogram_df["wer_bucket"] = pd.cut(
        histogram_df["wer"],
        bins=bins,
        labels=labels,
        include_lowest=True,
        right=False,
    )

    counts = (
        histogram_df.groupby(["wer_bucket", "pipeline_label"], observed=False)
        .size()
        .reset_index(name="file_count")
    )

    fig, ax = plt.subplots(figsize=(11, 6))
    sns.barplot(
        data=counts,
        x="wer_bucket",
        y="file_count",
        hue="pipeline_label",
        palette=PALETTE,
        ax=ax,
    )

    ax.set_title(title)
    ax.set_xlabel("WER bucket")
    ax.set_ylabel("Number of files")
    ax.legend(title="")

    save_figure(filename)


def draw_rtf_duration_scatter(df: pd.DataFrame, filename: str, title: str) -> None:
    fig, ax = plt.subplots(figsize=(10, 6))

    sns.scatterplot(
        data=df,
        x="duration_seconds",
        y="rtf",
        hue="pipeline_label",
        palette=PALETTE,
        alpha=0.75,
        s=48,
        edgecolor="white",
        linewidth=0.45,
        ax=ax,
    )

    for label, color in PALETTE.items():
        subset = df[df["pipeline_label"] == label]
        sns.regplot(
            data=subset,
            x="duration_seconds",
            y="rtf",
            scatter=False,
            color=color,
            ci=None,
            line_kws={"linewidth": 1.7, "alpha": 0.8},
            ax=ax,
        )

    ax.axhline(
        1.0,
        color="#111827",
        linestyle="--",
        linewidth=1.6,
        alpha=0.8,
        label="Realtime threshold (RTF = 1.0)",
    )
    ax.text(
        df["duration_seconds"].min(),
        1.015,
        "RTF = 1.0 realtime threshold",
        fontsize=10,
        color="#111827",
        va="bottom",
    )

    ax.set_title(title)
    ax.set_xlabel("Duration (seconds)")
    ax.set_ylabel("RTF")
    ax.set_ylim(0, 1.08)
    ax.legend(title="")

    save_figure(filename)


def draw_paired_delta_plot(wide_df: pd.DataFrame) -> None:
    plot_df = wide_df.sort_values("wer_delta_vad_minus_diarized").reset_index(drop=True)
    plot_df["sample_index"] = plot_df.index + 1

    fig, ax = plt.subplots(figsize=(11, 6))
    colors = [
        "#dc2626" if value > 0 else "#2563eb"
        for value in plot_df["wer_delta_vad_minus_diarized"]
    ]
    ax.bar(
        plot_df["sample_index"],
        plot_df["wer_delta_vad_minus_diarized"],
        color=colors,
        width=0.9,
        alpha=0.82,
    )
    ax.axhline(0, color="#111827", linewidth=1.4)
    ax.set_title("Paired WER Delta by Sample")
    ax.set_xlabel("Samples sorted by delta")
    ax.set_ylabel("WER delta: VAD-Chunked - Diarized-Turns")
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.text(
        0.01,
        0.97,
        "Negative values favor VAD; positive values favor diarized turns.",
        transform=ax.transAxes,
        ha="left",
        va="top",
        fontsize=10,
        color="#4b5563",
    )

    save_figure("paired_02_wer_delta_by_sample.png")


def draw_paired_rtf_box_plot(df: pd.DataFrame) -> None:
    fig, ax = plt.subplots(figsize=(9, 6))
    order = ["VAD-Chunked", "Diarized-Turns"]

    sns.boxplot(
        data=df,
        x="pipeline_label",
        y="rtf",
        order=order,
        hue="pipeline_label",
        palette=PALETTE,
        width=0.46,
        showfliers=True,
        linewidth=1.6,
        legend=False,
        ax=ax,
    )
    sns.stripplot(
        data=df,
        x="pipeline_label",
        y="rtf",
        order=order,
        color="#111827",
        alpha=0.28,
        size=3,
        jitter=0.18,
        ax=ax,
    )

    ax.set_title("RTF Distribution")
    ax.set_xlabel("")
    ax.set_ylabel("RTF")

    save_figure("rtf_distribution.png")


def draw_paired_wer_density_panels(df: pd.DataFrame) -> None:
    order = ["Direct Faster-Whisper", "VAD-Chunked", "Diarized-Turns"]
    fig, axes = plt.subplots(1, 3, figsize=(14, 4.8), sharey=True)

    for ax, label in zip(axes, order, strict=True):
        subset = df[df["pipeline_label"] == label].copy()
        wer_percent = subset["wer"] * 100.0

        sns.histplot(
            wer_percent,
            bins=28,
            stat="density",
            kde=True,
            color=PALETTE[label],
            edgecolor="white",
            linewidth=0.4,
            alpha=0.65,
            ax=ax,
        )
        ax.set_title(label)
        ax.set_xlabel("WER (%)")
        ax.set_xlim(0, 85)

    axes[0].set_ylabel("Density")
    axes[1].set_ylabel("")
    fig.suptitle("WER Distribution", y=1.02)

    save_figure("wer_distribution.png")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    apply_report_style()
    paired_df = load_paired_metrics()
    wer_df = load_paired_metrics_with_direct()

    draw_paired_rtf_box_plot(paired_df)
    draw_paired_wer_density_panels(wer_df)


if __name__ == "__main__":
    main()
