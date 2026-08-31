# OLMoEarth Planetary Response Stack — 연구·제품 확장안

기준 시각: 2026-08-29 14:28 KST
대상 사건: 2026-08-26 Rasuwa flash flood / rock–ice avalanche investigation
중심 원칙: **OLMoEarth는 공통 지표현과 후보 생성기다. 물리·보건·공식 보고를 대신하지 않는다.**

## 0. 결론

지금 만들 가치가 있는 것은 “재해를 맞히는 단일 AI”가 아니라 아래의 검증 가능한 response stack이다.

```text
TRIGGER             OBSERVE                 REPRESENT              TEST
USGS/GDACS/         Sentinel-1/2 + DEM      OLMoEarth core         r.avaflow / D-Claw
weather/field  ->   weather + roads    ->   second GeoFM      ->   sensor operator
reports             population/clinics     classical indices       counterfactuals
                                                                  |
                                                                  v
DECIDE              REVIEW                  IMPACT                 CANDIDATES
priority /      <-   analyst + official <-  access/WASH/       <-  source/change/
abstain             evidence                population/facility    runout/exposure
```

OLMoEarth는 이 스택에서 세 일을 맡는다.

1. 센서·시점·지역을 공통 768-d 표현으로 놓아 **변화 후보**를 만든다.
2. Nepal query와 유사한 과거 산사태 패치를 찾아 **analogue 후보**를 만든다.
3. raw pixel model과 달리 외부 지역에서 재사용 가능한 **frozen prior**를 제공한다.

다른 GeoFM, 물리모델, 인구·보건자료는 OLMo 입력 채널에 무리하게 삽입하지 않는다. 첫 구현은
late fusion과 candidate cascade이고, 동일 입력계약의 이득이 확인된 뒤에만 adapter/post-training으로 간다.

## 1. 무엇이 새로 확인됐는가

### 1.1 사건·보건

- WHO Nepal은 2026-08-26 홍수가 Bhote Koshi–Trishuli 회랑을 따라 Rasuwa, Nuwakot, Dhading,
  Chitwan, Gorkha, Tanahun에 영향을 줬다고 공개했다.
- WHO의 현재 잠정 집계에는 보건소 3곳 전파, 병원 1곳 부분 손상, 병원 2곳 접근 영향이 포함된다.
- 약 10,000가구의 즉시 구호 필요가 보고됐고, WHO는 약 10,000명을 3개월 지원하는 IEHK와
  미화 15만 달러 대응을 발표했다.
- WHO가 말하는 감염병 위험은 확진자 예측이 아니라, 이재·과밀·WASH 손상·의료 접근 단절에서
  생기는 **감시 우선순위**다. 따라서 앱도 “질병 발생 예측” 대신 “EWARS/현장 확인이 필요한
  접근·WASH 후보”를 내야 한다.

근거: <https://www.who.int/nepal/emergencies/2026-rasuwa-flash-floods>

### 1.2 최신 위성 계약

- 2026-08-29 05:26:55 UTC 공식 Copernicus 스냅샷에서 Sentinel-1 GRD 16개,
  Sentinel-2 L2A 31개를 확인했다.
- 08-28 Sentinel-1D는 공식 게시됐고 한 개 이상의 product footprint가 5개 operational anchor를
  모두 덮는다.
- 08-29 Sentinel-2C는 획득창은 지났지만 그 스냅샷 시각에는 `acquired_pending_catalog`다.
- 14:27 KST rslearn provider preflight를 다시 실행했으나 5/5 모두 08-24 장면을 선택했다.
  따라서 현재 action은 계속 `WAIT FOR PROVIDER SYNC`다. 대용량 download와 live embedding은 금지한다.

### 1.3 제품 선행사례가 주는 문법

- **EarthRanger**: source/observation/event/incident를 분리하고, 규칙 기반 alert와 사람 review를
  한 지도에서 닫는다.
- **Skylight**: 여러 센서의 detection은 analyst review 대상이며, 공개 데모에는 지연·제한이 있다.
  센서 한 개가 아니라 SAR/optical/VIIRS/RF의 후보 합의가 제품 가치다.
- **WFP PRISM**: hazard, food security, socioeconomic vulnerability를 같은 AOI에서 겹치고
  사용자가 요청한 단위로 on-demand 분석한다.
- **Copernicus EMS**: reference/delineation/grading, product version, delivery time, not-analysed area를
  제품 계약으로 둔다. 2026년에는 vector를 지도보다 먼저 공급하는 운영도 도입했다.
