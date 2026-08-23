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

Keep `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, and `FIR_SAATHI_BOOTSTRAP_ADMIN_EMAIL` on the server only. The browser needs only the Supabase URL and publishable key. In Supabase Auth password-security settings, enable leaked-password protection before opening account registration to a wider audience. Review Supabase RLS policies and restrict who can use the administrator account before using the prototype beyond demonstrations.
