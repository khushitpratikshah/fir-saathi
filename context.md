# FIR Saathi — Complete Project Context

**Project type:** Intel AI Impact Fest prototype  
**Current product name:** FIR Saathi  
**Primary purpose:** A multilingual, voice-first, source-preserving citizen complaint-intake and constable-review workspace for demonstration and evaluation.  
**Important framing:** FIR Saathi is **not** an official police portal, emergency dispatch system, FIR-registration mechanism, legal decision engine, or deployed public-safety service.

## 1. Project in one paragraph

FIR Saathi is designed around one central idea: **when a citizen speaks, the record should listen without changing their words**. It gives a citizen a calm way to describe an incident in a selected language through voice or text. The application preserves the original statement, uses AI only to identify exact source-backed details and possible gaps, asks for only the most useful missing context, and then routes the record into a human constable-review workflow. The prototype intentionally makes the boundaries visible: AI assists with structure and uncertainty, while citizens confirm their own words and constables make every review or verification decision.

> **Core principle:** The source statement is the record. AI may identify what is present or missing, but it must not translate, formalise, rewrite, invent, or silently alter the citizen’s account.

## 2. The problem FIR Saathi addresses

Incident reporting is difficult when people are stressed, unsure what details matter, speak different languages, or fear that their words will be distorted. A conventional long form can force a citizen to guess legal categories before they have simply described what happened. A fully automated system can create a different risk: it may rewrite the story, infer facts, overstate confidence, or make the citizen believe an official decision has been made.

FIR Saathi addresses the **intake and review experience**, not law-enforcement authority. It uses a source-preserving approach to make a citizen’s account easier to review while retaining clear human checkpoints. The Ministry of Home Affairs’ Digital Police service describes citizen-facing functions such as complaint filing, status access, FIR copies, and missing or recovered-property information; these references motivate clear case status and contextual information, but FIR Saathi does **not** claim to be part of that system.[1]

| Design challenge | FIR Saathi response |
|---|---|
| Citizens may be more comfortable speaking than typing. | Voice capture and server-side transcription are available alongside typed entry. |
| A witness may have already supplied key facts in a long narrative. | The transcript is examined first; the app avoids asking again for time, place, or safety details already present in source-backed fields. |
| A long form can feel overwhelming. | Intake is reduced to language selection, the citizen’s own words, and a transcript check. |
| Extra details are useful but should not modify the statement. | Context is stored separately as citizen-provided information. |
| AI can sound more authoritative than it is. | The interface repeatedly states that a constable verifies and that the prototype does not register an FIR. |

## 3. Intended users and roles

### Citizen

The citizen begins an intake, chooses a language explicitly, records or types a statement, sees the preserved source record, optionally answers only missing high-value questions, confirms their words, and can see a plain-language review status. The citizen can save an unfinished **text** intake using a private resume code. The code is intentionally treated as sensitive because it can reopen that draft.

### Constable

The constable opens a protected review queue, examines the source statement separately from citizen context, audio-evidence metadata, AI-extracted fields, clarification history, and readiness signals. The constable may correct a field with an audit reason, return a record for clarification, or verify the prototype record. A constable does **not** register an FIR through this interface.

### Administrator

An administrator can assign an approved profile the `constable` role through the small role-management dashboard. Authentication and role controls already exist in the project but are not the current product-development focus.

## 4. End-to-end citizen workflow

### 4.1 Landing page

The landing page is an Intel AI Impact Fest showcase that explains the product thesis and offers two clearly separated paths: **Open citizen intake** and **Open review workspace**. Its message is deliberately aspirational but constrained: source preserved, human verified, multilingual by design.

### 4.2 Guided intake

The current intake has only three internal steps:

1. **Choose language.** The citizen selects one language; the app does not guess the language from a short recording.
2. **Share your own words.** The citizen records audio or enters text. They must explicitly consent to prototype processing.
3. **Transcript check.** The app explains that it will preserve the source, identify source-backed information, and only then ask optional missing-detail questions.

The old multi-question intake form was intentionally removed. It asked for time, place, safety, people, property, and contact details before the system knew whether those details were already in the statement. This made the flow repetitive and less natural.

### 4.3 Voice capture and transcription

For voice intake, the browser captures audio and encrypts the recorded evidence using AES-GCM before the encrypted bytes are stored in private Supabase Storage. The server sends the raw recording to Groq transcription with an instruction to transcribe exactly as spoken and not translate, formalise, summarise, correct, or add facts. The raw audio is not retained as an unencrypted public file.

The returned transcript becomes the **source statement**. It is then processed by the drafting guardrails described below.

### 4.4 Transcript-first adaptive follow-up

