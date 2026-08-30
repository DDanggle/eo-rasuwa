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
-- 공개 읽기 + 익명 삽입만 허용. 수정/삭제는 대시보드(서비스 키)에서만.
create policy "public read" on public.candidate_reviews for select using (true);
create policy "anon insert" on public.candidate_reviews for insert with check (true);
