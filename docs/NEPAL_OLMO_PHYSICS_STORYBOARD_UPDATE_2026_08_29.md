# Nepal OLMoEarth live twin — 사건·관측·물리·스토리 재감사

기록 시각: 2026-08-29 KST

상태: **EVIDENCE LEDGER ACTIVE / LIVE EMBEDDING BLOCKED**

역할: CVPR 본 실험과 분리된 prospective operations·AI2 portfolio sidecar

## 1. 이번 결론

1. 2026-08-27에 Tibet에서 별도의 산사태가 다시 발생했다는 근거는 찾지 못했다.
   현재 가장 강한 설명은 08-26 02:52:10 UTC 네팔 영내 Langtang Lirung 북사면의
   rock–ice/glacial collapse가 초국경 debris-flow/flood를 만들었고, 같은 날 약 3시간 뒤 두 번째
   seismic landslide signal이 기록됐으며, 27–28일에는 그 여파로 생긴 barrier-lake 위험이
   보고·감시됐다는 것이다.
2. 08-28 Sentinel-1D는 publication delay가 아니었다. Copernicus에 인접 제품 2개가 게시됐지만
   AOI는 두 footprint 사이에 놓였다. 공식 지역 질의와 footprint containment 감사 결과는
   `regional_products=2`, `aoi_covering_products=0`, `status=missed_coverage`다.
3. 따라서 Nepal live OLMoEarth 결과는 아직 없다. 현재 계약은 anchor당 S1 3/4, S2 4/4이며
   `DO NOT EMBED`가 올바른 상태다. 다음 S1 후보는 08-31 00:07 UTC(09:07 KST)이며 실제 footprint
   containment를 다시 통과해야 한다.
4. OLMoEarth는 전후 표현 변화, source/change proposal, historical analogue retrieval에는 적용할 수
   있다. 원인·붕괴부피·유속·수심·도달시간을 직접 예측하는 물리모델은 아니다.
5. 현재 Rust/WASM 입자는 UI용 drainage-corridor animation이다. 과학적 확장은 상류
   r.avaflow v4 ensemble → D-Claw independent check → 정의된 cross-section hydrograph가 있을 때만
   LISFLOOD-FP/BASEMENT downstream stage로 분리한다.

## 2. 이전 Claude 계획의 계승과 정정

사용자가 제공한 `Live Twin — MapTiler 복원 + About 스토리 + 포인트 서사 연결` 계획에서 다음을
그대로 계승했다.

- MapTiler outdoor vector basemap과 key/network 실패 시 Esri raster fallback
- 2D 판독과 3D terrain 전환
- PRE/POST swipe, 점별 popup/story, Source Serif 기반 전면 스크롤 스토리
- observation / embedding / physics / human-review 레이어 분리
- claim boundary와 abstention을 화면의 기능으로 취급

다음 문장은 새 증거에 맞춰 폐기·정정했다.

| 이전 표현 | 판정 | 새 표현 |
|---|---|---|
| 22 km를 193 km/h로 이동 | 출처·계산 계약 불충분 | 속도 제거 |
| 발원지가 Tibet upper Lhende | 사실 오류 | Nepal-side Langtang Lirung source estimate |
| 27일 새 barrier-lake event | 인과 관계 혼동 | 26일 붕괴의 secondary hazard |
| 8/27 AOI clear | SCL 없음 | visually interpretable; B02-bright heuristic는 cloud classifier가 아님 |
| structures are gone | 픽셀만으로 검증 불가 | apparent channel widening / altered reflectance |
| 8/28 S1이 lake 위치를 고정 | footprint miss | 관측 실패를 `MISSED COVERAGE`로 기록 |
| M66이 같은 protocol transfer를 증명 | 계약 혼합 | related S2-only pilot; Nepal S1+S2 검증 아님 |

## 3. 사건 사실 대장