After the source statement is drafted, FIR Saathi checks source-backed extracted fields before asking a question. The automatic high-value follow-up order is:

| Possible question | It is shown only when the transcript does not already contain |
|---|---|
| **When did this happen?** | A source-backed date or time detail. |
| **Where did this happen?** | A source-backed location or landmark detail. |
| **Was there an injury, threat, or safety concern?** | A source-backed injury or safety detail. |

The citizen sees **one optional question at a time** and can add an answer or skip it. If the citizen’s source statement already includes the detail, that question is not repeated.

Additional information remains available without reinstating a long form. Once automatic high-value checks are complete, the citizen may choose to add one of these optional context types: **people or vehicle details**, **property or loss details**, or a **safe follow-up contact**. These are never forced. The contact prompt explicitly warns not to enter passwords, PINs, OTPs, or other secrets.

### 4.5 Example synthetic scenario used for validation

A synthetic test narration used during development described a woman at approximately 7:30 PM at the Alkapuri bus stand in Vadodara, a mobile-phone snatching by a person on a black motorcycle, an estimated property value, a red jacket and helmet, a nearby shopkeeper witness, and a safe contact number. In that scenario, the transcript already covered time, place, property, person/vehicle, witness, and follow-up contact. The intended behavior is to **not ask again** for those details. At most, the system may offer the optional injury/threat/safety question, which the citizen can skip.

This is synthetic demonstration material only. It must never be presented as a real incident or a filed report.

### 4.6 Citizen confirmation and status

The citizen sees the original statement, the separate AI-extracted source-backed details, any separately entered context, and the fact that human review is still required. The citizen must explicitly confirm before the record becomes ready for review.

The citizen-facing status page uses plain language, including states such as:

| Record status | Citizen-facing meaning |
|---|---|
| `needs_citizen_confirmation` | Review your words before sending. |
| `ready_for_review` | Your details are ready for human review. |
| `returned` | A constable asked for one more detail. |
| `verified` | The prototype review is complete; no FIR was registered by this application. |

For completed review states, the main action returns the citizen to the **main page**, rather than prompting them to start another intake.

## 5. Source-preservation model

FIR Saathi’s most important product constraint is that information has different origins and must remain distinguishable.

| Information type | What it is | How it is treated |
|---|---|---|
| **Source statement** | The citizen’s typed statement or the verbatim voice transcript. | Preserved as the original record; application flow does not overwrite it. |
| **Source-backed draft field** | An AI-identified fact whose source quote is an exact contiguous excerpt from the source statement. | Displayed as an aid; no paraphrased or inferred value is accepted. |
| **Citizen context** | A separate voluntary answer, such as time, place, safety detail, property detail, or contact preference. | Stored separately with source `citizen_context`; not merged into the source transcript. |
| **Citizen clarification** | A response supplied after a constable returns a record. | Appended separately and audited; it does not rewrite earlier source. |
| **Officer correction** | A constable’s manual review adjustment. | Audited with a reason and distinct source label. |

This separation is central to the demonstration. It lets a reviewer see what was directly said, what was added later by the citizen, what AI highlighted, and what a human officer changed.

## 6. AI behavior and safety constraints

### Drafting model

Groq’s OpenAI-compatible API is used for structured drafting. The configured drafting model is `openai/gpt-oss-20b`. The model must return a constrained JSON object containing source-backed fields, missing details, optional follow-up questions, and bounded BNS review suggestions.

### Transcription model

Groq `whisper-large-v3` is used for audio transcription. The prompt explicitly requires an exact transcription without translation, formalisation, summarisation, correction, or invented facts.

### Mandatory AI rules

The product enforces the following rules in prompts, schemas, and normalization code:

- Extracted field quotes must be **exact contiguous excerpts** from the source statement.
- A field is rejected if its quote is not found inside the original source.
- The assistant may identify missing information, but must not infer names, motives, intent, actions, emotions, credibility, jurisdiction, or legal conclusions.
- The selected source language is retained; source text is not silently translated into another language.
- The assistant must remain low-confidence or ask for officer review where it cannot safely support a suggestion.
- The fallback state is human review, not fabricated completion.

## 7. BNS review assistance

The prototype contains a deliberately constrained, source-linked Bharatiya Nyaya Sanhita review catalogue. It is a **constable review aid**, not a charge recommendation engine. Each non-generic BNS card must be supported by exact source excerpts, list ambiguity or missing factors, link to the official source, and remain subject to human assessment.

The application’s legal framing is conservative. The Bharatiya Nagarik Suraksha Sanhita identifies information in cognizable cases and references concepts such as time, place, and person; FIR Saathi uses those ideas only to prompt clearer factual context, not to classify an offence or create an official record.[2] The BNS catalogue links to the official gazette text and is explicitly demonstrative/non-authoritative.[3]

