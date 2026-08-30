# Nepal OLMo Live Twin — OLMoEarth 중심 실행 설계

기준 시각: **2026-08-28 15:37 KST** (catalog snapshot `20260828T000910Z`, live cube
재감사 포함). 사건 원인은 아직 확정되지 않았다. ICIMOD와
International Charter가 쓰는 안전한 표현은 **Rasuwa flash flood, suspected rock–ice
avalanche / rockslide mechanism under investigation**이다. 지진·빙하붕괴를 확정 사실처럼
쓰지 않는다.

> **2026-08-28 정정:** 08/27 S2B는 이제 provider selection을 5/5 앵커에서 통과했고 S2 4/4가
> 물질화됐다. 그러나 동일 cube의 S1이 3/4라 manifest는 `valid=false`다. 따라서 현재 상태는
> `PIXELS READY / CUBE INCOMPLETE / DO NOT EMBED`이며 OLMoEarth evidence는 여전히 0건이다.
> 당시의 “provider STAC 대기” 기록은 아래에 시간순 관측으로 보존하되 현재 판정으로 쓰지 않는다.

## 한 문장 주장

> 사건 전 56일의 Sentinel-1/2를 OLMoEarth의 768-d 공간 메모리로 만들고, 새 관측에서
> 비정상적인 임베딩 변화와 네팔 내 유사 지형을 검색한 뒤, 그 신호가 물리 runout/flood
> ensemble과 공간적으로 일치하는지를 검증한다.

이 설계에서 OLMoEarth가 **탐지·검색·업데이트의 중심**이고, 물리 모델은 OLMo 신호를
그럴듯한 재해 서사로 바꾸는 장식이 아니라 **독립적인 consistency constraint**다.

## 무엇이 관측이고 무엇이 모델인가

| 레이어 | 만들어지는 것 | 허용 문장 | 금지 문장 |
|---|---|---|---|
| O — Observation | S1 VV/VH, S2 12-band, cloud/validity mask | “위성이 이 픽셀을 관측했다” | “이 픽셀이 산사태다” |
| E — OLMo evidence | 768-d embedding, pre/post delta, nearest neighbours | “평시 메모리에서 벗어났다” | “OLMo가 원인을 증명했다” |
| P — Physics | r.avaflow runout ensemble, SFINCS downstream envelope | “이 초기조건이면 도달 가능하다” | “실제 흐름은 이 곡선이었다” |
| H — Human/official | Charter·ICIMOD·현장 검증 polygon | “확인된 피해/원인이다” | 자동 결과를 H로 승격 |

최종 화면에서도 O/E/P/H를 다른 선·투명도·범례로 유지한다. OLMo anomaly와 simulation을
곱해 확률처럼 보이는 수치를 만들지 않는다. calibration 전에는 각각 percentile/rank로만
표시한다.

## OLMoEarth가 실제로 맡는 네 가지 일

1. **Earth memory** — 5개 앵커마다 4×14일 S1+S2 입력을 동일 계약으로 만들고 Base v1의
   768-d patch embedding을 저장한다.
2. **Live update** — 오늘 S2, 내일 S1이 게시되면 같은 rolling-window recipe로 다시
   embed한다. `Δz = z_live - z_pre`는 일상적인 rolling delta/placebo date와 비교한다.
3. **Similar-place retrieval** — 사건 source/corridor의 변화 벡터를 Nepal historical grid와
   2025 Rasuwagadhi, 2015 Langtang, 2024 Thame calibration cases에서 검색한다. 가까운 벡터를
   “같은 재해”라 부르지 않고, 물리 초기조건을 좁힐 **analogue candidate**로 쓴다.
4. **Post-training** — 공식/수동 검증 polygon이 생기면 frozen → linear head → LoRA/adapter
   → full fine-tune을 1/5/10/100% label budget으로 비교한다. 이 축이 기존 M61의 transfer
   frontier와 연결된다.

