# Nepal OLMoEarth impact engineering roadmap

기록 시각: 2026-08-29 KST

역할: Nepal prospective sidecar / AI2 portfolio / physics-fusion experiment

상태: **관측 사슬 확장 · 공식 S1 5/5 footprint 통과 · rslearn provider 동기화 대기 · 물리 결합 설계 완료/미실행**

## 0. 한 문장 주장

> 사건을 예언했다는 데모가 아니다. 발원 추정지에서 하류까지 어떤 위성 증거가 실제로
> 존재하는지 봉인하고, OLMoEarth가 만든 변화·유사사례 후보를 물리 앙상블과 독립 관측으로
> 반증하여 분석가의 탐색 시간을 줄일 수 있는지를 시험한다.

이 문장 밖의 `confirmed damage`, `forecast`, `flood depth`, `arrival time`, `physics-validated`는
현재 앱에서 주장하지 않는다.

## 1. 사건 공간 문법 — A/B/C 오독 종결

| 순서 | ID | 역할 | 색 | 현재 증거·경계 |
|---:|---|---|---|---|
| 1 | E | Langtang Lirung 발원 수색점 | red | rock–ice/glacial collapse의 최선 공개 추정점. 현장 측량 release polygon 아님 |
| 2 | D | barrier-lake 수색구역 | purple | aftermath의 2차 위험. exact footprint 미공개이므로 점 자체가 호수 경계가 아님 |
| 3 | A | Rasuwagadhi 충격 관측창 | orange | 전후 위성 비교의 중심. 붕괴 원점 아님 |
| 4 | B | Gyirong 국경 검문소 | yellow | 사람·기반시설 노출 검토 기준점. A와 인접하지만 별도 역할 |
| 5 | F | Trishuli/Bidur 하류 관측창 | blue | 실제 Sentinel-2 전후 장면을 회수한 하류 observation point |
| Ø | C | Rishing 음성 대조군 | gray | A에서 약 114 km, 사건 회랑 밖. 평상 변화를 추정하는 placebo이며 종점 아님 |

인과선은 `E → D → A/B → F`다. C는 이 선에 그리지 않는다.

## 2. 이번에 새로 닫은 Bidur 관측 공백

기존 카탈로그는 Rasuwagadhi가 속한 MGRS `45RUM`만 조회했다. 이 타일의 남쪽 경계는
Bidur보다 바로 북쪽이어서 “Bidur 영상 없음”처럼 보였다. Planetary Computer STAC를 Bidur
bbox로 다시 조회하자 인접 타일 `45RUL`에서 두 장면이 발견됐다.

| 용도 | Sentinel-2 L2A item | 시각 | tile cloud |
|---|---|---|---:|
| PRE | `S2C_MSIL2A_20260812T045701_R119_T45RUL_20260812T100317` | 2026-08-12 | 27.947% |
| POST | `S2B_MSIL2A_20260827T045659_R119_T45RUL_20260827T084453` | 2026-08-27 | 54.287% |

앱은 동일 중심·동일 2.56 km·동일 256×256 규격으로 true-colour COG를 잘라 전후 창을 표시한다.
POST에서 보이는 하천 폭·색조 변화는 **관측 후보**이며, cloud/atmosphere/수위/토사 영향을
분리한 피해 라벨은 아니다. 이 두 장면은 아직 봉인된 OLMo 5-anchor 입력계약에 넣지 않는다.

재현 산출물:

- `apps/nepal-olmo-gis/python/materialize_bidur_visual.py`
- `apps/nepal-olmo-gis/public/data/bidur-visual-audit.json`
- `apps/nepal-olmo-gis/public/data/story/anchors/bidur_pre.png`
- `apps/nepal-olmo-gis/public/data/story/anchors/bidur_post.png`

### 2.1 14:15 KST live update

- Copernicus snapshot `20260829T051148Z`에서 08-28 Sentinel-1D 제품 게시를 확인했다.
- 단일 AOI 점이 아니라 5개 operational anchor를 전부 검사하도록 coverage audit를 수정했다.
  snapshot `20260829T051350Z`에서 지역 제품 6개, source point 포함 2개, **5/5 anchor를 모두
  덮는 제품 2개**가 확인됐다. coverage seal은
  `d1464d28b8a7b38e2b9d0650b7a18f1190e649113f4260e2d7bf0f010d5dad18`이다.
- 그러나 rslearn/Planetary Computer preflight는 5/5 모두 08-24 장면을 선택했고 08-28 장면은
  아직 0/5다. preflight SHA-256은
  `4b85f009d3f88ae210faa857117966c483ac7b63de5820cb3c52358c99037d1b`이다.
- 그러므로 현재 gate는 `WAIT FOR S1`이 아니라 `WAIT FOR PROVIDER SYNC`다. 새 위성이 아니라
  provider index가 첫 병목이며, 08-28이 5/5에 선택된 뒤에만 materialize한다.
