# 세션 조율 노트 (2026-08-31)

이 저장소는 이제 **공개 앱의 정본**이며, 다른(연구) 세션은 `olmoearth_projects/_work`에서 CVPR 논문 작업으로 복귀함.

- 서버는 **3300 하나만** 유지하기로 함 (`npx next start -p 3300`). 다른 포트(3310 등)에 서버를 띄우면
  같은 `web/.next`를 두 서버가 물어서 빌드 교체 때마다 CSS/청크가 깨져 보임 — 두 번 재발했던 원인.
  빌드가 필요하면: `pnpm check` → 기존 3300 프로세스 종료 → 재기동 순서로.
- 커밋 완료 상태: `b031d04` (한국어 기본 스토리 개편 + 사건 카드 무채색 + C 대조 창 영문 폴백).
  `pnpm check` 게이트 통과 확인함.
- Vercel: Root Directory=`web`, env `NEXT_PUBLIC_SITE_URL`(필수·layout metadataBase 기본값 덮어쓰기),
  `NEXT_PUBLIC_MAPTILER_KEY`(새 키 권장, origin 제한). DB(Supabase)는 1차 공개에서 OFF.
- GitHub 원격은 아직 없음 — 저장소 만들면 push 필요. 도메인은 eo-rasuwa.dev로 결정됨 (2026-08-31).
- 수치·문구를 바꿀 때는 `web/scripts/verify-assets.mjs` 불변식과 `scripts/sync-review-contract.mjs`를
  함께 갱신할 것 (rank == rank_pooled3 등).

## 2026-08-31 오후 — S1D 8/31 재관측 파이프라인 (내일 재개)

- 새 모드 `s1_live_0831` 준비 완료: `code/prepare_nepal_olmo_live.sh`(기간 7/17~9/12, 마지막 기간 8/29~9/12에 8/31 pass만 존재 → 결정적), `check_nepal_live_selection.py`(토큰 20260831), `seal_nepal_olmo_dataset.py` 확장. 봉인된 8/28 계약은 건드리지 않음.
- 8/31 S1D(desc orbit 121)는 Copernicus에 published지만 **Planetary Computer STAC 인덱스가 아직 안 따라옴** — 5회(2.5시간) 재시도 모두 preflight에서 차단됨(설계대로 픽셀 다운로드 전 정지). 백그라운드 루프는 세션 정리로 중단됨. 손실 없음.
- **내일 재개 방법**: `RSLEARN_BIN=$OLMO_VENV/bin/rslearn PYTHON_BIN=$OLMO_VENV/bin/python bash code/prepare_nepal_olmo_live.sh s1_live_0831` (OLMO_VENV=`~/dong/ai_projects/olmoearth_projects/.venv`). preflight 통과하면 materialize→seal까지 자동, 그다음 `bash code/run_nepal_olmo_embeddings.sh s1_live_0831` (OlmoEarth 가중치는 HF 자동 다운로드). 이후 Δz 비교→scenario 외과 반영.
- 남은 것: 임베딩 후 anchor Δz vs placebo 비교, scenario/ops_log 반영, s1d_20260831 state를 sealed로.
