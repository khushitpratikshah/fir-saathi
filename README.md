# FIR Saathi

FIR Saathi is a multilingual, voice-first **prototype** for source-preserving complaint drafting and human review. It does not register FIRs, provide legal advice, or accept emergency reports.

## Self-hosted stack

The running application uses React, Express, tRPC, Groq, Supabase Storage, Supabase Postgres, and Supabase Auth. It has no active dependency on hosted platform OAuth, hosted AI, hosted storage, hosted analytics, or a hosted Vite runtime.

| Capability | Portable service |
|---|---|
| Account sessions and roles | Supabase Auth and `public.fir_saathi_profiles` |
| Complaint workflow and audit history | Supabase Postgres |
| Encrypted evidence bytes | Private Supabase Storage bucket `fir-saathi-evidence` |
| Drafting and transcription | Groq API |
| Administrator role management | FIR Saathi `/admin` dashboard |

## Run locally

Install Node.js 22+ and pnpm, then create a local `.env` file from this example:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-supabase-publishable-key
GROQ_API_KEY=your-groq-key
FIR_SAATHI_BOOTSTRAP_ADMIN_EMAIL=your-admin@example.com
PORT=3000
NODE_ENV=production
```

Run `pnpm install`, apply the SQL files in `supabase/migrations/` to the target Supabase project, then use `pnpm build` and `pnpm start`.

## Initial administrator setup

The exact email in `FIR_SAATHI_BOOTSTRAP_ADMIN_EMAIL` can sign in to `/admin` first. Every other new account starts as a citizen. From the dashboard, approve authorised reviewers as **constables**. Constables can access the review workspace but cannot manage roles. The dashboard never grants the protected administrator role.

After a trusted administrator profile has been established, you may remove the bootstrap environment variable and assign the `administrator` profile role directly through a controlled Supabase migration or your internal operations process.

## Supabase Auth URL configuration

In Supabase **Authentication → URL Configuration**, set the Site URL to your final domain, for example `https://fir.example.org`. Add the same origin’s `/reset-password` path to the allowed redirect URLs. Add each development origin separately. This is required for confirmation and password-recovery emails.

## Security notes

Keep `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, and `FIR_SAATHI_BOOTSTRAP_ADMIN_EMAIL` on the server only. The browser needs only the Supabase URL and publishable key. Review Supabase RLS policies and restrict who can use the administrator account before using the prototype beyond demonstrations. `pnpm test` is intentionally offline and clone-safe; optional provider smoke tests require both `RUN_LIVE_PROVIDER_TESTS=1` and the relevant real server-side credentials.

### Citizen record lifecycle and private codes

Each newly created prototype record has a public `FS-…` reference and a separate, browser-session-held private `FSC-…` capability. The server stores only a SHA-256 hash of that capability. A citizen can replace the private code from the status screen; the previous code is revoked immediately and the replacement is returned only once. Citizens can also withdraw the active prototype record. Withdrawal clears the stored capability, blocks all later citizen and constable workflow actions, and redacts the content from normal workspaces while retaining a minimal withdrawal tombstone and audit entry. It is intentionally **not** represented as a real-FIR withdrawal, legal erasure certification, or deletion from every external backup or retention system.

Records created before private access-code support cannot be safely reopened because no recoverable capability exists; begin a new intake rather than attempting to restore access using the short public reference alone.

### Supabase password safeguard status

The connected project's Supabase Security Advisor currently reports leaked-password protection as disabled. This repository has no supported management API or MCP action that can change that Auth setting. Supabase documents that leaked-password protection is available only on the **Pro plan and above**; it therefore cannot truthfully be marked enabled for the current Free-plan project. If the project is upgraded, an administrator should open **Authentication → Attack Protection** (or the current project Auth settings), enable **Leaked password protection**, and retain strong password-length and character requirements. See [Supabase’s password-security guidance](https://supabase.com/docs/guides/auth/password-security) for the current control location and plan availability.

## Reproducible deterministic guardrail evaluation

The repository includes a deterministic, no-network guardrail harness in `server/adversarialEval.test.ts`. It verifies **four post-generation invariants across ten supported scripts**: unsupported workflow fields are discarded, invented source quotes are discarded, under-evidenced catalogue suggestions collapse to `REVIEW`, and non-catalogue BNS codes collapse to `REVIEW`. It also covers delimiter breakout, role-play framing, zero-width obfuscation, a homoglyph variant, and unknown context-key rejection.

This is deliberately **not** presented as a measured live-model prompt-injection pass rate. The harness tests the server’s deterministic output and input boundaries; it does not invoke Groq or establish that every model-level attack will fail. Run it with `pnpm test`.

### Opt-in live-model check

`pnpm eval:live-adversarial` is an explicitly opt-in Groq run (`RUN_LIVE_GROQ_EVAL=1`) that sends ten hostile source statements to the configured drafting model and writes the exact classified outcome to `docs/evaluations/live-groq-adversarial-latest.json`. It is excluded from ordinary tests and deployment gates because it consumes provider quota and provider/model revisions change results.

The current recorded run evaluated **4 of 10** responses as parseable JSON. Of those four, **2 produced an unsafe non-`REVIEW` BNS suggestion from an instruction-only source (50%)**; the deterministic normaliser mitigated both, leaving **0 unmitigated evaluated responses**. The other **6 of 10** responses were unusable JSON and are explicitly not counted as “blocked.” This is a small, time-stamped observation, not a stability claim or a provider benchmark; rerun it after changing the model, prompt, schema, or normalisers.

## Transcription confidence and language-quality evidence

`avg_logprob` metadata is retained with transcript segments, but FIR Saathi no longer uses the previous unvalidated `-0.85` cutoff to colour a citizen’s wording. Amber segment highlighting stays disabled until a provider-matched calibration achieves the documented precision requirement on at least 100 independently reference-checked segments. The repository contains an opt-in calculation command and exact input contract in [`docs/evaluations/REFERENCE_TRANSCRIPT_FORMAT.md`](docs/evaluations/REFERENCE_TRANSCRIPT_FORMAT.md).

The project also does **not** claim that Malayalam, Punjabi, or any other supported language exceeds a particular WER. Published benchmarks for another model or corpus cannot establish the deployed Groq provider’s performance. The evidence boundary, candidate reference corpora, and activation criteria are documented in [`docs/ASR_EVALUATION_PROTOCOL.md`](docs/ASR_EVALUATION_PROTOCOL.md).
