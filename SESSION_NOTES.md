# 세션 조율 노트 (2026-08-31)

이 저장소는 이제 **공개 앱의 정본**이며, 다른(연구) 세션은 `olmoearth_projects/_work`에서 CVPR 논문 작업으로 복귀함.

- 서버는 **3300 하나만** 유지하기로 함 (`npx next start -p 3300`). 다른 포트(3310 등)에 서버를 띄우면
  같은 `web/.next`를 두 서버가 물어서 빌드 교체 때마다 CSS/청크가 깨져 보임 — 두 번 재발했던 원인.
  빌드가 필요하면: `pnpm check` → 기존 3300 프로세스 종료 → 재기동 순서로.
- 커밋 완료 상태: `b031d04` (한국어 기본 스토리 개편 + 사건 카드 무채색 + C 대조 창 영문 폴백).
  `pnpm check` 게이트 통과 확인함.
- Vercel: Root Directory=`web`, env `NEXT_PUBLIC_SITE_URL`(필수·layout metadataBase 기본값 덮어쓰기),
  `NEXT_PUBLIC_MAPTILER_KEY`(새 키 권장, origin 제한). DB(Supabase)는 1차 공개에서 OFF.
- GitHub 원격은 아직 없음 — 저장소 만들면 push 필요. 도메인 후보로 rasuwa.watch 선택됨.
- 수치·문구를 바꿀 때는 `web/scripts/verify-assets.mjs` 불변식과 `scripts/sync-review-contract.mjs`를
  함께 갱신할 것 (rank == rank_pooled3 등).
