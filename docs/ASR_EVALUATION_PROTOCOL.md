# ASR evaluation evidence boundary

FIR Saathi does not currently publish language-specific WER claims for its configured Groq transcription provider. A language warning must be based on an evaluation of the same provider, model configuration, audio domain, transcript normalisation, and reference corpus; published results for a different ASR model are not a valid substitute.

## Suitable public reference sources

| Source | Relevant evidence | Use in FIR Saathi |
|---|---|---|
| [Google FLEURS dataset](https://huggingface.co/datasets/google/fleurs) | Licensed multilingual speech/reference-transcript data, including `ml_in` and `pa_in`; the dataset card identifies held-out test splits. | Candidate controlled benchmark for a small, versioned provider evaluation. |
| [FLEURS paper](https://simran-khanuja.github.io/assets/fleurs_slt.pdf) | Describes 102-language speech/reference data, native-speaker recordings, transcript quality control, and separate train/dev/test speakers. | Methodological reference for held-out evaluation and corpus limitations. |
| [AI4Bharat Vistaar](https://github.com/AI4Bharat/vistaar) | Reports language and corpus-specific WER for **IndicWhisper**, including Malayalam values above 30% on some benchmark rows. | Evidence that risk varies by corpus and language, but not a Groq/Whisper provider score; it must not trigger a product warning by itself. |
| [Mozilla Common Voice](https://commonvoice.mozilla.org/en/datasets) | Public speech datasets list Malayalam and Punjabi ASR corpora. | Optional domain-diverse validation source after checking each release licence and split. |

## Required calibration report

For each included language, retain a versioned manifest of non-sensitive reference audio and transcripts. Calculate segment error labels against the reference and report the selected `avg_logprob` threshold’s precision, recall, sample count, model identifier, corpus/split, text-normalisation rules, and evaluation date. Do not label any language “known WER >30%” unless that exact provider evaluation contains a sufficiently sized, documented result above the threshold.

> FLEURS and Vistaar offer suitable evaluation inputs and context, not evidence that FIR Saathi’s Groq transcription endpoint has any particular WER.