## 데이터가 현재 확보된 범위

`code/build_nepal_live_catalog.py`가 Copernicus OData 원응답과 정규화 결과를 새 snapshot으로
저장하고 각 파일을 SHA-256으로 봉인한다. 2026-06-28 이후 query point를 덮는 카탈로그는:

- Sentinel-1 IW GRD: **15 physical acquisitions**. CDSE가 같은 획득을 SAFE/COG 두 표현으로
  노출한 15개 복제본은 acquisition 단위로 중복 제거했다.
- Sentinel-2 L2A: **31 acquisitions**.
- S2B post-event pass는 2026-08-27 04:56:59 UTC에 획득됐고 **09:33:39 UTC
  (18:33 KST)에 L2A가 게시됐다**. 제품은
  `S2B_MSIL2A_20260827T045659_N0512_R119_T45RUM_20260827T084453.SAFE`,
  전체 45RUM tile cloud cover는 **78.471315%**다. 이는 AOI 구름률이 아니므로 아직
  Rasuwagadhi가 보인다고 주장하지 않는다.
- **09:09 KST 당시 상태**: 공식 Copernicus OData에는 게시됐지만 rslearn이 사용하는 Planetary
  Computer STAC에는 같은 장면이 아직 선택되지 않았다. 이후 provider selection은 5/5에서
  해소됐고 S2 4기간이 물질화됐다. 현재 `s2_live`가 OLMo-ready가 아닌 이유는 **S1 3/4**다.
  카탈로그 게시·provider 선택·입력 cube seal을 서로 다른 상태로 보존한다.

전체 SAFE를 60일치 복제하지 않는다. 저장·재현성을 위해 5개 2.56 km 앵커의 COG cutout만
물질화한다. 원 product UUID/S3 path/checksum은 catalog에 남는다.

**baseline·placebo 물질화 완료**: baseline, placebo A, placebo B 모두 5/5 앵커, S1·S2 exact
4 periods, 각각 91파일이다. 총 bytes는 48,859,900 / 49,313,623 / 48,680,635이고 각
`materialization_manifest.json`의 `valid=true`. 실제 입력은
`artifacts/nepal_olmo_live_v1/pre_event_input_montage.png`에서 감사할 수 있다. 흰 S2 영역은
눈·구름 때문에 optical 단독 판독이 불안정한 이유를 보여주며, 같은 기간 S1 RTC가 실질적인
live-update 축이어야 하는 이유도 시각적으로 드러난다.

**live 물질화는 미완료**: 5/5 앵커와 08/27 S2는 있으나 S1 3기간·S2 4기간, 81파일,
45,754,625 bytes다. manifest SHA-256은 `6e60ebe0…`이고 `valid=false`다. selection preflight가
통과해도 materialization seal 없이는 OLMo-ready가 아니다.

## 사건 전 메모리 앵커

좌표는 운영용 검색 중심이며 피해 라벨이 아니다.

| anchor | 역할 |
|---|---|
| source_provisional | 중국측 Lhende source search; 위치 자체도 provisional |
| rasuwagadhi | 국경·하도 영향 |
| timure | 정착지·도로 노출 |
| syabrubesi | downstream transfer |
| dhunche | downstream negative/control |

각 타일은 10 m, 256×256 px, Sentinel-2 12 bands + Sentinel-1 VV/VH, 4×14일이다.
`space_mode=PER_PERIOD_MOSAIC`가 강제된다. `MOSAIC`이면 `period_duration`이 무시되어 12개
장면이 생기는 결함을 실제 첫 실행에서 발견했고 그 결과는
`baseline_failed_space_mode_mosaic_20260827T153059`로 격리했다.
그 전에는 로컬 rslearn이 서버 설정의 S1 `nodata_value` 필드를 거부한 환경 차이도 데이터
다운로드 전에 잡아 공통 최소 계약으로 고쳤다.

## 관측 일정과 실행 시각

