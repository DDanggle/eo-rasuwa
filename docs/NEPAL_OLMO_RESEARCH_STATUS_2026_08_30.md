# Nepal OLMoEarth 연구 상태 — 2026-08-30

## 결론부터

현재 Nepal sidecar는 **OLMoEarth를 실제 재난 관측 흐름에 연결하는 provenance·candidate-triage
실험**으로는 유의미하다. 그러나 계약을 고친 prospective S1+S2 실험(M76)은 사건 변화를 검출하지
못했고, 물리 runout·피해 범위·현장 정답은 아직 없다.

가장 강한 AI 증거는 Nepal live 결과가 아니라 다음의 historical public-task 결과다.

- frozen OLMoEarth segmentation transfer: 8지역 중 6지역 승리, region-macro .272 vs raw UNet3D .197(M65)
- S2-only 변화표현: 고전 band/index change 대비 9/9 동급 이상, 8/9에서 +.05 AUROC 초과(M73)
- S1-only 변화표현: 7지역 중 Hokkaido·Hiroshima 2곳에서 AUROC .70 gate 통과(M78)

## 사건 명칭 경계

저장소의 canonical 사건은 `2026 Rasuwa–Bhote Koshi rock–ice/debris-avalanche and flash-flood
investigation`이다. 현재 로컬 증거에는 지진이 직접 trigger였다는 검증이 없다. 따라서 외부 공식
seismic attribution이 봉인되기 전에는 이 작업을 “네팔 지진 탐지”라고 부르지 않는다.

## 전체 진행 계보

| 단계 | 무엇을 했나 | 현재 판정 |
|---|---|---|
| M65 | 8-region frozen embedding transfer | OLMo representation 전이 가능성 지지 |
| M68/M73 | 과거 재해 S2-only Δz와 고전 변화량 비교 | candidate ranking의 AI 가치 지지 |
| M69/M71 | Nepal 회랑·산사면 S2-only discovery | 수색 lead; label 없는 피해 탐지 아님 |
| M70/M72/M74 | 최초 Nepal S1+S2 live 분석 | S1 전처리 계약 위반으로 전부 폐기 |
| M75 | Sentinel-1 linear→dB 누락 발견·영향범위 감사 | 실패 계보와 재현성 기여 |
| M76 | dB-corrected 5-anchor·27-window 재실행 | 사전등록 기준 미달; live detection 없음 |
| M77 | Tadi Khola 잠정 음성 대조 | 개발 control로 유효; confirmatory specificity 아님 |
| M78 | Sen12 S1-only/S2-only/S1+S2 분해 | S1은 2/7에서 작동; fusion gate 0/7 |

## 현재 AI가 실제로 한 일

1. Sentinel-2 12-band 및 Sentinel-1 VV/VH 시계열을 OLMoEarth의 768-d 공간 token으로 변환했다.
2. pre/post token의 cosine Δz를 계산해 회랑·산사면의 검토 순위를 만들었다.
3. 같은 위치의 평시 transition과 대조해 강한 prospective Nepal 양성 주장을 기각했다.
4. 과거 라벨 지역에서 S2-only·S1-only·S1+S2 표현의 AUROC를 같은 라벨에 비교했다.

OLMoEarth가 하지 않은 일은 수계선 생성, 뉴스 판독, 지진 원인 판정, runout 속도·수심 계산,
사망·질병 예측이다.

## M76 — 계약을 고친 Nepal live 결과

최초 실행은 Planetary Computer S1 RTC linear intensity에 필요한 `Sentinel1ToDecibels`가 빠져
있었다. 이를 고쳐 5-anchor 12모드와 회랑 3모드를 다시 계산했다.

- 5-anchor: 사건 token 비율이 모든 anchor에서 matched placebo 최대보다 작음.
- 27-window S1+S2: 사전등록 자체 임계 기준 후보 0.
- S1-only dB: w24가 다른 위치보다 크지만 자기 평시 변동을 넘지 못함.

따라서 현재 허용 문장은 `contract-correct Nepal prospective detection was negative`다. Devighat·
Bidur 등의 순위는 review order로는 남길 수 있지만 피해 증거로 승격하지 않는다.

## M77 — Tadi Khola 대조군을 어떻게 읽어야 하나

Rishing은 8월 27일 관측 가능 비율이 0이라 대조군으로 부적격이었다. 네 후보 중 관측성이 가장 좋은
Tadi Khola를 C로 교체했다.

| 값 | 재계산 결과 |
|---|---:|
| 8/27 관측 가능 token | 3461/4096 = 84.50% |
| 사건 평균 Δ / 평시 평균 Δ | .128665 / .124548 |
| 회랑 공통 p99=.281885 적용 | 124/3461 = **3.58%** |
| control-local p99=.347933 적용 | 19/3461 = **0.55%** |
| 회랑 1위 v003 | **25.43%** |

