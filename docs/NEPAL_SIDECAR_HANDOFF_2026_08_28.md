# Nepal OLMo live sidecar — 주차 인수인계

상태: **PARKED / 자동 재개 금지**

동결 시각: 2026-08-28 KST

역할: CVPR transfer 본 실험과 분리된 prospective operations·portfolio sidecar

## 지금 실제로 있는 것

| 자산 | 실물 상태 | 허용되는 해석 |
|---|---|---|
| baseline cube | 5앵커, S1 4기간 + S2 4기간, seal valid | 사건 전 OLMoEarth 입력 |
| placebo A/B cube | 각각 5앵커, exact 4+4, seal valid | historical change 두 표본 |
| baseline/placebo embedding | 3 mode × 5앵커, OLMoEarth v1, 768×64×64, manifest valid | 사건 전 변동의 기술통계 |
| delta report | baseline↔placebo A/B cosine distance | 두 control의 rank/max 비교만 |
| 08/27 S2 live cube | S2 4/4이지만 S1 3/4, `exact_four_periods_per_modality=false` | post-event 광학 픽셀은 존재하나 OLMo 입력 봉인 실패 |
| live event embedding | **없음** (`live_mode: null`) | 사건 변화·피해·이상치 주장 금지 |

주요 산출물:

- `artifacts/external_data/nepal_olmo_live_v1/delta/20260828T070505Z/nepal_delta_report.json`
- `artifacts/external_data/nepal_olmo_live_v1/materialized/{baseline,placebo_a,placebo_b}/embedding_manifest.json`
- `artifacts/external_data/nepal_olmo_live_v1/materialized/s2_live/materialization_manifest.json`
- `docs/NEPAL_EVIDENCE_OPERATIONS_REVIEW_2026_08_28.md`

## 지금 말하면 안 되는 것

1. `nepal_delta_report.json`은 `live_mode=null`이다. 여기에 있는 변화량은 사건 전 baseline과
   placebo 두 기간의 차이이지, 8월 26일 사건 전후 차이가 아니다.
2. placebo가 두 개뿐이라 p95 anomaly threshold를 추정할 수 없다. 각 64×64 patch를 독립 표본처럼
   세는 것도 공간 의사반복이다.
3. 08/27 S2 장면이 선택됐다는 사실은 멀티모달 OLMo cube가 유효하다는 뜻이 아니다. 현재 S1은
   3기간뿐이고 seal이 fail-closed로 막는다.
4. 웹의 flow는 하도 방향 도식이며 홍수 깊이·속도·도달시간·위험도 예측이 아니다.

## 재개 조건 — 네 개를 모두 만족할 때만

1. 사건 후 Sentinel-1 제품이 catalogued→selected→materialized되어 **5/5 앵커 모두 S1 4/4·S2 4/4**.
2. 새 live manifest와 SHA256 seal이 valid이고 required post-event scene ID가 각 앵커의
   `items.json`·selected layer에 실제로 존재.
3. CVPR 본선의 8-region aggregate와 Presto C1 cache smoke를 막지 않으며 GPU1 사용 전 점유 감사를 통과.
4. anomaly percentile을 주장하려면 label-independent historical placebo를 최소 20개, 권장 30개 이상
   먼저 동결. 그전에는 descriptive candidate change만 허용.

재개 시에도 순서는 `catalog → selection preflight → exact-period materialization → seal → embedding →
placebo-calibrated delta → independent corroboration`이다. 어느 gate가 실패하면 다음 단계는 실행하지 않는다.

## 본 실험과의 경계

Nepal sidecar는 OLMoEarth 입력 계약과 operational evidence ledger를 보여주는 좋은 취업용 증거다.
그러나 단일 사건·무라벨 live delta는 Sen12의 8-region transfer, 두 번째 GeoFM 대조, 한국 untouched
transfer를 대신하지 않는다. 따라서 현재 GPU·문서의 기본 queue에서는 제거하고, 위 재개 조건이
충족될 때만 별도 실행으로 다시 연다.

## 2026-08-29 재개 감사 — 재개 조건은 아직 미충족

사용자 요청으로 **뉴스·공개 관측·앱만** 재개 감사했다. CVPR 본선 GPU·확증 코드는 건드리지 않았다.

- 사건 정정: source anchor E는 Tibet이 아니라 **Nepal-side Langtang Lirung**이다. 08-27 별도 Tibet
  landslide를 지지하는 독립 근거는 없고, 27–28일 뉴스는 26일 사건 뒤 barrier-lake secondary hazard다.
- 관측 정정: 08-28 S1D는 catalog delay가 아니라 `MISSED_COVERAGE`다. 인접 official product 2개 중
  AOI 포함 footprint는 0개다. audit는
  `artifacts/external_data/nepal_olmo_live_v1/coverage/20260828T152324Z/`에 봉인했다.
- 현재 계약: S1 3/4, S2 4/4, `DO NOT EMBED` 유지. 다음 실제 S1 gate는 08-31 00:07 UTC 후보이며
  schedule이 아니라 footprint containment로 다시 판정한다.
- 앱: 사건 clock, evidence state, radar-purple 설명, M66/M67 경계, OLMo×physics contract,
  A0–A5 evaluation, official source ledger로 storyboard를 확장했다.
- 물리: 현재 Rust/WASM은 corridor illustration 그대로다. r.avaflow/D-Claw 결과가 생기기 전
  runout·depth·time claim을 허용하지 않는다.

상세 근거와 다음 실행은 `docs/NEPAL_OLMO_PHYSICS_STORYBOARD_UPDATE_2026_08_29.md`가 담당한다.
이 감사로 기존 네 재개 조건을 낮추지 않았으며, 조건 1–2가 여전히 실패하므로 live embedding은
실행하지 않았다.