시간은 Sentinel acquisition-plan KML이 AOI와 교차한 window다. 실제 usable product는 cloud,
swath edge, processing에 따라 달라진다.

| 데이터 | NPT | KST | 현재/행동 |
|---|---:|---:|---|
| S2B 2026-08-27 | 10:41–11:02 | 13:56–14:17 | L2A 게시 완료; tile cloud 78.47%, provider STAC 대기 |
| S1D 2026-08-28 | 18:04–18:12 | 21:19–21:27 | 오늘 핵심 SAR post-event pass; 09:09 KST snapshot에는 planned |
| S2C 2026-08-29 | 10:32–10:50 | 13:47–14:05 | 두 번째 optical post |
| S1D 2026-08-31 | 05:52–05:58 | 09:07–09:13 | 다른 시각/궤도 보완 |
| S2A 2026-08-31 | 10:37–10:50 | 13:52–14:05 | optical follow-up |

같은 지점의 60일 실제 publication latency는 S1 median **2.94 h** (2.15–3.92 h), S2
median **6.03 h** (4.28–8.01 h)다. 따라서:

- 오늘 S2B L2A의 경험적 게시 범위: **18:13–21:57 KST**, 중앙값 약 19:58.
- 내일 S1D GRD의 경험적 게시 범위: **23:28 KST–08/29 01:14 KST**, 중앙값 약 00:15.

이는 보장이 아니라 이 query point의 지난 60일 latency로 만든 poll window다.

## 실험 — 문제 → 실험 → 기록

### RQ-N1. OLMo embedding은 사건 변화를 일상 변화와 구분하는가?

- **문제**: pre/post cosine delta 자체는 계절, cloud, orbit 변화에도 커진다.
- **실험**: 사건 앵커의 `Δz`를 (a) 같은 앵커의 60일 placebo rolling delta, (b) Dhunche,
  (c) 동일 상대궤도 S1 pre/post와 비교한다.
- **현재 표본 한계**: 물질화된 placebo는 A/B 두 개뿐이다. 두 점으로 95 percentile을 정의할 수
  없으므로 첫 live delta는 descriptive rank와 `candidate representation change`로만 쓴다.
- **최종 판정**: label-independent historical placebo를 최소 20개(권장 30개 이상, 계절·S1
  orbit 층화)로 늘린 뒤, 사건 delta가 사전 고정한 placebo 95 percentile을 넘고
  source/corridor 방향이 3 seed/두 pooling recipe에서 유지될 때만 anomaly라고 쓴다.
- **기록**: scene IDs, valid-pixel fraction, cloud, relative orbit, model/release, code snapshot,
  vector SHA, neighbour list를 같이 봉인한다.

### RQ-N2. “비슷한 영역” 검색이 유의미한가?

- **문제**: embedding neighbour는 지형·계절·구름이 비슷한 것일 수 있으며 재해 analogue와
  같지 않다.
- **실험**: Nepal grid 전체에서 (i) pre-state neighbour, (ii) change-vector neighbour를 따로
  검색하고, 2015/2024/2025 historical event AOI의 enrichment를 blind로 평가한다.
- **판정**: random/DEM-only/S2 spectral-index retrieval보다 event enrichment와 manual top-k
  precision이 높아야 한다.

### RQ-N3. OLMo 신호가 물리적으로 말이 되는가?

- **문제**: 멋진 pre/post heatmap은 흐름 경로를 증명하지 않는다.
- **실험**: r.avaflow의 source-volume/friction ensemble → SFINCS 하도 전달 envelope를 만들고,
  OLMo anomaly와의 spatial overlap, distance-to-runout, downstream ordering을 측정한다.
- **판정**: DEM-only runout, random source, rainfall-only baseline보다 개선되어야 한다.
  simulation은 원인 확정이나 관측 대체에 쓰지 않는다.

### RQ-N4. frozen embedding 이후 post-training이 필요한가?

