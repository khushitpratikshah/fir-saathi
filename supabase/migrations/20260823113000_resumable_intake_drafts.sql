create table if not exists public.fir_saathi_intake_drafts (
  id uuid primary key default gen_random_uuid(),
  resume_code_hash text not null unique check (resume_code_hash ~ '^[a-f0-9]{64}$'),
  language text not null check (language in ('en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'pa')),
  source_transcript text not null check (char_length(source_transcript) between 8 and 12000),
  citizen_context jsonb not null default '{}'::jsonb,
  current_step smallint not null default 1 check (current_step between 1 and 8),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists fir_saathi_intake_drafts_expires_at_idx
  on public.fir_saathi_intake_drafts (expires_at);

alter table public.fir_saathi_intake_drafts enable row level security;

revoke all on table public.fir_saathi_intake_drafts from anon, authenticated;

create policy "intake_drafts_no_direct_browser_access"
  on public.fir_saathi_intake_drafts
  for all
  to anon, authenticated
  using (false)
  with check (false);
