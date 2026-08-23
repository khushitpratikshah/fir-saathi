-- FIR Saathi core-workflow expansion: more explicit citizen languages, separate context,
-- and append-only clarification audit events. The source transcript remains unchanged.
ALTER TABLE public.fir_saathi_complaints
  DROP CONSTRAINT IF EXISTS fir_saathi_complaints_language_check,
  ADD CONSTRAINT fir_saathi_complaints_language_check
    CHECK (language = ANY (ARRAY['en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'pa']));

ALTER TABLE public.fir_saathi_complaint_fields
  DROP CONSTRAINT IF EXISTS fir_saathi_complaint_fields_source_check,
  ADD CONSTRAINT fir_saathi_complaint_fields_source_check
    CHECK (source = ANY (ARRAY['source_statement', 'assistant_draft', 'officer_correction', 'citizen_context']));

ALTER TABLE public.fir_saathi_audit_events
  DROP CONSTRAINT IF EXISTS fir_saathi_audit_events_event_type_check,
  ADD CONSTRAINT fir_saathi_audit_events_event_type_check
    CHECK (event_type = ANY (ARRAY['created', 'transcribed', 'drafted', 'citizen_confirmed', 'field_corrected', 'returned', 'verified', 'evidence_checked', 'context_added', 'clarification_added']));