| What the BNS interface may do | What it must not do |
|---|---|
| Show a possible, source-grounded review reference. | Decide which law applies. |
| Quote the portion of the citizen’s statement that triggered the reference. | Recommend a charge or present a legal conclusion. |
| Highlight missing factual factors for a constable to examine. | Determine whether an FIR should be registered. |
| Display a source link and review date. | Replace professional or official assessment. |

## 8. Constable review workflow

The protected review workspace is designed to make the record legible instead of pretending that AI has completed the work.

The constable can see:

- The preserved source statement.
- Separate citizen context and later clarifications.
- Source-backed extracted fields and their confidence labels.
- Audio-evidence metadata, encryption details, and a ciphertext-hash recheck action.
- A record timeline and audit history.
- An advisory case-readiness panel that highlights source presence, time/place coverage, context, clarification state, evidence metadata, and missing-detail signals.
- Source-linked BNS review cards and a concise officer review brief.

The constable can correct a field with a reason, return a record for clarification, or verify the prototype record. These actions create audit events. Verification remains a human action and is explicitly described as **not FIR registration**.

## 9. Languages

The citizen must select one of ten explicit language options:

| Code | Language |
|---|---|
| `en` | English |
| `hi` | Hindi |
| `gu` | Gujarati |
| `mr` | Marathi |
| `bn` | Bengali |
| `ta` | Tamil |
| `te` | Telugu |
| `kn` | Kannada |
| `ml` | Malayalam |
| `pa` | Punjabi |

The interface supports language selection and multilingual source capture. It does not claim legal-quality translation or attempt to convert a citizen’s original account into another language.

## 10. Data model and auditability

FIR Saathi uses Supabase as the persistent backend. The important logical records are:

| Record | Purpose |
|---|---|
| `fir_saathi_complaints` | Public reference, language, status, consent, preserved source transcript, and structured draft JSON. |
| `fir_saathi_complaint_fields` | Source-backed fields, separate citizen context, clarifications, and officer corrections. |
| `fir_saathi_audit_events` | Lifecycle events including creation, transcription, drafting, context addition, clarification, confirmation, correction, return, verification, and evidence checks. |
| `fir_saathi_audio_evidence` | Encrypted evidence storage reference, MIME type, byte size, hash, encryption metadata, and tamper-check status. |
| `fir_saathi_intake_drafts` | Expiring, code-gated unfinished text drafts. Resume codes are hashed server-side. |
| `fir_saathi_bns_references` | Source-linked BNS catalogue data used by review cards. |
| `fir_saathi_profiles` | User profile and role assignment data. |

Row-level security is used for the underlying Supabase tables, and the private/server operations are performed through server-side access rather than browser-held service credentials.

## 11. Technical architecture

### Application stack

| Layer | Technology | Role |
|---|---|---|
| Front end | React 19, TypeScript, Tailwind CSS 4, Wouter | Citizen and constable interfaces. |
| API layer | Express 4 + tRPC 11 | Typed public and protected application procedures. |
| Database and auth | Supabase | PostgreSQL persistence, email/password accounts, roles, RLS, and private storage. |
| Drafting and transcription | Groq | Structured source-preserving drafting and speech-to-text. |
| Object storage | Supabase Storage | Private encrypted audio evidence storage. |
| Testing | Vitest | Unit, contract, guardrail, and provider-integration checks. |

### Key runtime sequence

```text
Citizen voice or text
        ↓
Browser encrypts recorded audio (voice path)
        ↓
Express/tRPC server
        ↓
Groq transcription (voice) → verbatim source transcript
        ↓
Groq structured drafting → source-backed fields + gap signals
        ↓
Supabase complaint, fields, audit events, private evidence metadata
        ↓
Citizen confirms → constable reviews → human verification or clarification loop
```

### Deployment and self-hosting context

The application is portable and does not require a local database or a built-in Manus AI service when self-hosted. The current self-hosting design uses:

- A **Raspberry Pi 5 (8 GB)** running a native Node.js 22 and pnpm application service.
- A dedicated unprivileged `firsaathi` Linux account.
- A `systemd` service named `fir-saathi` that runs the compiled Node production server from `/srv/fir-saathi/app`.
- **Cloudflare Tunnel** and a user-owned domain for HTTPS public access without opening router ports or requiring a public IP.
- External Supabase for database, authentication, and private storage.
- External Groq for transcription and structured drafting.
- A custom Resend SMTP configuration in Supabase for reliable account-confirmation emails.

