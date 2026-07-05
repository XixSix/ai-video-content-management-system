# Evaluation Figures

This folder contains report-ready figures generated from transcript evaluation metrics.

Use these figures for the final transcript pipeline comparison. Both are generated from the
paired evaluation set where VAD chunking and diarized turns are evaluated on the same 150
YTSeg samples:

- `wer_distribution.png`: direct Faster-Whisper plus the two AI Service pipelines.
- `rtf_distribution.png`: AI Service pipelines only because direct export runtime was not recorded.

The source metrics still include the original 300-sample split, but the report figures should use
the paired sample set for a fair pipeline comparison.

Regenerate figures with:

```bash
cd evaluate
UV_CACHE_DIR=.uv_cache uv run python generate_transcript_eval_charts.py
```
