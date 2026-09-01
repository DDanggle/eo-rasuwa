# Nepal AI Twin — Rasuwa 2026 × OlmoEarth

> English version: [README.md](./README.md) · 대용량 연구 원본과 중간 산출물은 Git에서 제외한
> `research-private/`에 있고, 경로 계약은 [`docs/RESEARCH_STORAGE.md`](./docs/RESEARCH_STORAGE.md)에 있습니다.

2026년 8월 26일 라수와–Bhote Koshi 돌발홍수에 대해, **범용 Earth embedding을 새 재난 탐지기로 재학습하지 않고** 사건 전후 변화의 검토 순위를 만든 공개 연구 데모입니다.

핵심 결과는 하나입니다.

> Sentinel-2 관측창 100개를 같은 계약으로 비교했고, 47개를 판독할 수 있었으며, 세 개 평시 전이의 p99를 넘은 6곳을 사람이 먼저 볼 리드로 남겼다. 리드는 피해 확정·피해 면적·원인·확률이 아니다.

## 공개 화면과 산출물

| 경로 | 내용 |
|---|---|
| `web/app/page.tsx` | 100 → 47 → 6 메시지를 전달하는 첫 화면 |
| `web/app/map/page.tsx` | MapLibre 증거 지도, 전후 장면, 100개 스캔 중심, 6개 리드, 재관측 목록, 방법 스토리 |
| `web/public/data/review-leads.geojson` | 공개 우선 검토 리드 6개 |
| `web/public/data/candidates.geojson` | 판독 가능한 전체 47개 창(리드와 분리) |
| `web/public/data/scenario.json` | 앱이 읽는 통합 결과·출처·계약·정정 장부 |
| `artifacts/` | 실험별 1차 `report.json` |
| `docs/MEASURED_FINDINGS_full.md` | M66–M88 측정·반증·정정 기록 |
| `code/` | 후보 스캔, 대조군, Sen12, Presto, 레이더, 지형 분석 코드 |

대용량 raw cube·embedding·delta는 `research-private/artifacts/`로 분리되어 있으며
`NEPAL_ARTIFACT_ROOT`로 서버 위치를 명시할 수 있습니다. `artifacts/` 표의 보고서는 공개 검토에
필요한 작은 결과만 뜻합니다.

`web/public/data/`는 약 125 MB입니다. 연구 원본이 아니라 공개 UI에 필요한 파생 PNG·GeoJSON·JSON·WASM만 포함합니다.

## 지금 말할 수 있는 것

- **네팔 우선 검토 목록:** 100개 창 중 47개 판독 가능, 6개 리드. 1위 Dalphedi는 pooled-three-pair 기준 13.3%; Tadi Khola 대조 창은 1.3%.
- **과거 라벨 평가(M73):** Sen12-Landslides 9개 지역의 같은 패치·시점·라벨에서 OlmoEarth Δz가 고전 band/index change보다 9/9 높았습니다. 그중 8/9가 사전 기준 +0.05 이상입니다.
- **두 번째 표현 대조(M79):** 같은 네 시점 계약에서 OlmoEarth가 Presto보다 6/7 지역에서 +0.03 이상 높았습니다. 다만 12개월 모델인 Presto에 불리한 하한 비교입니다.
- **레이더의 제한(M78·M80):** S1-only 신호는 Hokkaido·Hiroshima에서만 강했습니다. 실제 10% clear 장면에서는 Hokkaido 0.770, Alaska 0.497이므로 보편적 “구름 투시” 주장이 아닙니다. S1+S2 이득도 모든 지역에서 +0.03 미만입니다.
- **정정(M75·M76):** Sentinel-1 선형 강도를 dB 입력 계약으로 잘못 넣어 나온 초기 9.8% 결과와 관련 후보를 철회했습니다. 현재 페이지는 교정 후 산출물만 공개 결과에 사용합니다.

## 아직 말할 수 없는 것

- 6곳이 실제 피해라는 주장. 현재 확정 피해 라벨은 0개입니다. 동결 외부 홍수 범위와의 창 규모 대조(M86)는 무판별이었고, 40 m 토큰 규모 대조(M88)는 pooled AUROC 0.846으로 순위를 지지하지만 라벨은 여전히 홍수 대리이지 피해 확정이 아닙니다.
- 13.3%를 피해 면적이나 발생 확률로 해석하는 것.
- 물리 시뮬레이션으로 수심·유속·도달시간을 예측했다는 주장. Rust/WASM 입자는 OSM 중심선을 따르는 **설명용 운동학 시각화**입니다.
- OlmoEarth가 모든 GeoFM보다 우월하다는 주장. Prithvi·Clay·TerraMind는 같은 계약에서 실행하지 않았습니다.
- 네팔 1개 사건의 지형 상관을 일반 위험 모델로 확장하는 것.

**NP-86 (기존 M86, 2026-08-31):** Sentinel Asia 활성화의 IWM(PlanetScope)·TASA(FORMOSAT-5)·JAXA(ALOS-2) 홍수 범위를 발표본 그대로 동결하고, 순위·문턱을 바꾸지 않은 채 6개 리드를 채점했습니다. 합집합 precision@6은 6/6이지만 비리드 기저율 87.8%로 우연 기대치와 구분되지 않고, 창 내부 교차 면적도 리드 6.0% vs 비리드 6.3%로 동일합니다 — **창(2.56 km) 규모에서 외부 범위는 이 순위를 검증도 반증도 하지 못합니다** (`artifacts/external_label_score/report.json`, `code/score_external_extents.py`). 그 다음 40 m 토큰 대조 **NP-88 (기존 M88, 2026-09-01)** 에서는 OlmoEarth Δz가 외부 proxy와 정합했습니다(AUROC **0.846**, AUPRC **0.255**, 기저율 5.5%; 기관별 AUROC IWM 0.887/TASA 0.878/JAXA 0.796). 다만 122,558 토큰은 겹치는 창의 공간상관 표본이고 독립 사건은 1개입니다. 사후 강건성 감사 **NP-89**에서 사건 후 NDWI가 AUPRC 0.291로 Olmo를 이겼고, 5.12 km block-macro AUROC는 0.850 vs 0.857, Olmo−NDWI bootstrap CI가 0을 포함했습니다. 따라서 **외부 라벨 정합은 생존하지만 “AI가 고전 flood mapping보다 우월”하다는 주장은 하지 않습니다.** 같은 창·같은 80 m 강거리 구간 조건부 AUROC는 Olmo 0.801 vs NDWI 0.752로 후속 가설만 남습니다.

