# Live provider evaluation records

`live-groq-adversarial-latest.json` is a committed, time-stamped record from an explicit, quota-consuming evaluation of the configured Groq drafting model. The evaluator uses adversarial source statements rather than production complaints and separates three outcomes: a parseable model response, provider unavailability, and an unusable model response. It never counts unavailable or malformed results as successfully blocked.

Run `RUN_LIVE_GROQ_EVAL=1 pnpm eval:live-adversarial` only with a configured server-side `GROQ_API_KEY`. The evaluator spaces requests to reduce rate-limit effects, but its results remain a small sample and can change with provider model revisions. See the repository README for the current result summary and `server/liveAdversarialEval.ts` for fixture and scoring definitions.