3.58%는 회랑과 같은 threshold를 쓴 비교값이고, 0.55%는 control 네 곳만으로 threshold를 다시
맞춘 내부값이다. 두 숫자를 섞지 않는다. Tadi는 보도된 사건이 없는 잠정 control이지, 현장 검증된
`no change` 라벨은 아니다. 또한 결과가 아니라 관측성으로 골랐지만 사후 선택된 개발 control이므로
최종 specificity를 재는 untouched control로 쓰지 않는다.

## M78 — 레이더 이슈를 어디까지 해결했나

M78은 Sen12의 7개 적격 지역, 690패치에서 S1 ascending dB를 사용했다. Indonesia와 Thrissur는
pre/post에 서로 다른 S1 4시점을 확보하지 못해 제외했다.

| 질문 | 결과 | 판정 |
|---|---:|---|
| S1+S2 − S2 ≥ +.03 | 0/7 | fusion 기여 실패 |
| S1+S2가 수치상 양수 | 7/7, 최대 +.014 | 작은 기술통계 |
| S1-only AUROC ≥ .70 | 2/7 | 조건부 viability |
| S1-only OLMo > classical | 3/7 | Alaska는 절대 AUROC .553이라 작동 근거 아님 |

Hokkaido는 .768 vs classical .717, Hiroshima는 .731 vs .609다. 그러나 패치와 시간 선택을
S2의 가장 맑은 pre/post 4시점으로 했으므로 **cloud-obscured subset에서의 구조 성능을 직접 측정한
실험은 아니다**. “RADAR THROUGH CLOUD”는 센서 가능성에 대한 제품 문법이지, 현재 논문의 확증
문장으로 쓰면 안 된다.

또한 지역별 AUROC는 spatial token을 pooling했고 spatial-block confidence interval, seed 반복,
두 번째 GeoFM control이 없다. 현재 결론은 `S1 representation value is heterogeneous and viable in
2/7 regions under this recipe`까지다.

## 검증 수준

| 항목 | 수준 | 근거 |
|---|---|---|
| 입력·출력·코드 계보 | L1 재현 | manifest, SHA, code snapshot |
| Nepal 내부 placebo | L2 내부 대조 | M76 matched transition |
| Tadi negative control | L2 개발 대조 | M77, 현장 label 없음 |
| historical S1/S2 AUROC | L3 public label | M73/M78, 단 CI 부족 |
| Nepal 피해 정확도 | 미도달 | 독립 polygon/field label 없음 |
| 물리 runout | NOT RUN | DEM·source volume·rheology ensemble 없음 |

기계 감사는 `python code/audit_nepal_m77_m78.py`로 재실행한다. 출력은
`artifacts/nepal_m77_m78_audit.json`이며 M77 두 threshold와 M78 7지역/690패치 gate를 해시와 함께
고정한다.

## 다음 실험 우선순위

1. **M79 cloud-stratified radar test**: 모델 결과를 보기 전에 S2 관측성을 low/medium/high로 동결하고,
   S1-only가 low-optical stratum에서 classical보다 실제로 회복하는지 region-macro·spatial CI로 측정한다.
2. **Nepal off-river S1+DEM**: orbit·incidence angle을 맞춘 여러 평시 transition을 확보한 뒤 발원·지류·
   barrier-lake 후보를 탐색한다. M76의 한 transition 임계를 재사용하지 않는다.
3. **Untouched controls**: Nepal의 보도 밖 계곡 10곳 이상을 embedding 열람 전에 동결하고 공통
   threshold의 false-candidate area를 측정한다.
4. **Physics**: source geometry·volume 범위가 확보된 뒤 r.avaflow ensemble을 실행하고, OLMo Δz는
   물리 파라미터가 아니라 관측 likelihood로만 사용한다.
5. **Main-track 보호**: Nepal sidecar가 Presto matched control·한국 untouched transfer라는 CVPR
   임계경로를 다시 막지 않게 한다.

## 허용 주장 / 금지 주장

| 허용 | 금지 |
|---|---|
| OLMo frozen representation은 여러 지역에서 raw baseline보다 전이성이 있었다 | OLMo가 모든 EO 모델보다 우월하다 |
| S2-only Δz는 historical labels에서 고전 변화량보다 강했다 | Nepal 피해를 성공적으로 검출했다 |
| S1-only OLMo는 2/7 지역에서 .70 AUROC를 넘었다 | 레이더가 일반적으로 구름 아래 피해를 탐지한다 |
| Tadi는 회랑 후보보다 낮은 개발 음성 대조다 | Tadi가 현장 검증된 무변화 지역이다 |
| 물리 결합 구조가 설계됐다 | runout·수심·도달시간을 계산했다 |

## 근거 파일

- `MEASURED_FINDINGS.md` M65·M73·M75–M78
- `artifacts/nepal_m77_m78_audit.json`
- `artifacts/corridor_s2_candidates/embed_ctrl/report.json`
- `artifacts/corridor_s2_candidates/embed_scan_v2/report.json`
- `artifacts/sen12_radar_value/report.json`
- `code/audit_nepal_m77_m78.py`
- `code/sen12_radar_value.py`

UX 구현은 이번 감사에서 수정하지 않았다.