- 08-29 Sentinel-2C는 관측창이 끝났지만 05:11:48 UTC snapshot에서
  `acquired_pending_catalog`였다. 게시 전에는 새 optical scene으로 취급하지 않는다.

## 3. OLMoEarth가 지금 이미 한 것과 아직 못 한 것

### 이미 성립

1. **사건 전 공통 표현** — 5 anchor × S1/S2 × 4 periods의 768-d frozen baseline이 봉인됐다.
2. **공개 지역 transfer** — confirmatory 8-region에서 frozen reuse의 region-macro는 0.272,
   raw UNet3D는 0.197, absolute gap은 +0.076이며 6/8 region에서 이겼다.
3. **검색/변화/경량 head 인터페이스** — 동일 표현으로 similarity search, temporal comparison,
   lightweight downstream probe를 연결할 수 있다.
4. **실패 범위 보존** — Indonesia와 Itogon non-win을 지우지 않았다. OLMo가 모든 지역에서
   자동으로 이긴다는 주장이 아니다.

### 아직 성립하지 않음

1. **Nepal 사건 후 Δz** — 공식 S1 footprint는 5/5를 덮지만 materialization provider가 08-28
   장면을 아직 선택하지 않아 pixel cube가 없다.
2. **OLMo 고유 우월성** — 위 confirmatory 비교는 OLMo reuse 대 raw baseline이다. 동일 입력계약의
   두 번째 GeoFM(우선 Presto) 통제 전에는 OLMo만의 고유 우월성이라 쓰지 않는다.
3. **피해/원인/물리량** — embedding만으로 붕괴 부피, 마찰, 수심, 유속, 도달시간을 만들지 않는다.
4. **재난 예측** — M67 pre-event LOCO는 susceptibility를 검출하지 못했다. 예측 카피는 금지한다.

따라서 UI의 `WAIT S1`은 OLMo 전체가 막힌 것이 아니라 **Nepal live temporal delta 한 갈래의
입력 게이트**다. baseline·retrieval·transfer는 이미 사용 가능하다.

## 4. OLMoEarth × 물리 × 위성의 검증 가능한 결합

```text
S1/S2 + DEM + inventory
       │
       ├─ classical masks / change
       └─ OLMo embedding
            ├─ source/change proposal
            ├─ historical analogue retrieval
            └─ material-zone prior (candidate only)
                          │
                          ▼
              r.avaflow ensemble (primary)
                          │
               D-Claw independent check
                          │
                          ▼
      observation operator: water/debris/exposed-ground masks
      + sensor footprint + cloud/SAR visibility
                          │
                          ▼
      Rasuwagadhi/Bidur actual observations + CEMS/Charter review
                          │
                          └─ reject / reweight / send to analyst
```

핵심 분업:

- OLMo는 **어디를 먼저 보고 어떤 과거 사례를 불러올지** 제안한다.
- r.avaflow/D-Claw는 **주어진 물리 범위에서 어디까지 갈 수 있는지** 계산한다.
- 위성 observation operator는 결과를 사진처럼 꾸미지 않고, 센서가 볼 수 있는 semantic mask로
  투영한다.
- 실제 전후 영상과 외부 폴리곤이 앙상블을 기각/재가중한다.
- Rust/WASM은 solver가 아니라 precomputed quantile envelope를 웹에서 재생한다.

첫 “위성 시뮬레이션”은 photorealistic synthetic image가 아니라 관측 가능한 water/debris mask와
visibility footprint여야 한다. 생성 영상은 평가가 어려우며 실제 증거처럼 오독되기 쉽다.

## 5. 실험 설계

### 5.1 Arms

| Arm | 구성 | 답하는 질문 |
|---|---|---|
| A0 | raw visual/SAR review | AI 없이 무엇을 찾는가 |
| A1 | NDWI/SAR/classical change | 단순 변화탐지가 어디까지 가는가 |
| A2 | OLMo Δz / retrieval | 표현이 recall·검색을 개선하는가 |
| A3 | A2 + input gate/abstention | 잘못된 action을 줄이는가 |
| A4 | A3 + r.avaflow ensemble | 물리적으로 불가능한 후보를 제거하는가 |
| A5 | A4 + D-Claw + official/human review | 독립 확인 후 운영 가치가 남는가 |

### 5.2 Primary evaluation

- change: event-wise AUPRC, false changed area at matched recall, source localisation error
- physics: runout IoU, maximum-runout error, false-inundated area
- uncertainty: interval coverage, Brier/CRPS, abstention–coverage curve
- operations: analyst minutes/event, candidates reviewed, invalid-action rate, catalogue-to-decision latency
- protocol: leave-one-event-out; region/seed macro; CEMS/Charter/USGS는 untouched adjudication

**주 헤드라인은 정확도 단독이 아니라 `same recall에서 analyst minutes와 invalid actions가
줄었는가`다.** AI2의 planet-scale embedding과 EarthRanger/Skylight식 운영 문법이 만나는 지점이다.

### 5.3 Stop rules

