alter table public.fir_saathi_profiles
  drop constraint if exists fir_saathi_profiles_role_check;

alter table public.fir_saathi_profiles
  add constraint fir_saathi_profiles_role_check
  check (role in ('citizen', 'constable', 'administrator'));
