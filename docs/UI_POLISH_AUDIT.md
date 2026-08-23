# FIR Saathi UI Polish Audit

## Visual direction

The interface should read as a **civic verification workspace**: official, calm, multilingual, and human-reviewed rather than a generic AI dashboard. Navy carries authority, orange marks verification and primary action, and warm paper surfaces present citizen records.

## Findings from the current interface

- The landing page already communicates source preservation and human verification well, but its brand motifs can be carried more deliberately into task pages.
- The citizen intake page is functional and clear; it benefits from stronger progress emphasis, selection feedback, and more distinctive trust/status surfaces.
- The constable sign-in view is usable but visually sparse relative to the landing page; it needs stronger role context and a more considered workspace entry treatment.
- The active application routes are `/intake` and `/officer`; prior `/citizen-intake` and `/constable-review` captures were non-routed paths and do not represent the working application.

## Scope for this pass

Refine navigation, shared page framing, card depth, task-state feedback, role cues, and responsive spacing without changing complaint processing, authentication, source preservation, or safety claims.

## Validation notes

- Desktop verification confirmed the navigation treatment, orange action hierarchy, citizen selection feedback, and protected constable sign-in framing render together without clipping.
- Mobile verification confirmed that the landing headline remains readable, the language selection grid collapses to touch-friendly cards, and the constable sign-in card keeps usable spacing after the desktop-only review context is hidden.
