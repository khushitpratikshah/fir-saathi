# FIR Saathi — Current Project Context

**Project:** FIR Saathi  
**Purpose:** A multilingual, voice-first, source-preserving complaint-intake and human constable-review prototype for the Intel AI Impact Fest.  
**Repository:** [github.com/khushitpratikshah/fir-saathi](https://github.com/khushitpratikshah/fir-saathi)  
**Current framing:** This is a self-hostable demonstration prototype. It is **not** an official police portal, emergency service, FIR-registration system, legal-advice tool, or automated decision-maker.

> **Product principle:** When a citizen speaks, the record should listen without silently changing their words. AI may assist with organisation and uncertainty, but people retain authority.

## 1. What FIR Saathi does

FIR Saathi lets a citizen describe an incident in a language they select themselves, by voice or by typing. It preserves the resulting source statement, identifies only source-backed details, asks optional missing-detail questions one at a time, and requires an explicit citizen confirmation before sending the record to a protected constable-review workspace.

The constable sees the original source separately from later citizen additions, corrections, AI aids, evidence metadata, and audit history. The constable—not the AI—may return a record for clarification, correct a structured field with a reason, or mark the **prototype review** complete. No action in the application registers an FIR.

| User | Main capability | Boundary |
|---|---|---|
| **Citizen** | Start text or voice intake, confirm the source, add optional context, view status, rotate private access, or withdraw the prototype record. | Cannot access a record with its public reference alone. |
| **Constable** | Review source, separate additions, transcript timecodes, AI aids, BNS review cards, and audit trail. | Cannot turn an AI suggestion into an automatic legal or FIR decision. |
| **Administrator** | Assign approved users the constable role. | Role assignment and review access are server-enforced. |

## 2. Citizen workflow

The public experience begins on the FIR Saathi showcase landing page. The citizen is directed into a compact, source-first intake flow.

1. **Choose a language.** The citizen explicitly chooses English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, or Punjabi. The product does not guess a source language from a short recording.
2. **Provide a statement.** The citizen may type or make a browser recording after giving prototype-processing consent.
3. **Create the source record.** For voice input, raw audio travels over encrypted transport to the server solely for transcription. The server sends it to the configured Groq transcription provider and does not retain the raw recording after transcription. The returned transcript becomes the persisted source statement.
4. **Review only useful gaps.** AI may identify source-backed fields and high-value missing details. The citizen sees one optional follow-up at a time and can skip it. Context, clarification, and correction notes are stored separately from the source transcript.
5. **Confirm before review.** The citizen reads or listens to the source statement, can add a separate correction note against a timecoded passage, and explicitly sends the record for human review.
6. **Use private access safely.** The short `FS-…` reference identifies a record, while the separate `FSC-…` code is the private capability required for citizen access. The FSC is stored server-side only as a SHA-256 hash and is retained in the browser session, not presented as an identity system.

### Citizen record lifecycle

| Status | Meaning in the prototype |
|---|---|
| `draft` | Intake is incomplete. |
| `needs_citizen_confirmation` | The source statement is ready for the citizen to check. |
| `ready_for_review` | The citizen has confirmed and the record is ready for a constable. |
| `returned` | A constable requested a separate clarification. |
| `verified` | Human prototype review is complete; this does not register an FIR. |
| `withdrawn` | The citizen withdrew the active prototype record. It is removed from normal workspaces and private access is revoked. |

An FSC can be rotated from the citizen status page. Rotation invalidates the previous capability immediately and returns the replacement only once. Withdrawal clears the active private capability and blocks further citizen or constable workflow actions. FIR Saathi retains a minimal status/audit tombstone for prototype integrity; it does **not** claim certified deletion from every database backup, provider log, or legally applicable retention system.

## 3. Source-preservation model

The application intentionally distinguishes information by origin instead of merging it into one polished narrative.

| Information type | Meaning | Treatment |
|---|---|---|
| **Source statement** | Typed citizen words or the voice transcript. | Stored as the original record and never silently rewritten by application flow. |
| **Source-backed draft field** | AI-extracted detail with an exact contiguous source quote. | Rejected if the quote is absent from the original source. |
| **Citizen context** | Voluntary extra detail, such as time, place, safety, property, people/vehicle, or follow-up contact. | Stored separately; never merged into the original statement. |
| **Citizen correction/clarification** | A later citizen note, possibly attached to a timecoded passage. | Appended separately and audited. |
| **Officer correction** | Human review adjustment. | Stored separately with a reason and audit event. |
| **Reviewer translation aid** | English aid plus back-translation for constables. | Session-only, non-authoritative, and never substitutes for the original language source. |

## 4. AI functions and hard boundaries

FIR Saathi uses Groq’s OpenAI-compatible API on the server. The current drafting model is `openai/gpt-oss-20b`; transcription uses `whisper-large-v3`.

### What AI may do

AI may identify explicit source-backed details, identify missing factual context, phrase optional follow-up questions in the selected language, produce a separate constable translation aid, and surface a bounded possible-match BNS review card.

### What AI must not do

AI must not translate or formalise the original source record, invent facts, infer motives or credibility, decide jurisdiction, recommend a charge, verify a complaint, register an FIR, or present a legal conclusion. The safe fallback is **human review**, not an invented completion.

The drafting normaliser enforces a fixed field-key allow-list, exact contiguous source excerpts, and catalogue-limited BNS suggestions. It also rejects common prompt-control framing when a model attempts to turn source-embedded instructions into structured record fields.

### BNS review assistance

The BNS interface is a demonstrative, non-authoritative constable review aid. A non-`REVIEW` suggestion must be from the small maintained catalogue, cite exact source excerpts, disclose missing or ambiguous factors, and remain subject to human assessment. The catalogue links to the official Bharatiya Nyaya Sanhita text; it is not a substitute for legal analysis or official process.[1]

## 5. Transcription, confidence, and language boundaries

Each stored transcript segment may include Groq timestamp and `avg_logprob` metadata. FIR Saathi previously highlighted a hard-coded `-0.85` low-confidence threshold. That threshold is now **disabled** because it was not calibrated against real reference transcripts and could train users to ignore noisy warnings.

The repository now contains an evidence-gated calibration workflow. Before amber segment highlighting can be activated, the project requires at least 100 independently reference-checked segments from the same provider/model, a documented corpus and normalisation method, and reported precision/recall. The tool then selects only a threshold meeting the configured precision requirement; a maintainer must review and explicitly activate it.

FIR Saathi does not claim that Malayalam, Punjabi, or any other supported language has a particular word-error rate. A result from a different provider, model, corpus, or audio domain is not treated as evidence for the deployed Groq endpoint. In the citizen language picker, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, and Punjabi are visibly tagged **Experimental** because they have not yet been personally verified for this prototype; the tag is a product-status disclosure, not a measured transcription-quality claim. Candidate reference sources and the required evaluation protocol are documented in `docs/ASR_EVALUATION_PROTOCOL.md` and `docs/evaluations/REFERENCE_TRANSCRIPT_FORMAT.md`.

## 6. Safety evaluation evidence

The project has two deliberately separate adversarial-evaluation layers.

| Layer | Scope | Current evidence |
|---|---|---|
| **Deterministic invariant suite** | Tests source-quote, safe-field-key, BNS-catalogue, prompt-control, and API input boundaries across all ten supported scripts. | Runs in normal tests and validates the server boundary, not live-model behaviour. |
| **Opt-in live Groq evaluator** | Sends ten hostile source statements to the configured drafting model and records raw-result classification, normaliser mitigation, provider availability, and malformed responses. | A recorded run produced 4 parseable responses: 2 contained unsafe non-`REVIEW` BNS output from instruction-only sources, and both were mitigated by the deterministic normaliser. The remaining 6 were unusable JSON and are not counted as blocked. |

This evidence is intentionally not represented as a perfect safety score. The saved result is located at `docs/evaluations/live-groq-adversarial-latest.json`. Running it requires `RUN_LIVE_GROQ_EVAL=1 pnpm eval:live-adversarial` and consumes provider quota.

## 7. Privacy and access safeguards

The prototype does not persist raw voice recordings after transcription. It stores the source transcript, structured data, audit events, and audio metadata such as hashes and segment metadata. Browser-session audio preview is only available while the local session remains open.

Citizen record access is capability-based. The public `FS-…` reference is not sufficient to read or change a record; the private FSC code is required and compared server-side against a stored hash. Public citizen procedures are rate-limited in memory per IP and scope. This is appropriate for the current single-process Raspberry Pi prototype but is not horizontally scalable; a production deployment would need shared, durable rate limiting.

Supabase row-level security is enabled for the persistent records. Server-only credentials, including the Supabase service-role key and Groq key, remain outside the repository. Supabase leaked-password protection is currently unavailable on the connected Free-plan project; the README documents the dashboard action required after a plan upgrade rather than claiming it is enabled.[2]

## 8. Technical architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Front end | React 19, TypeScript, Tailwind CSS 4, Wouter, GSAP | Citizen intake, status, judge guide, constable workspace, accessibility, and reduced-motion-aware presentation. |
| Server/API | Express 4 and tRPC 11 | Typed procedures, role checks, citizen capability enforcement, validation, and provider orchestration. |
| Persistence/auth | Supabase PostgreSQL, Auth, Storage, RLS | Complaint records, fields, audit events, user profiles, roles, and controlled storage. |
| AI providers | Groq | Server-side source-preserving drafting, transcription, and reviewer translation aid. |
| Tests | Vitest | Unit, integration-boundary, guardrail, calibration, and UI helper checks. |
| Deployment | Raspberry Pi 5, Node 22, pnpm, systemd, Cloudflare Tunnel, GitHub Actions self-hosted runner | Self-hosted production process and guarded deployment path. |

```text
Citizen text or browser audio
        ↓
Express/tRPC server
        ↓
Groq transcription (voice only) → source transcript
        ↓
Groq structured drafting → normalisers and safety boundary
        ↓
Supabase: complaint + fields + audit + metadata
        ↓
Citizen confirmation → protected constable review → human action
```

## 9. Authentication, administration, and deployment

Constable and administrator access uses Supabase email/password authentication with server-side role enforcement. The administrator dashboard can assign an approved profile the `constable` role. Citizens do not require accounts; their record access uses the FSC capability instead.

The self-hosted deployment runs on a Raspberry Pi 5 under an unprivileged service account. A `systemd` service runs the compiled Node server, while Cloudflare Tunnel provides HTTPS access through the user’s domain without opening inbound router ports. Supabase remains the external database/auth service and Groq remains the external AI provider.

The GitHub Actions workflow runs on the Raspberry Pi’s self-hosted ARM64 runner. It performs dependency installation, TypeScript checking, the offline test suite, production build, and service restart only after the quality job succeeds. The most recent audit-remediation release passed **56 tests with 3 deliberate live-provider skips**, completed a production build, and passed the guarded Raspberry Pi deployment.

Normal `pnpm test` is clone-safe and offline: mocked provider tests receive a test-only Groq key, while Groq, Supabase, and Supabase Storage smoke tests run only when `RUN_LIVE_PROVIDER_TESTS=1` is explicitly set with real server-side credentials.

## 10. Visual and presentation design

FIR Saathi uses a civic-technology design language: deep navy for serious review surfaces, ember orange for actions and emphasis, warm paper-toned citizen panels, a shield/listening-wave identity, and readable Indian-script fallbacks. The citizen path is warm and supportive; the constable workspace is restrained and source-first.

Motion is intentionally limited to hierarchy, feedback, and recording/readiness cues. It respects `prefers-reduced-motion` and never presents an AI inference as a decision. The public `/process` page visualises the end-to-end workflow, while `/demo` contains a short judge-facing walkthrough and safeguards summary.

## 11. Current scope and known limitations

FIR Saathi is a prototype designed for demonstration, evaluation, and controlled self-hosting—not real public safety deployment. It does not provide emergency dispatch, official FIR registration, legal advice, formal records retention guarantees, biometric identity verification, production-scale abuse prevention, or a validated multilingual transcription benchmark.

The live model evaluator is intentionally small and provider-dependent. The transcript-confidence calibration machinery is implemented, but activation waits for real reference data. The private FSC mechanism is an access capability, not a recovery service; a citizen who loses it must begin a new intake. Historical records created before FSC support cannot be safely reopened without a capability.

## 12. Non-negotiable rules for future work and presentations

1. Never describe FIR Saathi as an official FIR filing, emergency, police-dispatch, or legal-decision system.
2. Preserve the separation between source statement, citizen additions, AI extraction, translation aid, officer correction, and human verification.
3. Never claim that AI rewrites, interprets, or decides the citizen’s account.
4. Keep BNS cards non-authoritative, source-linked, and limited to human review support.
5. Use only synthetic examples in demonstrations, screenshots, recordings, prompts, and videos.
6. Never expose service keys, passwords, tokens, FSC/FSR codes, personal data, or deployment secrets.
7. Do not activate confidence highlighting or a language-specific WER label without model-matched, documented evaluation evidence.
8. Be explicit that withdrawal revokes normal access but retains minimum audit metadata and is not certified external deletion.

## References

[1]: https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf "The Bharatiya Nyaya Sanhita, 2023 — official gazette text"

[2]: https://supabase.com/docs/guides/auth/password-security "Supabase: Password security"
