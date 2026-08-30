-- Apply this after 0001 on projects created from an earlier public-demo schema.
-- It removes unauthenticated writes before the site is exposed publicly.
drop policy if exists "anon insert" on public.candidate_reviews;
drop policy if exists "public read" on public.candidate_reviews;
drop policy if exists "authenticated read" on public.candidate_reviews;
drop policy if exists "authenticated insert" on public.candidate_reviews;
create policy "authenticated read" on public.candidate_reviews
  for select to authenticated
  using (auth.uid() is not null);
create policy "authenticated insert" on public.candidate_reviews
  for insert to authenticated
  with check (auth.uid() is not null);
