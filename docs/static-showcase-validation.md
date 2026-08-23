# Static showcase validation

The GitHub Pages build was generated with `pnpm build:github-pages` and served from the resulting root `index.html`.

The rendered page communicates FIR Saathi’s source-preservation and human-verification safeguards, labels itself as a static showcase, and explicitly states that it has no login, API keys, server workflow, or complaint submission. A generated-file audit found no references to the tRPC API, Supabase service role, Groq key, Supabase origin, or session-establishment endpoint.

The live sign-in form was also exercised with a non-personal invalid email and password. The final failure message reads: “We could not verify that email and password. Check both entries, or use password recovery.” This confirms the recovery guidance is specific without using a real account.
