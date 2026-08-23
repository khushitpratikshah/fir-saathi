# GitHub Pages static showcase

GitHub Pages can host FIR Saathi’s **static showcase**. It is designed for the Intel AI Impact Fest presentation: it communicates the problem, safeguards, multilingual flow, and self-hosting path without accepting a complaint or handling an account.

> GitHub Pages cannot host the full FIR Saathi service securely. The operational workflow needs the Express/tRPC server to keep the Groq key and Supabase service-role key private, verify Supabase sessions, enforce administrator/constable roles, generate drafts, and access encrypted evidence metadata.

## What the static showcase includes

| Included safely | Intentionally excluded |
|---|---|
| Promotional project narrative | Sign-in and password-reset requests |
| Illustrative multilingual source record | Citizen complaint submission |
| Human-verification and source-preservation explanation | Groq drafting and transcription |
| Link to the source and self-hosting guide | Administrator and constable data access |

## Enable Pages

The repository includes `.github/workflows/github-pages.yml`. In the GitHub repository, open **Settings → Pages**, choose **GitHub Actions** as the source, then run the workflow or push to `main`. The workflow runs `pnpm build:github-pages` and publishes only `dist-github-pages`.

For a local preview of the showcase build, run:

```bash
pnpm build:github-pages
pnpm vite preview --config vite.github-pages.config.ts
```

Use the full self-hosted Express service described in `README.md` and `SELF_HOSTING.md` for real authentication, administrator role management, secure evidence storage, Groq processing, and the constable workflow.
