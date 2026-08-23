# FIR Saathi self-hosting guide

FIR Saathi’s complaint drafting, multilingual transcription, evidence storage, and workflow persistence are designed to run without Manus built-in AI or storage services. The server uses Groq’s OpenAI-compatible APIs for drafting and speech-to-text, and Supabase for relational workflow data and private encrypted evidence storage.

| Environment variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Server-only key for structured drafting and multilingual transcription. |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key for RLS-protected complaint data and private evidence storage. Never expose it to browsers. |
| `VITE_SUPABASE_URL` | Yes | Public Supabase project URL used only by the browser sign-in form. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Public Supabase publishable key used only by the browser sign-in form. |

The database needs the FIR Saathi Supabase tables and the private `fir-saathi-evidence` bucket. Apply the included Supabase migrations before starting the server. The encrypted audio object is stored in the private bucket; its encryption metadata and SHA-256 hash are saved in the complaint database record.

Run `pnpm install`, set the environment variables in your host, and then use `pnpm build` followed by `pnpm start`. The public-facing complaint and review procedures are server routes; do not move `GROQ_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` into `VITE_` variables.

> FIR Saathi uses **Supabase Auth** for email/password accounts. The browser exchanges a Supabase session with the FIR Saathi server, which verifies the access token and stores only HTTP-only access and refresh cookies. A new account automatically receives the `citizen` profile role. To make an approved reviewer a constable, an administrator must update `public.fir_saathi_profiles.role` to `constable` in Supabase; the server maps that profile role to its protected constable procedures. Do not create a client-side role selector or permit profile self-updates of `role`.

The portable-auth schema is contained in `supabase-auth-migration.json`. Configure Supabase Auth’s Site URL and redirect URLs for the deployed domain, and ensure that your email confirmation policy matches the account onboarding you want. The deployed server must keep `SUPABASE_SERVICE_ROLE_KEY` private; it verifies each session and reads the server-authoritative role profile. Complete a security review, legal review, and key-management design before receiving real complaints.
