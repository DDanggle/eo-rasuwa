# Nepal AI Twin — Rasuwa 2026 × OlmoEarth

> 새 세션은 [`RESTART_HERE.md`](./RESTART_HERE.md)부터 읽습니다. 대용량 연구 원본과 중간
> 산출물은 Git에서 제외한 `research-private/`에 있고, 경로 계약은
> [`docs/RESEARCH_STORAGE.md`](./docs/RESEARCH_STORAGE.md)에 있습니다.

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
| `docs/MEASURED_FINDINGS_full.md` | M66–M85 측정·반증·정정 기록 |
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

- 6곳이 실제 피해라는 주장. 현재 확정 피해 라벨은 0개입니다.
- 13.3%를 피해 면적이나 발생 확률로 해석하는 것.
- 물리 시뮬레이션으로 수심·유속·도달시간을 예측했다는 주장. Rust/WASM 입자는 OSM 중심선을 따르는 **설명용 운동학 시각화**입니다.
- OlmoEarth가 모든 GeoFM보다 우월하다는 주장. Prithvi·Clay·TerraMind는 같은 계약에서 실행하지 않았습니다.
- 네팔 1개 사건의 지형 상관을 일반 위험 모델로 확장하는 것.

USGS는 2026년 8월 27일 잠정 산사태·홍수 범위 지도를 공개했고, Sentinel Asia는 8월 28일 Sentinel-1 피해 프록시와 Planet 기반 부가 산출물을 게시했습니다. 다음 과학 관문은 이 외부 범위를 동결한 뒤, 현재 순위·문턱을 바꾸지 않고 precision@k를 계산하는 것입니다.

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

코드 저장소 자체의 오픈소스 라이선스는 아직 선언하지 않았습니다. 라이선스 파일을 추가하기 전에는 제3자의 재사용 권한을 암시하지 않습니다.