| 시각 UTC | 사건 | 현재 판정 | 출처 |
|---|---|---|---|
| 08-26 02:52:10 | M5.2-equivalent initial signal | Nepal-side rock–ice/glacial collapse가 leading assessment | [USGS](https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood) |
| 08-26 약 +3 h | M4.2-equivalent second signal | 같은 날의 secondary landslide signal; 27일 Tibet 별도 사건 근거 아님 | [USGS](https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood) |
| 08-27 | barrier lake reported | 26일 사건의 aftermath; 공개 exact coordinate 미확정 | [AP](https://apnews.com/article/nepal-lake-china-flood-tibet-climate-5086eb25e29b23019632f7817739f807) |
| 08-28 | lake draining, monitoring continues | 위험 감소 신호이나 2차 위험 종료 선언 아님 | [China State Council](https://english.www.gov.cn/news/202608/28/content_WS6a91259dc6d00ca5f9a0cd54.html) |

보조 출처: [China Geological Survey](https://www.cgs.gov.cn/ywdt/ddyw/202608/t20260828_867531.html),
[ICIMOD](https://www.icimod.org/press-release/major-flash-flood-sweeps-through-nepals-rasuwa-district-raising-fears-of-further-downstream-flooding/),
[Copernicus EMSR927](https://mapping.emergency.copernicus.eu/activations/EMSR927/),
[International Charter 1052](https://disasterscharter.org/activations/flood-in-nepal-activation-1052-).

금지 표현은 `earthquake-triggered`, `confirmed GLOF`, `second Tibet landslide on 27 Aug`,
`climate-caused`다. 각각 현재 증거가 지지하는 범위를 넘는다.

## 4. 관측 계약과 최신 데이터

### 4.1 Sentinel-2

- S2B 2026-08-27 04:56:59 UTC L2A는 09:33:39 UTC에 게시됐다.
- tile cloud는 78.471315%다. AOI cloud-free 비율이 아니다.
- Rasuwagadhi B02-bright fraction은 2.5%지만 SCL이 없고 snow/cloud를 분리하지 못한다.
- 사건 후 광학 픽셀은 존재하고 여러 하류 창이 시각적으로 판독 가능하다. 발원 수색 창은
  cloud/snow로 방출흔 독립 판독이 불가능하다.

### 4.2 Sentinel-1

08-28 지역 제품 감사:

- south product: `641ccb0b-5d88-4c44-b558-93b488cd2453`, latitude bounds
  `26.082081–28.008425`
- north product: `ba5bd475-51ef-46d7-b7f4-c45b72120876`, latitude bounds
  `29.112562–31.029703`
- source AOI latitude: `28.2765`
- 결론: 인접 제품은 게시됐지만 어느 footprint도 AOI를 포함하지 않았다.

봉인 산출물:

- `artifacts/external_data/nepal_olmo_live_v1/catalog/20260828T151656Z/`
- `artifacts/external_data/nepal_olmo_live_v1/coverage/20260828T152324Z/coverage_audit.json`
- coverage seal SHA-256: `9b12e49600d5931712f283b31cecd05d668a91a2275f6b5118073a19cbfaef40`

다음 후보:

- S2C: 08-29 04:47–05:04 UTC (13:47–14:04 KST)
- S1D: 08-31 00:07–00:13 UTC (09:07–09:13 KST)
- S2A: 08-31 04:52–05:04 UTC

계획 궤도는 usable coverage 보장이 아니다. 매번 catalogue → regional products → footprint
containment → provider selection → exact-period materialization → seal 순서로 판정한다.

## 5. OLMoEarth 적용 범위

| 기능 | 지금 가능? | 필요한 입력/검증 | 주장 경계 |
|---|---:|---|---|
| 사건 전 baseline embedding | 예 | 5 anchor × S1+S2 × 4 periods, seal valid | 사건 전 상태 표현 |
| 전후 temporal Δz | 아니오 | post S1 4/4 + S2 4/4, 5/5 seal | 그전에는 event delta 없음 |
| 유사사례 retrieval | 인프라 가능 | sealed Nepal query + SEN12 archive | analogue 후보, 인과/피해 동일성 아님 |
| source/change proposal | 조건부 | S1/S2/classical change + DEM | physics ensemble의 후보 입력 |
| pre-event landslide forecasting | 현재 부정 | M67 LOCO AUROC 0.533–0.606 | susceptibility `not detected` |
| runout/depth/time | OLMo 단독 불가 | DEM·source volume·material·hydrology + physics solver | embedding→velocity/friction 직접 매핑 금지 |

M66 선행 결과는 Hokkaido AUROC 0.853, Hiroshima 0.952, Dominica 0.605다. 그러나
S2-only pre4/post4 pilot이고 Dominica placebo는 12 patch뿐이다. Nepal S1+S2 live contract의
외부 검증으로 승격하지 않는다.

M67 pre-event LOCO susceptibility는 OLMoEarth 0.582/0.606/0.533, raw 0.609/0.581/0.566이며
세 지역 모두 `not detected`다. 이것은 실패가 아니라 “현재 OLMoEarth로 landslide 발생 가능성을
예측한다”는 카피를 막는 중요한 negative control이다.

## 6. OLMoEarth × 물리 모델 결합

권장 계산 그래프:

```text
Sentinel-1/2 + DEM + inventory
          │
          ├─ classical change / masks
          └─ OLMoEarth embeddings → source/change/material-zone proposals
                                      │
                                      ▼
                         r.avaflow v4 ensemble (128–256 runs)
                                      │
                          D-Claw independent check
                                      │
                         cross-section hydrograph
                                      │
                  LISFLOOD-FP or BASEMENT downstream stage
                                      │
                  CEMS / Charter / USGS / field adjudication
```

- primary: [r.avaflow v4](https://gmd.copernicus.org/articles/18/9879/2025/)
- independent solver: [USGS D-Claw](https://claw.code-pages.usgs.gov/dclaw/)
- downstream: [LISFLOOD-FP 8.1](https://zenodo.org/records/6912932) 또는
  [BASEMENT 4.2](https://basement.ethz.ch/download/software-download.html)
- high-resolution terrain candidate: [High Mountain Asia 8 m DEM](https://nsidc.org/data/documentation/high-mountain-asia-8-meter-dems-derived-along-track-and-cross-track-optical-imagery)

브라우저는 precomputed COG/PMTiles/Parquet의 median/p90/p95 envelope를 재생한다. Rust/WASM은
quantile interpolation·animation을 맡고 mass-flow solver를 브라우저 안에서 흉내내지 않는다.

## 7. 유의미한 평가

| arm | 구성 |
|---|---|
| A0 | raw EO review |
| A1 | classical pre/post change |
| A2 | OLMoEarth temporal delta |
| A3 | gate-aware OLMoEarth + abstention |
| A4 | A3 + independent sensor / physics corroboration |
| A5 | A4 + human/official review |

주 비교는 A1 vs A3다. OLMoEarth를 넣었을 때 단순 성능만이 아니라 **같은 recall에서 invalid
action과 analyst minutes가 줄어드는가**를 operational headline으로 둔다.

- observation: AOI coverage correctness, catalogue latency, provider lag, invalid-action rate
- change: event-wise AUPRC/AUROC, source localisation error, false changed area
- runout: runout IoU, false-inundated area, maximum-runout error
- uncertainty: Brier/CRPS, interval coverage, abstention-coverage curve
- protocol: leave-one-event-out; CEMS/Charter/USGS는 untouched external adjudication

## 8. 앱/storyboard v3

스토리는 Snow Fall식 immersion과 Upshot식 설명형 도해, Economist식 claim-near-source 원칙을
합쳐 다음 순서로 재구성했다.

1. **One event. Many clocks.** — 사건과 현재 한계
2. **Evidence now** — O/E/P/H 4계층 상태
3. **Event clock** — 27일 별도 Tibet 사건 오독 해소
4. **Corridor** — 수계는 inspection route이지 flood polygon이 아님
5. **Optical view** — PRE/POST swipe와 cloud/SCL 경계
6. **Gaps** — cloud-obscured source와 08-24 radar purple 설명
7. **OLMoEarth** — Nepal blocked / M66 pilot / M67 negative control 분리
8. **Physics coupling** — OLMo proposes, physics propagates
9. **The test** — A0–A5와 metrics
10. **Claim boundary** — abstention
11. **Next clock** — 08-28 missed footprint와 08-31 gate
12. **Ledger** — 모든 물질화 장면과 공식 링크

화면 고정 문장:

> Research integration of OlmoEarth representations with EarthRanger-style incident provenance and
> Skylight-style observation awareness; not an official Ai2 disaster product.

## 9. 다음 실행

1. 08-29 S2C는 optical context/visual update로만 처리한다. S1 결손을 채우지 않으므로 이것만으로
   OLMo cube를 seal하지 않는다.
2. 08-31 S1D는 먼저 regional footprint containment를 감사한다. cover 0이면 즉시 abstain하고
   materialization을 실행하지 않는다.
3. cover 1+일 때만 5/5 anchor selection preflight → exact 4+4 materialization → seal을 수행한다.
4. seal 뒤에도 placebo 2개로 percentile anomaly를 만들지 않는다. 첫 Δz는 descriptive candidate
   map이며 최소 20개, 권장 30개 historical placebo 뒤에 threshold를 동결한다.
5. physics는 별도 experiment ID로 열고 A0–A5 protocol과 external polygons를 먼저 동결한다.
6. CVPR 본선의 Presto C1/Korea transfer/GPU queue는 이 sidecar 때문에 변경하지 않는다.

## 10. 08-29 공간·스토리 정정

- 앱의 사건 사슬을 `E source → D secondary hazard → A impact / B checkpoint → F Bidur`로
  고정했다. C는 사건 밖 negative control로 별도 표기한다.
- 발원 E는 red, A는 orange, B는 yellow, D는 purple, F는 blue, C는 gray로 분리했다.
- Bidur 영상 공백은 데이터 부재가 아니라 MGRS tile-boundary 조회 결함이었다. 인접 `45RUL`에서
  2026-08-12와 2026-08-27 실제 S2 L2A 창을 회수했다.
- OLMo 패널은 Nepal live `WAIT S1`만 강조하지 않고, 5-anchor baseline과 8-region confirmatory
  transfer(6/8 wins, 0.272 vs 0.197)를 함께 표시한다.
- 단, confirmatory 결과는 OLMo reuse 대 raw baseline이다. Presto 같은 두 번째 GeoFM 통제 전에는
  OLMo-specific superiority로 승격하지 않는다.
- 상세 실행·평가·우선순위는 `docs/NEPAL_AI2_IMPACT_ENGINEERING_ROADMAP_2026_08_29.md`에 봉인했다.

## 11. 14:15 KST 최신 관측 정정 — §1·§4·§9의 08-28 판정을 supersede

- 08-29 05:11:48 UTC 공식 카탈로그 재조회에서 08-28 Sentinel-1D 제품이 뒤늦게 확인됐다.
- coverage audit를 source 단일 점에서 operational 5-anchor 전체로 강화했다. 6개 지역 제품 중
  2개가 5/5 anchor를 모두 덮었다. 따라서 과거 `missed_coverage`는 당시 스냅샷 기록으로만
  보존하고 현재 판정은 `operational_anchors_covered`다.
- rslearn provider selection은 여전히 08-24 장면을 골라 08-28 required match가 0/5다.
  대용량 다운로드는 거부했다. 현재 next gate는 08-31 위성 대기가 아니라
  `WAIT FOR PROVIDER SYNC → 08-28 selection 5/5 → materialize → seal → embed`다.
- 08-29 S2C는 관측창 종료 직후 snapshot에서 `acquired_pending_catalog`; 아직 장면으로 쓰지 않는다.
