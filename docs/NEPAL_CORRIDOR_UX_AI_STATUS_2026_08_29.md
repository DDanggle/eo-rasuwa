# Nepal corridor UX + AI status — 2026-08-29

> **2026-08-30 연구 갱신**: 화면 구현은 유지한다. M77에서 C는 Tadi Khola 잠정 음성 대조로
> 교체됐고, M78에서 S1-only OLMo는 2/7지역에서 AUROC .70을 넘었지만 S1+S2 fusion +.03 gate는
> 0/7이다. M78은 S2-clear 시점으로 표본을 선택했으므로 일반적인 `through-cloud` 확증이 아니다.
> 최신 해석은 `docs/NEPAL_OLMO_RESEARCH_STATUS_2026_08_30.md`를 따른다.

## 한 문장 판정

OLMoEarth는 실제로 **27개 위치 × placebo·baseline·live = 81개 공간 임베딩**을 계산했다. 그러나
계약교정 결과는 “피해 탐지”가 아니라 **Devighat·Bidur를 먼저 검토하라는 약한 후보 압축**이다.

## 무엇이 AI이고 무엇이 아닌가

| 단계 | 실제 수행 | 분류 | 현재 허용 주장 |
|---|---|---|---|
| S1/S2 수집·footprint·checksum | STAC 조회, 12-band/RTC materialize, seal | 데이터/GIS | 입력이 존재하고 동일 위치라는 것 |
| OLMoEarth forward | 81 GeoTIFF, 각각 768×64×64 | **AI** | 각 40 m급 공간 token의 표현 |
| Δz·placebo p99 | cosine distance와 동일위치 평시 전이 비교 | AI 후처리 | 검토 순위(screening) |
| 강선·정착지·거리 | OSM·좌표·수계 규칙 | GIS | 관측/검토 범위 |
| runout·수심·도달시간 | 미실행 | 물리 | **아무 예측도 없음** |
| 피해·보건·현장 판정 | 미확보/외부기관 영역 | 외부 검증 | **아무 확정도 없음** |

## 입력계약 정정

공식 rslearn OLMoEarth 계약에서 Planetary Computer Sentinel-1 RTC는 선형 intensity를
`Sentinel1ToDecibels`로 변환한 뒤 `OlmoEarthNormalize`를 적용해야 한다. 기존 5-anchor 및 최초
27-window S1+S2 실행은 이 dB 변환이 빠졌다. 따라서 M70·M72의 S1+S2 부분과 M74·M74 S1-only는
**SUPERSEDED**다. 파일은 provenance로 보존하지만 능력 근거로 사용하지 않는다.

정정 뒤에는 placebo_b→baseline을 평시 전이, baseline→s1_live를 사건 전이로 두고 같은 위치마다
평시 token p99를 먼저 계산했다. 세 arm 모두 27/27 valid이며 출력은 총 81개다.

## 계약교정 27창 결과

| 순위 | 위치 | p99 초과 token | 사건 평균 / 평시 평균 |
|---:|---|---:|---:|
| 1 | Devighat w23 | 17/4096 = **0.415%** | 73.4% |
| 2 | Bidur w21 | 17/4096 = **0.415%** | 55.5% |
| 3 | Bidur w22 | 6/4096 = 0.146% | 66.8% |
| 4 | w18 | 5/4096 = 0.122% | 52.1% |
| 5 | Rasuwagadhi w00 | 3/4096 = 0.073% | 56.2% |
| 10 | Lhende w24 | 0/4096 | 44.8% |

- 27창 중 9창에 초과 token이 하나 이상 있지만 최대도 0.415%다.
- **모든 창에서 사건 평균 Δz가 평시 평균보다 작다.** 이전 “Lhende 27.9%”는 재현되지 않았다.
- 평시 전이가 위치당 하나뿐이므로 p99는 모집단 이상치 확률이 아니다. 이는 calibrated detection도,
  피해 면적도, 원인 판정도 아니다.

## 강 밖에서 가능한 탐색

현재 100-window S2-only discovery에는 49개 hillslope 창이 있다. 구름/눈 때문에 6개만 판정됐고,
Salê·Gosaikunda는 관측 가능 픽셀 21–23%의 **재관측 lead**일 뿐 산사태 발견이 아니다.

다음 실험은 강을 더 길게 긋는 것이 아니라 다음 네 큐다.

1. `off-river slope`: 발원 주변·지류·급경사 격자를 dB-corrected S1 + DEM으로 재스캔한다.
2. `barrier lake/blockage`: 하천 교차점에서 SAR 변화 + 수역 변화 + 상류 체류 가능성을 조합한다.
3. `settlement/infrastructure`: OLMo 후보와 도로·교량·발전소를 교차해 현장 검토 순서를 만든다.
4. `analogue retrieval`: Nepal 변화벡터로 과거 Sen12 패치를 검색하되 피해 판정이 아니라 사례 검색으로 쓴다.

## 물리 시뮬레이션 결합

가능하지만 아직 실행하지 않았다. 권장 구조는 다음과 같다.

`DEM + source volume/geometry + rheology ranges → r.avaflow ensemble → water/debris observation operator`

그 결과를 Sentinel-1/2 관측과 OLMo Δz에 대조해 ensemble을 재순위화한다. OLMo embedding을
마찰계수·속도·수심으로 직접 변환하지 않는다. D-Claw는 소수 시나리오의 독립 검산으로 둔다.
웹/WASM은 계산된 raster ensemble을 재생하고 파라미터·불확실성을 보여주는 역할이며, 브라우저에서
물리 solver를 흉내 내지 않는다.

## 다음 성공조건

- 평시 전이 ≥20개 또는 계절·orbit을 맞춘 충분한 reference bank
- Nepal 독립 피해/침수 polygon을 가린 채 후보 순위를 동결한 뒤 AUROC·AUPRC·recall@review-area 평가
- off-river S1+DEM 격자와 visibility/abstention 동시 보고
- r.avaflow ensemble의 공간 envelope를 실제 관측으로 재순위화하고 calibration/coverage 평가
- radar는 S2 관측성 strata를 결과 열람 전에 동결한 뒤 low-optical subset에서 다시 평가
- 음성 대조는 Tadi 한 곳이 아니라 열람 전 동결한 다수 계곡로 false-candidate area를 평가

## UX 검증

- 주황: 계약교정 OLMo 결과, 황색: S2-only discovery, 보라: 강 밖 재관측 lead, 청색 점선: 유사변화 검색.
- legacy 5-anchor 결과는 `SUPERSEDED`; 물리는 `NOT RUN`으로 표시한다.
- desktop·390×844 mobile, data contract, TypeScript, ESLint, Rust/WASM, production build를 통과했다.
- 공개 배포는 사용자 승인 전까지 보류한다.

## 근거

- 공식 OLMoEarth 입력계약: <https://github.com/allenai/rslearn/blob/master/docs/foundation_models/OlmoEarth.md>
- r.avaflow: <https://www.avaflow.org/>
- USGS D-Claw: <https://www.usgs.gov/observatories/cvo/news/get-know-cvo-david-and-d-claw>
- 로컬 상세 감사: `docs/NEPAL_OLMO_PROVENANCE_AND_RISK_AUDIT_2026_08_29.md`