- **Google Earth AI / Planetary Prediction Engine**: 한 모델을 모든 문제에 쓰지 않고,
  지구표현·인구·공개 covariate와 leakage gate를 조합해 문제별 예측 파이프라인을 자동 구성한다.

우리의 차별점은 `rejected action`도 사건으로 저장하는 것이다. `PROVIDER_NOT_INDEXED`,
`CONTRACT_INVALID`, `NO_VISIBILITY`, `MODEL_DISAGREEMENT`는 숨길 실패가 아니라 운영 증거다.

## 2. OLMo에 다른 Earth model을 붙이는 다섯 방식

| 결합 | 설명 | 지금 판정 | 주 위험 |
|---|---|---|---|
| input replacement | 새 센서/생성 영상을 OLMo 입력처럼 넣음 | 금지에 가까움 | band/GSD/time 계약 위반 |
| adapter/post-training | 새 modality token 또는 LoRA/adapter 학습 | P2 연구 | aligned cube와 충분한 paired data 필요 |
| embedding late fusion | 각 모델 임베딩을 정규화 후 작은 head/gate로 결합 | **P0 권장** | 차원·scale·누락 처리 |
| candidate cascade | OLMo가 넓게 recall, 물리/다른 모델이 precision 보강 | **P0 권장** | 각 단계 오류 전파 |
| teacher/student | 여러 모델 합의를 작은 OLMo-side student에 증류 | P3 | teacher 오류·비용·license |

첫 실험은 OLMo를 중심으로 유지한다.

```text
OLMo candidates ∪ classical candidates
    -> second-GeoFM score
    -> physics-feasibility score
    -> exposure score
    -> evidence conflict / abstention
    -> analyst queue
```

모델 embedding을 단순 concatenate해 성능만 보는 것은 금지한다. 각 모델의 독립 기여는
leave-one-source-out ablation과 calibration으로 측정한다.

## 3. 후보 모델과 정확한 역할

### P0 — 지금 실행 가능

| 모델/자료 | 입력 강점 | Nepal 역할 | 비교 계약 |
|---|---|---|---|
| OLMoEarth v1 | S1+S2 다기간, 공통 embedding | 중심 변화·검색·frozen transfer | 현행 5-anchor/8-region |
| Presto | 가벼운 EO 시계열 | 동일 cube의 second-GeoFM control | exact month·normalization·same head |
| 고전 EO | NDWI, NBR, SAR log-ratio/coherence | 해석 가능한 저비용 baseline | 같은 mask·recall·AOI |
| DEM/OSM | slope, flow path, road/bridge/facility | 물리·노출 gate | snapshot/date/license 봉인 |

### P1 — 같은 사건에 붙일 가치가 큼

| 모델 | 강점 | 쓰는 방식 | 금지 주장 |
|---|---|---|---|
| Prithvi-HLS v2 | HLS 기반 temporal representation, flood segmentation 생태 | 광학 변화의 독립 encoder | OLMo와 다른 해상도/밴드를 같은 입력이라고 부르지 않음 |
| Clay v1.5 | wavelength·GSD·sensor metadata, S1/S2/다센서 | sensor-shift stress test, 신규 센서 adapter 비교 | “sensor agnostic” 문구만으로 KOMPSAT transfer 승인 금지 |
| TerraMind | 9 modality, any-to-any generation/TiM | missing modality proposal, semantic auxiliary | 생성 영상을 관측/ground truth로 표시 금지 |
| SatlasPretrain | 고해상도 객체·인프라 | bridge/road/building damage candidate | Sentinel 10 m 결과와 직접 동급 비교 금지 |
| AlphaEarth | 전지구 10 m annual embedding, population fusion 생태 | 연간 배경 context/장기 susceptibility | 사건 직후 near-real-time 변화모델로 부르지 않음 |

TerraMind generation은 “센서 시뮬레이션” 후보지만, 첫 버전은 생성 RGB가 아니라
`water/debris/visibility` semantic mask여야 한다. 생성 pixel은 provenance가 다른 synthetic evidence다.

### P2 — 대기·예측 신호

- Aurora 1.5/ECMWF/IMERG/GPM: 강수·토양수분·대기 forcing. EO 영상 encoder와 목적이 다르므로
  spatial residual로 결합한다.
- Google Flood Hub/GRRR/GloFAS: riverine/flash-flood prior와 river discharge 후보. 현 사건처럼
  rock–ice avalanche/temporary dam이 가능한 경우에는 단독 모델 결과를 원인으로 쓰지 않는다.
- Destination Earth Extremes DT: 고해상도 weather/hydrology scenario의 선행사례. Nepal에서 바로
  on-demand EU regional 모델을 쓸 수 있다는 뜻은 아니고, `forecast forcing → local impact model`
  제품 문법을 이식한다.

