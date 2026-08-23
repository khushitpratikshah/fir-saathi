create policy "intake_drafts_no_direct_browser_access"
  on public.fir_saathi_intake_drafts
  for all
  to anon, authenticated
  using (false)
  with check (false);
