-- 사람 검토 노트: AI 후보 창(candidate_id)에 대한 판단 메모. 판정 데이터가 아니라 검토 큐 상태.
create table if not exists public.candidate_reviews (
  id bigint generated always as identity primary key,
  candidate_id text not null,
  verdict text not null check (verdict in ('confirmed_change','no_change','cloud','unsure')),
  note text not null check (char_length(note) between 1 and 1000),
  author text not null default 'anonymous' check (char_length(author) <= 80),
  created_at timestamptz not null default now()
);
create index if not exists candidate_reviews_candidate_idx on public.candidate_reviews (candidate_id, created_at desc);
alter table public.candidate_reviews enable row level security;
-- 공개 페이지에서는 이 기능을 기본으로 끈다. 켤 경우에도 읽기·삽입은 인증 사용자만 허용한다.
-- CAPTCHA/속도제한 없는 anon insert 정책은 공개 배포에서 스팸·사칭 경로가 된다.
create policy "authenticated read" on public.candidate_reviews
  for select to authenticated
  using (auth.uid() is not null);
create policy "authenticated insert" on public.candidate_reviews for insert to authenticated with check (auth.uid() is not null);