## 4. Candidate Factory

후보의 단위는 “지도 픽셀”이 아니라 다음 스키마를 가진 record다.

```json
{
  "candidate_id": "rasuwa-20260826-change-0001",
  "geometry": "polygon/multipolygon",
  "phenomenon": "debris|water|blocked-road|facility-access|source",
  "observed_at": "sensor acquisition time",
  "recorded_at": "pipeline time",
  "model_scores": {"olmo": null, "presto": null, "classical": null},
  "physics": {"feasible_fraction": null, "runout_rank": null},
  "exposure": {"population": null, "roads_km": null, "facilities": null},
  "evidence_grade": "O|M|P|H",
  "review_status": "new|triaged|corroborated|rejected|incident",
  "abstention_reason": null,
  "source_uris": [],
  "artifact_sha256": []
}
```

### 단계

| 단계 | 질문 | 출력 | 실패 시 |
|---|---|---|---|
| C0 Trigger | 어디를 볼까? | event AOI/scene queue | event only, no AI claim |
| C1 Observe | 실제 pixel이 있는가? | S1/S2/DEM visibility | wait/reject |
| C2 Represent | 일상변동보다 다른가? | OLMo Δ, retrieval, classical | candidate only |
| C3 Consensus | 다른 모델도 동의하는가? | agreement/conflict vector | abstain or rank down |
| C4 Physics | 지형·초기조건으로 가능한가? | feasible ensemble fraction | reject causal route |
| C5 Exposure | 무엇이 경로와 겹치는가? | roads/settlements/clinics/WASH | operational priority |
| C6 Corroborate | 독립 관측/보고가 있는가? | evidence grade H | incident/reject |

### 우선순위 점수

단일 magic score를 바로 만들지 않는다. UI에 다섯 축을 보존한다.

1. `change`: OLMo/classical/second-GeoFM 변화 점수와 calibration
2. `physics`: ensemble 중 관측과 일치한 비율
3. `exposure`: 사람·도로·시설과의 공간 교차
4. `freshness`: 관측 지연, provider 지연, 보고 지연
5. `evidence`: 독립 source 수, 충돌, 사람 검토 상태

정렬용 점수가 필요하면 monotonic weighted sum을 쓰되, score와 원축을 함께 표시한다.

## 5. 물리 시뮬레이션을 “보이게” 만드는 법

현재 Rust/WASM particle은 verified centerline을 따르는 UI animation이다. 이를 물리로 오해시키지
않으면서 세 단계로 승격한다.

### P-0 관측 가능한 시뮬레이션

- r.avaflow: release volume, basal friction, turbulence, water fraction을 Latin hypercube로 샘플.
- D-Claw: 상위/중위/하위 runout 시나리오 소수의 독립 확인.
- 산출물: depth처럼 보이는 예쁜 particle 대신 `arrival envelope`, `max runout`, `debris/water mask`,
  `uncertainty band`.
- 웹: WASM은 봉인된 ensemble의 surrogate만 재생하며, 사용자가 파라미터를 바꾸면 “계산됨/보간됨/
  범위 밖”을 표시한다.

### P-1 위성 observation operator

물리 output을 각 센서가 볼 수 있는 것으로 변환한다.

- S1: roughness/moisture/layover visibility mask, VV/VH 변화 후보
- S2: water/debris/exposed-ground semantic mask, cloud/snow visibility
- OLMo: predicted semantic mask 안팎의 embedding delta 분포

이렇게 해야 simulation과 관측이 같은 공간 단위에서 비교된다. 포토리얼 생성은 후순위다.

### 평가

- source localization error (m)
- runout IoU / boundary F1
- maximum-runout error (m)
- interval coverage / sharpness
- posterior rank calibration
- sensor-visible recall
- parameter-to-observation identifiability

## 6. 인간 영향·보건 렌즈

### 지금 만들 수 있는 것

1. **의료 접근 단절 후보**: 도로/교량 변화 polygon과 병원·보건소까지 network travel time의 전후 차이.
2. **시설 영향 후보**: WHO/HeRAMS 시설 상태와 위성/도로 증거를 join하되 현장 상태가 우선.
3. **WASH 감시 우선지역**: 침수/토석 후보 ∩ 정착지 ∩ 급수/위생 자산, EWARS 현장점검 queue.
4. **인구 노출 범위**: WorldPop을 polygon에 intersect하고 census/model 불확실성을 함께 제시.
5. **구호 경로**: 폐쇄 후보를 제외한 병원/대체진료소/물류창고 route와 도달시간 범위.

