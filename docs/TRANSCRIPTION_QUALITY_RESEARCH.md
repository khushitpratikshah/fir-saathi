# Transcription Quality Research Notes

## Official Groq guidance applied to FIR Saathi

Groq’s official speech-to-text documentation states that supplying an ISO-639-1 input language improves transcription accuracy and latency, and that a concise prompt may guide spelling of unfamiliar terms and context. The prompt is limited to 224 tokens and should guide style or context rather than act as a chat instruction.[1]

The current `whisper-large-v3` provider exposes `verbose_json` segment metadata including `avg_logprob`, `no_speech_prob`, and `compression_ratio`. Values closer to zero for `avg_logprob` indicate better confidence; higher `no_speech_prob` can indicate silence or non-speech; unusual compression ratios can indicate clarity or word-boundary issues. Groq recommends flagging metadata outside acceptable ranges and using this information to adjust preprocessing or recovery paths.[1]

Groq supports `word` and `segment` timestamps when `verbose_json` is used. It down-samples submitted audio to 16 kHz mono for recognition and notes that client-side conversion can reduce very large files without quality loss. For longer material, Groq recommends overlapping chunks and combining results carefully.[1]

FIR Saathi must use these signals only to invite a retry, listen-back, or citizen-visible review. It must not silently rewrite, translate, formalise, or invent the source record.

## References

[1] [Groq Docs, *Speech to Text*](https://console.groq.com/docs/speech-to-text)

[2] [Groq Docs, *Whisper Large v3*](https://console.groq.com/docs/model/whisper-large-v3)
