alter table public.fir_saathi_bns_references
  add column if not exists source_url text,
  add column if not exists reviewed_at date,
  add column if not exists eligibility_indicators jsonb not null default '[]'::jsonb;