### 만들면 안 되는 것

- 위성영상으로 콜레라·설사·호흡기질환 환자 수를 직접 예측
- 개인·가구 위치, SNS 계정, 건강상태를 연결
- 검증 안 된 SNS 피해 숫자를 지도 합계에 넣음
- WorldPop 추정치를 현재 체류 인구의 정확한 수로 표시
- AI가 만든 facility status를 WHO/정부 공식 상태보다 우선시함

보건 모델의 올바른 label은 `disease predicted`가 아니라 `field verification priority`다.

## 7. SNS·뉴스·현장 타임라인

### 안전한 순서

1. WHO/정부/USGS/GDACS/CEMS/ReliefWeb API
2. 검증된 기관 계정의 공식 embed
3. 사용자가 등록한 공개 post URL
4. 미검증 public report — 별도 lane, 지도 좌표는 confidence와 함께

X 콘텐츠는 공식 embed/API로만 표시한다. post text/image를 복제 저장하지 않고 post ID/URL,
관측시각, 수집시각, 삭제 상태를 유지한다. embedded post는 cookie/consent 고지가 필요하며,
삭제·비공개 전환을 따라야 한다. 앱의 기본은 ReliefWeb/GDACS/공식 report이며 X는 보조 증거다.

타임라인 event schema:

```text
OBSERVED -> REPORTED -> CATALOGUED -> SELECTED -> SEALED ->
CANDIDATE -> CORROBORATED -> REVIEWED -> INCIDENT / REJECTED
```

## 8. Planetary/Environmental services로 확장

같은 엔진을 위험 종류마다 다시 쓰되, task별 observation/physics/impact adapter를 분리한다.

| 서비스 | Trigger | OLMo/EO 후보 | 물리·과학 | 인간 영향 |
|---|---|---|---|---|
| landslide/GLOF | 강우·빙하·보고 | debris/change/analogue | r.avaflow/D-Claw/hydrology | road/bridge/clinic |
| earthquake | USGS feed/ShakeMap | landslide/building/change | ground motion/slope | PAGER/facility/access |
| flood | forecast/gauge/GDACS | water extent/change | hydrology/inundation | population/WASH/food |
| wildfire | FIRMS/weather | burn scar/smoke/infrastructure | spread/weather | air quality/evacuation |
| forest/biodiversity | GFW/patrol | clearing/habitat/change | landscape connectivity | ranger/community action |
| maritime | AIS/SAR/optical | vessel/oil slick candidate | drift/current | enforcement/ecosystem |
| agriculture/drought | rainfall/soil/crop calendar | crop stress/phenology | weather/soil water | food-security exposure |

EarthRanger/Skylight처럼 탐지 결과를 incident가 아니라 reviewable candidate로 만든다는 공통 문법이
제품의 핵심이다. 국가별 “성취 지도”는 이 사건 앱에 얹지 않고 별도 Planetary Atlas로 분리한다.
공식 SDG/World Bank/Climate TRACE/GFW 같은 공개 지표와 intervention provenance를 쓸 수 있지만,
현재 Nepal response 앱의 의사결정 흐름을 흐리지 않아야 한다.

## 9. 실험 설계

### E0 — 현재 Nepal one-event descriptive

- 목표: valid post cube가 생기면 OLMo Δ가 historical placebo 범위를 넘는지 본다.
- 최소 20, 권장 30+ historical placebo.
- 대조: NDWI/NBR, S1 log-ratio, raw pixel encoder, Presto.
- 결과 단위: anchor, 2.56/5.12/10.24 km spatial block.
- 금지: one-event AUROC를 일반 재해 탐지 성능으로 확대.

### E1 — Candidate retrieval

- query: Nepal event mask 안의 OLMo delta prototype.
- gallery: Sen12Landslides 6,834 patches + non-event hard negatives.
- 지표: AP@K, recall@K, analyst minutes at matched recall, spatial duplicate-aware bootstrap.
- 평가자 blinded review. 같은 event/region leakage 제거.

### E2 — Cross-model consensus

arms:

```text
A0 classical only
A1 OLMo only
A2 Presto/Prithvi only
A3 OLMo + second GeoFM late fusion
A4 A3 + physics feasibility
A5 A4 + exposure priority + abstention
```

주지표는 event-level recall에서 `false candidate area + analyst minutes`다. 모델마다 다른 threshold로
편하게 이기지 않도록 matched recall 또는 동일 review budget을 쓴다.

### E3 — Physics posterior ranking

