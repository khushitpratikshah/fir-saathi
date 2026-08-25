# Reference-transcript calibration input

The confidence calibrator requires a **real, independently reference-checked** JSON file. Do not use generated values, complaint text, or an evaluation from a different transcription provider. Each segment must have the `avgLogprob` returned by the configured provider and a human or trusted-reference decision on whether the segment has a material transcription error.

```json
{
  "model": "whisper-large-v3 via configured Groq endpoint",
  "corpus": "FLEURS ml_in test, documented sample selection",
  "evaluatedAt": "YYYY-MM-DD",
  "segments": [
    { "avgLogprob": -0.73, "hasReferenceError": false },
    { "avgLogprob": -1.12, "hasReferenceError": true }
  ]
}
```

Run the calibration only after at least 100 independently checked segments:

```bash
TRANSCRIPT_CALIBRATION_INPUT=path/to/real-reference-segments.json pnpm eval:transcript-confidence
```

The command writes precision, recall, sample size, selected threshold, corpus, model identifier, and evaluation date to `docs/evaluations/transcript-confidence-calibration-latest.json`. It does **not** automatically activate highlighting. A maintainer must review the result, confirm that it matches the deployed provider/model and intended audio domain, and then add it to `ACTIVE_TRANSCRIPT_CONFIDENCE_CALIBRATION` in `shared/transcriptReview.ts`.

## Language WER boundary

Do not label Malayalam, Punjabi, or any other FIR Saathi language as “WER >30%” based on an unrelated model or corpus. The current evidence protocol records that AI4Bharat Vistaar reports Malayalam values above 30% for some **IndicWhisper** benchmark rows, but it does not establish a Groq Whisper-large-v3 result; its Punjabi values in the cited rows are not above 30%. The current provider therefore shows **no language-specific WER banner** until a model-matched evaluation is produced. See `docs/ASR_EVALUATION_PROTOCOL.md`.
