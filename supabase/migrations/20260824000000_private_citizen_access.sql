-- Public FS references are identifiers, not authorization. A separate private
-- capability is generated server-side, stored only as a SHA-256 hash, and is
-- required for citizen record reads and changes.
alter table public.fir_saathi_complaints
  add column if not exists citizen_access_hash text;

create index if not exists fir_saathi_complaints_citizen_access_hash_idx
  on public.fir_saathi_complaints (citizen_access_hash)
  where citizen_access_hash is not null;