- prior ensemble을 관측 전 생성·봉인.
- sensor operator와 post-event mask의 likelihood로 순위화.
- 평가: top-k에 실제 runout이 포함되는지, interval coverage, max-runout error.
- OLMo 사용점: source proposal/analogue prior/semantic agreement. embedding을 물리 parameter로 직결하지 않음.

### E4 — Human impact triage

- pseudo-label 금지. 공식 facility status/road closure/field assessment만 label.
- 주지표: top-k facility/access candidate recall, time-to-first-action, false urgent alerts.
- subgroup: remote/urban, road density, cloud/snow, facility-data freshness.

## 10. 우선순위와 중단 기준

| 우선순위 | 작업 | 이유 | 중단 기준 |
|---|---|---|---|
| P0 | provider 5/5 sync → sealed Nepal Δ | 현재 가장 작은 live closure | scene 5/5 미선택 |
| P0 | Presto same-contract control | OLMo 고유효과 판정 | exact month/normalization 불일치 |
| P0 | candidate schema + review queue | 모든 서비스의 공통 제품 자산 | provenance 없는 candidate |
| P1 | 30+ placebo + retrieval 본실험 | one-event 자기기만 차단 | duplicate/leak 미해결 |
| P1 | r.avaflow ensemble + semantic operator | 물리와 위성의 닫힌 루프 | release/DEM 불확실성 미표현 |
| P1 | WHO/HeRAMS/WorldPop/road access lens | 실제 대응 질문과 연결 | 개인 건강 추론으로 변질 |
| P2 | Clay/Prithvi/TerraMind ablation | multi-model 확장 | OLMo main claim 지연 |
| P3 | physics surrogate in WASM | 인터랙티브 의사결정 | calibrated ensemble 없음 |
| P3 | X/public report lane | 현장 속도 보강 | consent/policy/provenance 미충족 |

## 11. 제품 한 문장

> **OLMoEarth가 새 위성 관측에서 변화·유사사건 후보를 만들고, 다른 지구모델과 물리 앙상블이
> 가능성을 교차검증하며, 도로·보건·인구 노출이 사람의 검토 순서를 정하는 증거 기반 planetary
> response system.**

이 문장은 “AI가 피해를 확정했다”가 아니라 “관측이 도착한 뒤 어디를 먼저 확인할지, 무엇을 아직
말하면 안 되는지, 어떤 추가 증거가 결정을 바꾸는지”를 제품 가치로 둔다.

## 12. 주요 1차 자료

- OLMoEarth fine-tuning: <https://docs.olmoearth.allenai.org/model-fine-tuning/>
- Google Earth AI: <https://research.google/blog/google-earth-ai-unlocking-geospatial-insights-with-foundation-models-and-cross-modal-reasoning/>
- Planetary Prediction Engine: <https://research.google/blog/planetary-prediction-engine-automating-global-models-via-earth-ai/>
- TerraMind: <https://github.com/ibm/terramind>
- Clay v1.5: <https://clay-foundation.github.io/model/getting-started/basic_use.html>
- NASA Prithvi: <https://science.nasa.gov/science-research/ai-foundation-model-in-orbit/>
- Google Flood Forecasting: <https://sites.research.google/gr/floodforecasting/>
- Microsoft Aurora: <https://www.microsoft.com/en-us/research/project/aurora-forecasting/>
- Destination Earth Extremes DT: <https://data.destination-earth.eu/extremes-dt>
- EarthRanger: <https://www.earthranger.com/>
- Skylight: <https://skylight.global/platform>
- WFP PRISM: <https://vamresources.manuals.wfp.org/docs/platform-for-real-time-impact-situation-monitoring>
- Copernicus EMS: <https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/product-overview/>
- WHO Rasuwa response: <https://www.who.int/nepal/emergencies/2026-rasuwa-flash-floods>
- WHO EWARS: <https://www.who.int/emergencies/surveillance/early-warning-alert-and-response-system-ewars/>
- WHO HeRAMS: <https://www.who.int/initiatives/herams>
- WorldPop disaster exposure: <https://www.worldpop.org/case_studies/measuring-populations-exposed-to-disasters/>
- ReliefWeb API: <https://apidoc.reliefweb.int/>
- USGS earthquake GeoJSON: <https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php>
- USGS ShakeMap/PAGER: <https://earthquake.usgs.gov/data/shakemap/> · <https://earthquake.usgs.gov/data/pager/>
- OCHA data responsibility: <https://centre.humdata.org/iasc-operational-guidance-on-data-responsibility-in-humanitarian-action/>
- X developer policy: <https://docs.x.com/developer-terms/policy>
