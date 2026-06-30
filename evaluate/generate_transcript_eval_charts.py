from pathlib import Path
import os


ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "evaluate"
os.environ.setdefault("MPLCONFIGDIR", str(OUTPUT_DIR / ".matplotlib_cache"))

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from matplotlib.ticker import PercentFormatter


INPUT_CSV = (
    ROOT_DIR
    / "ai-service/storage/transcript_eval/ytseg_pipeline_300/exports/per_sample_metrics.csv"
)

PIPELINE_LABELS = {
    "vad-chunked": "VAD-Chunked",
    "diarized-turns": "Diarized-Turns",
}

PALETTE = {
    "VAD-Chunked": "#2563eb",
    "Diarized-Turns": "#dc2626",
}


def load_metrics() -> pd.DataFrame:
    df = pd.read_csv(INPUT_CSV)
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


def apply_report_style() -> None:
    sns.set_theme(
        context="talk",
        style="whitegrid",
        rc={
            "figure.dpi": 150,
            "savefig.dpi": 220,
            "axes.titlesize": 17,
            "axes.labelsize": 13,
            "xtick.labelsize": 11,
            "ytick.labelsize": 11,
            "legend.fontsize": 11,
            "font.family": "DejaVu Sans",
        },
    )


def save_figure(filename: str) -> None:
    path = OUTPUT_DIR / filename
    plt.tight_layout()
    plt.savefig(path, bbox_inches="tight")
    plt.close()
    print(f"Saved {path}")


def draw_wer_box_plot(df: pd.DataFrame) -> None:
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

    ax.set_title("WER Distribution by Transcript Pipeline")
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

    save_figure("01_wer_distribution_boxplot.png")


def draw_wer_duration_scatter(df: pd.DataFrame) -> None:
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

    ax.set_title("WER vs Media Duration")
    ax.set_xlabel("Duration (seconds)")
    ax.set_ylabel("WER")
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.set_ylim(0, min(0.85, max(0.2, df["wer"].max() * 1.08)))
    ax.legend(title="")

    save_figure("02_wer_by_duration_scatter.png")


def draw_wer_histogram(df: pd.DataFrame) -> None:
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

    ax.set_title("WER Distribution Histogram")
    ax.set_xlabel("WER bucket")
    ax.set_ylabel("Number of files")
    ax.legend(title="")

    save_figure("03_wer_distribution_histogram.png")


def draw_rtf_duration_scatter(df: pd.DataFrame) -> None:
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

    ax.set_title("RTF vs Media Duration")
    ax.set_xlabel("Duration (seconds)")
    ax.set_ylabel("RTF")
    ax.set_ylim(0, 1.08)
    ax.legend(title="")

    save_figure("04_rtf_by_duration_scatter.png")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    apply_report_style()
    df = load_metrics()

    draw_wer_box_plot(df)
    draw_wer_duration_scatter(df)
    draw_wer_histogram(df)
    draw_rtf_duration_scatter(df)


if __name__ == "__main__":
    main()
