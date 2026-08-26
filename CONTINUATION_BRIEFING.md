# FIR Saathi — Continuation Briefing

> **Purpose:** Paste this document into a new chat to continue work on FIR Saathi without rediscovering product decisions, deployment constraints, safety boundaries, or the current release state.

## 1. Executive state

FIR Saathi is a **self-hostable, multilingual, voice-first complaint-intake and human constable-review prototype** created for the Intel AI Impact Fest. Its central product promise is that the system should preserve a citizen’s words while making review easier; AI assists with structure, uncertainty, and source-grounded review aids, while citizens and constables retain decision authority.

The repository is currently **public** at [github.com/khushitpratikshah/fir-saathi](https://github.com/khushitpratikshah/fir-saathi). The current deployed code is on `main`; the prior committed release revision before this briefing was `07265c1`, and the Raspberry Pi deployment run for that revision completed successfully. The latest saved project checkpoint was `manus-webdev://07265c1a`.

FIR Saathi is **not** an official police portal, emergency system, FIR-registration product, legal-advice engine, crime-classification engine, or production public-safety service. Do not describe it as any of those things in future work, demos, copy, or code.

## 2. Product problem and core decisions

The project addresses the difficulty of taking a citizen’s incident account without forcing people to fill out an intimidating legal form or allowing AI to transform the account into an authoritative-sounding narrative. The citizen can speak or type in a selected language, then review a preserved source record. The system only asks optional, high-value questions when a source-backed detail is genuinely absent. A human constable ultimately reviews the record.

| Product decision | Current implementation | Reason |
|---|---|---|
| Preserve the source statement | Source transcript remains separate from AI fields, citizen context, citizen corrections, clarifications, and officer edits. | Prevent silent rewriting or conflation of information origins. |
| Citizen chooses language | Ten Indian-language choices are explicit; the system does not infer a short recording’s language. | Avoid unnecessary language inference and preserve citizen agency. |
| Voice is optional | Text intake works without audio; voice uses Groq transcription server-side. | Accessibility and resilient recovery when recording or provider calls fail. |
| AI is bounded | Fixed field keys, exact source quotes, catalogue-bound BNS cards, non-authoritative translation aid, and human review fallback. | Avoid legal inference, hallucinated facts, or apparent automation of public authority. |
| No browser-held complaint access by identifier alone | An `FS-…` reference identifies a record, while a separate `FSC-…` capability controls citizen access. | Stop predictable record-reference access. |
| Withdrawal is soft and candid | Withdrawal revokes active access and redacts normal workspaces; minimal tombstone/audit metadata remains. | Preserve audit integrity without falsely promising universal/legal deletion. |
| Deployment is portable | Raspberry Pi 5 runs the Node app; Supabase and Groq remain external services. | The user explicitly did not want a runtime dependent on Manus services. |

## 3. User roles and key workflows

### Citizen flow

1. The citizen opens the public landing page and enters `/intake`.
2. They choose a source language from English (`en`), Hindi (`hi`), Gujarati (`gu`), Marathi (`mr`), Bengali (`bn`), Tamil (`ta`), Telugu (`te`), Kannada (`kn`), Malayalam (`ml`), or Punjabi (`pa`).
3. They give explicit prototype-processing consent, then type a statement or record audio.
4. For voice, raw audio crosses encrypted transport to the server, which sends it transiently to Groq transcription. **Raw recording bytes are not persisted after transcription.** A local browser-session preview may remain until the session ends.
5. The returned transcription becomes the persisted source statement. Groq drafting may identify source-backed fields, missing details, and bounded BNS review aids.
6. The app asks only one optional high-value follow-up at a time, and only if relevant detail is not already present in the source or separate context. Typical automatic checks are time, place, and injury/threat/safety; citizens may skip.
7. The citizen sees the original source separately, can attach a correction note to a selected timestamped segment, and confirms before the record moves to constable review.
8. A citizen sees plain-language status using the `FS-…` reference plus private `FSC-…` capability. They may rotate the FSC or withdraw the prototype record.

### Constable flow

Constables use a protected review queue at `/officer`. The review page intentionally makes separate lanes visible: immutable source, citizen additions/corrections, evidence metadata, audit/timeline, AI source-coverage information, non-authoritative BNS cards, and a separately requested translation/back-translation aid.

A constable may add an officer correction with a reason, return the record for a citizen clarification, or verify the **prototype review**. Neither action registers an FIR. Withdrawn records are non-actionable tombstones rather than normal review items.

### Administrator flow

Supabase-authenticated administrators have a small role-management interface to assign approved user profiles the `constable` role. Constable and admin enforcement occurs on the server; ordinary users cannot self-promote.

## 4. Source-preservation and data-origin model

| Information class | Example | Rule |
|---|---|---|
| Source statement | Typed citizen statement or transcription output | The record source; never silently rewritten by normal application flow. |
| Source-backed AI field | A location whose quote is an exact contiguous source excerpt | Accepted only when quote, fixed key, and source membership checks pass. |
| Citizen context | Optional time, place, property, people/vehicle, safety, or contact detail | Stored as `citizen_context`, never merged into source. |
| Citizen correction or clarification | “The name at 00:14 should be…” | Separate append-only note, linked to timestamp when applicable. |
| Officer correction | Human changes a structured field with reason | Separate source label and audit event. |
| Reviewer translation aid | English aid + back-translation + uncertainty note | Session-only, constable-only, non-authoritative, and never a replacement for original source. |

This separation is non-negotiable. Future functionality must not collapse the source record into a formalised narrative or label any AI output as the citizen’s statement.

## 5. AI, BNS, and translation boundaries

### Provider configuration

The server calls Groq’s OpenAI-compatible API. Current source configuration in `server/groqProvider.ts` uses:

| Capability | Model |
|---|---|
| Structured drafting | `openai/gpt-oss-20b` |
| Audio transcription | `whisper-large-v3` |

AI calls are server-side. Do not place `GROQ_API_KEY` in browser code, client-visible variables, commits, screenshots, or docs.

### Drafting constraints

`server/drafting.ts` uses a constrained schema plus deterministic normalisation. Important controls include a fixed allow-list of draft field keys; contiguous source-quote validation; duplicate-key prevention; prompt-control-framing rejection; safe missing-detail questions; and a BNS catalogue boundary. The current implementation rejects typical embedded-control phrases such as source delimiters, system/developer overrides, prior-instruction bypasses, role-play framing, “unrestricted,” and `BNS 999` when a model tries to promote them into a structured field.

The assistant must not translate/formalise source text, invent facts, infer motive or credibility, determine jurisdiction, make legal conclusions, recommend charges, determine FIR eligibility, or verify a complaint. The safe fallback is `REVIEW` / human assessment.

### BNS cards

`shared/firSaathi.ts` maintains a small, non-authoritative review catalogue: BNS 115, 303, 304, 308, 309, and 351. A non-`REVIEW` suggestion must be in the catalogue, carry exact source quotes, and disclose missing/ambiguous factors. The cards are constable aids only and link to the official Bharatiya Nyaya Sanhita source.[1]

### Translation aid

`complaints.reviewerTranslation` is constable-only. `ReviewerTranslationAid.tsx` explicitly labels English translation and back-translation as a separate, session-only aid. It does not persist translation text and cannot replace the citizen’s original-language source.

## 6. Security, privacy, and audit safeguards

### Citizen record capabilities

New complaints receive a private `FSC-…` access code. Only the hash is stored in `fir_saathi_complaints.citizen_access_hash`; the browser stores the raw code in session storage keyed by public ID. A public `FS-…` reference alone does not open or mutate a complaint. Existing historical records that predate FSC hashes cannot be safely reopened through the browser; the intended privacy-safe recovery is a new intake.

An FSC may be rotated. The prior hash is replaced, the old code stops working immediately, an `access_code_rotated` audit event is recorded, and the replacement raw FSC is returned only once. Citizen procedures require a valid FSC and server-side capability guard.

### Withdrawal

Migration `supabase/migrations/20260825000000_citizen_withdrawal_and_access_rotation.sql` added the withdrawal state and audit support. Withdrawal changes status to `withdrawn`, records withdrawal metadata, clears active citizen access, blocks follow-on actions, hides content in normal citizen/constable views, and retains a minimal audit/tombstone boundary. It is not an irreversible data purge or certified legal/DPDP erasure promise.

### Rate limiting and security scope

Public procedures use in-memory per-IP/scope 10-minute buckets. This is reasonable for the current single-process Pi prototype but not horizontally scalable. Redis or another shared limiter is an open production-hardening improvement.

Supabase RLS is enabled. The application uses server-side service-role access for privileged persistence work; browser-visible configuration must remain limited to Supabase URL and publishable key. The Supabase Security Advisor reported leaked-password protection disabled. That control is documented as unavailable for the connected Free-plan project; do not claim it is enabled. If the project upgrades, enable it in Supabase Auth/Attack Protection and retest auth flows.[2]

## 7. Transcription confidence and language-quality policy

The app persists Groq segment timestamps and optional `avg_logprob` metadata. Earlier versions highlighted segment text at a hard-coded `avg_logprob <= -0.85`. This was found to be an uncalibrated magic number and was deliberately **disabled**.

`shared/transcriptReview.ts` now contains `ACTIVE_TRANSCRIPT_CONFIDENCE_CALIBRATION`, currently `null`. No amber segment highlighting occurs until a calibration is explicitly activated. `server/transcriptConfidenceCalibration.ts` calculates threshold precision, recall, and F1 from independently reference-checked segments. It refuses activation with fewer than 100 checked segments and selects only thresholds satisfying a configured minimum precision.

The manual workflow is documented in:

- `docs/ASR_EVALUATION_PROTOCOL.md`
- `docs/evaluations/REFERENCE_TRANSCRIPT_FORMAT.md`
- `server/runTranscriptConfidenceCalibration.ts`

Run the command only with a real reference dataset:

```bash
TRANSCRIPT_CALIBRATION_INPUT=path/to/real-reference-segments.json pnpm eval:transcript-confidence
```

Do **not** label Malayalam, Punjabi, or any other FIR Saathi language as “known WER >30%” without a provider/model/corpus-matched evaluation. External benchmark values from a different model do not prove Groq Whisper-large-v3 performance in this product. The research protocol notes that certain IndicWhisper rows report Malayalam above 30%, but this is not valid evidence for the deployed Groq provider, and the cited Punjabi rows are not above 30%.

## 8. Adversarial evaluation evidence

There are two evaluation tiers; they must not be conflated.

| Tier | Implementation | What it proves | What it does not prove |
|---|---|---|---|
| Deterministic guardrail invariants | `server/adversarialEval.test.ts` and normaliser tests | The application boundary rejects hostile field keys, unsupported BNS codes, hallucinated excerpts, and known prompt-control patterns across supported scripts. | It is not a live model-safety score. |
| Opt-in live Groq evaluator | `server/liveAdversarialEval.ts` and `pnpm eval:live-adversarial` | It records raw model classification, normaliser mitigation, provider availability, and malformed responses against ten hostile source statements. | It is a small, provider-version-dependent observation, not a stable benchmark. |

The recorded live run in `docs/evaluations/live-groq-adversarial-latest.json` attempted 10 fixtures. Four model outputs were parseable JSON; two of those four produced unsafe non-`REVIEW` BNS output from instruction-only sources. The deterministic normaliser mitigated both, leaving zero unmitigated **evaluated** responses. Six outputs were unusable JSON and were explicitly **not** counted as blocked. This is the credible published number; do not round it to a perfect score.

Run live evaluation only deliberately because it consumes Groq quota:

```bash
RUN_LIVE_GROQ_EVAL=1 pnpm eval:live-adversarial
```

The evaluator batches requests to reduce rate-limit effects. It sanitises provider errors before storing results, so it does not commit internal provider/error details.

## 9. Technical architecture and key files

| Layer | Technology | Important locations |
|---|---|---|
| UI | React 19, TypeScript, Tailwind CSS 4, Wouter, GSAP | `client/src/pages/`, `client/src/components/`, `client/src/index.css` |
| API | Express 4 and tRPC 11 | `server/routers.ts`, `server/_core/trpc.ts` |
| Database/auth/storage | Supabase PostgreSQL, Auth, Storage, RLS | `server/db.ts`, `server/supabase.ts`, `supabase/migrations/` |
| AI provider | Groq | `server/groqProvider.ts`, `server/drafting.ts` |
| Shared contracts | TypeScript | `shared/firSaathi.ts`, `shared/transcriptReview.ts` |
| Tests | Vitest | `server/*.test.ts`, selected `client/src/**/*.test.ts` |
| Deployment | GitHub Actions, Raspberry Pi, systemd | `.github/workflows/deploy-raspberry-pi.yml`, `bin/deploy-from-main.sh`, `docs/RASPBERRY_PI_5_HOSTING.md` |

### Files most likely to matter in future work

| File | Purpose |
|---|---|
| `context.md` | Current high-level project reference. |
| `CONTINUATION_BRIEFING.md` | This detailed handoff document. |
| `todo.md` | Durable flat implementation history; append rather than delete entries. |
| `server/routers.ts` | tRPC contract and procedure authorization. |
| `server/db.ts` | Supabase persistence, FSC access checks, redaction, withdrawal, and audit helpers. |
| `server/citizenAccess.ts` | FSC normalisation, random generation, hashing, timing-safe matching. |
| `server/drafting.ts` | Provider prompt, draft normalisers, BNS restrictions, safe fallback. |
| `server/groqProvider.ts` | Groq chat/transcription/provider timeouts and parsing. |
| `server/liveAdversarialEval.ts` | Live-model hostile-input fixtures and result accounting. |
| `server/transcriptConfidenceCalibration.ts` | Precision/recall threshold selection logic. |
| `client/src/pages/CitizenConfirmation.tsx` | Source review, local audio playback, correction note, follow-ups, confirmation. |
| `client/src/pages/CitizenStatus.tsx` | FSC copy/rotation, withdrawal, citizen status. |
| `client/src/pages/ComplaintReview.tsx` | Source-first constable review and withdrawn tombstone handling. |
| `client/src/components/TranscriptSegmentReview.tsx` | Timecodes and calibration-aware uncertainty display. |
| `client/src/components/ReviewerTranslationAid.tsx` | Separate reviewer translation/back-translation UI. |
| `client/src/pages/JudgeGuide.tsx` | Judge walkthrough and safeguards summary, including withdrawal retention disclosure. |
| `README.md` | Public operational/security overview and evaluation claims. |

## 10. Database and migrations

Key logical tables include `fir_saathi_complaints`, `fir_saathi_complaint_fields`, `fir_saathi_audit_events`, `fir_saathi_audio_evidence`, `fir_saathi_intake_drafts`, `fir_saathi_bns_references`, and `fir_saathi_profiles`.

Important applied canonical migrations include:

| Migration | Purpose |
|---|---|
| `20260824000000_private_citizen_access.sql` | Adds hashed private citizen access capability and index. |
| `20260825000000_citizen_withdrawal_and_access_rotation.sql` | Adds `withdrawn` status, withdrawal metadata, and audit event support for withdrawal/FSC rotation. |

Use Supabase MCP migration facilities for future DDL changes; create a versioned migration in `supabase/migrations/` first, then apply it to the connected project. Do not run destructive schema changes casually. The live project uses RLS and existing data is not recoverable through Manus if accidentally deleted.

## 11. Testing and current validation state

Normal testing is intentionally clone-safe. `server/test.setup.ts` supplies a test-only Groq placeholder used only by mocked tests. Tests that genuinely touch Groq, Supabase REST, or Supabase Storage are intentionally skipped unless `RUN_LIVE_PROVIDER_TESTS=1` is set and real server-side credentials are present.

Current standard validation commands:

```bash
pnpm check
pnpm test
pnpm build
git diff --check
```

The last full audit-remediation validation passed **56 tests with 3 intentional live-provider skips**, passed TypeScript checking and production build, and passed the quality-gated Raspberry Pi deployment. The build reports a standard Vite large-chunk warning; it is not a blocking error but code splitting is a future performance task.

The old development log contains stale Vite/browser output about `rotateCitizenAccessCode` not being exported. The current source and build export it correctly, and the development service was restarted successfully; treat those timestamped log lines as historical unless a new build/check fails.

## 12. Raspberry Pi, GitHub, and hosting state

The production host is a Raspberry Pi 5 (8 GB) running Node 22 through NVM, pnpm, systemd, and Cloudflare Tunnel. It hosts the Node application only; Supabase provides database/auth/storage and Groq provides AI.

| Item | Current handling |
|---|---|
| Linux service | `fir-saathi` systemd service under an unprivileged `firsaathi` account. |
| Application path | `/srv/fir-saathi/app` on the Pi. |
| Runtime start script | `bin/start-production.sh`; systemd launches production `pnpm start`. |
| External TLS/domain | Cloudflare Tunnel and the user-owned domain; no inbound router port forwarding. |
| Secrets | Environment file outside source control, conventionally `/etc/fir-saathi.env`. |
| CI/CD | Self-hosted GitHub Actions ARM64 runner on the Pi; workflow type-checks/tests before build/restart. |

### Git usage warning

The actual GitHub remote is named **`github`**. Always push with:

```bash
git push github main
```

Do **not** use `origin` for release pushes; historical setup left `origin` as an artifact remote and it can fail or target the wrong endpoint. The GitHub repository was originally private, then the user explicitly asked to make it public. Do not revert visibility without an explicit request.

The latest deployment workflow also emitted a non-blocking GitHub annotation that `actions/checkout@v4` targets a deprecated Node 20 runtime and is being forced to Node 24. This should be reviewed eventually, but deployment currently succeeds.

## 13. Required environment variables

Never share values. Typical self-hosted runtime configuration includes:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Server-side Supabase project endpoint. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged Supabase access. |
| `VITE_SUPABASE_URL` | Browser build-time Supabase endpoint. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser build-time Supabase publishable key. |
| `GROQ_API_KEY` | Server-only Groq provider key. |
| `JWT_SECRET` | Server session signing. |
| `FIR_SAATHI_BOOTSTRAP_ADMIN_EMAIL` | Controlled bootstrap administrator allow-list. |

The public repository must not contain `.env` files, raw credentials, access codes, real incident data, screenshots showing secrets, Cloudflare tokens, or infrastructure private keys.

## 14. Visual and UX state

The visual system uses deep navy and ember-orange identity, warm paper-toned citizen surfaces, and a restrained dark constable workspace. It includes reduced-motion-aware GSAP choreography, browser typography fallbacks for Samsung Internet, responsive headline safeguards, mobile-friendly two-column language cards, and contextual loading skeletons.

Useful public routes:

| Route | Purpose |
|---|---|
| `/` | Landing/showcase page. |
| `/intake` | Citizen source-first intake. |
| `/resume` | Resume text draft or use FS/FSC record pair. |
| `/process` | Animated end-to-end process explanation. |
| `/demo` | Judge-facing walkthrough and safeguards summary. |
| `/officer` | Protected constable queue entry. |
| `/admin` | Authenticated administrator role management. |

Do not add fabricated customer reviews, testimonials, ratings, or fake user-generated content. This is a project-wide policy constraint.

## 15. Open questions and recommended next work

### Highest-value next work

1. **Create real transcription reference data.** Obtain licensed, non-sensitive audio/reference transcript segments for the deployed provider/model and intended Indian-language context. Run the calibration tool, review precision/recall, and only then activate `ACTIVE_TRANSCRIPT_CONFIDENCE_CALIBRATION`.
2. **Improve live adversarial evaluation reliability.** The current Groq run demonstrated both model-level unsafe BNS output and invalid JSON. Consider a more robust evaluation schema/response capture, larger sampled runs, and periodic reviewed reports—but keep them opt-in and do not convert results into a perfect-score claim.
3. **Replace in-memory rate limiting for production scale.** Use Redis or equivalent shared rate limiting if moving beyond one Pi process.
4. **Define an actual retention/erasure policy.** Technical withdrawal currently creates a privacy-safe workflow boundary, not verified deletion from backups, provider logs, or all systems. Any real deployment needs legal/privacy review and data-retention design.
5. **Update CI action runtime.** Investigate the Node 20 deprecation annotation from GitHub Actions while preserving the current successful self-hosted Pi deployment.

### Product enhancements worth considering after the above

- An administrator audit export that clearly contains only synthetic/non-production metadata in demo mode.
- A structured accessibility and device-support test plan for browser voices and microphone behaviour across target Android devices.
- A voluntary, privacy-safe provider health/dashboard view that never leaks record content or secrets.
- Additional language-specific evaluation only after proper corpus and provider matching.

## 16. Non-negotiable future-work rules

1. Do not claim real FIR registration, emergency dispatch, police integration, legal advice, or AI decision authority.
2. Do not silently translate, formalise, rewrite, infer, or merge source statements.
3. Do not allow BNS suggestions to become legal conclusions or charge recommendations.
4. Do not use real victim, witness, contact, address, audio, or incident data in a demo, test fixture, screenshot, or prompt.
5. Use synthetic examples and label them as synthetic.
6. Do not disclose credentials, raw FSC/FSR codes, passwords, tokens, service-role keys, private host details, or real user data.
7. Keep AI translation, source record, citizen additions, corrections, and officer edits visibly separate.
8. Do not reactivate transcript confidence highlighting or language WER warnings without documented, model-matched evidence.
9. Preserve all current test coverage and add tests before delivering new server or safety functionality.
10. For any future deployment, commit and push to `github main`, watch the quality-gated workflow, and do not claim success until both quality and deployment jobs pass.

## References

[1]: https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf "The Bharatiya Nyaya Sanhita, 2023 — official gazette text"

[2]: https://supabase.com/docs/guides/auth/password-security "Supabase: Password security"