Secrets remain outside the repository in `/etc/fir-saathi.env`. Public Vite configuration uses the Supabase project URL and publishable key at build time. Server-only values include the Supabase service-role key, Groq key, session secret, and bootstrap-administrator email. No secret should appear in screenshots, recordings, public repositories, or video material.

## 12. Visual and interaction design

### Visual identity

The visual direction is a civic-technology workspace rather than a literal police portal. It uses:

- A deep navy base (`#0c2039` / related dark surfaces) to create seriousness and trust.
- An ember orange accent (`#c64e19`) for action, emphasis, and the FIR Saathi speech/shield motif.
- Paper-toned review surfaces to make the citizen workflow calmer and more readable.
- The FIR Saathi mark: a navy shield, orange speech-bubble “S” stroke, and listening-wave references.
- DM Sans with Indian-language fallbacks, including Noto Sans Devanagari and Noto Sans Gujarati.

### Mobile design decisions

The application is designed mobile-first because citizen intake is likely to begin on a phone. Touch targets are substantial, actions are full-width when appropriate, and questions are one at a time. The landing-page hero headline was specifically repaired for mobile/Samsung Internet: it now uses explicit block lines, responsive type sizing, and disables the transform-based entrance animation on small screens to prevent overlapping text.

### Responsive visual validation

The landing hero and citizen-confirmation experience were visually reviewed in development at a **1280 × 720 desktop viewport** and a **375 × 812 phone viewport**. At desktop size, the hero headline, structured source statement, optional-detail controls, context cards, and confirmation action remained readable without overlap or clipped controls. At phone size, the hero’s explicit headline lines remained legible, and the confirmation journey stacked cleanly with readable source text, full-width optional-detail buttons, and a reachable confirmation action.

### Motion philosophy

Motion is subtle and purposeful: waveform movement communicates active listening, small fade-ins support page hierarchy, and buttons provide quick tactile feedback. Animations respect reduced-motion preferences. Motion must never obscure the source statement or make a legal/AI decision appear more certain.

## 13. What to say and what not to say about the project

| Appropriate description | Avoid saying |
|---|---|
| “A multilingual, source-preserving complaint-intake and constable-review prototype.” | “An official FIR filing system.” |
| “AI identifies explicit source-backed details and possible gaps.” | “AI understands the case” or “AI decides what happened.” |
| “Citizens confirm their own words; constables review and verify.” | “The app verifies complaints automatically.” |
| “BNS cards are demonstrative, source-linked review aids.” | “The app recommends charges” or “the app gives legal advice.” |
| “The prototype cannot dispatch emergency services.” | “The app sends police/emergency help.” |
| “It is built for an Impact Fest demonstration and self-hostable prototype evaluation.” | “It is live government infrastructure.” |

## 14. Current implementation state

The core working product includes the landing page, multilingual text/voice intake, source-preserving Groq workflows, optional resumable text drafts, citizen confirmation, context separation, clarification loops, role-protected constable review, BNS review aids, audit history, encrypted audio-evidence metadata, Supabase email/password authentication, and Raspberry Pi deployment through Cloudflare Tunnel.

The most recent live Raspberry Pi validation used the synthetic Rekha Sharma voice scenario. The spoken source explicitly included an approximate time, place, mobile/property description, motorcycle and clothing details, a nearby witness, and a contact number. The user confirmed that the flow worked as intended: those transcript-covered details were not repeated as mandatory follow-up prompts. The implementation may offer the separate **injury, threat, or safety** question only when that detail is absent; it is optional and can be skipped. The exact optional-prompt display state was not retained as a screenshot, so it should not be presented as a recorded UI outcome.

## 15. Non-negotiable guardrails for any future work or presentation

1. Do not present FIR Saathi as an official, emergency, dispatch, police, legal, or FIR-registration platform.
2. Do not imply that AI rewrites, translates, formalises, interprets, or determines the truth of the citizen’s source statement.
3. Do not present BNS suggestions as legal conclusions, charging advice, or registration outcomes.
4. Do not use real victim, witness, audio, phone, address, or incident data in demos, screenshots, videos, or prompts.
5. Use synthetic examples and clearly label them as synthetic.
6. Do not reveal Supabase service keys, Groq keys, resume codes, SMTP credentials, passwords, JWT secrets, or infrastructure details that would expose the deployment.
7. Preserve the distinction between source statement, citizen context, AI extraction, officer correction, and human verification in every future feature.

## References

[1]: https://digitalpolice.gov.in/ "Digital Police — Ministry of Home Affairs / NCRB"
[2]: https://www.indiacode.nic.in/bitstream/123456789/20099/1/A202346.pdf "Bharatiya Nagarik Suraksha Sanhita, 2023"
[3]: https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf "The Bharatiya Nyaya Sanhita, 2023 — official gazette text"
