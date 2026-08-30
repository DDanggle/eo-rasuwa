# Nepal Live Twin — AI가 실제로 한 일

> 2026-08-29 기준. 이 문서는 웹 UI, 과학 계산, 아직 실행하지 않은 계획을 분리한다.

## 결론

현재 시스템에서 **실제로 실행된 AI**는 세 가지다.

1. Nepal 사건 전 Sentinel-1/2 시계열을 frozen OLMoEarth v1에 통과시켜 공간 임베딩을 생성했다.
2. 별도의 8지역 산사태 데이터에서 frozen OLMoEarth 표현 위에 작은 segmentation decoder를 학습해 raw UNet3D와 전이를 비교했다.
3. 과거 3개 사건에서 사건 전후 OLMo 임베딩 cosine delta가 산사태 위치를 구분하는지 파일럿 측정했다.

반대로 지도, 스토리, Rust/WASM 입자 애니메이션은 **AI 결과가 아니다**. 이들은 위 계산의 provenance와 현재 관측 상태를 전달하는 제품 계층이다. Nepal 사건 후 OLMo 임베딩, Presto full control, r.avaflow/D-Claw 계산, 보건 위험 모델은 아직 실행하지 않았다.

## 1. Nepal에서 실행한 표현 계산

입력은 5개 anchor의 `S1 + S2 × 4 periods` cube다. 각 cube는 밴드, 시간, CRS, transform, 픽셀 checksum을 봉인한 뒤 OLMoEarth v1 Base frozen encoder에 넣었다.

```text
sealed S1/S2 tensors
        │
        ▼
frozen OLMoEarth v1 Base
        │
        ▼
768 channels × 64 × 64 spatial tokens, 40 m/token
```

- baseline 5개 + 사건 전 placebo A 5개 + placebo B 5개 = **15개 embedding GeoTIFF**
- 각 파일은 `float32`, `768×64×64`, CRS `EPSG:32645`
- 각 manifest와 파일은 SHA-256으로 봉인됨
- 할 수 있는 일: pre-event reference, 유사 지역 검색 query, future post-event delta의 기준
- 할 수 없는 일: 피해 분류, 수심, 유속, 도달시간, 질병 또는 사망 추론

실물 근거:

- `artifacts/external_data/nepal_olmo_live_v1/materialized/baseline/embedding_manifest.json`
- `artifacts/external_data/nepal_olmo_live_v1/materialized/placebo_a/embedding_manifest.json`
- `artifacts/external_data/nepal_olmo_live_v1/materialized/placebo_b/embedding_manifest.json`

## 2. AI가 task를 푼 방식: frozen representation transfer

OLMo 자체가 산사태 mask를 바로 출력한 것이 아니다.

```text
S1/S2 sequence ──► frozen OLMo encoder fθ ──► spatial embedding z
                                                    │
                                                    ▼
                                      trained small decoder hφ
                                                    │
                                                    ▼
                                          landslide segmentation
```

비교 arm은 raw 시계열을 처음부터 학습하는 UNet3D였다. 8개 held-out region, 3 seeds, 동일 region-macro 판정에서:

| arm | positive-tile macro IoU |
|---|---:|
| frozen OLMo reuse + small decoder | **0.272** |
| raw UNet3D | 0.197 |

OLMo reuse가 6/8 지역에서 이겼고 region-macro 격차는 +0.076이다. 이것은 **사전학습 표현을 재사용하면 제한된 downstream 학습으로 지역 전이가 개선될 수 있다**는 증거다. 그러나 Presto를 같은 입력·decoder 계약으로 돌리기 전에는 OLMo 고유 우월성이라고 할 수 없다.

근거: `artifacts/confirmatory_8region_summary.json`.

## 3. 변화 후보를 만드는 방식

과거 사건 파일럿은 사건 전 4시점과 사건 후 4시점을 각각 OLMo에 넣고, 공간 token마다 cosine distance를 계산했다.

\[
d(x,y)=1-\frac{z_{pre}(x,y)\cdot z_{post}(x,y)}{\|z_{pre}(x,y)\|\|z_{post}(x,y)\|}
\]

| 지역 | event AUROC | pre/pre placebo AUROC |
|---|---:|---:|
| Hokkaido | 0.853 | 0.564 |
| Hiroshima | 0.952 | 0.602 |
| Dominica | 0.605 | 0.433 |

두 지역에서는 강하고 Dominica에서는 약하다. 따라서 현재 허용되는 주장은 `historical candidate-localisation feasibility`뿐이다. Nepal 검증이나 범용 landslide detector 주장은 금지한다.

또한 pre-event embedding만으로 미래 산사태 위치를 예측하는 leave-one-region-out probe는 실패했다. 이 시스템은 **재해 예측기**가 아니라 새로운 관측이 들어온 뒤 검토 후보를 줄이는 표현·triage 시스템이다.

## 4. Nepal live 연결은 어디까지 왔나

```text
08/28 Sentinel-1 official footprint: 5/5 anchors covered
                       │
                       ▼
rslearn provider selection: still selects 08/24
                       │
                       ▼
post-event cube: not materialized
                       │
                       ▼
Nepal live OLMo Δ: not run
```

따라서 현재 화면의 `WAIT`는 AI가 실패했다는 뜻이 아니라 입력 계약이 닫히지 않아 계산을 거부했다는 뜻이다. provider가 08/28을 5/5 anchor에서 선택하면 `materialize → seal → frozen OLMo embedding → patch-wise Δ → placebo comparison` 순서로 연다.

## 5. 다른 Earth model과의 연결

모델을 OLMo 입력 채널에 억지로 붙이지 않는다. 가장 먼저 해야 할 결합은 다음 두 가지다.

1. **Matched control:** 같은 Sen12 cube, 같은 decoder, 같은 seeds에서 OLMo와 Presto를 비교한다. 이 결과가 OLMo-specific value를 판정한다.
2. **Candidate cascade:** OLMo delta가 넓게 후보를 만들고, classical S1 log-ratio/NDWI, second GeoFM, 물리 feasibility가 후보를 줄인다.

```text
OLMo candidate recall
      + classical change
      + second-GeoFM agreement/disagreement
      + r.avaflow/D-Claw feasible runout
      + road/clinic/WASH exposure
                    ▼
             analyst review queue
```

이 구조의 AI 기여는 “멋진 지도”가 아니라 **같은 recall에서 false candidate area와 analyst minutes를 줄이는가**로 평가한다.

## 6. 다음 실험과 성공 조건

| 우선순위 | 실험 | 성공 조건 |
|---|---|---|
| P0 | Nepal post-event OLMo delta | exact-period seal 통과, mask-blind 실행, placebo보다 분리 |
| P0 | Presto matched control | 동일 cube/decoder/seed; OLMo 고유효과 또는 GeoFM 공통효과 판정 |
| P1 | candidate cascade | matched recall에서 false changed area 및 검토시간 감소 |
| P1 | physics observation loop | runout IoU, max-runout error, interval coverage 개선 |
| P2 | health/access priority | top-k broken-access recall, false urgent alert, time-to-first-action |

## 한 문장 포지셔닝

> OLMoEarth가 재해를 예언하는 것이 아니라, multi-sensor 관측을 재사용 가능한 공간 표현으로 바꿔 변화·유사사건 후보를 만들고, 물리 모델과 현장 검토가 그 후보를 반증하도록 하는 시스템이다.
