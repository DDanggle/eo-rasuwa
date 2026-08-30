# Nepal Live Twin — Rasuwa 2026-08-26 (suspected rock–ice avalanche · flash flood) × OlmoEarth

이 저장소는 `olmoearth_projects/_work`(연구 작업공간)에서 **네팔 사건과 관련된 것만** 떼어낸 공개용 모음임.
앱(`web/`), 조사 문서(`docs/`), 실험 코드(`code/`), 봉인 보고서(`artifacts/`), Supabase 스키마(`supabase/`)로 구성함.
사건 표기는 "suspected rock–ice avalanche (under investigation)"로 고정하고, 피해·확률·원인 주장은 하지 않음.

## 구조
| 경로 | 내용 |
|---|---|
| `web/` | Next.js 16 앱(Vercel 배포용). 지도(MapLibre) + 스토리 + AI 후보 + 사람 검토 노트(Supabase, 선택) |
| `web/public/data/` | 봉인된 산출물(장면 PNG, 후보 창 pre/post/Δ, scenario.json). 123 MB, 정적 서빙 |
| `web/python/build_live_twin_data.py` | scenario.json 생성기. 원본 `artifacts/external_data/…`가 필요하므로 이 저장소에서는 재생성보다 **동봉된 scenario.json 사용**을 기본으로 함 |
| `docs/` | NEPAL_* 조사·상태·리스크 문서, 측정 장부 전체 사본(`MEASURED_FINDINGS_full.md`, M66–M80) |
| `code/` | 회랑 100창 스캔·검색·대조군·Sen12 실험(M66·M73·M78·M79·M80)·감사 스크립트 |
| `artifacts/` | 위 실험의 report.json (수치의 1차 출처) |
| `supabase/migrations/` | `candidate_reviews` 테이블 + RLS(공개 읽기·익명 삽입) |

## 배포 (Vercel + Supabase)
1. Supabase 프로젝트 생성 → SQL editor에 `supabase/migrations/0001_candidate_reviews.sql` 실행.
2. Vercel에서 이 저장소 import, **Root Directory = `web`**, Framework = Next.js. 환경변수:
   `NEXT_PUBLIC_MAPTILER_KEY`(선택, 없으면 Esri 래스터 폴백), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(선택, 없으면 검토 노트 UI 숨김).
3. MapTiler 키는 대시보드에서 배포 도메인을 allowed origin에 추가해야 함(이전에 키가 채팅에 노출된 적 있으므로 **새 키 발급 권장**).
4. 로컬: `cd web && pnpm install && pnpm build && pnpm start`. `pnpm verify`로 자산 불변식 검사.

## 잘된 것 (근거 있음)
- **AI vs 고전, 같은 조건 9/9 우위**(M73): Sen12-Landslides 9지역, 같은 패치·시점·라벨에서 OlmoEarth Δz AUROC가 밴드차·|ΔNDVI|+|ΔNBR|보다 높음(8/9 ≥ +0.05).
- **두 번째 모델 대조군**(M79): Presto(픽셀 시계열 FM)를 같은 계약에 넣었을 때 OlmoEarth가 6/7에서 ≥ +0.03 앞섬 → "아무 임베딩 Δ"가 아니라 공간 표현의 기여.
- **레이더 단독 신호**(M78·M80): Hokkaido·Hiroshima에서 S1만으로 0.77/0.73, 흐린 post(clear 10%)에서도 Hokkaido 0.770 유지.
- **네팔 회랑 후보 목록**(M69·M71): 100창 자동 스캔, 구름 판정 불가 제외 47창, 상위 Dalphedi·Bidur·Salê(강 밖). 대조 창 Tadi Khola는 3.6%(회랑 1위 25%).
- **정정을 남김**(M75·M76): 레이더 선형/dB 단위 오류로 초기 양성(9.8%) 철회, 재계산 후 미검출을 그대로 공개.
- 앱: 청록 점/후보 사각형 결함 원인을 헤드리스로 재현·수정, 스토리 5장(정정 포함), 팝업 위성 3장 + Planet 3.8 m.

## 부족한 것 (먼저 읽을 것)
- **네팔 사건 자체의 라벨이 없음**: USGS/UNOSAT 피해 경계 미공개 → 후보의 정밀도를 셀 수 없음. "검토 후보"까지만.
- **레이더 결합 이득 0/7**: 광학이 있으면 S1을 보태도 +0.03 미만. 네팔 레이더 화면(dB 교정 후)은 미검출.
- **구름 층화는 2지역뿐**: Sen12가 맑은 장면 위주라 "구름 투시" 일반화 불가. PC에서 흐린 장면을 직접 모아야 함.
- **대조 창은 사후 선택**(관측성 기준) — specificity 근거로 쓰지 않음. Rishing은 구름 100%로 판정 불가.
- **Presto 계약 불리**(12개월 모델에 4시점) → Presto 하한. Prithvi/Clay/TerraMind 미실행.
- 평시 기준이 한 쌍(2주)뿐, spatial-block CI 없음, 시드 반복 없음.
- 물리 시뮬레이션(r.avaflow/D-Claw) 미실행, 언색호(D) 위치 미확정, 발원지(E)는 구름·눈.
- 앱: 회랑 100창 사각형이 겹쳐 빽빽함, 한국어 스토리 일부는 영문 대비 검수 부족, 공개 후 사용자 테스트 없음.

## 여러 작업공간에서 한 일 (합본)
- **이 세션(메인)**: 앱 UX·스토리, M77(대조 창), M78(레이더), M79(Presto), M80(구름 층화), 확장 리서치(`docs/NEPAL_EXPANSION_RESEARCH.md`).
- **병렬 세션**: 레이더 dB 계약 감사(M75/M76 재실행), M77/M78 독립 재계산(`code/audit_nepal_m77_m78.py`, SHA 재현), 연구 상태판(`docs/NEPAL_OLMO_RESEARCH_STATUS_2026_08_30.md`), 리스크·출처 감사, 봉인 테스트.
- **서버(nx, GPU1)**: 모든 임베딩·Sen12 실험. 로그는 서버 `logs/`, 로컬은 report.json만 동기화.

## 라이선스·출처
Sentinel-1/2 © ESA Copernicus. PlanetScope/SkySat © Planet Labs PBC, CC-BY-NC-4.0 (Planet Disaster Data, source.coop). Basemap © MapTiler / OpenStreetMap contributors. OlmoEarth © Ai2. Presto © NASA Harvest.