- A2가 A1보다 false area나 analyst time을 줄이지 못하면 OLMo change detector 주장을 접고
  retrieval/representation asset으로만 남긴다.
- Presto 통제에서 차이가 사라지면 OLMo-specific 문장을 제거하고 GeoFM reuse 결과로 쓴다.
- official polygon/independent mask가 없으면 physics 결과는 scenario envelope이며 validation 아님.
- provider preflight가 08-28 S1을 5/5 anchor에 선택하지 않으면 materialize하지 않는다.
  08-31 S1은 백업 관측이며 같은 containment/preflight를 다시 통과해야 한다.

## 6. AI 엔지니어가 Earth impact로 연결할 수 있는 모든 경로와 우선순위

| 우선 | 수단 | 지금 가진 자산 | 다음 산출물 | 사용자/과학 가치 |
|---:|---|---|---|---|
| P0 | 데이터 coverage·계보·contract gate | S1 official 5/5 coverage, catalog/manifest/seal | provider 5/5 selection, Bidur mask, immutable event bundle | 거짓 결과 방지, 재현성 |
| P1 | OLMo change + analogue retrieval | 5-anchor baseline, SEN12 archive, 8-region transfer | A1–A3 matched-recall table, nearest-event gallery | 분석가 triage 속도 |
| P1 | 두 번째 GeoFM control | Presto 계획 | same-contract Presto/OLMo/raw comparison | OLMo 고유 가치 검증 |
| P2 | multimodal fusion | S1/S2, DEM, source/control anchors | gated fusion head + missing-sensor ablation | cloud/SAR/광학 상보성 |
| P2 | physics observation loop | r.avaflow/D-Claw 설계, Bidur/Rasuwa windows | 128–256 run ensemble + semantic likelihood | 설명 가능한 runout 범위 |
| P2 | human-in-the-loop active review | incident ledger UI | uncertainty-ranked review queue | 검수 비용 절감 |
| P3 | fast surrogate/neural operator | physics ensemble outputs | calibrated emulator with OOD abstention | 브라우저 scenario 탐색 |
| P3 | post-training/tool use | sealed tasks, verifiable gates | tool-use agent that queries STAC, rejects invalid cubes, cites provenance | AI engineer 포트폴리오·운영 자동화 |
| P4 | cross-country transfer | Korea/Nepal + Swiss follow-up | Nepal untouched, Swiss system transfer | 연구 일반화·사업 확장 |

### 권장 6주 순서

1. **지금–48 h:** Bidur/Rasuwagadhi blinded mask, 08-28 S1 provider preflight 재검사,
   5/5 선택 시 live cube 물질화. 08-31은 backup.
2. **1주:** A1–A3와 SEN12 retrieval gallery. Presto C1을 같은 계약으로 실행.
3. **2–3주:** r.avaflow ensemble, D-Claw 소수 독립 체크, observation operator.
4. **3–4주:** A4/A5, leave-one-event-out, analyst-time study.
5. **4–6주:** calibrated surrogate + WASM replay + incident review queue.

RL/SFT를 먼저 하지 않는다. post-training의 verifiable task는 이미 존재한다—`올바른 STAC item 선택`,
`5/5 contract 통과/거부`, `source와 control 혼동 금지`, `모든 claim에 provenance 연결`이다. 이 task
suite가 안정된 뒤 tool-use SFT/preference optimization을 붙여야 reward hacking을 식별할 수 있다.

## 7. 앱 storyboard

1. **산에서 시작해 강에서 보였다** — 결론과 현재 gate.
2. **사건 해부** — E/D/A/B/F의 역할; C는 별도 control.
3. **위성 증거** — Rasuwagadhi swipe + 실제 Bidur pair + source-to-downstream matrix.
4. **OLMo가 이미 한 일** — baseline, 8-region transfer, Nepal live gate 분리.
5. **결합 실험** — OLMo proposes / physics explains / satellites falsify.
6. **우선순위** — P0–P3와 검증 산출물.
7. **끝의 경계** — 다음 관측 시각과 금지 주장.

## 8. 레퍼런스

- [Ai2 — OLMoEarth embeddings](https://allenai.org/blog/olmoearth-embeddings)
- [Ai2 — OLMoEarth platform](https://allenai.org/olmoearth)
- [Ai2 — planet-scale infrastructure](https://allenai.org/blog/olmoearth-infrastructure)
- [USGS — 2026 Nepal debris avalanche and flash flood](https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood)
- [Copernicus EMSR927](https://mapping.emergency.copernicus.eu/activations/EMSR927/)
- [International Charter activation 1052](https://disasterscharter.org/activations/flood-in-nepal-activation-1052-/)
- [Planetary Computer STAC/Data API](https://planetarycomputer.microsoft.com/docs/quickstarts/using-the-data-api/)
- [r.avaflow v4, GMD 2025](https://doi.org/10.5194/gmd-18-9879-2025)
- [USGS D-Claw](https://claw.code-pages.usgs.gov/dclaw/)
