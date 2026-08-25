alter table public.fir_saathi_complaints
  add column if not exists withdrawn_at timestamptz,
  add column if not exists withdrawal_reason text;

alter table public.fir_saathi_complaints
  drop constraint if exists fir_saathi_complaints_status_check;

alter table public.fir_saathi_complaints
  add constraint fir_saathi_complaints_status_check
  check (status = any (array['draft', 'needs_citizen_confirmation', 'ready_for_review', 'returned', 'verified', 'withdrawn']));

alter table public.fir_saathi_audit_events
  drop constraint if exists fir_saathi_audit_events_event_type_check;

alter table public.fir_saathi_audit_events
  add constraint fir_saathi_audit_events_event_type_check
  check (event_type = any (array['created', 'transcribed', 'drafted', 'citizen_confirmed', 'field_corrected', 'returned', 'verified', 'evidence_checked', 'context_added', 'clarification_added', 'withdrawn', 'access_code_rotated']));
