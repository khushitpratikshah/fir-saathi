# FIR Saathi self-hosting guide

FIR Saathi’s complaint drafting, multilingual transcription, evidence storage, and workflow persistence are designed to run without Manus built-in AI or storage services. The server uses Groq’s OpenAI-compatible APIs for drafting and speech-to-text, and Supabase for relational workflow data and private encrypted evidence storage.

| Environment variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Server-only key for structured drafting and multilingual transcription. |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key for RLS-protected complaint data and private evidence storage. Never expose it to browsers. |
| `DATABASE_URL` | Template-dependent | Retained only for the bundled account/auth user table. The complaint workflow itself uses Supabase. |
| `JWT_SECRET` | Yes outside the managed platform | Session-signing secret. |

The database needs the FIR Saathi Supabase tables and the private `fir-saathi-evidence` bucket. Apply the included Supabase migrations before starting the server. The encrypted audio object is stored in the private bucket; its encryption metadata and SHA-256 hash are saved in the complaint database record.

Run `pnpm install`, set the environment variables in your host, and then use `pnpm build` followed by `pnpm start`. The public-facing complaint and review procedures are server routes; do not move `GROQ_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` into `VITE_` variables.

> The template’s existing Manus OAuth scaffolding is separate from the portable complaint pipeline. Before a non-Manus production deployment, replace that account/session integration with your own authentication solution or keep the public prototype paths unauthenticated only where appropriate. Complete a security review, legal review, and key-management design before receiving real complaints.