## AI 파이프라인 — 코드로 따라가기

모델은 Ai2의 [OlmoEarth v1 Base](https://huggingface.co/allenai/OlmoEarth-v1-Base) frozen encoder 하나이며,
이 사건을 위해 어떤 재학습·미세조정도 하지 않았습니다. 파이프라인 전체가 이 저장소의 코드로 재현됩니다.

```text
Copernicus 카탈로그 봉인 → 씬 선택 preflight → 픽셀 materialize (rslearn)
      → frozen OlmoEarth 임베딩 (768ch × 64×64 토큰, 40 m/토큰)
      → Δz = 1 − cos(z_before, z_after)
      → 평시 세 전이의 pooled p99 문턱 → 검토 순위 (탐지 주장 아님)
      → web/public/data 파생 자산 생성
```

| 단계 | 코드 | 산출물 |
|---|---|---|
| 관측 카탈로그 봉인 (메타데이터만) | `code/build_nepal_live_catalog.py` | `catalog/<snapshot>/` + SHA-256 seal |
| 필수 씬 선택 검사 (다운로드 전 차단) | `code/check_nepal_live_selection.py` | `selection_preflight.json` |
| 4×14일 S1+S2 cube materialize | `code/prepare_nepal_olmo_live.sh` | `materialized/<mode>/dataset` |
| frozen 임베딩 추출 | `code/run_nepal_olmo_embeddings.sh` + `code/model.yaml` | embedding GeoTIFF + manifest seal |
| 회랑 창 Δz·평시 문턱·순위 | `code/analyze_corridor_sealed.py`, `code/corridor_change_retrieval.py` | `report.json` (100→47→6) |
| 과거 라벨 대조 (M73/M78/M79) | `code/sen12_*.py` | `artifacts/sen12_*/report.json` |
| 공개 자산 빌드 | `web/python/build_live_twin_data.py` | `web/public/data/*` |

수식과 계약은 짧습니다: 같은 위치의 사건 전/후 임베딩 토큰 `z_before, z_after`에 대해
`score = 1 − cosine(z_before, z_after)`를 계산하고, 사전 등록한 세 개의 평시 2주 전이에서 얻은
pooled p99를 넘는 토큰 비율로 창을 정렬합니다. 순위는 사람이 먼저 볼 순서이지 피해 판정이 아닙니다.

무엇이 AI 계산이고 무엇이 제품 계층(지도·스토리·WASM 입자)인지의 상세 구분, 실행됨/실행 안 됨의
전체 장부는 [`docs/NEPAL_WHAT_THE_AI_ACTUALLY_DOES_2026_08_29.md`](./docs/NEPAL_WHAT_THE_AI_ACTUALLY_DOES_2026_08_29.md)와
[`docs/MEASURED_FINDINGS_full.md`](./docs/MEASURED_FINDINGS_full.md)에 있습니다.
재실행에는 rslearn 환경과 `research-private/`(약 5.9 GB, Git 미포함) 원본이 필요하며,
경로 계약은 `code/nepal_paths.py`와 `NEPAL_ARTIFACT_ROOT`가 관리합니다.

## 로컬 검증

Node.js 22.13+와 pnpm 11.19.0을 사용합니다.

```bash
cd web
pnpm install --frozen-lockfile
pnpm check
pnpm start
```

`pnpm check`는 공개 자산 불변식, ESLint, TypeScript, production build를 모두 실행합니다. 데이터 생성기는 원 연구 작업공간을 요구하므로 공개 저장소에서는 동봉된 `scenario.json`을 기본으로 사용합니다. 결과 계약을 갱신했을 때는 `node scripts/sync-review-contract.mjs`로 첫 화면·지도·두 GeoJSON을 맞춘 뒤 `pnpm verify`를 실행합니다.

배포 절차와 롤백은 [DEPLOYMENT.md](./DEPLOYMENT.md), 출처·재배포 경계는 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)를 따릅니다.

## 외부 출처

- [USGS preliminary extent map](https://www.usgs.gov/media/images/2026-nepal-debris-avalanche-and-flash-flood-map)
- [Sentinel Asia activation and products](https://sentinel-asia.org/EO/2026/article20260826NP.html)
- [WHO Nepal health response](https://www.who.int/nepal/emergencies/2026-rasuwa-flash-floods)
- [Ai2 OlmoEarth embeddings](https://allenai.org/blog/olmoearth-embeddings)

이 저장소의 코드와 문서는 [Apache License 2.0](./LICENSE)입니다 — OlmoEarth를 공개한 Ai2와 같은 조건입니다. 단 `web/public/data/` 안의 제3자 파생 자산은 각자의 원 라이선스를 따릅니다: Planet 크롭은 CC-BY-NC-4.0(비상업), Sentinel 파생물은 CC-BY-4.0(ESA Copernicus 귀속), 지도 지오메트리는 ODbL(OSM). 상세는 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
