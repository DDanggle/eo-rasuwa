# Nepal OLMoEarth Evidence Operations — 독립 감사와 제품·연구 승격안

기준 시각: **2026-08-28 15:37 KST**. 이 문서는 `c5872b6`의 운영 피드·AOI 관측성·검색 지표를
원 산출물과 독립 대조하고, EarthRanger·Skylight·Copernicus EMS·NASA FIRMS·Global Nature
Watch의 공식 운영 문법을 OLMoEarth 중심 시스템으로 재구성한 결과다.

## 결론부터

현재 데모는 **좋은 evidence ledger이지만 아직 event-intelligence 결과는 아니다.** 실물 상태는
Sentinel-2 post-event 픽셀이 5/5 앵커에 선택됐지만, OLMoEarth cube는 S1 3/4·S2 4/4라 봉인에
실패했다. 따라서 지금의 올바른 결정은 `DO NOT EMBED`이고, 허용 문장은 “post-event 픽셀이
있다”까지다. **OLMoEarth가 변화를 봤다**, **피해를 탐지했다**, **AOI가 clear다**는 문장은 아직
허용되지 않는다.

이 차단은 실패가 아니라 현재 포트폴리오에서 가장 AI2다운 기능이다. 다만 차단 화면만으로
논문이 되지는 않는다. 연구 기여는 여러 사건에서 이 게이트가 (a) 잘못된 계산·경보를 얼마나
줄이고, (b) 유효한 후보를 얼마나 빨리 만들며, (c) 분석가 검토량을 얼마나 줄이는지를 비교해야
생긴다.

## 1. 독립 감사 — 유지·정정·차단

| 항목 | 실물 판정 | 연구·서비스 처리 |
|---|---|---|
| 08/27 S2B | CDSE 게시, provider selection 5/5 통과, S2 4/4 | **관측 O는 존재** |
| live OLMo cube | 5 앵커 모두 S1 3/4·S2 4/4, manifest `valid=false`, 81파일 | **E 계산 금지** |
| baseline/placebo | baseline·placebo A·B 각각 91파일, manifest `valid=true` | 입력 자산은 유효하지만 placebo 2개뿐 |
| AOI 밝은 픽셀 | B02 > 2600 DN: Rasuwagadhi 2.52%, Timure 5.66%, Syabrubesi 8.63% | **밝기 진단**만. cloud-free 추정 금지 |
| tile cloud | 제품 metadata 78.471315% | tile 평균이며 2.56 km AOI 구름률 아님 |
| OLMo embedding/delta | 산출물 0건 | `BLOCKED`, candidate heatmap도 아직 없음 |
| M17 P@10 | base .370 / raw .432 / whole .452 / masked .538 | 사전 gate 실패를 포함해 유지 |
| M17 기존 AP@100 | raw .425 / whole .503 / masked .553 | **철회**. top-100에서 찾은 양성 수를 분모로 쓴 비표준 AP |

`AP@100` 구현은 표준 `min(전체 relevant 수, 100)` 분모와 `Recall@100`을 분리하도록 고쳤고,
회귀 테스트 4개를 추가했다. 재실행 전에는 새 AP 수치를 쓰지 않는다. P@10 및 사전등록 kill
gate에는 영향이 없다.

## 2. 다른 운영 시스템에서 정확히 이식할 것

### EarthRanger — event가 아니라 incident와 history

EarthRanger의 event feed는 타입·우선순위·좌표·발생시각과 생성시각을 구분하며, 여러 event를
하나의 incident로 묶고 수정·첨부·노트를 history에 남긴다. 우리 OPERATIONS LOG도 단순 로그가
아니라 아래 구조를 가져야 한다.

- `observed_at`과 `recorded_at`을 분리한다.
- `candidate` 여러 개를 하나의 `incident_id`로 묶는다.
- 모델 재실행·사람 판정·공식 polygon 도착을 덮어쓰지 않고 `supersedes` 이력으로 남긴다.
- 좌표·scene·embedding·review를 incident dossier 한 장에서 재생한다.