- **문제**: M59/M63은 frozen OLMo가 scratch보다 실용적임을 보였지만 OLMo 고유 우월성이나
  Nepal label efficiency를 답하지 않았다.
- **실험**: frozen kNN/linear → adapter/LoRA → full FT, label 1/5/10/100%, source-region
  regression check. CROMA/Presto 등은 comparison arm이지 중심 모델이 아니다.
- **판정**: accuracy/AUPRC/ECE/false alarm + train/inference/storage cost Pareto를 보고 action을
  정한다.

## 08/28–08/29 최종 행동 규칙

1. `build_nepal_live_catalog.py` 재실행. 새 snapshot을 만들며 과거 것을 덮어쓰지 않는다.
2. S2B provider selection 5/5와 S2 물질화는 완료됐다. 다만 S1 3/4인 기존 partial cube를
   유효 cube로 간주하거나 부족한 기간을 복제하지 않는다.
3. 08/28 S1D가 게시되면 Aug16 동일 상대궤도(예상) pair를 우선하고
   `prepare_nepal_olmo_live.sh s1_live`.
4. exact-4 period, bands, CRS, completed marker, hashes gate 통과 전에는 OLMo inference 금지.
   live 모드는 period 수만 보지 않고 S2 `2026-08-27` 또는 S1 `2026-08-28` item이 5개
   앵커 모두에 실제 포함됐는지 확인한다. 이 검사는 이제 materialize **전에** 실행되어 stale
   provider index로 수십 GB를 내려받는 일을 막는다.
5. Base v1 768-d를 primary로 추출. v1.2는 release sensitivity이며 결과를 같은 열에 섞지 않는다.
6. 첫 embedding 뒤에도 placebo가 두 개뿐이면 heatmap 제목은 **candidate representation
   change**로만 쓴다. 20개 이상의 사전 동결 placebo 전에는 anomaly/damage probability를 쓰지
   않는다.
7. OLMo anomaly가 있으면 physics ensemble을 조건부로 실행한다. anomaly가 없어도 결과를 숨기지
   않고 “sensor/representation에서 미검출”로 기록한다.

## 이것이 취업·박사·사업 목표에 각각 주는 것

- **AI2 AI for the Planet**: 그들의 S1+S2 native contract, rslearn, 768-d embedding export,
  immutable catalog, live polling, 실패한 data contract까지 한 operational story에 묶는다.
- **Sherrie Wang 연구 축**: ground truth가 희소하고 noisy한 실제 재해에서 representation,
  weak/late labels, transfer, uncertainty를 분리해 검증한다. 단순 demo가 아니라 label-scarce
  measurement problem이다.
- **박사/CVPR**: 한 사건 heatmap이 아니라 multi-event calibrated retrieval + physics
  consistency + label-budget adaptation이 method contribution이다. Nepal 2026은 untouched case다.
- **사업**: “재해를 예언”이 아니라 새 장면이 들어오면 어디를 먼저 검토·시뮬레이션할지
  triage하는 evidence system으로 정의한다.

## 현재 논문성 판정

네팔 한 사건만으로는 CVPR 논문이 아니다. 그러나 아래 세 축을 완료하면 강한 형태가 된다.

1. 2015 Langtang / 2024 Thame / 2025 Rasuwagadhi로 calibration, 2026 Rasuwa untouched test.
2. frozen / PEFT / full FT와 OLMo v1/v1.2의 label–cost–transfer frontier.
3. OLMo-only, physics-only, naive late fusion, proposed calibrated coupling ablation.

현재 가장 가치 있는 deliverable은 **“OLMoEarth live event memory + falsifiable evaluation”**이며,
시뮬레이션 영상만 먼저 만드는 것보다 AI2와 연구 양쪽에 더 직접적이다.

제품·연구 독립 감사와 EarthRanger·Skylight·CEMS 기반 승격 설계는
`docs/NEPAL_EVIDENCE_OPERATIONS_REVIEW_2026_08_28.md`를 따른다.
