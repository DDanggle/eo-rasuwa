# Nepal OLMo provenance and risk audit — 2026-08-29

> **2026-08-30 갱신**: M76의 최종 판정은 contract-correct Nepal 5-anchor·27-window 모두
> 사전등록 기준 미달이다. M77 Tadi control과 M78 radar 분해를 포함한 현재 canonical 상태는
> `docs/NEPAL_OLMO_RESEARCH_STATUS_2026_08_30.md`다. 이 문서는 8월 29일 입력계약 감사 시점의
> 계보를 보존한다.

## 결론

이 프로젝트에서 OLMoEarth가 한 일은 위성 cube를 공간 표현으로 바꾸고, 같은 위치의 평시 변화와
사건 후 변화를 비교해 **검토할 창을 압축한 것**이다. 수계선, 뉴스, 물리 애니메이션, 보건 문구는
OLMo 출력이 아니다. 현재 Nepal prospective 결과는 음성에 가깝고, historical transfer 결과는 강하다.

## 산출물 계보

| 증거 | 입력 | 출력 | 상태 |
|---|---|---|---|
| Nepal corrected corridor | 27창 × 3 arm × S1+S2 4기간 | **81 × 768×64×64** | sealed, screening |
| Nepal old five-anchor | 5창 × S1+S2 | dB 변환 없는 embedding | **superseded** |
| Nepal S2 discovery | 100창 S2-only | 47 ranked / 53 abstain | lead generation |
| Tadi control (M77) | S2-only 5-date, putative no-event | 공통 임계 3.58% / local 임계 0.55% | development control |
| Sen12 radar (M78) | 7지역 690패치 S1-only/S2/fusion | S1 ≥.70 2/7; fusion gate 0/7 | conditional viability |
| Sen12 historical Δz | 9 적격 과거 재해 지역 | AI vs classical AUROC | 9/9 non-inferior, 8/9 +0.05 초과 |
| Sen12 frozen transfer | 8 held-out regions, 3 seeds | region-macro segmentation | OLMo .272 vs raw .197; 6/8 wins |
| Physics | DEM/source/rheology | 없음 | **not run** |

## 왜 현재 결과도 의미가 있는가

EO 모델이 raw 모델보다 좋을 수 있다는 사실 자체는 새롭지 않다. 여기서 유의미한 것은 세 가지다.

1. 실제 재난의 sparse·cloudy·multi-sensor stream에서 입력계약을 어기면 그럴듯한 가짜 결론이 생겼고,
   공식 계약으로 재실행하자 그 결론이 사라졌다.
2. 모델의 역할을 피해 예언이 아니라 `review-area reduction under abstention`으로 좁혀 검증 가능하게 했다.
3. 실패도 provenance와 UI 상태로 보존해, 새 장면 도착→계약 검사→forward→후보→외부 검증의 운영
   경계를 구현했다.

## 위험 후보 큐와 소유 모델

| 큐 | 후보 생성 | 다음 검증 | OLMo 역할 |
|---|---|---|---|
| channel/debris change | corrected S1+S2 Δz | 다중 평시·공식 polygon | 표현/순위 |
| off-river slope failure | S1+DEM grid | 고해상도/현장 inventory | S1 표현 + 후보 압축 |
| barrier lake/blockage | SAR·water extent·terrain | 수위/official footprint | late-fusion feature |
| runout/arrival | r.avaflow, D-Claw | post-event satellite | 관측 likelihood, 직접 물리값 아님 |
| road/health access | network GIS·공식 시설 상태 | 현장·기관 보고 | 필요시 EO 변화 후보만 공급 |

## 완전 검증 가능성

코드와 입력·출력의 계보는 전부 검증할 수 있다. 반면 라벨이 없는 실제 사건의 “정답”은 코드만으로
검증할 수 없다. 따라서 검증 수준을 분리한다.

- L0 존재: STAC item·footprint·timestamp.
- L1 재현: checksum·input contract·code snapshot·output shape.
- L2 내부 대조: 동일 위치 placebo·센서/계절 stratification·abstention.
- L3 독립 대조: 공식/현장 polygon, blind evaluation.
- L4 운영 가치: 같은 recall에서 검토 면적·analyst minutes·invalid action 감소.

현재 Nepal은 L2 screening까지, Sen12 historical 실험은 라벨이 있어 L3까지 왔다. M78은 S2-clear
시점으로 표본을 고른 뒤의 S1 viability라 cloudy-stratum 확증은 아니다. 물리는 L0도
아직 시작하지 않았다.

## 다음 실행 우선순위

1. dB-corrected S1+DEM off-river grid와 barrier-lake 후보를 만든다.
2. 평시 전이를 계절·orbit별 최소 20개로 늘려 empirical tail과 calibration을 만든다.
3. 독립 피해경계를 확보하기 전 후보 순위·threshold·metric을 동결한다.
4. r.avaflow source-volume/rheology ensemble을 실행하고 위성/OLMo likelihood로 재순위화한다.
5. Presto 또는 다른 GeoFM을 동일 입력·동일 decoder·동일 seed로 대조해 OLMo 고유 이점을 분리한다.

이 순서가 끝나야 “다른 위험군을 찾는다”, “시뮬레이션과 결합한다”, “OLMo가 운영 판단을
개선한다”를 각각 독립적으로 주장할 수 있다.