공식 참고: [EarthRanger events](https://support.earthranger.com/en_US/Events),
[reports and incidents](https://support.earthranger.com/en_US/reports-incidents),
[EarthRanger platform](https://www.earthranger.com/).

### Skylight — detection보다 schedule·review·feedback

Skylight의 강점은 다중 센서 이벤트 자체보다 관측 지연·소스 한계·예정 관측을 함께 보여주고,
detection을 analyst review와 사용자 feedback으로 연결하는 데 있다. 우리 시스템에는 다음이 바로
이식 가능하다.

- 다음 S1/S2 pass와 경험적 publication window를 **coverage schedule**로 표시한다.
- `CATALOGUED → SELECTED → SEALED` 각 단계의 지연을 source-health 그래프로 낸다.
- 모든 후보에 `confirm / reject / unsure / request imagery` 검토 버튼과 사유 코드를 둔다.
- offline benchmark와 live analyst audit을 분리하고, false alert를 다음 calibration에 되먹인다.
- 경보는 poll마다가 아니라 **상태 전이**와 후보 score의 사전등록 임계 통과 때만 보낸다.

공식 참고: [Skylight events](https://support.skylight.global/en_US/events/what-are-events),
[capability and latency](https://support.skylight.global/en_US/capabilities/review-of-capabilities),
[satellite schedules](https://support.skylight.global/en_US/capabilities/previewing-satellite-schedules),
[precision and recall](https://support.skylight.global/en_US/ai-for-maritime-surveillance/precision-and-recall).

### Copernicus EMS — 빠른 초판과 단계별 제품 버전

CEMS Rapid Mapping은 first estimate, delineation, grading을 한 장의 확률지도처럼 섞지 않고 제품
단계와 버전으로 나눈다. Nepal 화면도 다음 네 버전을 명시해야 한다.

1. `FEP`: 빠른 사건 범위 추정 — 공식·뉴스 기반, OLMo 결과 아님.
2. `CANDIDATE`: 봉인된 OLMo delta/place retrieval — 피해 polygon 아님.
3. `CORROBORATED`: SAR/광학·physics·다른 탐지기의 독립 일치.
4. `REVIEWED`: 사람 또는 공식 출처가 판정한 incident.

부분 제품은 낼 수 있지만 입력 품질과 한계를 명시하고 다음 버전이 이전 버전을 대체하는 계보를
보존한다. SAR의 산림·급경사 한계도 결과별 disclaimer로 붙인다.

공식 참고: [Rapid Mapping portfolio](https://mapping.emergency.copernicus.eu/about/rapid-mapping-portfolio/),
[product delivery](https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/product-overview/what-is-delivered-in-a-product/),
[SAR disclaimer](https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/product-overview/what-is-delivered-in-a-product/map/map-marginalia/disclaimer/).

### Global Nature Watch·FIRMS — 반복 관측과 독립 증거의 confidence

Global Nature Watch의 integrated alerts는 한 시스템의 첫 신호를 확정으로 부르지 않고, 반복
관측과 독립 시스템이 더해질수록 confidence를 올려 현장 확인 우선순위를 만든다. FIRMS도 NRT와
science-quality 산출물을 구분하고 지연·결측 가능성을 운영 계약에 포함한다. 우리도 OLMo score
하나를 피해 확률로 바꾸지 말고 `single-source → repeated → cross-sensor → human` evidence
ladder를 사용한다.

공식 참고: [integrated disturbance alerts](https://globalnaturewatch.org/blog/data-and-tools/integrated-deforestation-alerts/),
[Forest Watcher](https://watcher.globalforestwatch.org/),
[NASA FIRMS NRT overview](https://www.earthdata.nasa.gov/s3fs-public/2023-03/FIRMS_OnePager_2022_Prnt-Web.pdf).

## 3. 목표 제품 구조

```text
SCHEDULED
    ↓ acquisition
CATALOGUED
    ↓ provider selection
SELECTED
    ↓ 5/5 anchors × 4 periods × S1/S2 + hashes
SEALED
    ↓ OLMoEarth v1 inference
EMBEDDED
    ↓ placebo-calibrated Δz / retrieval
CANDIDATE
    ↓ independent sensor · physics · official evidence
CORROBORATED
    ↓ analyst decision
REVIEWED → INCIDENT → CLOSED / REOPENED
```

핵심은 O/E/P/H 네 레이어가 위 상태기계와 독립이라는 점이다.

- O는 관측이므로 `SEALED`까지 갈 수 있다.
- E는 OLMo 산출물이므로 `CANDIDATE`까지만 자동 승격한다.
- P는 물리적 가능성 제약이지 E의 확률 보정값이 아니다.
- H만 incident의 최종 판정과 사유를 가진다.

### Evidence dossier 최소 스키마

| 범주 | 필수 필드 |
|---|---|
| 사건 | `incident_id`, `event_type`, AOI, `observed_at`, `recorded_at`, priority |
| 장면 | provider, product ID, acquisition/publication, orbit, bands, tile cloud, AOI SCL/CLD, valid fraction |
| 계약 | anchor/period/modality counts, manifest SHA, input checksums, fail reason |
| 모델 | release, checkpoint SHA, code snapshot, embedding SHA, pooling/normalization |
| 후보 | Δz, placebo rank, Recall/P@K, nearest examples, uncertainty, abstention reason |
| 독립 증거 | SAR/optical agreement, physics envelope, official/human polygon |
| 검토 | decision, reason code, reviewer, time, action, feedback target |
| 계보 | version, `supersedes`, source URI, immutable artifact URI |

## 4. 구현 우선순위

### P0 — 정확성: 이번 감사에서 구현 완료

- UI의 `OLMo READY`를 selection이 아니라 materialization seal까지 보도록 고쳤다.
- 현재 결정을 상단에 `DO NOT EMBED`로 고정하고 S1 3/4·S2 4/4 이유와 다음 gate를 노출했다.
- bright-pixel complement를 `clear`라 부르지 않고 `not_bright_frac_of_valid`로 교정했다.
- M17 비표준 AP를 철회하고 표준 AP@K·Recall@K와 단위 테스트를 추가했다.
- ops event에 event ID·관측/기록 시각·근거 URI를 넣었다.

### P1 — 다음 제품 승격

1. **AOI cloud sidecar**: Sentinel-2 SCL과 CLD/SNW probability를 AOI별로 저장한다. MAXCC/tile
   cloud를 viewport 구름률로 쓰지 않는다. [S2 L2A classes](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html),
   [Statistical API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html).
2. **Incident dossier drawer**: 지도 후보를 누르면 scene→seal→model→corroboration→review 이력을
   한 화면에 연다.
3. **Review queue**: confirm/reject/unsure/request imagery와 reason code, reviewer agreement를
   수집한다.
4. **Source health**: acquisition→catalog→provider→materialization→embedding 각 지연과 실패율을
   센서별로 그린다.
5. **Pair validity**: S1 relative orbit·direction이 다르거나 S2 cloud/snow가 높으면 delta를
   계산하지 않고 `ABSTAIN`한다.
6. **시각 문법**: S1은 grayscale·orbit badge, S2는 true/false color recipe badge, model
   heatmap은 별도 범례와 uncertainty hatch를 강제한다.

### P2 — 논문이 되는 실험

한 사건 UI가 아니라 아래 다섯 arm을 같은 사건·같은 데이터 컷오프에서 비교한다.

| arm | 설명 |
|---|---|
| A0 raw feed | 카탈로그와 장면만, 모델 없음 |
| A1 naive latest | 최신 장면을 계약·placebo 없이 바로 비교 |
| A2 OLMo-only | 봉인은 하지만 single delta score만 사용 |
| A3 gate-aware OLMo | 봉인·pair validity·placebo·abstention 포함 |
| A4 proposed | A3 + 독립 sensor/physics + human review loop |

주지표는 `time-to-first-valid-candidate`, invalid-action rate, 사건 후보 precision/recall,
analyst review 수/사건, false alerts/주, calibration·abstention, compute/storage/latency다. 최소 세
historical calibration event와 한 untouched prospective event가 필요하다. 2015 Langtang, 2024
Thame, 2025 Rasuwagadhi는 **후보**이며 동일한 공개 장면·라벨·cutoff를 확보한 뒤에만 cohort로
확정한다.

## 5. 오늘 밤 실행 규칙

예정된 S1D 획득은 **2026-08-28 21:19 KST 전후**, 지난 60일 경험적 게시 window는 대략
23:28 KST–08/29 01:14 KST다. 이는 보장이 아니라 polling 범위다.

1. immutable catalog snapshot을 새로 만들고 product ID·publication time을 봉인한다.
2. provider가 5/5 앵커에 장면을 선택하기 전에는 materialize하지 않는다.
3. S1·S2 각각 exact 4 periods와 5/5 anchor, bands·CRS·hash를 모두 통과해야 `SEALED`다.
4. 같은 서버 환경·봉인된 code snapshot으로 v1 embedding을 만든다.
5. baseline/placebo A/B/live 네 cube의 입력·벡터 SHA를 묶어 저장한다.
6. placebo가 두 개뿐이므로 **95 percentile anomaly는 계산하지 않는다.** 첫 결과는 descriptive
   rank와 `candidate representation change`만 쓴다.
7. anomaly flag를 열기 전에 label-independent historical placebo를 최소 20개, 가능하면 계절·궤도
   층화 30개 이상 확보하고 기준을 다시 동결한다.
8. OLMo 후보가 생긴 뒤에만 physics runout을 조건부로 실행하며, 두 score를 곱해 damage
   probability처럼 표시하지 않는다.

## 6. 세 목표에 대한 냉정한 판정

| 목표 | 현재 가치 | 승격 조건 |
|---|---|---|
| AI2 취업 | **강함** — rslearn 입력계약·fail-closed·provenance·live data ops가 직접 연결 | 실제 sealed embedding과 검토 가능한 dossier 1건 |
| 박사/CVPR | **아직 약함** — 한 사건의 ledger/heatmap은 method가 아님 | multi-event A0–A4 비교와 analyst-burden/validity 유의 개선 |
| 비즈니스 | **문장 생김** — 위험 예측기가 아니라 증거 triage와 SLA | source latency·false alert·review time을 실제 운영 KPI로 측정 |

가장 강한 논문 후보 문장은 다음이다.

> **Delayed and heterogeneous EO observations에서 contract-aware OLMoEarth event memory가
> invalid inference를 거부하고, 독립 증거와 human review를 통해 더 적은 검토 비용으로 더 빠른
> valid candidate를 만드는가?**

이 주장은 OLMoEarth가 scratch model보다 좋다는 당연한 비교, 혹은 한 재해를 탐지했다는 과장보다
훨씬 강하다. 실패해도 어떤 gate가 시간·coverage·오경보를 지배했는지가 측정 논문으로 남는다.

## 7. 현재 GO / HOLD / NO-GO

| 작업 | 판정 | 이유 |
|---|---|---|
| S2 08/27 시각 비교 | **GO** | 관측 픽셀과 provenance 존재 |
| AOI cloud-free 주장 | **NO-GO** | SCL/CLD가 없고 B02 bright는 cloud classifier가 아님 |
| OLMo live embedding | **HOLD** | S1 3/4, seal invalid |
| Δz heatmap | **HOLD** | embedding 0건 |
| 95% anomaly | **NO-GO** | placebo 2개로 percentile 정의 불가 |
| descriptive candidate delta | **GO after seal** | 표현 변화까지만 허용 |
| 피해·원인 확정 | **NO-GO** | H 레이어 없음 |
| product demo | **GO** | decision gate와 provenance가 핵심 기능 |
| CVPR method claim | **HOLD** | multi-event·ablation·human-effort 평가 필요 |
