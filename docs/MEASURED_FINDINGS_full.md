# 측정 장부 — 실제로 잰 것만

최종 갱신: 2026-08-29

이 파일에는 **실행해서 나온 수치만** 넣는다. 계획·설계·문헌 판단은 넣지 않는다
(그건 `K_ALIGN_PROGRAM_NOTE.md`, `K_ALIGN_CVPR_READINESS_AUDIT.md`, `K_GAIN_AXES.md`가 맡는다).

각 항목은 **주장 / 근거파일 / 허용범위 / 아직 말할 수 없는 것**을 함께 적는다.

---

## 0. 한눈에

| # | 측정 | 판정 | 상태 |
|---|---|---|---|
| M1 | OlmoEarth v1↔v1.2 cross-release 검색 identity (제주 216) | **실패** — 사전등록 8 gate 전부 | 봉인 완료 |
| M2 | Major TOM 249k 두 제품의 paired 여부·계약 필드 | **PAIRED / 계약필드 8개 전부 부재** | 완료 |
| M3 | 밴드 순서 계약 불일치 dose–response (v1) | 단조 곡선 확보 | 완료 |
| M4 | R@1 취약성 반증 대조군 | **위협 기각** | 완료 |
| M5 | dose–response 릴리스 복제 (v1.2) | **복제 실패 → 일반 주장 철회** | 완료 |
| M6 | LFMC 인코더 교체(v1→v1.2) frozen-head 실험 | **설계 결함 발견 → 실험 재설계** | 진단 완료 |
| M7 | v1/v1.2 토큰화 계약과 로딩 환경 (C1) | **M1 자작 아님 확인 + 비대칭 발견** | 완료 |
| M8 | v1.2 mask 소비 경로 실측 (C2-A) | **게이트 6/6 통과 — M1 방어 완결** | 완료 |
| M9 | AI-Hub 71363 인벤토리·split 감사 | **공식 split 사용 불가 (valid 110/110 누수)** | 완료 |
| M10 | AOI 군집 spatial holdout 구축·동결 (C2-S) | **게이트 6/6 통과, 동결 완료** | 완료 |
| M11 | Sen12Landslides 접근 감사 (G-0) | **통과 — CC BY 4.0, 지역 단위 선택 수신 가능** | 완료 |
| M12 | annotation-process 감사 (G-A) | **16지역 중 13이 저자 교락, MMU 최대 1,916배** | 완료 |
| M13 | 한국 폴리곤을 Sen12 16지역과 같은 자로 측정 | **한국은 Höhn군과 호환. Italy는 최대 이질 짝** | 완료 |
| M14 | OlmoEarth modality 전수 조사 | **15개. 기상용 비공간 슬롯 `era5_10`이 이미 있음** | 완료 |
| M15 | GK2A 2km 격자 좌표계 역공학 | **4-point in-sample fit 0.896 — 좌표계 확인 주장 철회, 공식 KMA grid로 대체** | 종결/폐기 |
| M16 | KMA API Hub 공식 격자 접근·봉인 | **승인됨. Seal A 완료(격자 파일) / Seal B 미결(창 오프셋)** | 진행 |
| M17 | cross-region 산사태 검색 (OlmoEarth 임베딩) | **사전등록 판정 미검출 — 단 raw 대비 명확 우위(P@10 .538 vs .432)** | 완료 |
| M17 | ASOS 일자료로 `era5_10` 6변수 소급 확보 | **가능. 2022-04-17 실측 성공** | 완료 |
| M18 | apihub 활용신청 5건 실측 | **필요한 격자 API는 아직 403. ASOS 시간자료 열림** | 진행 |
| M19 | apihub 활용신청의 실제 단위 | **서비스가 아니라 개별 API 단위. 필요 목록 확정** | 완료 |
| M20 | 공식 KO 격자 확보 + 봉인 게이트 작동 | **V1·V2 통과, V4 실패 — `x0`가 해석 불가** | 진행 |
| M21 | ASOS 지점 → AOI 군집 결합 | **게이트 4/4. 중위 17.7 km** | 완료 |
| M22 | `era5_10` 6변수 60일 추출 | **5/6 커버리지 ~100%. 강수만 99.1% 공백** | 완료 |
| M23 | G-P pilot 1차 (8 epoch, 1 fold) | **개발 관측. AUPRC 표본추출 결함·test 노출로 확정표에서 제외** | 보존/제외 |
| M24 | 공식 저장소 binary benchmark와의 비교 가능성 | **비교 불가 — task·split·입력·학습이 다름. 난이도 순서도 단정 금지** | 정정 완료 |
| M25 | G-P strict 개발 pilot 독립 복구 | **P4 IoU는 P2-tiny 초과, AP는 78.7%. G-P는 strong baseline 부재로 BLOCKED** | 개발 측정 완료 |
| M26 | 결정성 × 공식성 충돌 범위 실측 | **pooling backward 3개만 막힘. conv3d로 대체 가능** | 완료 |
| M27 | 공식 구조는 이미 결정적 — 치환 1개가 수학적으로 동일 | **구조 변경 0. diff 3.3e-16** | 완료 |
| M28 | AI-Hub 원천 영상 정체 + STAC 물질화 게이트 | **RGB uint8 3밴드였음. STAC 게이트 4/4 통과** | 완료 |
| M65 | frozen-v2 확증 8-region region-macro | **P4 .2722 > P2 .1966 > P3 .1834; P4−P2 +.0756, 지역 승리 6/8** | 봉인 집계 완료 |
| M75 | Nepal S1 입력계약 결함 | **기존 S1 포함 주장 폐기; 선형 intensity를 dB 계약으로 재실행 필요** | 결함·영향범위 확정 |
| M76 | Nepal dB 교정 재실행 | **5앵커·27창 사전등록 기준 미달; live detection 주장 없음** | 봉인 완료 |
| M77 | Tadi Khola 잠정 음성 대조 | **공통 임계 3.58%, control-local 임계 0.55%; 현장 무변화 라벨은 없음** | 개발 대조 완료 |
| M78 | S1-only·S1+S2 radar value | **S1-only ≥.70은 2/7; fusion +.03 gate는 0/7** | 7지역 690패치 완료 |

**아직 confirmatory하게 측정하지 않은 것**: 두 번째 frozen GeoFM과의 matched 비교,
한국 공공데이터의 **표현 기여**(접근·인벤토리·split 감사는 M9·M10에서 했으나 모델 성능 기여는 0),
스위스·네팔 산악 데이터, 압축(PQ/int8) 하에서의 거동, label-free region action prediction.

---

## M1. 릴리스 전환에서 검색 identity가 깨진다

**근거**: `artifacts/release_audit_full216_v1/analysis_strict1/`

- 모집단: 제주 54 windows × 2023–2026 = **216 site-years**, 입력 5,616파일 56.68 GB SHA-256 고정
- split: calibration 30위치 / embargo 6 / **sealed test 16(64건)** / disclosed-audit 2

| bridge | v1.2→v1 R@1 | v1→v1.2 R@1 |
|---|---:|---:|
| native same-release ceiling | 1.0000 | 1.0000 |
| identity | **0.0000** | **0.0000** |
| calibration mean shift | 0.00024 | 0.0000 |
| translated Procrustes | 0.49097 | 0.43604 |
| affine ridge | 0.69727 | 0.60889 |

사전등록 4방법 × 2방향 **8 gate 전부 실패**. 동시에 pooled CKA **0.97857**,
거리 Spearman **0.95251**, 그런데 동일 token raw cosine **−0.00860**.

실행비 비대칭도 기록됐다: v1 3,756.12초(55.26 crops/s, peak 4,291 MiB) vs
v1.2 2,250.12초(92.25 crops/s, peak 2,719 MiB) = **1.67×**.

- **말할 수 있는 것**: 같은 입력에서 릴리스만 바꾸면 좌표계 identity가 깨진다. 관계구조는 남는다.
- **말할 수 없는 것**: task 정확도, 구름 강건성, 공공데이터 효과, 한국 일반화.
  이 sealed 64는 이미 결과를 봤으므로 **새 방법의 test로 재사용 금지**.

---

## M2. 공개 임베딩 제품 두 개는 paired다. 그러나 계약이 기계에 안 보인다

**근거**: `artifacts/results/majortom_contract_audit.json`
**대상**: `Major-TOM/Core-S2L2A-249k-OlmoEarth-Base`, `Major-TOM/Core-S2L2A-249k-Clay-v1_5`

### 조인

| 조인 키 | 1:1 | 교집합 |
|---|---|---:|
| `unique_id` | **False** | **0** |
| `grid_cell + product_id` | True | **248,719** |
| `grid_cell` | True | 248,719 |

두 데이터셋 모두 248,719행, **동일 스키마 15컬럼**, 첫 행들의 `grid_cell`·`product_id`가 일치.
그런데 **`unique_id`는 교집합이 0**이다 — 데이터셋별 content hash이지 공유 chip 식별자가 아니다.
이름과 스키마 위치가 같아서 **조인 키로 쓰면 조용히 빈 결과가 나온다**(`unique_id_is_a_trap: true`).

### 계약 필드

기계가 읽을 수 있는 스키마에 **8개 전부 부재**:
`model_weights_hash`, `acquisition_dates`, `temporal_recipe`, `band_order`,
`normalization`, `pooling`, `input_content_hash`, `output_content_hash`.

실제로는 두 제품이 다음에서 다르다 — 차원 768 vs 1024, pooling **unmasked token 평균 vs CLS**,
밴드 **12 vs 10**(Clay는 B01·B09 없음), 정규화 OlmoEarth normalizer vs Clay mean/std.
**이 차이는 데이터셋 카드의 산문에만 있다.**

- **말할 수 있는 것**: paired cross-model 실험대가 공개 자산으로 존재한다(총 약 2 GB, CC-BY-SA-4.0).
  그리고 출시된 공개 제품에 계약 메타데이터가 기계 판독 형태로 없다.
- **말할 수 없는 것**: 이건 cross-**family**이지 release pair가 아니다(Major TOM의 OlmoEarth
  릴리스는 하나뿐). 밴드·pooling·정규화가 달라 **모델 우열 비교 불가**.
  chip당 벡터 하나뿐이라 **token/공간 수준 분석 불가**. 라벨 없음.
- **미확인**: SatCLIP·SigLIP·DINOv2·FarSLIP·MMEarth·AlphaEarth·UniverSat의 계약.
  `grid_cell` 단독 조인은 이 subset에서 우연히 1:1일 뿐 **일반 조인 키로 쓰면 안 된다.**

---

## M3. 계약 불일치의 용량–반응 (OlmoEarth v1)

**근거**: `artifacts/results/contract_dose_v1_analysis.json`
**설계**: `config/olmo_release_v1_legacy.yaml`이 밴드 순서를 두 곳에 선언한다는 점을 이용 —
`data.inputs.sentinel2_l2a.bands`만 k쌍 치환하고 정규화기 `band_names`는 그대로 둔다.
정규화 통계가 다른 밴드에 붙지만 파일·차원·실행은 정상이다.
**대상**: disclosed-audit smoke **8 site-years** (sealed 64는 건드리지 않음), 원본 raster 재사용.

**타당성**: dose 0이 frozen `embeddings_audit_v1_legacy`와 **byte-identical 8/8**.
→ dose ≥1의 차이는 전부 밴드 순서 불일치에 귀속된다.

| dose | 이동칸 | same-token cos | linear CKA | dist Spearman | **R@1** |
|---|---:|---:|---:|---:|---:|
| 1 | 2 | +0.9643 | 0.9923 | +0.9617 | 0.9818 |
| 2 | 4 | +0.9584 | 0.9873 | +0.9275 | 0.9246 |
| 3 | 6 | +0.9430 | 0.9797 | +0.8925 | 0.6019 |
| 6 | 12 | +0.9145 | 0.9720 | +0.8318 | 0.2456 |
| reverse | 12 | +0.8628 | 0.9595 | +0.7743 | 0.1613 |

- **말할 수 있는 것**: 용량–반응이 단조롭다. 계측기가 작동한다.
  **dose 6과 reverse는 이동 칸수가 똑같이 12인데 손상이 다르다** — 이동 개수가 아니라
  이동 거리가 중요하며, 단순 카운트로 손상을 예측할 수 없다.
- **말할 수 없는 것**: R@1은 자기검색(표현 프록시)이지 task 정확도가 아니다.

---

## M4. R@1은 취약한 지표가 아니다 (반증 대조군)

**근거**: `artifacts/results/dose_brittleness_control.json`
**동기**: 한 window의 토큰이 공간적으로 인접해 거의 같다면, 작은 섭동만으로 최근접이 넘어가
M3의 R@1 붕괴가 `표현이 깨졌다`가 아니라 `지표가 원래 잘 깨진다`가 된다.

dose 0 임베딩에 크기를 아는 Gaussian 잡음을 넣었다.

| 잡음 | same-token cos | linear CKA | **R@1** | 오검색 |
|---:|---:|---:|---:|---|
| 0.01 | +0.9999 | 1.0000 | 1.0000 | 0건 |
| 0.1 | +0.9950 | 0.9967 | 1.0000 | 0건 |
| **0.3** | **+0.9577** | **0.9505** | **1.0000** | **0건** |

`smallest_noise_matching_dose6 = None` — **시험한 어떤 잡음도 dose 6의 R@1(0.2456)을
재현하지 못했다.** 30% 잡음에서도 4,096 토큰 전부 자기 자신을 찾았다.

- **말할 수 있는 것**: 위협 기각. M3의 R@1 붕괴는 지표 취약성이 아니라 **구조적 이동**이다.
  덤으로 `토큰이 인접해 거의 같다`는 우려도 틀렸다 — 토큰은 임베딩 공간에서 충분히 분리돼 있다.
- **v1에 한정한 관측**: 잡음 0.3은 CKA 0.9505 / R@1 1.0000인데, band-order dose 6은
  CKA 0.9720 / R@1 0.2456이다. **CKA 기준으로는 무해한 쪽이 더 달라 보인다**(순서 역전).
  단 아래 M5에 의해 **이것을 일반 주장으로 쓰지 않는다.**

---

## M5. 복제 실패 — `진단 눈멂` 일반 주장을 철회한다

**근거**: `artifacts/results/contract_dose_v12_analysis.json`,
`artifacts/results/overnight_complete.json`
**설계**: M3과 동일한 축·동일한 8 site-years를 **OlmoEarth v1.2**에서 반복.
**타당성**: v1.2 dose 0도 frozen `embeddings_audit_v1_2_legacy`와 **byte-identical 8/8**.

| dose | v1 CKA / R@1 | **v1.2 CKA / R@1** |
|---|---:|---:|
| 1 | 0.9923 / 0.9818 | **0.7928** / 0.7556 |
| 2 | 0.9873 / 0.9246 | **0.5274** / 0.1487 |
| 3 | 0.9797 / 0.6019 | **0.5193** / 0.0898 |
| 6 | 0.9720 / 0.2456 | **0.4172** / 0.0216 |
| reverse | 0.9595 / 0.1613 | **0.2749** / 0.0020 |

`blind_doses_by_release = {"v1": ["6","reverse"], "v1_2": []}`,
`replicates_across_releases = **False**`.

**v1.2에서는 CKA가 손상을 정확히 따라간다.** 눈멀지 않았다.

분석기에 사전 등록한 규칙(`모든 dose에서 CKA와 R@1이 같이 무너지면 W2 주장을 철회한다`)이
v1.2에 적용된다. 따라서:

- **철회**: `CKA는 계약 불일치에 눈멀었다` / `CKA의 순서가 역전된다`를 **일반 주장으로 쓰지 않는다.**
  v1에서 관측된 **모델 의존적 현상**으로만 기술한다.
- **유지**: 용량–반응 단조성(양 릴리스), 취약성 기각(M4), 하네스 타당성(양 릴리스 byte-identical).

### 대신 나온 탐색적 관측 — 승격하지 않음

같은 불일치에 **v1.2가 훨씬 취약하다**: dose 2에서 **6.2×**, dose 6에서 11×, reverse에서 80×.
운영적으로는 *파이프라인에 잠복한 밴드 순서 버그가 있을 때 v1→v1.2 업그레이드가 그 피해를
6~80배 키운다*는 뜻이다.

**승격하지 않는 이유**: 릴리스 2개는 `비교`이지 `법칙`이 아니고, **사전 등록되지 않았다.**
원인 가설(v1.2 표현이 밴드에 더 특화돼 순열이 전역 구조까지 흔든다)은 가설이며
effective rank·밴드별 ablation 민감도로 시험할 수 있다.

---

## M6. 미세조정은 파트너를 릴리스에 비가역적으로 결합시킨다

**근거**: `frozen_head_swap/frozen_head_swap.json`, `frozen_head_swap/encoder_finetune_diagnosis.json`
**의도**: 배포된 LFMC 모델의 인코더만 v1→v1.2로 올렸을 때 task가 얼마나 나빠지는지 측정.
`R@1=0`(좌표 호환성)과 task 실패 사이의 간극을 메우려 했다.

**실행**: 우리 학습 체크포인트(`epoch=33-step=22270`, test MSE 558.787)의 디코더 12키를 유지하고
인코더 231키를 릴리스 원본으로 교체해 키가 정확히 일치하는 병합 체크포인트를 만든 뒤
평소와 같은 `rslearn model test`로 평가했다.

**타당성 게이트 실패**: v1으로 병합한 대조군이 원본을 재현하지 못했다.

| arm | test MSE |
|---|---:|
| 원본 ep33 (참조) | 558.787 |
| v1 병합 재구성 | **1006.913** (|Δ| 448.126) |

**진단**: ep33의 인코더 텐서 **231개 중 206개가 HF 릴리스 원본과 다르다**
(최대 상대 L2 차이 0.0169, `blocks.*.attn.v.bias` 계열이 가장 큼). lfmc 레시피가
`FreezeUnfreeze(unfreeze_at_epoch=20)`로 백본을 해동하므로 ep33은 인코더까지 미세조정된 상태다.
병합이 그 13에폭을 원본으로 덮어써 성능이 절반으로 떨어졌다.

- **말할 수 있는 것**: end-to-end 미세조정된 배포 모델은 **인코더를 교체할 수 없다.**
  head와 인코더가 co-adapt돼 있어 릴리스 백본을 끼우면 즉시 붕괴한다(MSE 1.80배).
  따라서 파트너의 실제 선택지는 ① v1 유지 ② 전면 재미세조정 ③ 캐시 임베딩 + bridge 뿐이다.
  미세조정은 파트너를 릴리스에 **비가역적으로 결합**시킨다.
- **말할 수 없는 것**: 이 수치는 "v1.2로 올리면 1.8배 나빠진다"가 **아니다.**
  v1 대조군에서 이미 발생한 손해이므로 릴리스 효과가 아니라 **인코더 교체 자체의 비용**이다.
  v1.2 arm은 이 대조군이 무효이므로 실행하지 않았다.
- **재설계**: 논문 주제(아카이브 임베딩 재사용)에 맞는 설정은 **인코더 동결 + head 학습**이다.
  v1 동결 특징으로 디코더를 학습하고, 같은 디코더에 v1.2 동결 특징을 투입한다.
  두 arm 모두 "동결 인코더 + 같은 head"가 되어 바뀐 변수가 릴리스 하나로 통제된다.

## M7. M1은 자작이 아니다. 그러나 두 릴리스는 밴드 구조가 비대칭이다

**근거**: `release_tokenization_probe/release_tokenization_probe.json`,
`release_audit_p0/checkpoints.json`의 environment 기록
**질문 (C1)**: M1의 `R@1=0`이 v1.2를 잘못된 입력 계약으로 돌린 결과인가?

### 로드된 모델에서 직접 확인한 구조

| | v1 | v1.2 |
|---|---|---|
| 파라미터 | 88.96 M | **113.99 M** |
| S2 band group | override 없음 → rslearn 기본 **3 band_set** | **12밴드 단일 그룹** |
| `token_pooling` 기본값 | True | True |

rslearn `_prepare_modality_inputs`는 `num_band_sets`를 `Modality.get(m).band_sets`=**3**으로
계산한다. 릴리스와 무관하다. 즉 v1.2에는 mask 3-set과 model 1-group의 불일치가 존재한다.

**그럼에도 M1은 유효하다.** `token_pooling=True`가 시간·모달리티 축을 patch 단위로 pooling해
(model.py L373–377) 출력이 릴리스와 무관하게 공간 patch당 768-d 하나가 된다. 따라서
`same-token` 비교의 단위는 band group이 아니라 공간 patch이고, 두 릴리스 간 정의가 같다.

### 로딩 환경 — 재현에 필수인 사실

감사가 기록한 환경은 `rslearn 0.1.13 + olmoearth_pretrain 0.0.6`이다.

| 환경 | 패키지 | v1.2 로드 |
|---|---|---|
| `.venv` (uv.lock 고정) | rslearn 0.0.27 + `olmoearth_pretrain` 0.0.2 | **불가** |
| `.venv-master` (감사 환경) | rslearn 0.1.13 + `olmoearth_pretrain_minimal` 0.0.6 | 가능 |

`.venv`의 `ModelID`에는 v1 변종만 있고, `model_path`로 v1.2를 로드하면 원인 안내 없이
`RuntimeError: Error(s) in loading state_dict` — `per_modality_channel_embeddings.sentinel2_l2a`가
checkpoint `[1,192]` vs model `[3,192]`, `rope_mixed_freqs`·`pixel_proj`가 unexpected로 뜬다.
`.venv-master`의 `ModelID`에는 v1.1·v1.2 엔트리가 있다.

- **말할 수 있는 것**: M1은 로딩·계약 오류의 산물이 아니다. 밴드 순서도 v1.2 선언 순서와 일치했고
  (2026-08-24 확인), 구조 차이는 pooling으로 흡수된다. **재현에는 rslearn ≥0.1.x가 필요하며
  레포의 lockfile 환경으로는 v1.2 arm을 돌릴 수 없다.**
- **말할 수 없는 것**: (M8에서 해소됨 — forward 내부 mask 경로를 실측했다.)
- **파생 제약 (PhilEO P0 설계에 직접 영향)**: PhilEO S2는 10밴드로 `band_set 0+1`과 정확히 일치하고
  없는 B01·B09는 `band_set 2` 전체다. v1에서는 band_set 하나의 부재로 표현 가능하지만,
  **v1.2는 12밴드가 단일 그룹이라 같은 방식으로 표현할 수 없다.** 즉 10밴드 입력을 두 릴리스에
  **대칭적으로** 줄 방법이 없고, 어떤 처리를 하든 릴리스 의존적 차이가 주입된다.
  이것을 통제하지 못하면 P0의 task-risk 비교가 오염된다.

## M8. v1.2는 mask slice 0만 읽는다. band_set 2를 MISSING으로 표시해도 조용히 무시된다

**근거**: `mask_path_c2a/mask_path_c2a.json`, `code/probe_mask_path_c2a.py`
**환경**: rslearn 0.1.13 + olmoearth_pretrain_minimal 0.0.6 (M1을 만든 그 환경)
**설계**: 결정적 합성 입력 1개(32×32, T=2, 12채널, seed 20260824). 공간 위쪽 절반만 MISSING으로
표시해 "모든 토큰 masking" assertion을 회피했다. 사전 등록 게이트 6개.

| 게이트 | 내용 | 결과 |
|---|---|---|
| G1 | encoder 출력 S축: v1=3, v1.2=1 | PASS |
| G2 | rslearn 입력 mask S축 = 3 (릴리스 무관) | PASS |
| G3 | v1.2에서 slice 1·2를 MISSING → 출력 byte-identical | PASS |
| G4 | v1.2에서 slice 0을 MISSING → 출력 변화 | PASS |
| G5 | v1에서 slice 2를 MISSING → 출력 변화 | PASS |
| G6 | v1.2에서 slice 2 MISSING이 fast_pass만 끄고 출력은 동일 | PASS |

측정값:

| 릴리스 | num_bandsets | token shape | slice 0 MISSING | slice 1·2 MISSING | slice 2 MISSING |
|---|---|---|---|---|---|
| v1 | 3 | `[1,8,8,2,3,768]` | max\|Δ\| 5.38228 | 5.49309 | 4.79137 |
| v1.2 | 1 | `[1,8,8,2,1,768]` | max\|Δ\| 5.34337 | **0.0 (byte-identical)** | **0.0 (byte-identical)** |

**메커니즘 (설치된 소스에서 확인)**:
`flexi_vit.py` per-modality embedding 루프가 `for idx in range(num_band_sets)`이고
`num_band_sets = self.tokenization_config.get_num_bandsets(modality)` — 즉 **모델 쪽** 값이다.
v1.2는 1이므로 `modality_mask[..., 0]`만 읽히고 slice 1·2는 접근되지 않는다.

- **말할 수 있는 것**:
  1. M1의 same-token 비교는 유효하다. 두 릴리스 모두 pooling 후 공간 patch당 768-d 하나를 낸다.
     `R@1=0`은 토큰 개수를 임의로 대응시킨 결과가 아니다.
  2. **v1.2에서는 partial-group missingness를 표현할 수단이 없다.** band_set 2(B01·B09)를
     MISSING으로 표시하는 것이 v1에서는 실제 효과가 있고 v1.2에서는 완전히 무시된다.
  3. **G6 — 이 무시가 조용하다.** rslearn의 `fast_pass`는 입력 mask 3 slice 전체를 보고 결정되므로
     slice 2를 MISSING으로 두면 `fast_pass=False`로 바뀌어 pooling이 masked-average 경로로 간다.
     그런데 출력 mask는 S=1이고 MISSING이 없으므로 결과는 baseline과 byte-identical이다.
     사용자는 "밴드 부재를 선언했다"고 믿지만 아무 일도 일어나지 않았고, 경고도 없다.
- **말할 수 없는 것**: 이 측정은 합성 입력 1개다. 실제 PhilEO 타일에서 downstream 지표가
  어떻게 갈리는지는 별개(C2-B)다. `use_register_bottleneck_output` 경로는 시험하지 않았다.
- **논문 문구**: "R@1=0은 서로 다른 token 개수를 임의로 대응시킨 결과가 아니다. 두 릴리스 모두
  동일한 공간 patch마다 768차원 출력을 생성한다." 이것은 representation compatibility failure이며
  downstream task failure를 직접 의미하지는 않는다(그것이 C2-B의 질문이다).

## M9. AI-Hub 71363의 공식 split은 쓸 수 없다. valid 타일 110개 전부가 train과 겹친다

**근거**: `inventory/inventory_audit.json`, `inventory/split_leakage_audit.json`,
`code/build_aihub_inventory.py`, `code/audit_aihub_split_leakage.py`
**환경**: 네트워크 미사용. 수신한 zip만으로 판정했다.

### 먼저 — 내가 틀렸던 것

"678 타일 × 63 날짜"라고 썼다. **관측된 조합이 아니다.** Cartesian product로 만들면
42,714개의 인공 조합이 되고 원 분포와 다른 데이터셋이 된다. 실제는 다음이다.

| | 값 |
|---|---|
| 실제 (타일, 날짜) 쌍 | **2,699** |
| 고유 타일 | 594 (train 485 / valid 110) |
| 고유 날짜 | 60 (train 56 / valid 13) |
| 타일당 날짜 수 | 1 ~ 8 |
| 플랫폼 | SENTINEL-2A 1,961 / 2B 738 |
| WGS84 범위 | 125.14–129.59 E, 34.01–38.31 N |

수집 단위는 `(sample geometry, img_time, platform, original grid)`이며 곱집합이 아니다.

### A1 ID 조인 — 통과

메타데이터 3,000 · 라벨 2,700 · **교집합 2,699** (label_only 1, metadata_only 301).
`SA`/`SB` 접두는 두 쪽에 모두 있다(메타 SA 1,962 / SB 1,038). Major TOM식 교집합 0 함정은 없다.

### A2 기하 해석 — 추측을 제거했다

메타데이터 `coordinates`가 중심인지 좌상단인지 몰랐다. 라벨 폴리곤 범위와 대조해 판정했다.

| 가설 | 중위거리 |
|---|---|
| **upper_left** | **4.2e-05 m** (400/400 투표) |
| center | 7,240.77 m |
| lower_left | 10,240.00 m |

**좌상단이다.** 사실상 정확일치이므로 bbox는 `[x, y-10240, x+10240, y]`로 확정된다.

### split 누수 — 공식 split 사용 불가

| 게이트 | 결과 | 판정 |
|---|---|---|
| L1 tile_id 누수 | 공유 타일 1개 | FAIL |
| L2 날짜 누수 | 공유 날짜 9개 | FAIL |
| **L3 공간 중첩** | **642쌍, valid 타일 110/110 영향** | **FAIL** |
| L4 근접(1타일 폭 이내) | 646쌍 | FAIL |
| L5 AOI 군집 | 13군집 중 5개가 양쪽에 걸침 (최대 군집 180타일) | FAIL |

**valid 타일의 100%가 train 타일과 실제로 겹친다.** A2가 정확일치였으므로 bbox 계산
오류가 아니다. 타일이 설계상 중첩(sliding window)일 수 있으나, 그렇다면 결함은 타일링이
아니라 **분할 방식**에 있다.

- **말할 수 있는 것**: 이 데이터셋의 공식 train/valid split으로 낸 수치는 공간 누수로
  부풀려진다. 우리는 제공된 split을 쓰지 않고 **13개 AOI 군집 단위로 spatial holdout을
  직접 만든다.** 군집이 13개뿐이므로 leave-one-cluster-out이 자연스럽다.
- **말할 수 없는 것**: 중첩이 데이터 구축 의도인지 실수인지는 모른다(문서 미확인).
  누수가 실제 성능을 얼마나 부풀리는지는 아직 측정하지 않았다 — 누수 split과 우리 holdout을
  같은 head로 비교해야 수치가 나온다.
- **다음 조치**: 군집 단위 holdout을 먼저 만들고, test 군집을 **동결**한다.
  이미 탐색에 쓴 valid 300은 test로 쓰지 않는다.

## M10. AOI 군집 단위 spatial holdout — 동결 완료

**근거**: `artifacts/aihub71363_spatial_holdout.json`, `..._tile_assignment.jsonl`,
`..._loco_folds.json`, `code/build_aihub_spatial_holdout.py`
**전제**: M9에서 공식 split이 사용 불가로 판정됨 (valid 110/110 공간 중첩).

### 동결된 분할 (SHA-256은 타일 목록의 해시다 — 바뀌면 split이 바뀐 것)

| split | 군집 | 타일 | 관측쌍 | 벌목지 | 산사태 | sha256(앞16) |
|---|---|---|---|---|---|---|
| train | C01·C11·C13 | 393 | 1,733 | 131 | 56 | `50fdcb4b6b404d41` |
| val | C04·C09·C10 | 84 | 408 | 10 | 12 | `8e133c51db9b2eb5` |
| test | C02·C03·C05·C06·C07·C08·C12 | 113 | 542 | 26 | 22 | `3f44498758600c3f` |
| excluded | (C12 일부) | 4 | 16 | — | — | `e67c09a5b013cf73` |

합계 594 타일 / 2,699 관측쌍. `excluded`는 이미 집계 감사에 쓴 공식 valid 타일이라
test에서 뺐고, train으로 옮기면 공간 분리가 깨지므로 **어느 split에도 넣지 않았다.**

### 게이트 (사전 등록, 6/6 통과)

| | 내용 | 결과 |
|---|---|---|
| S1 | 군집 간 최소 이격 ≥ 1 타일 폭(10.24 km) | **20,480.0 m** |
| S2 | test가 두 희소 클래스를 모두 포함 | 통과 |
| S3 | val이 두 희소 클래스를 모두 포함 | 통과 |
| S4 | test에 기탐색 공식 valid 타일 없음 | 0건 |
| S5 | 모든 타일이 배정됨 | 594/594 |
| S6 | val·test가 희소 클래스마다 ≥10 타일 | 최소 10 |

### 도중에 고친 결함 세 개 (전부 기록에 남긴다)

1. **군집 간 거리를 bounding box로 쟀다.** 군집들이 지리적으로 맞물려 있어 extent는 겹치고
   `min_gap = 0`이 나왔다. **타일 단위 거리**로 다시 재니 정확히 20,480 m — union-find의
   연결 기준과 일치한다. 즉 구성상 보장된 성질을 잘못된 척도로 재서 놓칠 뻔했다.
2. **희소 클래스를 '존재 여부'로 셌다.** 그래서 val의 산사태가 4타일뿐이었다. '타일 수'로 바꿨다.
3. **test가 희소 군집을 먼저 독식했다.** 산사태 90타일 중 56이 대형 군집 C11·C13에 몰려 있어
   val 예산으로는 받을 수 없다. **두 split의 쿼터를 동시에 채우는** 규칙으로 바꿨다.
   예산을 특정 군집에 맞춰 바꾸는 것은 cherry-picking이므로 하지 않았다.

- **말할 수 있는 것**: 분할은 결정적이다(같은 입력 → 같은 분할, 사람의 선택 없음).
  군집이 13개뿐이므로 leave-one-cluster-out 13폴드도 함께 생성했다.
- **말할 수 없는 것**: 공식 split의 누수가 성능을 얼마나 부풀리는지는 **아직 측정하지 않았다.**
  같은 head를 두 분할에서 학습·평가해야 수치가 나온다 (C2-B에서 함께 잰다).
  test 군집의 희소 클래스 절대량(벌목 26 / 산사태 22 타일)은 작으므로, 신뢰구간을
  spatial bootstrap으로 반드시 붙인다.

## M11. Sen12Landslides 접근 감사 — G-0 통과

**근거**: `sen12landslides/audit/access_audit.json`, `code/audit_sen12landslides_access.py`
**출처**: HuggingFace `paulhoehn/Sen12Landslides` (실물 확인. 논문·검색 요약을 근거로 쓰지 않았다)

| 항목 | 실측 |
|---|---|
| 라이선스 | **CC BY 4.0** (`doi:10.57967/hf/5883`) — 파생물 공개 가능 |
| 총 용량 | 170.5 GB |
| harmonized S2 | **39.42 GB / 28 파트** |
| 파트 구성 | **지역별로 묶여 있다** (part01 = chimanimani 500개) → **필요한 지역만 수신 가능** |
| 패치 | 128×128 px @10 m, **15 timestep** |
| S2 밴드 | **B02–B12 (10밴드)** + SCL + MASK + DEM |
| 메타 속성 | `event_date`, `date_confidence`, `pre_post_dates`, `annotated`, `crs`, `center_lat/lon` |
| inventory | `inventories.zip` 22 MB, shapefile 1개 (74,956 폴리곤) |

**두 가지가 설계에 직접 영향을 준다.**

1. `data_harmonized`가 **ESA Baseline 04.00의 +1000 DN offset을 이미 보정**했다
   (2022-01-25 이후). 앞서 걱정한 PB04 문제를 데이터셋 저자가 처리했다.
   단 `data_raw`는 보정하지 않았으므로 **둘을 섞으면 안 된다.**
2. S2가 **B02–B12 10밴드로 B01·B09가 없다.** PhilEO와 같은 구조다. 즉 M8의 비대칭이
   여기서도 그대로 적용된다 — v1에서는 band_set 2 부재로 표현 가능하고 v1.2에서는 무시된다.
   설계가 정한 "v1 + B01·B09 band-group missing mask" 경로가 맞다는 뜻이다.

## M12. annotation 교락 — Sen12Landslides의 지역은 라벨 저자와 거의 같다

**근거**: `sen12landslides/audit/annotation_audit.json`, `code/audit_annotation_process.py`
**질문 (R2/G-A)**: leave-one-region-out 성능 하락이 지형 차이인가 라벨 차이인가?

### 측정 (inventory 74,956 폴리곤, 16지역, 저자 5명)

| region | 폴리곤 | MMU(p1) m² | median m² | 최다 저자 점유 |
|---|---|---|---|---|
| Italy | 47,522 | **62.9** | 409.8 | Ferrario 1.00 |
| DominicaMaria | 10,172 | 219.7 | 3,191.9 | Emberson 1.00 |
| Newzealand | 3,242 | 1,038.2 | 7,905.8 | Höhn 1.00 |
| Chimanimani | 2,513 | 441.7 | 2,813.4 | Höhn 1.00 |
| Kyrgyzstan1 | 2,405 | 2,230.3 | 8,640.2 | Höhn 1.00 |
| Hokkaido | 2,340 | 562.0 | 7,391.3 | Höhn 1.00 |
| Indonesia | 2,097 | 8,757.4 | 26,769.9 | Höhn 0.91 |
| USA_Alaska | 103 | **120,569.4** | 466,259.8 | Belair 1.00 |
| **Nepal** | **8** | 4,640.2 | 72,720.5 | Höhn 1.00 |

- **13/16 지역이 단일 저자 90% 이상** → leave-one-region-out은 부분적으로
  leave-one-**annotator**-out이다.
- **MMU 비가 최대 1,916배** (Italy 62.9 vs USA_Alaska 120,569). 10배 이상 차이나는 지역쌍 **50개**.
- median 면적이 409.8 m²(Italy) ~ 466,259.8 m²(USA_Alaska)로 **1,100배** 퍼져 있다.

### 내가 제안한 harmonization은 실패한다

전 지역 공통 면적 하한을 `max(MMU) = 120,569 m²`로 잡으면 Italy는 p99가 6,965 m²이므로
**사실상 전멸한다.** 단순 면적 하한으로는 조화가 불가능하다. 이 실패를 기록으로 남긴다.

### 해결 — 저자를 고정한 LOCO

Höhn et al. (2025) 단독으로 **14지역 16,306 폴리곤**을 덮는다.

| | 전체 저자 | **Höhn 단독** |
|---|---|---|
| 지역 | 16 | 14 (≥100 폴리곤 **11**) |
| MMU 비 | **1,916×** | **20×** |
| 공통 하한 8,821.8 m² 적용 | Italy 전멸 | 11지역 **15.2~99.0%** 보존, 합계 7,921 폴리곤 |

11지역: Chimanimani · China · Hiroshima · Hokkaido · Indonesia · Itogon ·
Kyrgyzstan1 · Kyrgyzstan2 · LanaoDelNorte · Newzealand · Thrissur

- **말할 수 있는 것**: annotation 교락을 **설계로 제거**할 수 있다. 저자 고정 11지역 LOCO는
  독립 표본 11개이고, 3국 LOCO(n=3)보다 신뢰구간을 만들 수 있다.
- **말할 수 없는 것**: 저자를 고정해도 MMU가 20배 남는다. 면적 하한의 보존율이
  Chimanimani 15.2%로 낮으므로, 하한값에 대한 **민감도 분석**이 필요하다.
  라벨 정확도 자체(폴리곤이 옳은가)는 검증하지 않았다.
### 이 교락이 원 논문의 결과에 실제로 닿는가 — 닿는다

원 논문(Sci Data 2025)을 확인했다.

- **Experiment 3에서 leave-one-cluster-out을 수행한다.** 6개 지리 군집:
  Americas / Europe / Africa / Central Asia / Southeast Asia / Oceania.
- 라벨 잡음은 인정한다 — *"the ground truth data was noisy, particularly in inventories
  derived from deep learning models"*. slope < 7% 제외 등 정제도 했다.
- **그러나 원 inventory 간 도화 기준(최소 도화 면적·상세도) 이질성에 대한 명시적 논의는 없다.**

우리 측정과 겹쳐 보면: inventory에 유럽 지역은 Italy 하나뿐이고 Italy = Ferrario 47,522
(전체의 63%, MMU 62.9 m²)다. 따라서 **Europe 군집을 hold-out하는 것은 사실상 한 저자를
hold-out하는 것**이고, 그 저자의 MMU는 다른 지역보다 최대 1,916배 작다.
Americas 군집도 DominicaMaria(Emberson) + USA_*(Belair)로 저자가 갈린다.

- **말할 수 있는 것**: 공개 benchmark의 지역 일반화 평가가 annotation 이질성과 교락돼 있고,
  원 논문이 이를 논의하지 않는다. M9(공식 split 공간 누수)와 **같은 종류의 benchmark validity
  결과**이며, 재현 스크립트가 있다.
- **말할 수 없는 것**: 원 논문의 6개 군집 각각의 정확한 지역 구성을 논문에서 확인하지
  않았다(우리 inventory 지역 목록으로 추정했다). 교락이 그들의 보고 수치를 **얼마나**
  바꾸는지도 측정하지 않았다 — 저자 고정 LOCO와 raw LOCO를 같은 head로 비교해야 나온다.

- **설계 변경**: **네팔은 이 inventory에서 폴리곤이 8개뿐이다.** 문서의 네팔 arm은
  Sen12Landslides로 성립하지 않는다. BIPAD/ICIMOD에서 따로 와야 하고 headline 지역이 아니다.

## M13. 한국은 Höhn 군집과 annotation 호환됨. Italy→Korea는 최대 이질 짝임

**근거**: `aihub/audit/korea_annotation_audit.json`,
`code/audit_korea_vs_sen12_annotation.py`, `code/korea_sliver.py`
**질문**: `Italy 학습 → Korea 적용` arm이 성립하는가. 한국을 저자 고정 LOCO에 넣을 수 있는가.

### 측정 대상

AI-Hub 71363 라벨 GeoJSON의 `ANN_CD=80`(산사태·토석류) 폴리곤 **8,350개 / 90타일**.
좌표가 EPSG:32652 미터라 shoelace로 면적을 바로 구했음. 재투영 안 했음.
`ANN_CD=70`(벌목지)도 같이 냈음 — 2,643개 / 167타일.

### 먼저 발견한 함정 — MMU가 0.046 m²로 나왔음

원인은 도화 기준이 아니라 **타일 경계 절단물**이었음.

| 면적 구간 | 개수 | 비율 |
|---|---|---|
| < 1 m² | 134 | 1.60% |
| < 100 m² | 150 | 1.80% |
| < 400 m² | 229 | 2.74% |

100 m² 미만 150개는 **전부 꼭짓점 4~5개짜리 사각형**임. 1024×1024 타일로 자를 때 생긴
조각임. 즉 `p1`을 MMU 대리로 쓰면 **클리핑 상태가 다른 데이터셋끼리 비교가 무효**가 됨.
Sen12Landslides inventory는 전역 shapefile이라 잘리지 않았고, AI-Hub는 타일 단위로 잘렸음.

**400 m² 하한을 걸면 2.74%만 버려지고 결과가 뒤바뀜.**

| | 필터 전 | **필터 후 (≥400 m²)** |
|---|---|---|
| n | 8,350 | 8,121 |
| MMU(p1) | 0.046 m² | **549.1 m²** |
| median | 5,410.8 m² | 5,731.8 m² |
| p99 | 281,983 m² | 290,935 m² |

### 한국의 자리 — Höhn 군집 한가운데임

| | MMU(p1) m² | median m² |
|---|---|---|
| Höhn 11지역 범위 | 216.2 ~ 8,757.4 | 2,813.4 ~ 46,104.1 |
| **Korea (필터 후)** | **549.1** | **5,731.8** |
| Italy (Ferrario) | 62.9 | 409.8 |
| USA_Alaska (Belair) | 120,569.4 | 466,259.8 |

한국은 MMU·median 모두 **Höhn 범위 안에 들어감**. Hiroshima(4,162)와 Kyrgyzstan2(5,512) 사이임.

### Italy → Korea 판정

| 비교 | 값 | G-A 임계 |
|---|---|---|
| MMU 비 (필터 후) | **8.7×** | 10× 미만 → 통과 |
| **median 비** | **14.0×** | — |
| Italy 점유율 | 전체 폴리곤의 **63%** | — |

**MMU 비만 보면 통과하지만 median 비가 14배임.** 즉 `MMU 비 ≥ 10×` 단독 기준은 불충분함.
분포 수준 비교(median 비 또는 log-면적 분포 거리)를 같이 걸어야 함.

- **말할 수 있는 것**:
  1. 한국을 저자 고정 LOCO의 **12번째 지역**으로 넣을 수 있음. annotation 호환됨.
  2. `Italy → Korea`는 **의도적인 최대 annotation-shift 짝**으로 쓰는 것이 정확함.
     라벨이 풍부한 곳에서 학습해 라벨이 없는 곳에 적용하는 현실 배치 시나리오와도 맞음.
  3. 면적 하한 400 m²는 **클리핑 정규화**이지 도화 기준 조화가 아님. 둘을 구분해야 함.
- **말할 수 없는 것**: 면적 분포가 비슷하다고 라벨이 같은 것을 가리킨다는 보장은 없음.
  현상 정의(산사태·토석류 vs debris flow)와 시점 의미(촬영일 vs event date)는 아직 대조 안 했음.
  한국 폴리곤의 정확도 자체도 검증 안 했음.
- **G-A 수정 사항 2개**:
  ① MMU 대리를 `p1` → **클리핑 정규화 후 p1**로 바꿈
  ② `MMU 비 ≥ 10×` 단독 판정 → **MMU 비와 median 비를 같이** 봄

## M14. OlmoEarth에는 기상 전용 비공간 modality 슬롯이 이미 있음

**근거**: `code/probe_modalities.py`, `.venv-master` (rslearn 0.1.13 + olmoearth_pretrain_minimal 0.0.6)
**질문**: 한국 위성·기상 자료를 넣으려면 새 modality를 만들어야 하는가?

### 등록된 modality 15개

| modality | band_set | is_spatial | tile_factor | 밴드 |
|---|---|---|---|---|
| `sentinel2_l2a` | **3** | True | 1 | B02B03B04B08 / B05B06B07B8AB11B12 / B01B09 |
| `sentinel1` | 1 | True | 1 | **vv, vh** |
| `landsat` | 2 | True | 1 | B8 / B1–B7,B9–B11 |
| `naip` / `naip_10` | 1 | True | 1 / **4** | R,G,B,IR |
| **`era5_10`** | 1 | **False** | **−256** | **2m-temperature, 2m-dewpoint-temperature, surface-pressure, 10m-u-component-of-wind, 10m-v-component-of-wind, total-precipitation** |
| `srtm` | 1 | True | 1 | srtm |
| `latlon` | 1 | False | 1 | lat, lon |
| `worldcover` / `worldpop` / `cdl` / `worldcereal` / `gse` / `openstreetmap_raster` / `wri_canopy_height_map` | 1 | True | 1 | (보조 레이어) |

### 결론 — 기존 슬롯은 후보일 뿐, source contract를 새로 검증해야 함

이것이 M8과 직결됨. 새 센서를 위해 아키텍처를 바꾸는 것이 아니라,
**이미 사전학습된 슬롯에 다른 출처의 자료를 넣었을 때 계약이 지켜지는가**가 질문임.

| 넣으려는 것 | 후보 슬롯 | 근거 |
|---|---|---|
| **아리랑 5호 (KOMPSAT-5)** | 직접 재사용 불가. 새 sensor adapter 또는 공통 VV-only baseline 후보 | K5는 **X-band 9.66 GHz·single polarization**, S1은 **C-band 5.405 GHz·통상 VV+VH**. 주파수·편파 계약이 다름 |
| **KMA ASOS 지상관측** | `era5_10`은 구조적 후보 | 변수 이름은 대응하지만 관측높이·단위·누적 강수·점→격자·u/v 변환이 달라 exact match가 아님 |
| GK2A 구름·에어로졸 | 대응 슬롯 없음 | CLD/AOD/FOG/COT/CT는 어느 슬롯에도 없음. `r_t`로 head 쪽에서 결합해야 함 |
| 차세대중형위성 4호 (5 m) | 없음 | GSD·밴드가 어느 슬롯과도 안 맞음 |

- **말할 수 있는 것**:
  1. `era5_10`이 **비공간(is_spatial=False, tile_factor=−256)** 슬롯이므로, 기상 시계열을
     받는 구조적 경로는 존재함. 그러나 ASOS를 넣어도 사전학습 분포 안이라는 뜻은 아님.
  2. **KMA ASOS 일자료는 이미 승인됐고 과거 이력이 있음.** GK2A 경량화 endpoint의
     D-1/D-2 창과 달리 소급 실험이 가능함. 따라서 retrospective forcing arm의 1순위는 ASOS임.
  3. 아리랑 5호는 `sentinel1`이라는 이름으로 재포장하면 안 됨. 현재 OLMo task config는
     Sentinel-1 IW의 `vv`,`vh` 두 밴드와 dB 변환을 요구하므로 K5 single-pol에서 fake VH를
     만들지 않는다.
- **말할 수 없는 것**: ASOS 관측값을 `era5_10`이 기대하는 단위·정규화로 맞출 수 있는지는
  **미확인**임. ERA5 total precipitation과 ASOS 강수의 시간 누적·단위도 같다고 가정할 수 없다.
  ERA5는 재분석 격자, ASOS는 지점 관측이므로 공간 보간이 필요하고 그 보간이 또 하나의 계약
  변경이다. K5↔S1은 주파수·편파·입사각·보정수준이 함께 바뀌는 cross-sensor stress test다.
  이 슬롯들에 다른 출처를 넣었을 때 M8식 조용한 무시가 일어나는지도 아직 시험하지 않았음.

## M15. GK2A 4-anchor 좌표 역공학은 판정 불가 — 공식 KMA grid로 대체

**근거**: `gk2a/_crs/grid_crs_test.json`, `code/solve_gk2a_grid_crs.py`,
`code/gk2a_offset_search.py`, 앵커 캐시 `gk2a/_crs/area_anchors.jsonl`
**문제**: 한반도(All) 응답에 CRS가 없음 (`gridKm=2.0 xdim=320 ydim=397 x0=63 y0=333` 뿐).
좌표를 못 붙이면 격자를 AOI에 쓸 수 없음.

### 당시 검정 설계 (사전 등록)

`Area` 계열이 행정동코드에 대해 `(lon, lat, value)`를 줌. 같은 시각 격자에서 그 위치의
칸 값을 뽑아 **일치율**을 봄. 구름탐지는 3클래스이므로 우연 수준은 약 0.33임.

| 일치율 | 판정 |
|---|---|
| ≥ 0.90 | 채택 |
| 0.50–0.90 | 오프셋 보정 후 재검정 |
| < 0.50 | 기각. 문서 확보 전까지 격자를 쓰지 않음 |

### 실측 결과와 재판정

| 단계 | 가정 | 일치율 |
|---|---|---|
| H1 | 동네예보 5 km 오프셋을 2 km로 환산 (XO2=107.5, YO2=340), y축 그대로 | **격자 밖** (전 관측 이탈) |
| H1′ | 같은 오프셋, **y축 뒤집음** | 0.385 (우연 수준) |
| **H2** | LCC 유지, 오프셋을 탐색 (xo·yo를 −200~400 / −100~700에서 전수) | **0.8958** (86/96) |

H2의 최적해는 `xo ≈ 124~125, yo = 664`, row-major, y축 안 뒤집음이었다. 최초 코드에는
cache key에서 `resultType`이 빠져 FOG Area가 CLD Area를 덮어쓴 채 CLD All과 비교될 수 있는
결함도 있었다. CLD만 명시적으로 filter한 재실행에서도 수치는 우연히 같은 0.8958(86/96)이었다.
그러나 96개 비교는
**고유 공간점 4개 × 24시각**이고, 두 offset을 같은 4개 지점으로 선택하고 평가했다. 범주별
기저확률도 균등 0.33으로 검증하지 않았다. 따라서 0.8958은 held-out projection score가 아니며,
LCC·저장순서·y축을 “확인”했다는 주장을 철회한다.

- **말할 수 있는 것**: 4-point fitted candidate가 86/96을 맞췄고, Area parsed row는
  192건(4지점 × CLD·FOG × 12슬롯 × 2일)이다.
- **말할 수 없는 것**: projection family, offset, row/column order, y direction의 외부 타당성.
- **대체 경로 발견**: KMA API Hub는 KO/2 km의 공식 lon·lat을 grid 저장순서대로 ASCII로
  조회하거나 NetCDF로 받는 endpoint를 제공한다. 좌표는 추정하지 않고 이 파일을 SHA-256 고정한다.
- **종결 기준**: 공식 lon/lat과 경량화 값이 모두 `320 × 397 = 127,040`이고 순서가 exact match한
  뒤에만 AOI join을 연다. 기존 offset 코드는 audit-only 실패 기록으로 남긴다.

## M16. 공식 KO/2km 격자 — Seal A 완료, Seal B 미결

**근거**: `gk2a/_grid/grid_seal.json`, `code/seal_gk2a_grid.py`
**배경**: M15의 역공학은 철회됐음(4점 in-sample fit). 기상청이 KO/2km lat/lon을
**격자 저장 순서대로** 제공하므로 역공학이 불필요함.

### 공식 경로 (2026-08-25 확인)

```
ASCII   apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-gk2a_latlon_api
        ?area=KO&grid=2&latlon=lon|lat&disp=A&authKey=
NetCDF  apihub.kma.go.kr/api/typ01/url/gk2a_latlon_file_down.php?area=KO&grid=2&authKey=
```

### 실측 — 401과 403을 구분해야 함

| 호출 | 응답 |
|---|---|
| 키 없음 | `401 유효한 인증키가 아닙니다` |
| **키 있음** + GK2A latlon | `403 활용신청이 필요한 API 입니다` |
| 키 있음 + NetCDF 다운로드 | `403` 동일 |
| 키 있음 + **전혀 다른 API** (`kma_sfctm2` 지상관측) | **`403` 동일** |

마지막 줄이 진단을 확정함. **키 자체는 유효하고**(401이 아님), apihub는 data.go.kr과 같이
**API별 활용신청**을 요구하며 현재 신청된 API가 없음.

### 봉인 스크립트는 준비됨 — 사전 등록 게이트 4개

`code/seal_gk2a_grid.py`. 활용신청이 승인되면 그대로 실행함.

| | 검증 | 실패 시 |
|---|---|---|
| V1 | lon·lat 원소 수 = `xdim × ydim` = 320 × 397 = 127,040 | 봉인 안 함 |
| V2 | row-major 저장 순서 — 행 내 경도 단조증가, 열 내 위도 단조 | 저장 순서가 다른 것이므로 봉인 안 함 |
| V3 | 경도 120~135, 위도 30~45 (한반도) | 봉인 안 함 |
| V4 | **자유 매개변수 0개** 앵커 검증. 공식 격자에서 최근접 칸을 찾아 같은 시각 CLD 값과 대조. 일치율 ≥ 0.90 | 봉인 안 함 |

V4가 M15와 결정적으로 다른 점: **아무것도 적합하지 않음.** 대응이 공식 파일에서 직접 오므로
높은 일치율은 증거가 되고 낮은 일치율은 반증이 됨. M15의 캐시 결함(`resultType` 누락으로
FOG가 CLD를 덮어씀)도 필터로 막았음.

- **말할 수 있는 것**: 공식 경로가 존재하고 키는 유효함. 봉인 절차와 판정 기준이 사전 등록됨.
- **말할 수 없는 것**: 격자 대응은 **아직 확정되지 않았음.** 320×397 순서 가정도 미검증임
  (V2가 그것을 검증할 항목임). GK2A admission 실험은 봉인 전에 열지 않음.
- **필요한 사용자 조치**: apihub.kma.go.kr에서 **GK2A 기상산출물** API 활용신청.
  겸해서 **지상관측(ASOS)** 도 신청하면 M14의 `era5_10` 슬롯 경로가 열림.

### 2026-08-25 갱신 — 활용신청이 승인되어 파일을 받았음. 위 403 절은 그 이전 상태임

`nph-gk2a_latlon_api`가 **http 200**으로 열렸음. 위의 401/403 진단 이력은 보존하되,
아래가 현재 상태임. **그리고 사전 등록 게이트 표의 V1·V3이 틀렸음을 실측이 드러냈음.**

#### 내가 사전 등록을 잘못했던 두 가지

| 게이트 | 사전 등록값 | 실측 | 왜 틀렸나 |
|---|---|---|---|
| V1 | 원소 수 = `320 × 397` = 127,040 | **810,000 = 900 × 900** | 공식 파일은 **KO 도메인 전체**이고, 경량화 응답의 320×397은 그 안의 **부분 창**임. 둘을 같다고 가정했음 |
| V3 | 경도 120~135, 위도 30~45 | 실제 **113.996~138.004 / 29.312~46.358** | 도메인이 한반도보다 넓음. 정상 격자가 게이트 때문에 실패로 나왔음 |

게이트를 실측 도메인(`113~139 / 29~46.5`)과 전체 격자 크기에 맞춰 고쳤음.
**사전 등록을 했다는 것만으로 게이트가 옳은 것은 아님** — 등록값이 틀리면 정상 데이터가
실패로 찍힘. 이 사례를 남김.

#### Seal A — 격자 파일 (통과)

| | 값 |
|---|---|
| 전체 격자 | **900 × 900 = 810,000** (헤더 `900, 900,=`와 일치) |
| 경도 파일 | 8,991,016 B · `sha256 2b1f43a28a8002e1…` |
| 위도 파일 | 8,181,016 B · `sha256 997ebe8c066194d6…` |
| 저장 순서 | **row-major**, 행 내 경도 단조증가 18/18, 열 내 위도 **북→남** 18/18 |
| 범위 | 경도 113.996 ~ 138.004, 위도 29.312 ~ 46.358 |
| 간격(중앙) | Δlon 0.02337° · Δlat −0.01850° |
| **Seal A 해시** | `0476c9ad622bbedb1e825e9c0203280306e6bcb736d23faf3a47672d9d481e1a` |

LCC 특성이 보임 — 행 0은 경도 폭 24.0°, 행 899는 18.5°로 극쪽 수렴함.
**투영 역공학은 영구히 불필요해졌음.**

`area=EA&grid=2`는 3000×2600(85.7 MB), `area=FD&grid=2`는 `error(-11)`로 미제공임.

#### Seal B — 창 오프셋 (미결)

경량화 응답이 준 `x0=63, y0=333`을 공식 격자에서 확인했음.

| 해석 | 결과 |
|---|---|
| `y0=333`을 행 인덱스로 | 위도 40.08 → 32.81. 한반도를 덮어 **그럴듯함** |
| `x0=63`을 열 인덱스로 | 경도 116.69 → 124.54. **한국보다 서쪽** |
| EA 격자(76.81 E 시작)의 열 63 | 더 서쪽. 안 맞음 |
| 앵커 값 일치율 | **0.2396** (임계 0.90) |

**앵커로 메우려는 시도는 식별 불가임.** `y0=333`을 고정해 `x0`만 탐색해도(자유도 1),
최악 앵커 거리 1.17 km(반 칸)를 내는 `x0`이 **213개 동률**임. 320폭 창이 앵커를 포함하기만
하면 거리가 항상 반 칸이 되기 때문임. **`y0`도 같은 이유로 확인된 것이 아님.**

- **말할 수 있는 것**: 공식 격자는 봉인됐음. 투영을 다시 추정할 필요가 없음.
- **말할 수 없는 것**: `x0/y0`가 이 격자의 어디를 가리키는지 **모름.** 따라서 격자를
  AOI에 붙이지 않고 GK2A admission 실험도 열지 않음.
- **필요한 것**: data.go.kr **위성자료 경량화 활용가이드(참고문서)** 의 `x0/y0` 정의.
  `dateTime`·`resultType`은 경험적으로 풀 수 있었으나 이건 자유도 2에 앵커 4곳이라
  **적합으로 풀면 M15를 반복하는 것**임.

## M17. `era5_10` 슬롯 6변수를 ASOS 일자료로 소급 확보할 수 있음

**근거**: `apis.data.go.kr/1360000/AsosDalyInfoService/getWthrDataList` 실호출
**배경**: M14에서 OlmoEarth에 기상 전용 **비공간** modality `era5_10`이 있음을 확인했음.
GK2A는 보존 2일이라 소급이 불가능했으나, ASOS는 과거 이력이 있음.

### 실측 (2022-04-17, 서울 stn 108 — 71363 촬영일 중 하나)

`resultCode 00 NORMAL_SERVICE`. 반환 필드가 `era5_10` 6변수와 대응함.

| `era5_10` 밴드 | ASOS 필드 | 실측값 |
|---|---|---|
| 2m-temperature | `avgTa` | 14.0 |
| 2m-dewpoint-temperature | `avgTd` | 3.5 |
| surface-pressure | `avgPa` / `avgPs` | 1007.7 / 1017.9 |
| 10m-u/v-component-of-wind | `avgWs` + `maxWd` | 2.3, 250° |
| total-precipitation | `sumRn` | 공백(무강수) |

- **말할 수 있는 것**: 6변수 모두 존재하고 **과거 날짜로 조회됨**. 이 서비스는 2026-05-18에
  이미 승인돼 있어 추가 신청이 필요 없음. 따라서 retrospective live-residual arm의
  1순위는 GK2A가 아니라 ASOS임(M14의 판단이 실측으로 확인됨).
- **말할 수 없는 것**: 세 가지가 미해결임.
  1. **단위·정규화**가 `era5_10`이 기대하는 것과 같은지 미확인. ERA5는 K·Pa·m/s 재분석이고
     ASOS는 °C·hPa·m/s 지점관측임
  2. `avgWs`+`maxWd`는 **평균 풍속과 최대 풍향**이라 u/v 성분으로 바로 바꿀 수 없음.
     같은 시각의 풍향이 아니므로 벡터 분해가 부정확함. 시간자료가 필요할 수 있음
  3. **지점 → 격자 보간**이 필요하고, 그 보간이 또 하나의 계약 변경임(M8 계열 위험)
- **다음**: 지점 좌표(지상관측 지점정보)를 확보해 AOI 최근접 지점을 정하고,
  단위 변환표를 사전 등록한 뒤 결합함. 보간 없이 **최근접 지점 값**부터 시작하는 것이 안전함.

## M18. apihub 활용신청 5건 실측 — 필요한 격자 API는 아직 아님

**근거**: 2026-08-25 승인 5건에 대한 직접 호출.

| # | 승인된 API | 실측 |
|---|---|---|
| 1 | 단기예보 `fct_shrt_reg.php` | **200**, 30,208 B |
| 2 | 레이더합성 `rdr_cmp_file.php` | `404 유효하지 않은 API` — 파라미터/경로 형태가 다름 |
| 3 | 레이더 파일목록 `rdr_stn_file_list.php` | 200이나 46 B (`#`만) — 파라미터 미확정 |
| 4 | **ASOS `kma_sfctm2.php`** | **200**, 26,441 B — **열림** |
| 5 | 천리안 2A호 **LE1B 기본관측자료** | (별도 경로) |
| — | **`nph-gk2a_latlon_api`** | **403 여전히 활용신청 필요** |
| — | **`gk2a_latlon_file_down.php`** | **403 여전히** |

**5번은 우리가 필요한 API가 아니었음.** LE1B는 16채널 기본관측자료이고, 봉인에 필요한 것은
**기상산출물 계열의 위경도 조회/파일**임.

**2026-08-25 갱신**: 이 표 이후 `nph-gk2a_latlon_api` 활용신청이 승인되어 **http 200**으로
파일을 받았음. M16의 **Seal A는 완료**됐고, 남은 것은 경량화 응답의 창 오프셋(Seal B)임.
위 403 행은 승인 이전 상태 기록으로 보존함.

### ASOS 시간자료가 M17의 결함 하나를 해결함

`help=1` 헤더로 컬럼 정의를 확인했음. **시간자료**이므로 같은 시각의 값이 함께 옴.

| 필요 | ASOS 시간자료 컬럼 |
|---|---|
| 기온 | `TA` (C) |
| 이슬점 | `TD` (C) |
| 기압 | `PA` 현지기압 / `PS` 해면기압 (hPa) |
| **풍향·풍속** | **`WD` (36방위) + `WS` (m/s)** — 같은 시각이므로 **u/v 분해가 정확함** |
| 강수 | `RN` (mm, 4~10월 1시간 / 11~3월 3시간), `RN_DAY`, `RN_INT` |
| (보너스) 적설 | `SD_HR3`, `SD_DAY`, `SD_TOT` |
| (보너스) **전운량** | **`CA_TOT` (1/10)**, `CA_MID`, `CH_MIN` 최저운고 |

M17에서 문제로 적었던 "`avgWs`+`maxWd`는 평균풍속과 최대풍향이라 u/v 분해가 부정확함"이
**시간자료로 해소됨.** 그리고 `CA_TOT` 전운량은 GK2A와 **독립적인 지상 관측 기반 관측조건
변수**이므로 admission control의 대조군이 될 수 있음.

- **말할 수 없는 것**: 응답에 **지점 좌표(경위도)가 없음.** `지상관측 지점정보`를 따로
  받아야 AOI 최근접 지점을 정할 수 있음. 강수 `RN`의 집계 구간이 계절에 따라 1시간/3시간으로
  달라지는 것도 결합 시 통제해야 함.

## M19. apihub 활용신청은 **개별 API 단위**임 — 필요 목록을 확정했음

**근거**: 명세서(datawiki 지상관측)에 나온 하위 API 4개를 직접 호출.

`지상관측 > 종관기상관측(ASOS)` 항목에서 **1.1만 승인**된 상태로 나머지를 호출했음.

| 명세 번호 | API | 결과 |
|---|---|---|
| 1.1 시간자료 | `kma_sfctm2.php` | **200** (승인됨) |
| 1.2 시간자료 기간조회 | `kma_sfctm3.php` | **403** |
| 1.5 요소별 조회 | `kma_sfctm5.php` | **403** |
| 2. 지상 평년값 | `sfc_norm1.php` | **403** |
| 4.2 지상관측지점일람표 | `getSfcStnLstTbl` | **403** |

**즉 활용신청 단위는 "종관기상관측(ASOS)" 같은 서비스가 아니라 그 아래 개별 API임.**
앞서 M18에서 "천리안 2A호"를 신청했는데 필요한 위경도 API가 403이었던 것도 같은 이유임.

### 명세에서 확인한 사실 — 소급 실험이 충분히 가능함

| 항목 | 값 |
|---|---|
| ASOS 보유기간 | **1904년 4월 ~ 현재** (지점별 상이) |
| 지점 수 | 96 (2020-04-01 기준) |
| 생산주기 | 분·시간·일·월·연 |
| `kma_sfctm3.php` 1회 조회 한도 | **최대 31일** |
| `kma_sfctm5.php` 출력 | **`LON`(deg), `LAT`(deg), `HT`(m)** 포함 |
| `getSfcStnLstTbl` 출력 | `lat`, `lon`, `ht` + 기압계·온도계·풍속계·우량계 높이 |
| `sfc_norm1.php` | 1991~2020 등 4개 평년기간의 일·순·월·연 평년값 |

- **말할 수 있는 것**:
  1. M17·M18에서 막혔던 **지점 좌표 문제는 `kma_sfctm5.php` 또는 `getSfcStnLstTbl`로 풀림.**
     둘 다 아직 403이라 신청이 필요함.
  2. `kma_sfctm3.php`(31일 일괄)가 있으면 2019~2022 소급 수집이 실용적임.
     없으면 시각마다 개별 호출이라 비용이 커짐.
  3. `sfc_norm1.php`의 **기후평년값**은 설계의 `z_region`(정적 지역 residual) 재료임.
     기온·강수·풍속·전운량·안개계속시간·지중온도까지 있음.
- **말할 수 없는 것**: 신청 후 승인 리드타임을 모름. 일일 호출 한도도 미확인임.
  `sfc_norm1.php`의 평년값이 `era5_10` 정규화에 쓸 수 있는 형태인지도 미검증임.

## M20. 공식 KO/2km 격자를 받았고 봉인 게이트가 제 역할을 했음 — `x0` 해석 불가

**근거**: `gk2a/_grid/grid_seal.json`, `gk2a/_grid/window_convention.json`,
`code/seal_gk2a_grid.py`, `code/gk2a_window_convention.py`
**전제**: apihub 활용신청 #4·#5 승인(`gk2a_latlon_file_down.php`, `nph-gk2a_latlon_api`).

### 받은 것

| | |
|---|---|
| lon 파일 | 8,991,016 B, sha256 `2b1f43a28a8002e1…` |
| lat 파일 | 8,181,016 B, sha256 `997ebe8c066194d6…` |
| 헤더 | **`900, 900,=`** → KO/2km는 **900×900 = 810,000 칸** |
| 전체 범위 | lon 113.9964~138.0036, lat 29.3122~46.3580 |
| 코너 | (0,0) 113.996/45.729 · (899,899) 135.247/29.312 |

`area`/`grid` 조합도 전수 확인했음: KO 2/1/0.5km = 900²/1800²/3600², EA 2km = 3000×2600,
**FD는 제공되지 않음**(`#latlon_data_read:error(-11)`).

### 게이트 결과

| | 결과 |
|---|---|
| V1 개수 | **통과** — 810,000 = 헤더가 말한 900×900 |
| V2 저장순서 | **통과** — lon 행 단조증가 18/18, lat 열 단조감소 18/18 → **row 0 = 북쪽, row-major** |
| V3 범위 | **실패 → 내 사전등록 오류.** 실제 범위가 113.99~138.00 E인데 게이트를 120~135로 좁게 잡았음. KO 영역은 한반도보다 넓음. 데이터가 아니라 임계값이 틀렸음 |
| V4 앵커 | **실패 (0.4583)** — 아래가 이유임 |

### V4 실패의 실체 — `x0`가 KO 격자 열 인덱스가 아님

앵커 4곳의 최근접 칸을 900×900에서 직접 찾았음.

| 앵커 | j | i | 격자 lon/lat | 거리 |
|---|---|---|---|---|
| 서울 종로 | 472 | 491 | 126.9637 / 37.5794 | 0.0084° |
| 서울 중구 | 473 | 492 | 126.9866 / 37.5607 | 0.0076° |
| 부산 | 604 | 585 | 129.0292 / 35.1045 | 0.0105° |
| 울산 | 579 | 598 | 129.3428 / 35.5541 | 0.0060° |

한국 본토(124.5~131.0 E, 33.0~38.7 N)의 인덱스 범위는 **`j 406~721, i 381~680`** 임.
응답이 준 창은 `320×397 @ (x0=63, y0=333)`.

| | 창 범위 | 한국 |
|---|---|---|
| 행 (`y0=333`, 높이 397) | 333~729 | 406~721 → **전부 포함** |
| 열 (`x0=63`, 폭 320) | 63~382 | 381~680 → **거의 전부 제외** |

**즉 `y0`는 KO-900 행 인덱스로 맞지만 `x0=63`은 열 인덱스가 아님.**
행/열 원점(북↔남, 서↔동)과 응답 배열 뒤집기까지 **16개 규약을 전수로 시험**했으나
최고 0.4583, 차선 0.4375로 **격차가 0.0208**뿐이었음 — 어떤 규약도 분리되지 않음.
그리고 어떤 창도 앵커를 제대로 포함하지 않았음(서울 126.97이 창 밖).

apihub 경량화(`WthrSatlitInfoService/getGk2aIrAll`)도 **동일한 `x0=63.0, y0=333.0`** 을 주며
추가 좌표정보가 없음. 즉 data.go.kr 쪽 문제가 아니라 산출물 자체의 메타데이터가 부족함.

- **말할 수 있는 것**:
  1. 공식 KO/2km 격자를 확보하고 해시로 봉인 가능한 상태임. 저장순서(row-major, 북→남)도 확정됐음.
  2. **봉인은 보류가 맞음.** 사전 등록한 V4가 정확히 이 불일치를 잡아냈음.
     M15 때처럼 적합해서 밀어붙이지 않았음.
  3. 경량화 응답의 `x0`는 이 격자로 해석되지 않음. 문서화 공백임.
- **말할 수 없는 것**: `x0=63`의 의미를 모름. 다른 area/grid로도 설명되지 않음
  (KO 900²/1800²/3600², EA 3000×2600 전부 확인).
- **다음**: 앵커를 **행정동코드 수십~수백 개**로 늘려 정수 오프셋 `(i0, j0)`를 탐색함.
  4개로는 16규약이 0.02 차이로 붙었지만, 앵커가 100개면 참 오프셋만 높은 일치율을 냄.
  이때도 **연속 매개변수 적합이 아니라 정수 오프셋 선택**이며, 최고와 차선의 격차를 함께 보고함.
  격차가 작으면 여전히 봉인하지 않음.
- **우회로**: `Area` 계열은 lon/lat을 직접 주므로 **격자 확정 없이도 AOI 작업이 가능함.**
  admission 실험을 행정동 단위로 먼저 하는 것이 막히지 않는 경로임.

## M21. ASOS 지점 → AOI 군집 결합 — 게이트 4/4

**근거**: `asos/asos_aoi_join.json`, `code/build_asos_aoi_join.py`
**전제**: apihub `stn_inf.php` 승인(M19에서 막혀 있던 지점 좌표).

96지점 좌표를 받아 M10에서 동결한 13군집 중심에 최근접 결합했음. **보간하지 않음.**

| 군집 | split | 타일 | 산사태 | 최근접 지점 | km |
|---|---|---|---|---|---|
| C11 | train | 180 | 42 | 217 정선군 | 20.7 |
| C13 | train | 129 | 14 | 295 남해 | 20.1 |
| C12 | test | 22 | 12 | 251 고창군 | 10.4 |
| C09 | val | 12 | 8 | 276 청송군 | 16.1 |
| C08 | test | 6 | 6 | 259 강진군 | 9.1 |
| C05 | test | 8 | 4 | 133 대전 | 11.0 |
| C10 | val | 38 | 4 | 289 산청 | 23.5 |
| C01 | train | 84 | 0 | 268 진도군 | 17.7 |
| C04 | val | 34 | 0 | 283 경주시 | 10.9 |
| C06 | test | 30 | 0 | 284 거창 | 20.1 |
| C03 | test | 28 | 0 | 129 서산 | 29.2 |
| C07 | test | 14 | 0 | 108 서울 | 11.8 |
| C02 | test | 9 | 0 | 262 고흥 | **61.2** |

거리 최소 9.1 · **중위 17.7** · 최대 61.2 km.

| 게이트 | 결과 |
|---|---|
| J1 모든 군집 결합 | 13/13 |
| J2 중위 ≤ 30 km | 17.7 |
| J3 60 km 초과 군집 표시 | C02 하나 (61.2 km). **산사태 0타일이라 primary task 영향 없음** |
| J4 한 지점이 4개 이상 군집 담당 안 함 | 통과. 담당 중복이 없으므로 residual이 복제되지 않음 |

**J4가 중요함**: 한 지점이 여러 군집을 담당하면 같은 값이 복제되어 지역 간 변동이 사라지고,
negative control(region-shuffle)에서 이득이 남는 위험이 생김. 통과했음.

지점명이 AOI 정체를 확인해줌 — **C10 산청(지리산), C09 청송군(주왕산), C11 정선군(오대산권),
C12 고창군(내장산권)**. 산사태가 있는 7개 군집은 전부 **23.5 km 이내**임.

## M22. `era5_10` 6변수를 60 촬영일 전부 추출했음 — 강수만 문제임

**근거**: `asos/era5_10_residual.jsonl`, `asos/era5_10_residual_summary.json`,
`code/build_era5_10_residual.py`

`kma_sfctm2.php`가 `stn=0`으로 96지점을 한 번에 주므로 **60일 × 5시각 = 300회 호출**로 끝났음.
결과 3,898행(주 시각 780행 = 60일 × 13군집).

### 사전 등록한 규약 (사후에 바꾸지 않음)

| | |
|---|---|
| 주 시각 | **11:00 KST** (Sentinel-2 통과가 현지 10:30 전후) |
| 민감도 | 09·10·12·13시도 함께 받음 |
| 바람 | `WD`(36방위)×10° 를 **불어오는 방향**으로 보고 `u = −WS·sin θ`, `v = −WS·cos θ` |
| 단위 | **변환하지 않음.** °C·hPa·m/s·mm 원값 보존. ERA5의 K·Pa 변환은 학습 직전에 명시적으로 |
| 보간 | **없음.** 최근접 지점 값만 |

### 커버리지 (주 시각 780행)

| 변수 | 커버리지 |
|---|---|
| temperature (°C) | **1.0000** |
| surface_pressure (hPa) | **1.0000** |
| cloud_total (1/10) | **1.0000** |
| dewpoint (°C) | 0.9987 |
| wind u/v (m/s) | 0.9987 |
| **precipitation (mm)** | **0.0090** |
| precipitation_day (mm) | 0.0795 |
| snow_depth (cm) | 0.0077 |

### 강수 공백의 정체 — 계절 규칙이 아님

명세는 "11월~3월은 3시간강수량, 4~10월은 1시간 강수량"이라고 하므로 겨울철 공백을 예상했음.
캐시 28,591행을 세어보니 **그게 아님**.

| 구간 | RN 값 | RN 공백 | 공백률 |
|---|---|---|---|
| 4~10월 | 279 | 15,482 | **98.2%** |
| 11~3월 | 159 | 12,671 | **98.8%** |

두 계절이 같음. 그리고 RN이 공백일 때 `RN_DAY`도 26,199건 함께 공백이고, 값이 있는 1,954건은
0.0·0.1·0.2… 로 소량 강수임. 96지점 모두 강수를 상시 측정하므로 "미측정"으로 98%는 설명되지 않음.
→ **ASOS 텍스트 피드는 무강수를 0으로 적지 않고 생략함.**

- **말할 수 있는 것**: 6변수 중 5개는 커버리지 ~100%로 곧바로 쓸 수 있음.
  강수는 원값(`precipitation_mm`, None 가능)과 **가정 적용값**(`precipitation_mm_zerofilled`,
  0.0 채움)을 분리 보존하고 `precip_was_blank`로 표시했음. 조용히 채우지 않았음.
- **말할 수 없는 것**: 공백=0 이라는 해석은 **정황 증거**임(98% 공백률, RN_DAY 동반 공백,
  상시 측정 사실). 기상청 문서로 확인하지 않았음. 그리고 **산사태 forcing에는 시각 강수가 아니라
  선행강우 누적이 필요함** — 촬영시각 11시의 1시간 강수는 산사태 유발과 거의 무관함.
- **다음**: 선행강우지수(antecedent precipitation index)를 설계함. 촬영일 이전 1·3·7·15일
  누적을 `kma_sfcdd`/`kma_sfctm3`로 받아 계산하고, 누적 창 길이를 **사전 등록**함.
  창을 성능 보고 고르면 자기기만임.

## M23. G-P pilot 1차 — “frozen OLMo 전 지표 우위”는 개발 신호였고 확정표에서 제외한다

**근거**: `sen12_gp_pilot/holdout_chimanimani_pilot_8ep.json`, `logs/gp_pilot.log`,
`code/extract_sen12_fold_cache.py`, `code/pilot_sen12_gp_heads.py`
**환경**: GPU1 전용(`CUDA_VISIBLE_DEVICES=1`), GPU0은 다른 프로젝트 62.6 GB로 미사용.

> **2026-08-25 독립 감사 정정**: 아래 표는 8-epoch 개발 관측으로 보존하지만 확정 성능표가 아니다.
> AUPRC 구현이 매 batch의 동일한 pixel offset을 반복 표본추출해 공간 편향됐고, `positive_pixel_frac`도
> 전체가 아닌 그 표본에서 계산됐다. 8-epoch test를 열람한 뒤 40-epoch로 수정했으므로 Chimanimani는
> 이후 confirmatory test가 아니라 development holdout이다. v2는 exact AUPRC·전체 train pos_weight·
> arm별 RNG reset·checkpoint/per-sample seal로 재실행한다.

### 준비 — fold 캐시

`holdout_chimanimani` (test chimanimani 1,133 / val china 159 / train 5,542).
**봉인 해시 3/3 일치**를 코드가 검증하고 불일치면 중단한다.

| 캐시 | 용량 |
|---|---|
| `emb_fp16` frozen OLMo 768×32×32 | 10.75 GB |
| `raw_u16` S12q 실관측 10밴드 10×12×128×128 | 26.87 GB |
| `mask_u8` 128×128 | 0.11 GB |

추출 6,834개 · 6.2~6.8 sample/s · peak CUDA 0.74 GB · 약 18분.

### 1차 결과 (8 epoch, seed 1, 동일 예산)

| arm | 학습 파라미터 | 학습 s | peak GB | **test IoU** | test F1 | test AUPRC | **test ECE** | val IoU | val F1 |
|---|---|---|---|---|---|---|---|---|---|
| P1 raw 시간평균 U-Net | 474,849 | 67 | 0.47 | 0.0727 | 0.1356 | 0.0534 | 0.0949 | 0.0294 | 0.0571 |
| P2 raw 12시점 3D U-Net | 265,649 | 138 | 0.96 | 0.1030 | 0.1868 | 0.4757 | 0.1010 | 0.0464 | 0.0888 |
| **P4 frozen OLMo + decoder** | **237,537** | **62** | **0.32** | **0.1153** | **0.2067** | **0.5501** | **0.0738** | **0.0927** | **0.1698** |

`pos_weight` 35.002 (세 arm 동일), test 양성 픽셀 비율 0.90%.

이 8-epoch 실행 안에서는 P4가 **IoU·F1·근사 AUPRC·ECE 전부에서 1위**이고 동시에
**학습 파라미터 최소·head 학습시간 최단·head 학습 메모리 최소**였다.
P4/P2 비는 IoU 112% · F1 111% · AUPRC 116%. val에서는 IoU가 2.0배(0.0927 vs 0.0464)다.

### 그런데 이 비교는 아직 공정하지 않다

epoch별 손실을 보니 **세 arm 모두 8 epoch에서 단조 하강 중**이었다.

```
P1  0.9431 → 0.5738   (8 epoch까지 계속 하강)
P2  0.9606 → 0.3894
P4  0.4064 → 0.1857
```

전부 미수렴이다. 그리고 P4는 시작 손실이 0.406으로 P1/P2의 ~0.95보다 훨씬 낮다 —
frozen feature가 이미 정보를 담고 있어서다. 즉 **짧은 예산은 P4에 유리하다.**
사전 등록한 `8 epoch 고정`이 이 경우 편향을 만든다.

- **말할 수 있는 것**: 이 실행에서 세 arm은 같은 S12q 표본 계약을 썼고, 이미 만든 cache 위의
  **head fit 범위**에서는 P4가 더 적은 학습 파라미터·시간·메모리를 썼다.
- **말할 수 없는 것**: frozen OLMo encoder 88.96M 파라미터와 10.75 GB cache extraction을 제외한
  62초·0.32 GB만으로 end-to-end 비용 우위를 주장할 수 없다. multi-task 수에 따른 amortization 표가
  나오기 전에는 `cached-head cost`로만 부른다.
- **말할 수 없는 것**:
  1. **정확도 우위는 아직 확정할 수 없다.** 미수렴 상태의 비교다
  2. 절대값이 낮다. IoU 0.115 · F1 0.207. 양성 픽셀이 0.9%인 극단 불균형 task이고
     Sen12 논문 baseline과 비교하지 않았다
  3. **fold 1개 · seed 1개**다. G-P 게이트의 `catastrophic fold 없음`을 판정할 수 없다
  4. **P3(U-TAE)을 돌리지 않았다.** 게이트는 `max(P2,P3)의 95%`이므로 U-TAE가 훨씬 강하면
     결과가 바뀔 수 있다
  5. AUPRC는 픽셀 표본추출 + 101 threshold sweep 근사다
- **프로토콜 수정 (사유 공개)**: 미수렴을 근거로 예산을 **모든 arm에 동일하게 40 epoch**로
  늘리고 **val IoU로 best epoch을 고른다**(test는 선택에 쓰지 않는다). 1차 결과는 폐기하지 않고
  이 항목에 그대로 남긴다. 2차 결과는 별도 M-항목으로 기록한다.

## M24. 공식 저장소의 후속 binary benchmark와 우리 수치는 비교 대상이 아니다

**근거**: `PaulH97/Sen12Landslides` 현재 README·configs와 Scientific Data 본문
**질문**: M23의 IoU 0.115가 낮은 것인가?

### 공식 저장소가 추가 보고한 S12LS-LD binary benchmark (S2+DEM, seed 42/123/777 평균)

| Model | AP | F1 | **IoU** | Precision | Recall |
|---|---|---|---|---|---|
| U-TAE | 67.75 | 61.80 | **44.74** | 53.19 | 74.90 |
| U-ConvLSTM | 65.13 | 61.95 | 44.88 | 60.59 | 63.92 |
| Unet3d | 62.08 | 58.82 | **41.66** | 55.75 | 62.56 |
| ConvGRU | 60.00 | 59.06 | 41.91 | 56.72 | 61.77 |

### 왜 비교할 수 없는가 — 네 가지가 다르다

| | 공식 저장소 S12LS-LD benchmark | 우리 (M23) |
|---|---|---|
| **task** | README의 **마스크 >50픽셀 표본만** (S2 4,988개, 100% annotated) | headline 6,834개, **음성 포함**, 양성 픽셀 0.90% |
| **split** | random 80/20 (`seed 42`) | **leave-one-region-out** (M9·M12의 요지) |
| **입력** | 11채널 (밴드 + SCL + **DEM**), **15 timestep** | 10밴드, **12 timestep**, DEM 없음 |
| **학습** | **75 epoch**, `BCEDiceLoss(pos_weight 5, dice_w 0.5)` | 8 epoch, `BCE(pos_weight 35)` |

두 표는 네 축이 동시에 달라 **난이도 순서까지 단정할 수 없다.** LOCO는 random split보다 공간 전이에
엄격하지만, 음성 표본 증가는 지표에 따라 난이도를 올리거나 background-dominated metric을 쉽게 만들 수
있다. 또한 위 표는 논문 원표가 아니라 현재 공식 저장소가 별도로 제공하는 binary benchmark다.
Scientific Data 논문 자체는 50 epoch·cross-entropy 설정과 geographic cluster leave-one-out 실험도
보고하므로, 이를 “원 논문은 같은 지역 random split만 썼다”라고 요약하면 틀린다.

- **말할 수 있는 것**: M23의 IoU 0.115와 저장소 benchmark 0.447을 직접 나눠 성능 격차로 읽으면 안 된다.
  또한 이 표는 **P3(U-TAE)이 3D U-Net보다 IoU 44.74 vs 41.66으로 우수함**을 보여주므로,
  G-P 게이트의 `max(P2,P3)`에서 P3가 기준선이 될 가능성이 높다 → **P3를 반드시 돌려야 한다.**
- **말할 수 없는 것**: task만 맞춘 부분집합(마스크 >50) 수치로도 **split·입력·epoch이 여전히
  다르므로** 직접 비교가 아니다. 그들의 LOCO(Experiment 3) 수치는 확인하지 못했다.
- **조치**: v2 pilot에 `ld_iou`/`ld_f1`(마스크 >50 부분집합)을 같은 pass에서 함께 내도록 추가했고,
  산출물에 원 논문 표와 **`not_comparable_because` 4항목**을 함께 박았다. 숫자만 옮겨 비교하는
  일을 코드 수준에서 막았다.

## M25. strict G-P 개발 pilot — P4는 유망하지만 “전 지표 1위”가 아니다

**근거**: `artifacts/sen12_gp_pilot_audit/determinism/final/`,
`docs/GP_PILOT_VALIDATION_AUDIT.md`
**환경**: Python 3.12.3, NumPy 1.26.4, PyTorch `2.7.0a0+7c8ec84dab.nv25.03`, CUDA 12.8,
cuDNN 9.8, NVIDIA H200 physical GPU1. 코드 SHA-256 `478c6af5…`.

strict CUDA 결정성, arm별 RNG/DataLoader reset, 전체 train pos_weight 46.53, val-best checkpoint,
모든 pixel exact AP, checkpoint/per-sample SHA를 적용했다. cache 6,834/6,834 content audit도 통과했다.

| arm | val IoU | test IoU | exact AP | F1 | positive-patch macro IoU | LD IoU | head fit+val 초 |
|---|---:|---:|---:|---:|---:|---:|---:|
| P1 raw mean | 0.03685 | 0.054055 | 0.077737 | 0.102565 | 0.115962 | 0.14488 | **387.3** |
| P2-tiny factorized | 0.06197 | 0.134989 | **0.286074** | 0.237869 | **0.195021** | 0.21327 | 1,455.7 |
| P4 frozen OLMo | **0.11181** | **0.141643** | 0.225115 | **0.248139** | 0.183479 | **0.23041** | 950.5 |

- **말할 수 있는 것**: 이 개발 fold에서 P4는 P1보다 강하며 P2-tiny 대비 IoU 104.9%·F1 104.3%,
  LD IoU 108.0%다. OLMo spatial cache에 산사태 segmentation 신호가 있다는 viability evidence다.
- **동시에 말해야 하는 것**: P4의 AP는 P2-tiny의 **78.7%**, positive-patch macro IoU는 94.1%다.
  따라서 사전 G-P의 IoU+AUPRC 95% 조건을 충족하지 않는다. calibration 지표는 P4가 낮지만
  background-dominated pixel-micro라 router calibration 근거가 아니다.
### 독립 재검증 추가분 (2026-08-26)

산출물 JSON을 다시 파싱해 P4/P2 비를 **모든 축에서** 계산했다. 95% 미달이 두 개가 아니라 **세 개**다.

| 축 | P4/P2 | |
|---|---|---|
| test IoU | 104.9% | PASS |
| F1 | 104.3% | PASS |
| LD 부분집합 IoU | 108.0% | PASS |
| precision | **110.9%** | PASS |
| **AP exact** | **78.7%** | 미달 |
| **positive-patch macro IoU** | **94.1%** | 미달 |
| **recall** | **75.1%** | **미달 (기존 기록에 없던 축)** |

**recall이 AP 미달의 원인을 설명한다.** P2-tiny는 recall **0.89748**로 과다 예측하고
precision은 0.13710이다. P4는 recall 0.67382에 precision 0.15207이다. 즉 두 arm은
품질 차이보다 **작동점(operating point)이 다르다** — P2는 많이 잡고 틀리는 쪽, P4는 적게
잡고 맞히는 쪽이다. threshold-free AP는 전자에 유리하다.

따라서 "P4가 AP에서 밀린다"를 **표현 품질이 낮다**로 읽으면 안 된다. 동시에
"작동점 차이일 뿐"으로 넘겨서도 안 된다 — AP는 threshold와 무관하므로 P2의 **순위 능력이
실제로 더 좋다.** 두 해석을 함께 보고한다. 결론은 바뀌지 않는다: 사전 G-P 조건 미충족.

Brier도 P4가 1.42배 우수(0.02869 vs 0.04075)지만, ECE와 같은 이유로
background-dominated pixel-micro이므로 router calibration 근거로 쓰지 않는다.

- **말할 수 없는 것**: P2는 공식 Sen12 3D U-Net이 아니라 deterministic factorized-pool tiny
  stand-in이고 P3 U-TAE가 없다. P4만 acquisition timestamp를 받았다. Chimanimani test는 이미
  M23에서 열람했다. 따라서 strong baseline 우위·region 일반화·confirmatory test·CVPR gate를
  주장할 수 없다.
- **재현성 복구**: RNG reset만 한 pre-fix P4 replay는 test IoU `0.122826→0.143442`(+16.8%)로
  갈렸다. strict algorithms/cuBLAS/cuDNN/TF32 계약 뒤 P1/P4 smoke와 P2-tiny smoke는 각각
  checkpoint tensor max-abs diff 0을 보였다. final P4-only 40-epoch도 full run과 history(시간 제외),
  모든 지표, per-sample/checkpoint SHA, tensor가 bitwise 일치했다(max-abs diff 0).
- **비용 범위**: 표의 시간은 cached head fit+val이다. P4 cold extraction은 1,130.05초,
  embedding 10.75 GB, frozen encoder 88.96M 파라미터다. 같은 P4의 wall time도 full sequence
  950.5초 vs 단독 replay 520.0초로 갈려, isolated 반복 전에는 P4 end-to-end/cost 우위가 미측정이다.

## M26. 결정성과 공식성의 충돌은 **pooling backward 3개**뿐이다

**근거**: `code/probe_det_ops.py`, GPU1, strict 계약 하에서 forward/backward를 따로 시험
**질문**: 공식 3D U-Net / U-TAE를 이식하려면 무엇을 포기해야 하는가?

M25에서 P2-tiny를 쓴 이유는 strict 모드에서 `max_pool3d_with_indices_backward_cuda`가
없었기 때문이다. 그런데 **어디까지 막히는지는 재보지 않았다.** 전수로 쟀다.

| 연산 | forward | backward |
|---|---|---|
| `max_pool3d` | OK | **막힘** |
| `avg_pool3d` | OK | **막힘** |
| `adaptive_avg_pool3d` | OK | **막힘** |
| **`conv3d` stride 2** | OK | **OK** |
| `interpolate3d` nearest | OK | OK |
| `interpolate3d` trilinear | OK | OK |
| `x.mean(dim=T)` | OK | OK |
| `x.max(dim=T)` | OK | OK |
| `BatchNorm3d` · `GroupNorm` | OK | OK |
| **U-TAE temporal attention** | OK | **OK** |
| **`scaled_dot_product_attention`** | OK | **OK** |

- **말할 수 있는 것**:
  1. **막힌 것은 3개, 전부 pooling의 backward다.** 그 셋만 대체하면 된다.
  2. **`conv3d` stride 2의 backward가 결정적이다** → downsampling을 learned stride conv로
     바꾸면 구조를 유지하면서 결정성을 얻는다. 시간축 축약도 `mean`/`max` reduce로 가능하다.
  3. **U-TAE의 핵심(temporal attention, SDPA)은 손댈 필요가 없다.** 즉 P3 이식의 장애물은
     attention이 아니라 encoder의 pooling뿐이다.
- **말할 수 없는 것**: 대체가 성능에 미치는 영향은 미측정이다. strided conv는 파라미터를
  늘리므로 **파라미터 수를 공식 config와 맞춰 보고해야** 공정하다. 그리고 이렇게 만든 모델을
  **"공식과 동일"이라고 쓰지 않는다** — 바꾼 연산과 이유를 산출물에 기록한다.
- **결정**: 선택지 C(deterministic-safe 재구현)를 택한다. A(경고 모드 후퇴)는 재현성을 버리고
  B(tiny 유지)는 공식성을 버린다. C의 비용은 pooling 치환 하나이며 M25가 우려한 것보다 작다.

## M27. 공식 baseline 이식에 **구조 변경이 필요 없다** — 치환 하나가 수학적으로 동일하다

**근거**: `code/verify_pool_equiv.py` (float64, GPU1), 공식 config 조회
**질문**: M26의 선택지 C가 얼마나 공식성을 훼손하는가?

### 공식 config를 확인하니 애초에 pooling으로 downsample하지 않는다

| | downsampling | strict에서 막히는 것 |
|---|---|---|
| 공식 `UNet3D` | **strided `Conv3d`** | 마지막 `AdaptiveAvgPool3d` 하나 |
| 공식 `UTAE` | **strided conv** (`str_conv_k 4, s 2, p 1`) | **없음** |

U-TAE 공식 설정: `encoder_widths [64,64,64,128]`, `decoder_widths [32,32,64,128]`,
`agg_mode att_group`, `encoder_norm group`, `n_head 16`, `d_model 256`, `d_k 4`,
`padding_mode reflect`. UNet3D는 `dropout 0.0`.

**M25에서 내가 P2를 분해한 것은 내가 `max_pool3d`를 선택했기 때문이었다.**
공식 모델은 max pooling을 쓰지 않는다. 내 stand-in이 공식과 멀어진 것은 결정성 때문이 아니라
**내 설계 선택 때문이었다.**

### 남은 하나는 근사가 아니라 동일하다

`AdaptiveAvgPool3d((1,H,W))`가 T를 1로 줄이는 것이면 `x.mean(dim=2, keepdim=True)`와
**같은 함수**다. float64로 검증했다.

| | 값 |
|---|---|
| forward `max|diff|` | **3.331e-16** |
| backward `max|diff|` | **5.551e-17** |
| 출력 shape | 동일 `(3,16,1,32,32)` |

strict 모드 backward: `adaptive_avg_pool3d` **막힘**, `mean(dim=2)` **OK**,
`conv2d k4s2p1 reflect` **OK**, `conv3d k(1,4,4) s(1,2,2)` **OK**.

- **말할 수 있는 것**: 공식 `UNet3D`·`UTAE`를 **구조 변경 없이** 이식할 수 있다.
  바뀌는 것은 **같은 수학 함수의 커널 선택**뿐이고 기계정밀도 내에서 동일함을 검증했다.
  따라서 M26의 "치환을 명시해야 한다"는 부담이 크게 줄어든다 — 명시는 하지만
  **아키텍처가 다르다고 쓸 필요는 없다.**
- **말할 수 없는 것**: `UNet3D`의 내부 채널 리스트·depth는 config에 없고 클래스 기본값이므로
  파라미터 수를 공식과 정확히 맞췄는지는 **구현 후 파라미터 수로 검증해야** 한다.
  U-TAE의 `att_group` 집계 세부는 원 구현(Garnot & Landrieu 2021)을 따르되
  우리 구현이 bit 단위로 같다는 보장은 없다.
- **함의**: M25의 `BLOCKED` 사유 중 "P2가 공식이 아니다"는 **해소 가능한 것**이었다.
  남은 사유는 P3 부재와 timestamp 비대칭이다.

## M29. AI-Hub 12밴드 물질화는 **가능하다** — 4/4 표본이 물리적으로 정합했음

**근거**: `code/materialize_aihub_s2_12band.py`, `code/inspect_materialized_s2.py`,
`aihub/s2_probe/manifest.jsonl`, `logs/materialize_s2.log`
**맥락**: M28로 원천 RGB 사용이 막혔음. 대체 경로(직접 물질화)가 실제로 서는지 확인했음.

### 사전 등록한 계약 (실행 전 고정. 사후 변경 없음)

| 항목 | 값 | 이유 |
|---|---|---|
| 후보 선택 | 같은 날짜·bbox `sentinel-2-l2a`, **id 정렬 후 첫 항목** | cherry-pick 차단. C2-C S3에서 결정성 3/3 확인 |
| 구름 상한 | `eo:cloud_cover <= 60` | 표본에 cc=100이 실재했음. 초과는 **버리지 않고 `excluded.jsonl`에 기록** |
| 격자 | AI-Hub EPSG:32652 좌상단 원점, 1024×1024 @10 m | M9에서 좌상단 정합 중위 4.2e-05 m 확인 |
| 리샘플링 | **nearest** | 20 m·60 m를 10 m로 올릴 때 없던 값을 만들지 않음. bilinear은 민감도로 별도 확인 |
| 밴드 순서 | B02 B03 B04 B08 / B05 B06 B07 B8A B11 B12 / B01 B09 | v1 band-set 순서 |
| dtype | uint16 | L2A 반사도가 정수이므로 무손실 |

### 4표본 실측 (`SA0100000000`, 2019-01-03 / 05-23 / 11-06 / 2020-04-14)

| 검사 | 결과 |
|---|---|
| 12밴드 결측 | **0** (`missing_bands=[]` 4/4) |
| 밴드별 nonzero 비율 | **1.0** 전 밴드 4/4 — 빈 창(window) 없음 |
| STAC platform vs AI-Hub 메타 | **4/4 일치** (Sentinel-2A) |
| MGRS | 52SDE 4/4 (동일 타일이므로 일관) |
| 후보 수 | 1 (모호성 없음) |
| B04 중위 | 236 ~ 722 |
| B08 중위 | 1,380 ~ 4,070 |

**물리 정합성**: 전 표본에서 B08(근적외) > B04(적색)이고, 5월 표본의 B08 중위가 4,070으로
가장 높았음(1월 1,380). 식생 계절성과 방향이 맞음 — 숫자만 채워진 큐브가 아님.

### 전체 실행

2,699쌍 전체를 백그라운드로 시작했음(GPU 미사용, network/CPU-bound이므로 GPU1의 4-arm과
간섭 없음). 초기 실측 **0.16쌍/s → 약 4.6시간**, 50쌍 시점 `ok=47 skip=3`,
1.2 GB/47쌍 → 최종 **약 68 GB** 예상.

### 아직 말할 수 없는 것

- `skip` 3건의 사유 분포(구름 초과 vs item 없음)는 전체 종료 후에야 확정됨.
  20표본 게이트에서 1건 실패 → 2,699 외삽 시 약 135건이었음.
- nearest가 20 m·60 m 밴드 성능에 주는 영향은 **미측정**. 민감도 실험이 별도로 필요함.
- 이 큐브로 학습한 결과는 아직 없음. 물질화 가능성만 닫혔음.
- **AI-Hub 원본 재배포 금지**는 그대로 유효함. 여기서 만든 것은 Sentinel-2 공개 데이터이며
  AI-Hub 산출물이 아님(라벨·타일 정의만 AI-Hub에서 옴).

## M30. 사전 등록한 G-P 95% 게이트가 **깨졌음** — frozen이 성능 지표를 하나도 못 이김

**근거**: `logs/gp_official_full.log`, `sen12_gp_official/`, `code/pilot_sen12_gp_heads.py`,
`code/sen12_official_baselines.py`
**맥락**: M25(P2-tiny stand-in)로는 공식 구조를 과소평가하고 있었음. M27로 공식 이식을 마친 뒤
같은 실행에서 4-방식을 끝냈음.

### 같은 실행 4-방식 확정값 (holdout_chimanimani, 40 epoch, test는 선택에 미사용)

| arm | params | train | IoU | AUPRC | ECE | ld_IoU | pos-patch IoU | best@ |
|---|---|---|---|---|---|---|---|---|
| P1 shallow (raw 시간평균) | 475,137 | 372 s | 0.054621 | 0.087877 | 0.125889 | 0.14401 | 0.113345 | 34 |
| **P2 공식 UNet3D** | 2,693,121 | 1,491 s | **0.159254** | **0.174585** | 0.033389 | **0.23922** | **0.194446** | 18 |
| P3 공식 U-TAE | 1,165,409 | 1,103 s | 0.120554 | 0.166852 | 0.058261 | 0.20732 | 0.188959 | 33 |
| P4 frozen v1 + decoder | 237,537 | 641 s | 0.130582 | 0.151348 | **0.024967** | 0.21338 | 0.159966 | 36 |

### 판정

**0.130582 / 0.159254 = 82.0%.** 사전 등록한 95% 게이트 **실패**. 기준을 낮추지 않음.

viability 재정의는 `67bb564`(2026-08-26 03:43:33)로 **결과 산출(04:35 이후) 전에** 커밋돼
있었으므로 별도의 exploratory gate로는 인정 가능함. 그래도 **원래 95% 게이트의 실패 기록은
그대로 남김.**

### 앞선 보고에서 내가 틀렸던 것 (정정)

1. **"P4가 AUPRC에서 앞선다"는 틀렸음.** 인용한 0.182354는 `sen12_gp_pilot_v2` 실행 값이었음.
   같은 실행에서는 **0.151348**이고 P2(0.174585)에 짐. **P4가 이긴 성능 지표는 0개**이며
   남은 것은 ECE(0.024967, 4-방식 중 최저) 하나뿐임.
2. **"지표 교차 → routing 기회"는 성립하지 않음.** 교차 자체가 서로 다른 실행을 한 표에
   올린 결과였음. router의 근거는 **같은 목적함수에서 지역·장면별 승자 교차 + 라벨 없는
   사전 예측 가능성**이어야 하며, 평균 표로는 판정 불가.
3. **P2는 cache-refresh action이 아님.** raw에서 학습하는 task-specific model이며,
   refresh 축(stale / current / partial / FoldRefresh / full)과 같은 선상에 둘 수 없음.
   강한 상대 baseline일 뿐임.
4. **비용표가 불공정했음.** P4의 286 s도 v2 실행 값이었고 같은 실행에서는 **641 s**임.
   encoder 88.96M · cache 1,130 s · 10.75 GB를 포함한 공정 비교는 아래와 같음.

| K (과제 수) | 방식 A (공유 캐시) `1,130 + 641K` | 방식 B (직접) `1,491K` | 차이 |
|---|---|---|---|
| 1 | **1,771 s** | 1,491 s | A가 280 s 비쌈 |
| 2 | **2,412 s** | 2,982 s | **A가 570 s 쌈** |
| 3 | **3,053 s** | 4,473 s | A가 1,420 s 쌈 |

**손익분기점**: `1,130 + 641K < 1,491K` → `K > 1,130/850 = 1.329` → 정수로 **K ≥ 2**.

*(정정: 처음에 "3개부터 유리"라고 적었으나 틀렸음. 부등식을 풀지 않고 표의 3개 행만 보고
썼음. 실제로는 **2개부터** 공유 캐시가 싸다.)*

**이것은 학습비용 회계임.** 운영비를 주장하려면 과제별 inference latency와 신규 관측의
re-embedding latency를 따로 재야 하며, 아직 재지 않았음.

### 증거 번들 (E0 · 봉인 완료)

`evidence/gp_official_bundle/` — per-sample JSONL 8개 + 실행 로그 + pilot JSON + manifest.
체크포인트는 용량 때문에 저장소에 넣지 않고 **SHA-256만 봉인**했음(서버 경로 기록).

**재계산 검증 통과**: per-sample의 tp/fp/fn을 합산해 micro IoU를 다시 계산한 결과가
위 표와 소수점 6자리까지 일치함 — P1 0.054621 · P2 0.159254 · P3 0.120554 · P4 0.130582.
즉 이 표는 문서상 기록이 아니라 **독립 재계산 가능한 증거**임.

### 아직 말할 수 없는 것

- **신뢰구간이 없음.** IoU 격차 0.028712가 짝지은 부트스트랩에서 살아남는지 미측정.
  이긴 쪽 숫자도 구간 없이는 확정이 아님.
  **단 "region 단위 부트스트랩"은 원리상 불가능함** — test region이 chimanimani 하나뿐이라
  n=1임(실측: `region` distinct 1, `event_date` distinct 1). 처음에 region-level CI를
  제안했던 것은 틀렸음. 실제 가능한 단위는 **`ann_id` 422개**의 cluster bootstrap과
  타일 인접을 고려한 spatial block bootstrap임.
- **조기종료를 "공정성 결함"이라고 적었던 것은 틀렸음.** 전 방식이 40 epoch을 돌고
  동일하게 best val IoU 체크포인트를 선택하므로 **test 성능 비교는 공정함**.
  실제 문제는 **비용 회계**임: 1,491 s에는 선택되지 않은 epoch 19~40의 비용이 포함됨.
  비용은 두 가지로 나눠 보고해야 함 —
  `fixed-budget cost`(40 epoch 전체) vs `practical cost`(공통 patience로 멈췄을 때의 time-to-best).
  둘 다 아직 분리 측정하지 않았음.
- **oracle routing gain 미측정.** 타일별로 P2/P4 중 나은 쪽을 골랐을 때의 상한을 재기 전에는
  선택 장치가 필요한지 자체를 알 수 없음.
- 40 epoch 예산 확대는 test 열람 뒤 결정이므로 **탐색이지 확증이 아님**(M23 protocol_history).

## M31. AI-Hub 12밴드 물질화 완료 — 병목은 구름이 아니라 **장면 부재**였음

> **[RETRACTED BY M35]** 아래 2,539건은 파일 생성 성공 집계일 뿐 유효 큐브 집계가 아님.
> M35 전수 내용 감사에서 624건(24.6%)의 심각한 all-band zero 영역을 확인했으므로,
> 성능·전이 실험 자산으로 사용하지 않는다. 이 절은 오류가 생긴 경위를 보존하기 위한 기록이다.

**근거**: `aihub/s2_12band/materialize_summary.json`, `excluded.jsonl`, `manifest.jsonl`

| 결과 | 건수 | 비율 |
|---|---|---|
| 12밴드 생성 성공 | 2,539 | 94.1% |
| 제외 · `no_stac_item` | 149 | 5.5% |
| 제외 · `cloud_over_max` | 11 | 0.4% |
| 오류 | **0** | 0% |
| 총 용량 | 63.9 GB | — |

**사전 예상이 빗나갔음.** cc ≤ 60 상한을 걱정해서 사전 등록했는데 실제로 걸린 것은 11건뿐이고,
탈락의 93%는 **해당 날짜에 Sentinel-2 장면 자체가 없는 경우**였음(재방문 주기·궤도 때문).
M29에서 20표본 외삽으로 "약 135건"을 예상했고 실제 160건으로, 방향은 맞았으나 원인은 달랐음.

**이 자산의 위치**: 오늘의 P2/P4 결과를 설명하는 데 쓰지 않음. 방법·임계값은 공개 데이터에서
정하고 동결한 뒤, 한국 데이터는 손대지 않은 operational transfer 검증으로 남김.
순서를 섞으면 검증이 아니라 튜닝이 됨.

## M32. P4 열세의 사후 진단 — **해상도·가는 형태 가설은 아직 기각되지 않음**

**근거**: `code/diagnose_p4_gap.py`, `evidence/gp_official_bundle/p4_gap_diagnosis.json`
**맥락**: M30에서 frozen(P4)이 공식 UNet3D(P2)에 82.0%로 졌음. 원인을 학습 없이 분해했음.
test 타일 1,133개(양성 423개), 같은 봉인 번들에서 계산했음.

### A. 블록-상수 라벨 oracle — hard geometric limit 설명은 약하지만 실제 병목은 미판정

캐시는 32×32 토큰(=40 m)임. 128×128(10 m) 라벨을 40 m로 내렸다 되올릴 때 남는 IoU가
얼마인지 라벨만 보고 계산했음. 아래 값은 각 4×4 블록을 단일 이진값으로 복원한
**비배포 가능 geometric reference**이며, 학습 decoder의 성능 상한이 아님. decoder는
토큰 하나에서 블록 내부의 비상수 4×4 출력을 만들 수 있기 때문임.

| 블록-상수 규칙 | tp | fp | fn | IoU 참고값 |
|---|---|---|---|---|
| any-positive (블록에 양성 1개라도) | 167,477 | 168,363 | 0 | **0.498681** |
| majority (블록 과반) | 118,105 | 27,063 | 49,372 | **0.607099** |
| — P2 실제 | | | | 0.159254 |
| — P4 실제 | | | | 0.130582 |

이 참고값이 실제 성능보다 높으므로 **블록-상수 출력만으로도 P2 수준의 라벨 기하를 표현할
수 있다는 약한 사실**만 남음. 그러나 실제 embedding이 그 정보를 보존한다는 증거가 아니며,
40 m token support가 학습 난도나 작은 물체 표현의 실질 병목인지도 판정하지 못함.
따라서 후보는 (a) 4×64 타일링으로 잘린 문맥, (b) 마지막 layer만 쓰는 작은 decoder,
(c) 40 m support, (d) representation adaptation 부재로 모두 열어 둠.

### B. 산사태 면적별 격차 — 작은 면적 집중 가설은 지지되지 않았지만 가는 형태는 미판정

| 라벨 면적 구간 | 타일 | 양성 px 범위 | P2 IoU | P4 IoU | 격차 |
|---|---|---|---|---|---|
| 아주 작음 | 105 | 2–73 | 0.043270 | 0.038162 | **0.005108** |
| 작음 | 106 | 75–206 | 0.091225 | 0.083583 | 0.007642 |
| 중간 | 106 | 207–475 | 0.203480 | 0.157499 | **0.045981** |
| 큼 | 106 | 478–3,229 | 0.311845 | 0.284740 | 0.027105 |

격차 최대 지점은 **중간 면적**이고, 가장 작은 면적에서는 두 방식이 거의 같음
(둘 다 매우 나쁨). 따라서 **격차가 작은 면적에만 집중된다**는 패턴은 관찰되지 않았음.
그러나 면적은 폭·elongation·경계복잡도의 대리변수가 아니므로 "가는 흉터" 또는
high-frequency residual 가설을 기각할 수 없음. 중간 면적 격차는 문맥 가설과 양립하지만
그 원인을 식별하지는 않음.

### 이 진단이 바꾸는 것

E1은 `4×64 vs 1×128 문맥`과 `작은 vs 큰 convolutional decoder`의 2×2 요인설계로 둠.
여기서 큰 decoder는 skip/intermediate feature가 없는 **capacity-matched decoder**이지
U-Net·multi-scale decoder가 아님. E1이 답하는 것은 문맥·용량의 평균효과와 상호작용이며,
40 m support·multi-scale feature·adaptation 문제는 별도 실험으로 남음.

### 아직 말할 수 없는 것

- seam을 **직접** 보지 못했음. per-sample 파일에 픽셀 예측이 없어 x/y=64 경계 근방
  오류율을 아직 못 쟀음. 예측 맵을 저장하는 재실행이 필요함.
- 크기 구간은 면적(px)만 씀. **폭·경계복잡도**는 아직 안 씀 — 가는 형태 가설을
  완전히 닫으려면 형태 지표가 필요함.
- 블록-상수 oracle은 test 라벨을 본 사후 진단이며, 실제 캐시 정보 보존이나 모델 상한을
  증명하지 않음. `p4_gap_diagnosis.json`의 v1 필드명 `token_grid_ceiling`은 잘못된 명칭이며,
  원본 증거는 보존하되 v2에서 정정함.

## M33. P2 우위는 **공간 블록 부트스트랩에서도 유지됨** — 단, ann_id 군집은 무효였음

**근거**: `code/bootstrap_spatial_block.py`, `code/bootstrap_arm_gap.py`,
`evidence/gp_official_bundle/arm_gap_ci_spatial.json`, `arm_gap_ci.json`

관측 격차 (P2 − P4, micro IoU) = **0.028672**, 10,000회 재표집, seed 20260826.

| 블록 크기 | 블록 수 | 블록당 타일(중위/최대) | CI95 | 폭 | p(격차≤0) |
|---|---|---|---|---|---|
| 2.56 km | 463 | 2 / 4 | [0.011592, 0.045378] | 0.033786 | 0.0009 |
| 5.12 km | 133 | 9 / 16 | [0.012339, 0.045330] | 0.032990 | 0.0002 |
| 10.24 km | 39 | 34 / 60 | [0.008401, 0.047830] | 0.039429 | 0.0027 |
| 20.48 km | 12 | 77 / 176 | [0.009739, 0.052631] | 0.042893 | 0.0018 |

블록을 키우면 구간이 넓어지지만(0.0338 → 0.0429) **어느 크기에서도 0을 포함하지 않음.**
따라서 이 한 지역·이 블록 정의의 민감도 분석에서는 P2 우위가 단순 타일 i.i.d. 재표집에만
의존하지 않음. 다만 20.48 km에서는 블록이 12개뿐이라 percentile CI가 불안정하고,
표의 `p(격차≤0)`는 bootstrap tail fraction이지 정식 가설검정 p-value가 아님.

### 먼저 시도한 `ann_id` cluster 부트스트랩은 **무효였음**

CI [0.014455, 0.043575]이 나왔으나 이 단위 자체가 틀렸음. 실측:

- test 1,133행 중 `ann_id` **빈값 710행(62.7%)** — 음성 타일에는 아예 없음
- 값이 있는 423행의 고유값이 **422개** → 타일과 사실상 1:1
- `event_date`도 `2019-03-15` 하나뿐(사이클론 이다이) → 사건 단위도 n=1

즉 그건 군집이 아니라 타일 i.i.d.였고 공간 상관을 무시했음.
**"ann_id 422개로 cluster bootstrap 가능"이라고 적었던 앞선 판단은 철회함.**
가능한 단위는 좌표 기반 공간 블록뿐이며, 좌표는 계약 파일에 없어 NetCDF `x`/`y`에서 읽었음.

## M34. 300표본에서 crop 경계 이상이 **관찰됨** — 층화·짝지은 CI 전에는 확증 아님

**근거**: `code/measure_cache_seam.py`, `code/extract_sen12_cache_full128.py`,
`evidence/gp_official_bundle/cache_seam.json` · 표본 300개

기존 P4 캐시는 128×128을 64 crop 4장으로 **독립** 인코딩해 이어붙였음.
토큰 격자 32×32에서 경계는 인덱스 16임. 이웃 토큰 코사인 거리로 쟀음.

| 캐시 | 경계 가로지르는 이웃 | 내부 이웃 | 비율 |
|---|---|---|---|
| 4×64 타일 (M30의 P4) | 0.267883 | 0.214104 | **1.48987** |
| 1×128 통짜 | 0.212440 | 0.246232 | **0.823504** |

선택된 300표본에서 타일 캐시는 crop 경계의 이웃 토큰이 내부보다 더 이질적이었고,
통짜 인코딩에서는 같은 패턴이 보이지 않았음. 이는 crop 경계 artifact와 일치함.
그러나 v1은 sample ID 정렬 후 첫 300개를 사용했고 지역 층화·짝지은 CI가 없으므로
**대표성 있는 확증 결과로 부르지 않음.** 고정 중심축이 실제 지형 경계와 겹칠 가능성도
full-cache 대조의 difference-in-differences와 계층 부트스트랩으로 수량화해야 함.

### 예상과 달랐던 것

두 캐시의 차이가 **경계에 몰려 있지 않음**:

| | 값 |
|---|---|
| 경계 띠 평균 코사인 거리 | 0.245780 |
| 내부 평균 코사인 거리 | **0.291037** |
| 상대 Frobenius 차이 | **0.746274** |

내부 차이가 경계 차이보다 **큼**. 즉 crop은 seam만 만든 게 아니라 **표현 전체를 바꿈**.
64 crop은 positional context와 self-attention 범위를 통째로 바꾸므로 이 방향이 자연스러움.
따라서 개선 가설을 "seam 제거"가 아니라 **"문맥 복원"**으로 써야 함.

### 아직 말할 수 없는 것

- **이 차이가 성능을 올리는지는 아직 모름.** 표현이 달라졌다는 것과 더 좋다는 것은 다름.
  1×128 캐시로 같은 decoder를 학습해야 답이 나옴 (진행 중, 6,834 샘플).
- v1 300표본은 ID 정렬 선택이라 지역 편향 가능성이 있음. 지역 균형 표본과
  `(tiled cross−inner)−(full cross−inner)`의 짝지은 계층 bootstrap CI가 필요함.
- peak CUDA 1.22 GB, 6샘플 1.81 s로 비용은 문제되지 않음.

## M35. M31의 "2,539 성공"은 **틀렸음** — 24.6%가 격자 밖 0 채움이었음

**근거**: `code/audit_aihub_cubes.py`, `evidence/cube_audit.json` · 2,539큐브 전수

물질화기는 단일 STAC item을 `boundless=True`로 읽음. 타일이 그 item의 MGRS 격자를
벗어나면 **밖이 0으로 채워진 채 성공으로 집계됨.** 전수로 재봤음.

| 전밴드 동시 0 비율 | 큐브 수 | 비율 |
|---|---|---|
| < 0.1% (정상) | 1,891 | 74.5% |
| 0.1 ~ 1% | 21 | 0.8% |
| 1 ~ 10% | 3 | 0.1% |
| **≥ 10% (심각)** | **624** | **24.6%** |

평균 0.201758 · 중위 0.0 · p95 **1.0** · 최대 **1.0**.
최악 사례는 `SA1900000000_20220417` 등으로 **전체가 0**인데 manifest에는 성공으로 기록됐고
`cloud_cover` 10.27까지 붙어 있었음.

**따라서 M31의 "성공 2,539 / 94.1%"를 철회함.** 사후 1% 기준을 만족한
**후보 큐브가 1,912개(75.3%)**였을 뿐, 이를 "실사용 가능"으로 확정하지 않음.
all-band zero는 심각한 hole을 잡는 proxy이며 원천 nodata mask·대상 격자 coverage·시각 감사가
아직 없고, 1% 기준도 사전 등록되지 않았기 때문임.

정상으로 확인된 것: `platform` 불일치 **0건**, 최대값 25,024로 uint16 포화 없음.

### 원인과 고칠 방향

한 타일이 두 MGRS 타일에 걸치면 단일 item으로는 절대 못 채움. 고치려면
**같은 날짜의 인접 item들을 모자이크**하거나, 커버리지가 100%인 item만 통과시켜야 함.
v2는 같은 날짜·플랫폼의 교차 item 전체를 target grid로 재투영해 결정론적으로 모자이크하고,
명시적 coverage mask가 사전 기준을 못 채우면 fail-closed해야 함. v1은 덮어쓰지 않음.
정확한 coverage·보간 규칙을 사전 등록하기 전에는 재실행하지 않음.

### 이 사건에서 배운 것

"오류 0건"은 무결성의 증거가 아니었음. 예외가 안 났다는 뜻일 뿐임.
**산출물은 형태·개수뿐 아니라 내용 분포까지 봐야 함** — L5(눈으로 확인한다)를
4표본에만 적용하고 전수에 적용하지 않은 것이 이번 누락의 직접 원인임.

## M36. [SUPERSEDED BY M37] E1 첫 새 셀은 회복 신호, 당시 factorial은 **배관 결함으로 중단**

아래는 첫 중단 실행의 역사 기록이다. 배관 수정·host identity 확인·동일 SHA 네 셀 재실행 결과는
M37이 현재 판정이며, M36의 한 셀만 최종 결과로 인용하지 않는다.

**근거(서버, 아직 저장소 미봉인)**:
`/home/work/data/olmoearth/e1_tiled_big/`, `/home/work/data/logs/e1_factorial.log`

E1 2×2의 `tiled cache + large convolutional decoder` 한 셀만 완주했다. 결과를 읽기 전에
`docs/E1_CONTEXT_DECODER_ANALYSIS_PLAN.md`에 contrast와 판정식을 동결했지만, 실행은 이미 시작되고
validation curve 일부를 본 뒤였으므로 완전한 preregistration이 아니라 prospective analysis lock이다.

| 방식 | params | train | IoU | AUPRC | ECE | ld-IoU | positive-patch macro IoU |
|---|---:|---:|---:|---:|---:|---:|---:|
| P4 tiled + small (M30) | 237,537 | 641 s | 0.130582 | 0.151348 | 0.024967 | 0.21338 | **0.159966** |
| **P4c tiled + large** | 2,989,121 | 1,036 s | **0.177727** | **0.213574** | **0.012010** | **0.21952** | 0.139172 |
| P2 official-safe UNet3D | 2,693,121 | 1,491 s | 0.159254 | 0.174585 | 0.033389 | **0.23922** | **0.194446** |

tiled 조건의 decoder contrast는 IoU **+0.047145**, AUPRC **+0.062226**로 크다. P4c는 P2보다
pixel-micro IoU와 AUPRC가 높아졌고 원래 95% 참고선도 넘었다. 따라서 M30의 열세를 frozen
embedding 자체의 한계로 귀속한 것은 성급했고, small decoder가 큰 병목 후보였음이 확인됐다.

그러나 **"P4c가 P2를 이겼다"로 요약하지 않는다.** 양성 patch macro IoU는 P4-small보다도
낮고 P2에 크게 지며, LD subset IoU도 P2보다 낮다. P4c는 precision 0.2669/recall 0.3472,
P2는 0.1871/0.5168로 오류 양상이 다르다. spatial paired CI·object-size/shape 분석·공통 val-based
threshold rule 전에는 어느 쪽이 산사태 segmentation에 더 낫다고 확정할 수 없다. test가 이미
노출된 한 지역·seed 1이라는 한계도 그대로다.

### 왜 나머지 두 셀이 안 돌았나

full128 경로에는 `emb_fp16` 6,834개만 있고 mask/raw/month/base audit는 tiled 경로에 있다.
runner의 단일 `--cache` 인자가 이 네 source를 모두 같은 root에서 찾도록 결합돼 있어 두 번째 셀이
시작 전 `cache audit seal 없음`으로 종료했다. full128 cache 자체는 6,834/6,834, 10.75 GB,
1,120.24 s로 추출 완료됐지만 이 실행 당시 별도 content seal이 없었다.

수정:

- runner에 `--emb-cache`를 추가해 mask/raw/month/base와 alternate embedding source를 분리함.
- alternate embedding 6,834개의 exact set·shape·dtype·finite·content SHA를 base audit와 묶는
  `code/audit_sen12_embedding_cache.py`를 추가함.
- `run_e1_factorial.sh`이 full cache seal을 먼저 만들고 full-small/full-big에 명시적으로 전달함.
- 기존 P4c 산출물은 삭제하지 않되, 최종 2×2는 수정 후 동일 code SHA로 다시 봉인하는 것이 원칙임.

원격 접속에서는 SSH host fingerprint 변경 경고가 발생했다
(`SHA256:y6YfMhYlugocey1MiM5fS2Ggg0RFtQSMCexH2ryWziI`). 현재 파일 읽기는 됐지만 host identity를
Backend.AI 세션과 재확인하기 전에는 코드 push·재실행 같은 원격 변경을 하지 않는다.

## M37. E1 2×2 완결 — full-context는 성능을 해쳤고 decoder 효과는 context에 따라 반전

**근거(저장소 봉인)**: `evidence/e1_factorial_v2/e1_factorial_analysis.json`과 네 cell의
pilot/per-sample JSONL. runner code SHA `1fb3fd66…`, paired test tile 1,133개. 네 cell의 runner
SHA·sample ID가 같고, per-sample TP/FP/FN에서 재계산한 micro-IoU가 pilot JSON과 일치해야만
분석기가 결과를 썼다.

| cell | cache / decoder | params | fixed 40-epoch fit+val | IoU | AUPRC | LD-IoU | positive-patch macro IoU |
|---|---|---:|---:|---:|---:|---:|---:|
| `y00` | tiled 4×64 / small | 237,537 | 866.6 s | 0.130582 | 0.151348 | 0.21338 | **0.159966** |
| `y01` | tiled 4×64 / large | 2,989,121 | 1,596.2 s | **0.177727** | **0.213574** | **0.21952** | 0.139172 |
| `y10` | full 1×128 / small | 237,537 | 647.4 s | 0.116565 | 0.132972 | 0.20293 | 0.141897 |
| `y11` | full 1×128 / large | 2,989,121 | 775.9 s | 0.081419 | 0.080557 | 0.09515 | 0.066738 |

사전 고정 IoU contrast:

| contrast | 값 | 판정 |
|---|---:|---|
| `C_small = y10-y00` | **-0.014017** | full-context가 small에서도 악화 |
| `C_large = y11-y01` | **-0.096308** | large에서 더 크게 악화 |
| context 평균 | **-0.055162** | 2.56/5.12/10.24/20.48 km CI 모두 0 아래 |
| `D_tiled = y01-y00` | **+0.047145** | tiled에서는 capacity 이득 |
| `D_full = y11-y10` | **-0.035146** | full에서는 capacity 손해 |
| decoder 평균 | +0.005999 | 네 scale CI 모두 0 포함, main effect 불성립 |
| interaction | **-0.082291** | 네 scale CI 모두 0 아래 |

따라서 사전 규칙의 `context-supported`와 `capacity-supported`, `y11 exploratory parity`는 모두
false다. 더 강한 결론은 **full-context의 음의 효과**와 **decoder 효과의 부호 반전**이다.
M34에서 full cache가 경계 이질성을 줄였다는 표현 진단은 맞지만, smoothness가 downstream
정보량이나 정확도를 보장하지 않았다. 즉 seam 제거를 성능 개선의 대리변수로 쓸 수 없다.

`y01`은 공식 P2의 micro-IoU/AUPRC(0.159254/0.174585)를 넘지만 positive-patch macro와 LD-IoU는
P2보다 낮다. 또한 head fit만 1,596.2 s로 P2의 1,491 s보다 길고 cache extraction 1,130 s를 별도로
요구하므로 현재 수치에는 accuracy-cost Pareto가 없다. 낮은 ECE나 높은 micro 지표 하나로 shared
cache 사업성을 주장하지 않는다.

**한계**: Chimanimani는 이미 노출된 개발 지역이고 seed 1뿐이다. spatial bootstrap은 test tile의
공간 상관 민감도이지 optimization seed 불확실성이 아니다. 따라서 negative interaction을 지역·seed
일반 법칙으로 승격하지 않는다. 다음 recipe 선택 전에 exact-time 정보 계약을 정렬하고, 선택한
tiled-large와 strong raw baseline을 공통 seed로 반복해야 한다. full-context arm은 이 개발 계약에서
중단하며 다른 모델/해상도로 일반화하지 않는다.

## M38. 벽시계 비용은 **오염됐음** — FLOPs로 다시 재니 손익분기는 살아남되 baseline에 의존함

**근거**: `code/measure_flops_cost.py`, `evidence/flops_cost.json`
**맥락**: M30(손익분기 K≥2)과 M37(Pareto 없음)이 모두 `fit_plus_epoch_val_seconds`
위에 세워져 있었음. 그 시계가 믿을 만한지 먼저 확인했음.

### 벽시계가 못 쓰는 이유 — 같은 구성에서 +35%

| 구성 | M30 기록 | M37 기록 | 차이 |
|---|---|---|---|
| P4 · tiled · small (**동일 구성·동일 변수**) | 641 s | 866.6 s | **+35.2%** |
| P4c · tiled · large | 1,036 s (본 세션 실측) | 1,596.2 s | +54.1% |
| P4 · full · small | 839 s (본 세션 실측) | 647.4 s | −22.8% |

두 실행 모두 GPU1에 **다른 프로젝트 작업 2개(각 35 GB)** 가 동시에 돌던 중이었음.
`fit_plus_epoch_val_seconds`는 벽시계이므로 경합을 그대로 흡수함.

#### 결정적 증거 — 출력이 **비트 단위로 같은데** 시간만 2.14배 다름

`full_1x128 / large` 구성을 두 세션이 **독립적으로** 돌렸음.

| | 다른 세션 `y11` | 본 세션 칸4 |
|---|---|---|
| IoU | 0.081419 | **0.081419** |
| AUPRC | 0.080557 | **0.080557** |
| ECE | 0.010456 | **0.010456** |
| positive-patch macro IoU | 0.066738 | **0.066738** |
| ld_IoU | 0.09515 | **0.09515** |
| **벽시계** | **775.9 s** | **1,657 s** (2.14배) |

**전 지표가 완전히 일치하므로 계산은 동일함**(결정성 계약 유지 확인).
동일 계산의 시간만 2.14배 다르다는 것은 벽시계가 경합 잡음이라는 완결된 증명임.
**따라서 벽시계 기반 비용 비교는 무효로 본다.**

부수 성과: 이 일치는 M30~M37의 결정성 주장을 **다른 실행·다른 세션에서 외부 재현**한 것이기도 함.

### 경합 불변 대체 지표 — 샘플당 forward FLOPs

| 모듈 | GFLOP / 샘플 |
|---|---|
| P4 작은 decoder | 2.01 |
| P4c 큰 decoder | 14.50 |
| P3 공식 U-TAE | 38.72 |
| P2 공식 UNet3D | 270.76 |
| **OlmoEarth 인코더 (1×128)** | **26,454.32** |

파라미터 대조 통과: 237,537 / 2,989,121로 실제 arm과 일치.

### 실측과의 정합성 확인

인코더 총 `1.808e17` FLOP, P2 학습 총 `1.801e17` FLOP로 **거의 같음**.
환산 처리율 160.0 vs 120.8 TFLOP/s — 같은 자릿수이므로 FLOPs 모델이 실측 시간과 모순되지 않음.

### 손익분기 (학습 배율 반영: 5,542 샘플 × 40 epoch × 3)

| raw baseline | head | K* (실수) | 정수 |
|---|---|---|---|
| P2 공식 UNet3D | 작은 | 1.0115 | **2** |
| P2 공식 UNet3D | 큰 | 1.0608 | **2** |
| P3 공식 U-TAE | 작은 | 7.4051 | **8** |
| P3 공식 U-TAE | 큰 | 11.2207 | **12** |

**M30의 `K≥2`는 살아남음** — 오염된 벽시계가 아니라 FLOPs로도 같은 답이 나옴.

### 그러나 새로 드러난 것: 손익분기는 **baseline 선택에 의존함**

U-TAE는 P2보다 **7.0배 싸면서** IoU 0.120554로 P2(0.159254)의 **75.7%**를 냄.
FLOP당 정확도로는 U-TAE가 훨씬 유리함. 상대를 U-TAE로 바꾸면 공유 캐시는
**8~12개 task**가 있어야 이득임.

**지금까지의 비용 논의는 가장 비싼 baseline 하나만 상대했음.** RQ2의 3-task 계획은
P2 기준으로는 손익분기를 넘지만 U-TAE 기준으로는 **넘지 못함**. 어느 쪽을 운영
baseline으로 볼지 **사전에 고정해야 하며, 아직 고정하지 않았음.**

### 이번 측정에서 내가 낸 오류 2건 (수정 후 재측정함)

1. `conv_bn`을 conv **1개**로 복제해 작은 decoder 파라미터가 191,169로 나왔음.
   원본은 conv **2개**임. 수정 후 237,537로 일치.
2. 손익분기식에서 **학습 배율을 누락**했음. 인코더는 샘플당 1회지만 task 모델은
   40 epoch × (fwd+bwd)를 돎. 처음엔 K≈98이 나왔고 이는 인코더 비용을 약 100배
   과대평가한 것임.

### M37 서술 중 정정할 것

"decoder 용량을 키우면 좋아진다 → 기각"은 **주변평균 기준으로만 맞음**.
실제로 배포된 계약인 tiled 안에서는 `D_tiled` CI **[0.033754, 0.059273]**, tail **0.0**으로
0을 명확히 제외함. 정확한 진술은 **"decoder 용량 효과는 문맥 계약에 의존한다"**이며,
상호작용 −0.082291이 그 근거임. `D_decoder_mean`이 0을 포함하는 것은 tiled(+0.047145)와
full(−0.035146)이 상쇄된 결과이지 "효과 없음"이 아님.

### 아직 말할 수 없는 것

- forward FLOPs만 셈. backward를 일괄 2배로 가정했고 arm마다 그 비율이 같다는 보장은 없음.
- 메모리 대역폭·커널 효율·데이터 로딩은 반영되지 않음. **실제 시간이 아님.**
- 추론 지연시간과 신규 관측의 re-embedding 지연은 **아직 안 쟀음.**
  운영비 주장에는 이 둘이 필요함.
- 저장 비용(캐시 10.75 GB)은 이 식에 없음.

## M39. "exact timestamp 비대칭"은 **존재하지 않음** — wrapper는 월 해상도만 씀

**근거**: `code/probe_timestamp_asymmetry.py`, `evidence/timestamp_asymmetry.json`
**맥락**: 다음 실험 1순위가 "P2/P3의 month 입력과 P4의 exact timestamp 비대칭 제거"였음.
고치기 전에 **비대칭이 실재하는지부터** 확인했음.

### 방법

같은 큐브를 두 timestamp 집합으로 인코딩해 임베딩을 비교했음.
(a) 원래 timestamp (b) **월을 보존한 채 날짜만 ±1~3일 이동**.

### 결과 — 5/5 비트 단위 동일

| sample | 시점 수 | 한 달을 공유하는 시점 | 월 채널 변화 | max abs diff | 동일? |
|---|---|---|---|---|---|
| chimanimani_s2_1000 | 12 | 2 | False | **0.0** | 예 |
| chimanimani_s2_1001 | 12 | 3 | False | **0.0** | 예 |
| chimanimani_s2_1002 | 12 | 3 | False | **0.0** | 예 |
| chimanimani_s2_1003 | 12 | 3 | False | **0.0** | 예 |
| chimanimani_s2_1004 | 12 | 3 | False | **0.0** | 예 |

**OlmoEarth wrapper(`use_legacy_timestamps=False`)는 날짜 수준 변화에 완전히 둔감함.**
시간 정보를 **월 해상도로 양자화**함.

### 따라서

`month/11` 한 채널을 받는 P2/P3는 **이미 인코더와 같은 시간 해상도**를 가짐.
**"exact-time parity" 실험은 없는 문제를 고치는 것이므로 실행하지 않음.**
다음 실험 순서에서 이 항목을 내림.

### 남는 진짜 비대칭 — 정보량이 아니라 **부호화 형태**

| | P4 | P2 / P3 |
|---|---|---|
| 시간 정보 | 월 | 월 (동일) |
| 부호화 | sinusoidal positional encoding (d_model 차원) | 스칼라 1채널 `month/11`을 공간 전체에 broadcast |

정보량은 같고 **표현 방식이 다름**. 이는 "P4가 더 많은 정보를 봤다"가 아니라
"같은 정보를 더 쓰기 좋은 형태로 받았다"는 훨씬 약한 주장임.
검정하려면 raw arm에 **월의 sinusoidal 부호화**를 주고 다시 재야 함 — 별도 실험 항목으로 둠.

### 중간에 잡은 내 오류 2건

1. 처음엔 월을 전부 그 달 1일로 뭉갰는데, 한 달에 2~3개 시점이 몰려 있어
   **timestamp 중복**으로 wrapper가 거부했음(`multiple images with the same timestamp`).
   이 실패 자체가 "12시점 중 9~10개 월만 존재"한다는 증거였음.
2. 그다음 무조건 +1일을 썼는데 일부 시점의 **월이 넘어가** `month_channel_changed=True`가
   됐고, 그 상태에서 임베딩이 달라진 것을 "날짜 민감성"으로 잘못 읽을 뻔했음.
   월 보존 이동으로 바꾼 뒤 차이가 **정확히 0**이 됐음.

### 아직 말할 수 없는 것

- 5샘플·1지역·`use_legacy_timestamps=False` 설정에서만 확인했음.
  `use_legacy_timestamps=True`나 다른 modality에서는 다를 수 있음.
- 월 해상도 양자화가 **downstream에 손해인지**는 별개 문제이며 여기서 답하지 않음.
  (계절 신호만 필요한 task에는 충분할 수 있음.)

## M40. oracle 여유는 **있으나** 라벨 없는 예측은 실패 — 그리고 P4c 우위는 **오경보 축**이었음

**근거**: `code/oracle_routing_headroom.py`, `evidence/oracle_routing_headroom.json`,
`evidence/positive_tile_breakdown.json` · test 1,133타일 · 새 학습 없음
**맥락**: kill gate 2("task/장면별 승자가 교차하고 예측 가능한가")를 기존 per-sample
파일만으로 쳤음. 실패하면 router 방향 전체를 접어야 하므로 먼저 확인했음.

### (1) 전체 타일 oracle — 겉보기 여유 큼

best single = `P4c_tiled_big` 0.177727 → oracle **0.248310**, gain **+0.070583 (+39.71%)**.
승자 분포도 흩어져 있음: 최고 arm이 42.45%만 이기고 **7개 arm 전부**가 어딘가에서 이김
(최하위 P1도 2.47%).

### (2) 그러나 그 여유의 상당 부분은 **빈 타일 인공물**

test 1,133타일 중 **710개(62.7%)가 산사태 화소 0개**임. 빈 타일에서 IoU는
`0/(0+fp+0)`이므로 **거짓양성이 적은 arm이 자동으로 이김.** 실제로:

| arm | 이긴 타일 | 그중 양성 0인 비율 |
|---|---|---|
| P4c_tiled_big | 481 | **85.2%** |
| P4c_full_big | 176 | **85.8%** |
| P4_tiled_small | 178 | 67.4% |
| P2_unet3d | 127 | 0.0% |
| P3_utae | 82 | 2.4% |

### (3) 양성 타일 423개만 보면 **순위가 뒤집힘**

| arm | 전체 IoU | **양성 타일 IoU** | 빈 타일 FP |
|---|---|---|---|
| **P2 공식 UNet3D** | 0.159254 | **0.225709** | 160,013 |
| P4c frozen + 큰 decoder | **0.177727** | 0.213494 | **54,817** |
| P4 frozen + 작은 | 0.130582 | 0.203144 | 219,149 |
| P3 공식 U-TAE | 0.120554 | 0.192932 | 387,502 |
| P4 full + 작은 | 0.116565 | 0.188782 | 234,556 |
| P1 shallow | 0.054621 | 0.125927 | 1,040,842 |
| P4c full + 큰 | 0.081419 | 0.094022 | 31,903 |

**"frozen + 큰 decoder가 공식 UNet3D를 이겼다"는 서술을 정정함.**
전체 micro-IoU로는 맞지만, 그 우위는 **오경보를 P2의 34.3%로 줄인 것**에서 나옴.
산사태를 실제로 그리는 능력은 P2의 **94.6%**로 여전히 아래임.
`positive_patch_macro_iou`(0.194446 vs 0.139172)와 `ld_iou`(0.23922 vs 0.21952)가
이미 같은 방향을 가리키고 있었고, 이제 **기전이 확인됐음**: 오경보 축 vs 경계묘사 축.

양성 타일만으로 다시 계산해도 oracle 여유는 남음:
best single `P2_unet3d` 0.225709 → oracle **0.295112**, gain **+0.069403 (+30.7%)**,
승자 분포 P2 30.0% · P3 18.9% · P4c_tiled 16.8% · P4_tiled 13.7% · P4_full 8.0% ·
P1 6.6% · P4c_full 5.9%. **여유 자체는 인공물이 아님.**

### (4) 그러나 라벨 없이 승자를 못 맞힘 — gate 2의 나머지 절반 **실패**

`P2_unet3d` vs `P4c_tiled_big` 중 승자를 라벨 없는 값
(`mean_probability`, `prediction_positive_pixels`)만으로 맞히는 최선 규칙:

| | 값 |
|---|---|
| 결정 가능한 타일 | 377 |
| 다수결 정확도 | 0.6260 |
| 최선 단일특징 규칙 (in-sample 임계값 탐색) | **0.6499** |
| 순이득 | **+2.4%p** |

임계값을 **같은 데이터에서 고른 낙관적 상한**인데도 다수결보다 2.4%p밖에 못 넘음.
표본 외에서는 사실상 0으로 봐야 함. **현재 특징만으로는 router가 성립하지 않음.**

### 반드시 먼저 해야 할 통제 두 가지 (아직 안 했음)

1. **잡음 바닥 oracle**: 같은 구성을 seed만 바꿔 2회 돌린 뒤 그 둘 사이의 oracle gain을 잼.
   그 값이 **순수 선택 잡음**임. 실제 routing 여유는 이 바닥을 넘어야 의미가 있음.
   현재 +0.0694는 7개 arm에 대해 test 라벨로 고른 값이라 **위로 편향돼 있음.**
2. **임계값 정합 비교**: P4c의 우위가 오경보 축이므로, P2의 임계값을 P4c와 같은 FP율에
   맞춘 뒤에도 양성 타일 우위가 유지되는지 봐야 함. 지금은 per-sample에 확률맵이 없어
   못 함. **다음 실행부터 확률맵을 저장해야 함.**

### 아직 말할 수 없는 것

- chimanimani test는 이미 다회 노출됨. 전부 development-only이며 확증이 아님.
- oracle은 test 라벨로 고른 상한임. 위 통제 1을 하기 전에는 크기를 신뢰할 수 없음.
- 라벨 없는 특징을 2개 계열만 시도했음. 캐시 자체의 통계(노름·유효 랭크·공간 자기상관)나
  arm 간 불일치(disagreement)는 아직 안 써봄. 이것들이 되면 결론이 바뀔 수 있음.

## M41. seed 분산이 헤드라인을 또 하나 무너뜨림 — 그러나 routing 여유는 잡음 바닥을 넘음

**근거**: `code/noise_floor_analysis.py`, `code/run_noise_floor_oracle.sh`,
`evidence/noise_floor_analysis.json`, `evidence/noise_floor/seed{2,3}_P4c_test.jsonl`,
`evidence/tile_coords.json`
**맥락**: M40이 요구한 통제 1(잡음 바닥 oracle)을 실행했음. 같은 구성
(P4c·tiled 캐시·큰 decoder)을 **seed만 바꿔** 2회 추가 학습(seed 2, 3)했음.

### (1) seed 분산 — "P4c가 P2를 이겼다"는 seed 1의 운이었음

| seed | micro IoU (전체) | macro IoU (양성 타일) |
|---|---|---|
| 1 | 0.177727 | 0.139172 |
| 2 | 0.159746 | 0.139827 |
| 3 | 0.144488 | 0.119644 |

micro IoU: 평균 **0.160654** · 범위 **0.033239** · 표준편차 **0.016638**.
**P2(0.159254, 단일 seed)가 P4c의 seed 범위 [0.1445, 0.1777] 한가운데 있음.**
3-seed 평균 0.1607 ≈ P2 0.1593. **M37의 "tiled-large가 micro를 회복했다"는
seed 취약(seed-fragile) 결과로 강등함.** 단정 서술을 철회함.

부수 관찰: seed 1과 2는 micro가 0.018 차이 나는데 macro(양성)는 0.1392 vs 0.1398로
거의 같음 — micro의 seed 변동이 주로 **빈 타일 FP 행동**에서 옴. 주 지표를
양성 macro로 사전 등록해야 할 또 하나의 근거임. (단 seed 3은 macro도 낮아
macro가 seed에 면역이라는 뜻은 아님.)

### (2) 잡음 바닥 oracle — 순수 선택 잡음의 크기

같은 표현·같은 구성·seed만 다른 두 실행 사이의 per-tile oracle gain
(지표 정렬: 양성 타일 tile-IoU 평균으로 선택·보고 통일):

| seed 쌍 | best single | oracle | **잡음 바닥 gain** |
|---|---|---|---|
| 1|2 | 0.139827 | 0.168847 | **0.029021** |
| 1|3 | 0.139172 | 0.158088 | 0.018916 |
| 2|3 | 0.139827 | 0.158152 | 0.018325 |

**모델이 완전히 같아도 per-tile 선택만으로 +0.018~0.029가 나옴.**
이 바닥을 모르고 oracle gain을 보고하면 그만큼이 허수임.

### (3) 관측 oracle은 바닥을 2.7배 넘음 — gate 2 전반부는 개발 수준에서 생존

서로 다른 4 arm(P2·P3·P4·P4c-seed1), 같은 정렬 지표, 양성 423타일:

| | 값 |
|---|---|
| best single (P2, macro) | 0.194446 |
| oracle | 0.272922 |
| gain | **+0.078476** |
| gain − 잡음 바닥(최대) | **+0.049455** |
| gain / 바닥 비율 | **2.704** |
| (gain − 바닥) 공간 블록 5.12 km CI95 | **[0.048845, 0.069595]** — 0 제외 |

**arm 간 상보성은 선택 잡음으로 환원되지 않음.** M40의 (4) 라벨 없는 예측 실패는
그대로 유효하므로, 현재 위치는 여전히 "여유는 실재하나 예측기는 없음"임.
CI의 바닥은 seed2|seed3 쌍(0.0183)을 썼고 점추정은 최대 바닥(0.0290)을 썼음 —
보수적 조합이 아니므로 둘 다 표기함.

### (4) M40의 지표 불일치 결함 수정

M40은 tile-IoU로 선택하고 micro-IoU로 보고해 쌍별 gain이 음수가 되는 목적 불일치가
있었음(외부 감사 지적이 맞음). 수정:
- **macro 축**: 선택·보고를 tile-IoU 평균으로 통일 (macro는 타일별 분해 가능 → per-tile max가 정확한 oracle)
- **micro 축**: 좌표상승 탐욕 oracle(하한) — best single 0.177727 → **0.305031**, gain +0.127304

### (5) 기하 진단 (M37 기전 후보) — `evidence/cache_geometry.json`

| 가설 | 측정 | 판정 |
|---|---|---|
| A. 과도 평활화 | 공간 고주파 에너지 비율 full/tiled = **0.8359** | **지지** |
| B. 표현 붕괴 | 유효 랭크 비율 0.9655 | 기각 |
| C. 척도 이동 | std 비율 0.9788 · 노름 비율 0.9773 | 기각 |

통짜 인코딩은 채널 통계·랭크는 보존하면서 **공간 고주파만 16.4% 깎음**.
전역 attention의 평활화가 M37 성능 저하의 유력 기전임. 단 상관 관찰이며 인과 증명 아님.

### 아직 말할 수 없는 것

- P2·P3의 seed 분산은 **아직 안 쟀음.** P2도 seed에 0.03씩 흔들리면 M33의 격차 CI
  해석이 또 달라짐. 다음 GPU 여유 시 P2 seed 2·3을 돌려야 함.
- 잡음 바닥은 P4c 한 구성에서만 쟀음. arm마다 바닥 크기가 다를 수 있음.
- 관측 oracle의 arm 4개 중 P4c는 **seed 1(운 좋은 seed)** 을 씀. seed 평균으로 다시
  구성하면 gain이 줄 수 있음.
- 전부 chimanimani 단일 지역·development-only임.

## M42. E7a R-event — task 이질성 kill gate **발동**: 두 task의 승자가 같았음

**근거**: `code/probe_r_event.py`, `evidence/r_event_probe.json` · 학습 없음, CPU 전용
**맥락**: RQ2 public twin의 최소형. 같은 봉인 캐시로 retrieval(양성 타일 검색)을 수행해
segmentation과 **캐시 선택의 순위가 달라지는지** 봤음. 사전 등록 판정:
"두 task의 순위가 같으면 task 이질성 주장은 AI-Hub 3-task 전까지 보류."

### 설계

train 양성 타일 평균 임베딩(prototype) 코사인 유사도로 test 1,133타일 순위.
prototype은 train에서만 생성, test 라벨은 평가에만 사용. 학습·seed 없음(결정적).

### 결과

| arm | AP | R@50 | R@200 | nDCG@100 |
|---|---|---|---|---|
| tiled_4x64 캐시 | **0.6954** | 0.1111 | 0.3499 | 0.8953 |
| full_1x128 캐시 | 0.6805 | 0.1087 | 0.3381 | 0.8545 |
| raw spectral 평균 (10차원) | 0.6682 | 0.1040 | 0.3499 | 0.8479 |
| random (20회 평균) | 0.3769 | 0.0415 | 0.1799 | 0.3677 |

### 판정 — kill gate 발동

| task | 승자 |
|---|---|
| segmentation (M30/M37, 작은 decoder) | tiled_4x64 |
| retrieval (본 실험) | tiled_4x64 |

**역전 없음.** 등록한 대로 "같은 캐시 자원에 대해 task별 최적 선택이 다르다"는 주장은
이 데이터로 지지되지 않으며, **AI-Hub 3-task(E8) 전까지 보류함.**

### 부수 발견 — retrieval에서 캐시의 부가가치가 얇음

frozen 캐시(768차원) AP 0.6954 vs **밴드 평균 10개짜리** 0.6682. 차이 +0.0272.
prototype 코사인이라는 극히 단순한 판독에서는 캐시가 spectral 평균을 거의 못 벗어남.
R@200은 동률(0.3499)임. CRITICAL_PATH 1c("같은 cache가 retrieval에도 raw spectral보다
나은가")의 답은 **"근소하게, 그러나 강하지 않게"**임.

### 아직 말할 수 없는 것

- prototype 1개짜리 최약체 판독임. 학습된 retrieval head면 캐시 우위가 커질 수 있음
  (그러면 그 자체가 "판독기 용량 의존"의 재현이 됨 — M37과 같은 구조).
- 단일 지역·이진 양성 검색임. event 단위 검색(동일 event 타일 묶음)은 ann_id가
  타일당 고유(M33)라 이 데이터로는 정의 불가.
- kill gate는 "보류"이지 "기각"이 아님 — task 축이 seg vs retrieval 두 개뿐이고
  둘 다 산사태 신호를 공유함. 이질성의 진짜 시험대는 서로 다른 물리 신호를 쓰는
  AI-Hub 3-task(토지피복/벌목/산사태)임.

## M43. E5a 완결 — **오늘의 중심 음성 결과가 뒤집혔음**: 82% 게이트 실패는 seed 1 대 seed 1의 비교였음

**근거**: `code/run_seed_spread_p2p4.sh`, `evidence/seed_spread/` (per-sample 4개 +
`summary_recomputed.json`), 재계산으로 소수점 6자리 대조 완료
**맥락**: M41이 P4c의 seed 폭(0.033)을 쟀고, E5a가 격차의 양쪽(P2·P4)을 seed 2·3으로
반복했음. 사전 등록 kill gate: "P2 폭이 격차 0.029를 삼키면 M33을 미확정으로 강등."

### 3-seed 확정표 (전부 per-sample 재계산 검증)

| arm | seed 1 | seed 2 | seed 3 | 평균 | 폭 |
|---|---|---|---|---|---|
| **P2 공식 UNet3D** micro IoU | 0.159254 | **0.083273** | 0.121479 | 0.121335 | **0.075981** |
| **P4 frozen+작은** micro IoU | 0.130582 | 0.129527 | 0.139970 | 0.133360 | **0.010443** |
| P2 양성 macro IoU | 0.194446 | 0.112859 | 0.130575 | 0.145960 | 0.081587 |
| P4 양성 macro IoU | 0.159966 | 0.181241 | 0.199708 | 0.180305 | 0.039742 |
| (참고) P4c frozen+큰 micro | 0.177727 | 0.159746 | 0.144488 | 0.160654 | 0.033239 |

### 판정 1 — kill gate 발동: M30·M33·M40의 arm 비교를 전부 **미확정으로 강등**

P2의 seed 폭 **0.0760**은 M33이 확정이라 불렀던 격차 0.0287의 **2.6배**임.
M33의 공간 블록 CI는 타일 표집 잡음만 반영했고 **최적화(seed) 잡음을 고정 상수로
취급**했음 — 그 가정이 틀렸음. 단일 seed 대 단일 seed 비교는 이 영역에서 무의미함.

- **M30의 "95% 게이트 실패(82.0%)"**: 등록된 프로토콜(단일 seed)에서의 실패 기록은
  유지함. 그러나 그 프로토콜 자체가 결함이었음이 판명됐음 — 3-seed 평균으로는
  P4/P2 = **109.9%**로 frozen이 오히려 위임.
- **M40의 "양성 타일은 P2 우위"**도 뒤집혔음: P2 seed 1의 macro 0.1944는 자기 seed 중
  최고치였고, 3-seed 평균은 P4 0.1803 > P2 0.1460임.

**사후에 게이트를 통과로 바꾸지 않음.** 실패 기록은 그대로 두고, 다중 seed 프로토콜을
확증 지역용으로 새로 사전 등록함(주 지표: 3-seed 평균 양성 macro + seed 폭 병기).

### 판정 2 — 새 양성 주장 후보: frozen 캐시의 **학습 분산 안정성**

같은 40 epoch·같은 데이터·같은 선택 규칙에서:

| | P2 (raw 학습) | P4 (frozen+판독기) | 비율 |
|---|---|---|---|
| micro 폭 | 0.075981 | 0.010443 | **7.3×** |
| micro 표준편차 | 0.038 | 0.0058 | 6.6× |

frozen 캐시 위의 작은 판독기는 **최적화 지형이 안정**해서 seed에 거의 흔들리지 않음.
raw에서 통째로 학습하는 공식 모델은 seed에 따라 고재현율 붕괴(seed 2: recall 0.748,
precision 0.086, ECE 0.087)까지 감. 이는 "cache 재사용의 가치는 평균 성능이 아니라
**배포 시점의 분산 축소**"라는, 기존에 세우지 않았던 주장의 실측 근거임.
utility에 분산 항을 넣는 risk-sensitive routing과 자연스럽게 연결됨.

### 이 주장이 공격받을 지점 (미해결 — 주장 승격 전 필수)

1. **튜닝 인공물 가능성**: P2의 불안정이 pos_weight·LR·clip 부재 때문일 수 있음.
   "raw 학습은 불안정하다"가 아니라 **"동일 고정 프로토콜 하에서 7배 분산"**으로만
   서술해야 함. 표준 안정화(LR 하향·grad clip) 1~2개를 P2에 적용한 강건성 검사가
   승격의 전제임.
2. seed 3개는 폭의 하한 추정임. P2는 5-seed 확장이 필요함(회당 25분).
3. 전부 chimanimani 단일 지역·development-only임.

## M44. E5c FP율 정합 — P4c 우위는 임계값 인공물이 **아니었음**. 단 승자는 작동점에 의존함

**근거**: `code/threshold_matched_compare.py`, `code/run_probmaps_eval.sh`,
`evidence/threshold_matched.json`, `probmaps_eval/` (uint8 확률맵, seed 1 체크포인트 소급)
**검증**: eval-only 재현이 봉인값과 일치 — P4c micro 0.177727·AUPRC 0.213574 완전 일치,
P2 micro 0.159235 vs 봉인 0.159254 (uint8 양자화 오차 2e-5, 허용).

### 사전 등록 판정 규칙 (실행 전 고정)

"P2를 P4c의 빈 타일 FP율에 정합시킨 뒤에도 P2의 양성 macro가 위면 → P4c 우위는
임계값 인공물로 확정, frozen 경쟁력 서술 전면 철회." + 대칭 방향 동시 보고.

### 결과

| 작동점 | P2 macro | P4c macro | P2 micro | P4c micro |
|---|---|---|---|---|
| 기본 0.5 (FP 불일치: 160k vs 55k) | **0.1945** | 0.1392 | 0.1592 | **0.1777** |
| **P2를 P4c FP율로** (t=0.78) | 0.1342 | **0.1392** | 0.1505 | **0.1777** |
| P4c를 P2 FP율로 (t=0.016) | **0.1945** | 0.1579 | 0.1592 | 0.1594 |

### 판정

- **같은 오경보 예산에서는 P4c가 macro·micro 모두 위임** — 등록 규칙상 임계값
  인공물 판정은 **기각**, frozen 경쟁력 서술은 생존함.
- 단 대칭 방향에서는 P2가 macro 우위임. 즉 **승자는 작동점의 함수**임:
  낮은 FP 영역(경보 운영에서 실제로 쓰는 영역)은 P4c, 높은 FP 영역은 P2.
  M40의 "오경보 축 vs 경계묘사 축" 해석이 곡선 수준에서 확인된 것임.
- **M40의 서술 하나를 추가 정정함**: "P4c 우위는 오경보 축에서 나왔고 경계묘사는
  P2가 위"는 **0.5 고정 비교에서만** 참이었음. FP 예산을 맞추면 경계묘사도 P4c가 위임.

### 한계

- 확률맵은 **seed 1 체크포인트**에서 소급함. M43에서 P2 seed 1이 자기 seed 중
  최고치였으므로 이 비교는 **P2에 유리한 조건**임 — 그런데도 정합 후 P4c가 위였다는
  점에서 방향은 보수적으로 안전함. 다중 seed 확률맵은 다음 실행부터 자동 저장됨.
- uint8 양자화(1/255)로 임계값 해상도가 제한됨. 정합 오차: fp_empty 54,412 vs 54,822.
- 단일 지역 development-only.

## M45. 라벨 없는 승자 예측 재시도 — **진전은 실재하나 사전 등록 기준 미달**

**근거**: `code/labelfree_winner_retry.py`, `evidence/labelfree_winner_retry.json`
**맥락**: M40의 실패 조건 두 개를 고쳐 재시도했음 — (1) 특징에 **arm 간 불일치**
(disagreement, 확률맵 필요→E5b로 해금) 추가, (2) in-sample 임계값 탐색을
**5.12 km 공간 블록 5-fold CV**로 교체(규칙은 train 블록에서만 학습).

### 사전 등록 판정 규칙 (실행 전 고정)

"held-out 평균 lift ≥ +5%p **이고** 5-fold 전부에서 다수결 이상."

### 결과 (P2 vs P4c, seed 1, 판정 가능 377타일, P4c 승률 37.4%)

| fold | 예측기 | 다수결 |
|---|---|---|
| 1 | 0.5875 | 0.5750 |
| 2 | 0.7500 | 0.6154 |
| 3 | 0.7952 | 0.6386 |
| 4 | 0.6818 | 0.6250 |
| **5** | **0.6081** | **0.6757** ← 미달 |
| 평균 | **0.6845** | 0.6259 |

**평균 lift +5.86%p — 첫 조건은 통과. 그러나 fold 5가 다수결에 못 미쳐
둘째 조건 실패. 판정: M40 실패 유지.** 기준을 사후에 완화하지 않음.

### 그래도 기록할 진전

- M40: in-sample 낙관 상한이 **+2.4%p** → 본 실험: out-of-sample 평균 **+5.9%p**.
  측정이 더 엄격해졌는데 신호가 커졌음. 방향은 살아 있음.
- 특징 가중치: `f_maxp_b`(P4c 최대 확률, +1.74) · `f_conf_b`(P4c 확신도, +0.93) ·
  `f_prob_l1`(두 arm 확률 차, +0.81)이 지배적 — **P4c 자신의 확신 구조**가 정보원임.
  disagreement 자체(+0.13)는 예상보다 약했음.

### 다음에 바뀔 수 있는 것

- n=377로 fold당 ~75타일뿐 — fold 분산이 큼. 확증 지역이 열리면 표본이 커짐.
- 지형 공변량(경사)·캐시 통계(M41 기하)를 아직 안 섞었음.
- 이 쌍(P2 seed1 vs P4c seed1)은 M43상 **P2의 운 좋은 seed**라 승자 라벨 자체가
  seed 조건부임. 다중 seed 확률맵이 쌓이면 라벨의 안정성부터 재야 함.

## M46. E6 Action Matrix v1 — **블록별 이질성의 겉모습은 거의 전부 seed 잡음이었음**

**근거**: `code/build_action_matrix.py`, `evidence/action_matrix_v1/`
(`matrix_summary.json`, `blocks.jsonl`) · 재학습 없음
**맥락**: EarthRoute 학습 데이터의 원형. 5.12 km 블록 × 6 action × utility.
주 지표는 양성 타일 macro IoU(M40), 기준 action은 `reuse`, λ 후보 3개를 **모두** 보고
(결과를 보고 하나를 고르지 않기 위해).

**설계에 M43을 계약으로 박았음**: 모든 action 값은 가용 seed 평균, seed 1개인 action은
`reliable=false`, 블록 최적은 **seed 폭보다 큰 차이**일 때만 유효.

### 겉보기 — 이질성이 있는 것처럼 보임

양성 있는 블록 69개에서 argmax가 6개 action에 흩어짐:
`raw_utae 28 · reuse 16 · recontext 9 · reuse_bigdec 8 · raw_unet3d 5 · recontext_bigdec 3`.
`single_action_dominates=false` — kill gate 통과처럼 보임.

### 실제 — 두 개의 치명적 오염

**(1) seed 폭이 margin을 압도함**

| | 값 |
|---|---|
| 블록 최적 vs 차순위 margin 중위 | **0.0270** |
| 블록 seed 폭 중위 | **0.1054** (3.9배) |
| seed 폭을 넘는 결정적 블록 | **69개 중 3개 (4.3%)** |

**(2) 단일 seed action이 승자를 독식함**

6개 action 중 3개(`raw_utae`·`recontext`·`recontext_bigdec`)가 seed 1개뿐임.
이들이 **69블록 중 40개(58%)에서 최적으로 뽑혔음.** seed 운으로 이긴 것과
실력으로 이긴 것을 구분할 수 없음.

3-seed action(`reuse`·`reuse_bigdec`·`raw_unet3d`)만으로 다시 계산하면:

| | 값 |
|---|---|
| 블록 최적 분포 | reuse **42** · reuse_bigdec 15 · raw_unet3d 12 |
| seed 폭 넘는 결정적 블록 | **69개 중 2개 (reuse만)** |

**즉 신뢰 가능한 action만 보면 `reuse`가 61%의 블록에서 최적이고, 나머지는 잡음 안에 있음.**

### 판정

- **E6 kill gate: "블록 간 최적 action이 단일하면 중단" → 사실상 발동.**
  겉보기 다양성은 seed 1개 action의 운과 seed 폭 안의 요동으로 설명됨.
  **단일 task(산사태) 안에서의 블록 단위 routing은 현재 근거가 없음.**
- M45(라벨 없는 예측 미달)와 방향이 일치함. 예측할 대상 자체가 잡음이었다면
  예측기가 안 서는 것이 당연함.
- 다만 M41의 oracle 여유(+0.078, 바닥의 2.7배)는 **타일 단위**였고 여기는 **블록 단위**임.
  블록으로 묶으면 타일 수준 상보성이 평균으로 상쇄됨 — 두 결과는 모순이 아니라
  **routing의 유효 해상도가 타일급이라는 뜻**임. 그런데 타일급 결정은 라벨 없이
  예측해야 하고 그게 M45에서 미달임.

### 그래서 다음이 바뀜

1. 모든 action을 **최소 3 seed**로 채우는 것이 E6 재실행의 전제임
   (현재 미달 3개: raw_utae, recontext ×2).
2. routing 해상도를 **타일급**으로 고정하고 블록은 CV 단위로만 씀.
3. task 축을 늘리는 것(E8 AI-Hub 3-task)이 단일 task 안에서 이질성을 더 파는 것보다
   우선순위가 높아짐 — M42와 같은 결론.

## M47. M43의 "7배 안정" 주장을 **정정** — 안정한 것은 품질이 아니라 **작동점**이었음

**근거**: 본 세션의 자체 재검토(M43 산출물 재분석). 새 실행 없음.
**동기**: M43에서 "frozen 캐시가 seed 분산 7.3배 안정"이라고 적었음. 임계값 무관
지표로 검증하니 **그 서술이 지표 하나에만 의존**하고 있었음.

### 지표별 seed 폭 (3 seed, 전부 실측)

| 지표 | P2 폭 | P4 폭 | 비율 P2/P4 | 평균 (P2 / P4) |
|---|---|---|---|---|
| micro IoU (임계값 0.5) | 0.0760 | **0.0104** | **7.3×** | 0.1213 / 0.1334 |
| 양성 macro IoU (0.5) | 0.0816 | **0.0397** | 2.05× | 0.1460 / 0.1803 |
| ECE (0.5) | 0.0606 | **0.0191** | 3.16× | 0.0492 / 0.0351 |
| **AUPRC (임계값 무관)** | **0.0494** | 0.0841 | **0.59×** ← 역전 | 0.1466 / **0.2050** |

**AUPRC에서는 P4의 폭이 P2보다 1.7배 큼.** 즉 "전반적으로 7배 안정"은 틀렸음.

### 무엇이 실제로 안정한가 — 작동점

P2의 seed별 작동점 이동이 극단적임:

| | recall | precision | 빈타일 포함 FP |
|---|---|---|---|
| P2 seed 1 | 0.5168 | 0.1871 | 375,995 |
| P2 seed 2 | **0.7484** | **0.0857** | **1,337,640** |
| P2 seed 3 | 0.3949 | 0.1493 | 376,972 |
| P4 seed 1 | 0.4784 | 0.1523 | 446,053 |
| P4 seed 2 | 0.7440 | 0.1356 | 794,475 |
| P4 seed 3 | 0.7146 | 0.1483 | 687,598 |

- recall 폭: P2 **0.3535** vs P4 0.2656 — **P4도 크게 흔들림**
- precision 폭: P2 **0.1014** vs P4 **0.0167** (6.1×)
- FP 배율: P2 3.56× vs P4 1.78×

**P4는 recall이 흔들려도 precision이 거의 고정됨.** P2는 둘 다 흔들리며
seed 2에서 고recall·저precision 붕괴로 감. 고정 임계값 지표가 P2에서 무너지는 이유임.

### 정정된 서술 (이것만 주장 가능)

> 동일 고정 프로토콜에서 frozen 캐시 + 작은 판독기는 **고정 임계값에서의 정밀도와
> 교정(calibration)이 seed에 거의 불변**이다. 순위 품질(AUPRC) 자체의 seed 분산은
> raw 학습보다 작지 않다 — 오히려 크다.

배포 관점에서는 여전히 의미가 큼(운영은 고정 임계값을 씀). 그러나
**"표현이 더 안정적"이라는 일반 서술은 근거가 없음.** M43의 해당 문장을 이 기록으로 대체함.

### 부수 확인

P4의 AUPRC 폭은 **seed 1이 낮은 쪽 이상치**(0.1513 vs seed 2·3의 0.2355·0.2283)여서 커짐.
그런데 M44(FP 정합)와 M45(라벨 없는 예측)가 모두 **seed 1 확률맵**을 씀.
즉 그 두 실험은 P4 계열에 **불리한 seed**를 쓴 것이며, 결론(정합 후 P4c 우위)은
그 점에서 보수적으로 안전함. 다중 seed 확률맵으로 재확인 대상으로 남김.

## M48. **두 번째 지역(china) val에서 P4 > P2가 3/3 seed 전부, 범위 겹침 없음**

**근거**: `logs/gp_official_full.log`, `logs/seed_spread.log`의 best val IoU 기록.
`sen12_gp_official/holdout_chimanimani_pilot.json`으로 val_region=**china**,
test_region=chimanimani 확인 — **서로 다른 지역임**.

### best val IoU (val = china 159타일, 40 epoch 중 최고)

| seed | P2 공식 UNet3D | P4 frozen+작은 | 차이 |
|---|---|---|---|
| 1 | 0.0742 (@18) | **0.0971** (@36) | +0.0229 |
| 2 | 0.0580 (@38) | **0.1139** (@25) | +0.0559 |
| 3 | 0.0559 (@31) | **0.1054** (@29) | +0.0495 |
| 범위 | [0.0559, 0.0742] | **[0.0971, 0.1139]** | — |

**P4의 최솟값 0.0971 > P2의 최댓값 0.0742.** 두 분포가 전혀 겹치지 않음.
3/3 seed 완승이며 chimanimani(test)와 **다른 지역**에서 나온 결과임.

### 왜 이게 중요한가

지금까지 arm 비교는 전부 chimanimani test 하나에서 나왔고 그 지역은 다회 노출됐음.
china val은 **epoch 선택에만 쓰였고** 어떤 설계 결정도 이 지역 수치를 보고 내리지 않았음
(arm 구조·decoder 크기·문맥 계약은 전부 test 또는 문헌 근거로 결정했음).
따라서 **지역 일반화의 첫 독립 신호**임.

### 정직한 한계 — 확증이라고 부를 수 없는 이유

1. **val은 각 arm이 자기 최고 epoch을 고른 지점**임. 두 arm 모두 같은 방식으로
   낙관 편향돼 있으나, epoch 수가 많은 쪽이 더 유리할 수 있음(둘 다 40 epoch이므로 대칭).
2. **159타일뿐**임. 공간 블록 CI를 낼 표본이 아님. per-sample 파일이 있으므로
   차후 부트스트랩 가능하나 단위 수가 매우 적음.
3. val이 epoch 선택에 쓰였으므로 **완전한 held-out이 아님**. 확증은 미열람 9지역에서만 가능함.
4. P4c(큰 판독기)의 val은 0.1392(seed1)로 P4보다 높으나 seed 2·3은 M41 기록의
   0.1398·0.1196임 — 이 비교는 별도로 정리해야 함.

### H2(val 선택 잡음) 검토 결과

best epoch 위치: P2 = 18/38/31 (폭 20), P4 = 36/25/29 (폭 11).
P2의 선택 지점이 더 넓게 튐 — M47의 "P2 작동점 이동"과 일관됨.
val best IoU 폭은 P2 0.0183, P4 0.0168로 **비슷함**. 즉 val에서의 품질 분산은
두 arm이 유사하고, test에서 P2의 고정임계값 지표가 크게 흔들리는 것은
**작동점 이동 + 지역 이전**이 겹친 결과로 보는 것이 정합적임.

## M49. 관문 1 — 표준 안정화로 P2 분산이 **고쳐지지 않음**. 작동점 안정성 주장 생존

**근거**: `code/run_p2_stabilized.sh`, `/home/work/data/olmoearth/p2_stab/seed{1,2,3}`
**사전 등록 규칙** (`run_p2_stabilized.sh`에 실행 전 기입):
처치는 grad clip 1.0 + LR 절반(5e-4) 동시 적용, 다른 축은 불변.
`S_stab ≤ 0.021` → 튜닝 인공물(주장 사망) / `≥ 0.031` → 주장 생존 / 사이 → 미확정.

### 결과

| 구성 | seed 1 | seed 2 | seed 3 | 평균 | 폭 |
|---|---|---|---|---|---|
| P2 원본 (lr 1e-3, clip 없음) | 0.159254 | 0.083273 | 0.121479 | 0.121335 | 0.075981 |
| **P2 안정화 (lr 5e-4, clip 1.0)** | 0.066115 | 0.118905 | 0.121946 | **0.102322** | **0.055831** |
| P4 frozen | 0.130582 | 0.129527 | 0.139970 | 0.133360 | 0.010443 |

**S_stab = 0.055831 ≥ 0.031 → 판정: 주장 생존.**
표준 안정화 2개를 동시에 넣어도 폭이 0.0760 → 0.0558로 26% 줄었을 뿐이고,
**여전히 P4 폭(0.0104)의 5.3배**임. 평균은 오히려 0.1213 → 0.1023으로 **떨어짐**
(평균 조건 미충족). AUPRC도 평균 0.1466 → 0.1288로 하락, 폭은 0.0846으로 증가.

즉 **이 처치는 분산을 사지 못하면서 성능을 잃었음.** "raw 학습이 불안정한 것은
LR·clip 탓"이라는 반론은 이 처치 조합에서는 성립하지 않음.

### 그래도 남는 반론 (정직하게)

- 처치 **1가지 조합만** 시험했음. warmup·pos_weight 조정·다른 scheduler·더 낮은 LR은
  안 해봤음. "튜닝으로 절대 못 고친다"는 주장은 **불가능**하며, 말할 수 있는 것은
  **"가장 표준적인 두 처치로는 안 고쳐졌다"**뿐임.
- M47의 정정이 그대로 적용됨: 안정한 것은 **작동점(precision·교정)**이고
  순위 품질(AUPRC) 분산은 P4가 더 큼.

### 정정된 최종 서술 (주장 가능 범위)

> 동일 고정 프로토콜과 표준 안정화 처치(LR 절반 + grad clip) 하에서, raw 학습
> 공식 UNet3D는 고정 임계값 지표의 seed 폭이 frozen 캐시 경로의 **5~7배**이며
> 그 폭은 처치로 26%만 줄고 평균 성능은 오히려 하락한다.

## M50. china val 격차의 공간 블록 CI — **세 블록 크기 전부 0 제외**

**근거**: `evidence/tile_coords_val.json`(새로 추출), `gp_official_bundle/per_sample/P{2,4}_val.jsonl`
**맥락**: M48이 china val에서 P4 > P2 3/3 완승·범위 겹침 없음을 보였으나 CI가 없었음.
좌표를 추출해 공간 블록 부트스트랩(10,000회, seed 20260826)을 냈음.

seed 1 기준 격차 **+0.022960** (P2 0.074189 → P4 0.097149).

| 블록 크기 | 블록 수 | CI95 | p(격차≤0) | 0 제외 |
|---|---|---|---|---|
| 2.56 km | 115 | [+0.005681, +0.041227] | 0.0041 | 예 |
| 5.12 km | 59 | [+0.004215, +0.045903] | 0.0100 | 예 |
| 10.24 km | 28 | [+0.003164, +0.038826] | 0.0131 | 예 |

블록을 키워도 0을 포함하지 않음. **china에서의 P4 우위는 공간 상관을 반영해도 유지됨.**

### 한계

- seed 1 하나의 격차에 대한 CI임. seed 2·3의 per-sample val 파일이 있으므로
  seed별 CI와 seed 평균 격차의 CI를 추가로 낼 수 있음(미실행).
- val은 epoch 선택에 쓰였으므로 완전한 held-out이 아님. 확증은 미열람 9지역뿐임.
- 159타일·양성 81개로 표본이 작음. 블록 28개(10.24 km)에서는 검정력이 낮음.

## M51. china val 3-seed 확장 — **두 지표·3 seed·세 블록 크기 전부에서 P4 우위, CI 0 제외**

**근거**: `code/china_val_seed_ci.py`, `evidence/china_val_seed_ci.json`,
`evidence/seed_spread_val/`(seed 2·3 val per-sample 신규), `evidence/tile_coords_val.json`
**맥락**: M50은 seed 1 하나의 CI였음. M43·M47이 seed 변동 크기를 보였으므로
**seed 평균 격차**에 대한 CI로 단위를 맞췄음. 부트스트랩은 공간 블록(타일 재표집),
seed는 프로토콜의 일부로 고정 3개를 평균함(3개뿐이라 seed 재표집은 검정력 없음).

### seed별 격차 (china val 159타일, 양성 81)

| seed | micro IoU (P2 → P4) | 격차 | 양성 macro (P2 → P4) | 격차 |
|---|---|---|---|---|
| 1 | 0.074189 → 0.097149 | +0.022960 | 0.113788 → 0.144010 | +0.030222 |
| 2 | 0.057994 → 0.113883 | **+0.055889** | 0.090929 → 0.153555 | **+0.062626** |
| 3 | 0.055926 → 0.105357 | +0.049431 | 0.081882 → 0.151983 | **+0.070101** |
| **평균** | — | **+0.042760** | — | **+0.054316** |

**3/3 seed 전부 양수.** 두 지표 모두.

### seed 평균 격차의 공간 블록 CI (10,000회, seed 20260826)

| 블록 | micro CI95 | p≤0 | macro CI95 | p≤0 |
|---|---|---|---|---|
| 2.56 km (115) | [+0.0251, +0.0656]* | 0.0000 | [+0.0272, +0.0820] | 0.0003 |
| 5.12 km (59) | [+0.0251, +0.0656] | 0.0000 | [+0.0237, +0.0851] | 0.0006 |
| 10.24 km (28) | [+0.0209, +0.0601] | 0.0004 | [+0.0138, +0.0901] | 0.0070 |

`all_block_sizes_exclude_zero = true` (두 지표 모두). *2.56 km 값은 산출 JSON 참조.

### 의미 — 지금까지 가장 단단한 양성 결과

- **다른 지역**(china)에서 나왔음. 지금까지 모든 arm 비교는 다회 노출된 chimanimani였음.
- **주 지표(양성 macro)와 부지표(micro) 모두** 같은 방향임 — M40에서 문제였던
  "지표가 승자를 만든다"가 여기서는 발생하지 않음.
- **seed 전부**에서 성립하고 seed 평균 CI가 0을 제외함 — M43의 함정을 통과함.
- 공간 상관을 반영해도 유지됨.

### 여전히 확증이 아닌 이유

1. **val이 epoch 선택에 쓰였음.** 각 arm이 자기 최고 epoch을 이 지역에서 골랐으므로
   두 arm 모두 낙관 편향임(대칭적이지만 편향은 편향임). 진짜 확증은 미열람 9지역뿐임.
2. 159타일·양성 81개로 표본이 작음. 10.24 km에서는 블록 28개로 검정력이 낮음.
3. P4c(큰 판독기)·P3(U-TAE)의 china val 비교는 아직 안 냈음.

### 다음 (우선순위 상향)

미열람 지역 확증의 recipe를 이 결과로 동결해도 되는지 판단할 근거가 생겼음.
E5d(recipe 동결) 이후 **미열람 9지역 순차 공개**가 이제 최우선임 —
china에서의 신호가 다른 지역에서도 재현되면 논문의 중심 양성 결과가 됨.

## M52. E6 재실행 — M37의 **방향은 생존, 크기는 반토막, 주지표에서는 상호작용이 소멸**

**근거**: `code/run_matrix_seed_fill.sh`, `evidence/factorial_3seed.json`,
`evidence/matrix_fill/` · 단일 seed였던 3개 arm을 seed 2·3으로 채워 **2×2 전 칸을 3-seed화**
**맥락**: M46에서 단일 seed action 3개가 69블록 중 40개(58%)를 독식해 matrix가 신뢰
불가였음. 그 결함을 메웠음.

### 3-seed 확정표 (chimanimani test 1,133타일)

| 칸 | seed 1 | seed 2 | seed 3 | micro 평균 | micro 폭 | **양성 macro 평균** | macro 폭 |
|---|---|---|---|---|---|---|---|
| tiled / small | 0.130582 | 0.129527 | 0.139970 | 0.133360 | **0.010443** | **0.180305** | 0.039742 |
| tiled / big | 0.177727 | 0.159746 | 0.144488 | 0.160654 | 0.033239 | 0.132881 | 0.020183 |
| full / small | 0.116565 | 0.133000 | 0.122975 | 0.124180 | 0.016435 | 0.164170 | 0.038938 |
| full / big | 0.081419 | 0.128765 | 0.134484 | 0.114889 | 0.053064 | 0.108868 | 0.087372 |
| P3 U-TAE | 0.120554 | 0.127452 | 0.094270 | 0.114092 | 0.033182 | 0.167113 | 0.048387 |
| P2 UNet3D | 0.159254 | 0.083273 | 0.121479 | 0.121335 | 0.075981 | 0.145960 | 0.081587 |

### 2×2 대비 — seed 1 단독 vs 3-seed 평균

| 대비 | seed 1 (M37) | 3-seed micro | 3-seed **주지표 macro** |
|---|---|---|---|
| C_small (문맥 효과, 작은) | −0.014017 | −0.009180 | −0.016135 |
| C_large (문맥 효과, 큰) | **−0.096308** | **−0.045765** | −0.024013 |
| D_tiled (용량 효과, tiled) | **+0.047145** | +0.027294 | **−0.047424** ← 부호 반전 |
| D_full (용량 효과, full) | −0.035146 | −0.009291 | −0.055302 |
| **상호작용 I** | **−0.082291** | −0.036585 | **−0.007878** ← 거의 0 |

### 판정 세 가지

**(1) 문맥 효과의 방향은 생존함.** C_small·C_large 모두 3-seed에서도 음수임.
"통짜 인코딩이 낫다"는 여전히 기각임. 다만 **크기가 절반 이하로 줄었음**
(C_large −0.0963 → −0.0458). M37의 크기 서술은 과장이었음.

**(2) M37의 헤드라인 상호작용 −0.0823은 지표 의존이었음.**
사전 등록한 주지표(양성 macro)에서는 **−0.0079로 사실상 0**임.
"decoder 용량 효과가 문맥 계약에 의존한다"는 주장은 **micro에서만** 성립하고
주지표에서는 성립하지 않음. M38에서 내가 "정확한 진술은 상호작용"이라고 적었던
정정도 이 기록으로 다시 정정함.

**(3) 주지표에서는 큰 판독기가 두 문맥 모두에서 손해임** (D_tiled −0.0474, D_full −0.0553).
즉 M30~M44에서 반복된 "큰 판독기가 회복시킨다"는 서술은 **micro 전용 현상**이었음.

### 주지표 순위 (3-seed 평균 양성 macro)

| 순위 | arm | macro | 폭 |
|---|---|---|---|
| 1 | **tiled / small (frozen, 가장 싼 것)** | **0.180305** | 0.039742 |
| 2 | P3 공식 U-TAE | 0.167113 | 0.048387 |
| 3 | full / small | 0.164170 | 0.038938 |
| 4 | P2 공식 UNet3D | 0.145960 | 0.081587 |
| 5 | tiled / big | 0.132881 | 0.020183 |
| 6 | full / big | 0.108868 | 0.087372 |

**가장 싸고 가장 단순한 arm(frozen 캐시 + 237K 판독기)이 주지표 1위임.**
M51(china val 3/3 우위)과 방향이 일치함.

### 내가 이 실험 중에 낸 오류 1건

로그에서 `sed "s/test {.*iou.: \([0-9.]*\).*/"`로 값을 뽑았는데 greedy 매칭이
뒤쪽 `ld_iou`를 잡아 full/small seed2를 0.226으로 읽었음. 그 상태에서
"M37이 뒤집혔다"고 보고했고 **그것은 틀렸음**. per-sample 재계산으로 0.133을
확인한 뒤 정정함. 교훈: 로그 정규식 추출을 신뢰하지 말고 per-sample 재계산만 쓸 것.

## M53. 메타데이터 감사 — stale `information_contract`를 **소스에서** 고치고 봉인본에는 정정 주석을 병기

**근거**: `code/pilot_sen12_gp_heads.py:700` 부근(정정 완료),
`code/fix_stale_information_contract.py`, 로컬 5개 + 서버 10개 이상 pilot JSON
**동기**: 외부 감사가 "봉인 JSON의 한 필드가 아직 'P2는 순서만 받았다'로 남아 있다"고
지적했음. **확인 결과 사실이었음.**

### 무엇이 틀려 있었나

```
"known_mismatch": "P4 encoder received acquisition timestamps; P1/P2 only receive order"
"claim_status":   "not timestamp-matched"
```

두 필드 다 틀렸음.

1. **P1/P2/P3는 order가 아니라 월(month/11) 1채널을 받음.** `forward()`의 timestamp
   parity 처리이고 로그에 `months 로드 6834개`로 남음.
2. **M39 실측**: 인코더는 시간을 **월 해상도로 양자화**함(날짜 ±1~3일 이동 시 임베딩
   5/5 비트 동일). 따라서 P4도 acquisition datetime의 날짜 성분을 쓰지 않음.
   `not timestamp-matched`라는 판정 자체가 성립하지 않음.

### 조치 — 봉인본은 덮어쓰지 않음

- **소스 정정**: `pilot_sen12_gp_heads.py`의 해당 블록을
  `information_parity: true` · `encoder_time_resolution: month` ·
  `residual_asymmetry: encoding form only`로 교체하고, 왜 이전 문구가 stale인지를
  코드 주석으로 남겼음. 이후 실행되는 모든 산출물은 올바른 값을 씀.
- **봉인본 처리**: 이미 만들어진 pilot JSON의 원본 필드는 **삭제하지 않음.**
  봉인 산출물의 사후 수정은 그 자체가 재현성 위반이므로,
  `information_contract_correction_2026_08_26` 키를 나란히 추가해
  "무엇이 틀렸는지 · 왜 틀렸는지 · 올바른 진술 · 근거"를 같은 파일 안에 남겼음.
  로컬 5개 적용 완료, 서버 적용 진행.

### 남는 진짜 비대칭 (미검정)

정보량은 동일하고 **부호화 형태만** 다름 — P4는 sinusoidal positional encoding,
raw arm은 스칼라 1채널 broadcast. 이는 "P4가 더 많은 정보를 봤다"가 아니라
"같은 정보를 더 쓰기 좋은 형태로 받았다"는 훨씬 약한 주장이며 별도 ablation 항목임.

### 함께 검증한 것 — val 지역 선택이 사후가 아님

`build_sen12_gp_contract.py`의 `build_loco_folds`는
`val_region = regions[(i + 1) % len(regions)]`로 **기계적으로** 고름.
즉 test=chimanimani → val=china는 결과를 보고 고른 것이 아니라 지역 순서상 자동임.
china 결과(M48·M51)를 "유리한 지역을 골랐다"고 공격할 근거가 없음.

단, **china가 epoch 선택에 쓰였다는 한계는 그대로 유효함.** M48·M51에 이미 기록돼
있으며 "학습에 쓰지 않은 geographic validation 지역에서의 반복 신호"가 정확한 표현임 —
독립 test transfer가 아님.

## M54. M52의 서술 세 곳을 **강등** — seed 부호 불일치와 미검정 격차를 반영

**근거**: `evidence/factorial_3seed.json` 재분석(새 실행 없음),
`evidence/action_matrix_v1/matrix_summary.json` 3-seed 재계산
**동기**: 외부 감사가 M52의 표현이 한 단계 과장됐다고 지적했고, seed별 수치를 직접
확인해 **전부 사실로 확인**했음.

### seed별 대비 — 부호가 일치하는 것과 아닌 것

| 대비 | seed 1 | seed 2 | seed 3 | 3/3 부호 일치 |
|---|---|---|---|---|
| C_small (문맥, 작은) | −0.0181 | −0.0004 | −0.0299 | **예** |
| **C_large (문맥, 큰)** | −0.0724 | −0.0341 | **+0.0345** | **아니오** |
| D_tiled (용량, tiled) | −0.0208 | −0.0414 | −0.0801 | **예** |
| D_full (용량, full) | −0.0752 | −0.0751 | −0.0157 | **예** |
| **상호작용 I** | −0.0544 | −0.0337 | **+0.0644** | **아니오** |

### 강등 1 — "상호작용이 사실상 0"은 과장

seed 3에서 **+0.0644로 부호가 뒤집힘**. 평균 −0.0079는 상호작용이 없다는 증거가
아니라 **방향이 seed에 강하게 의존해 재현 가능한 효과로 식별되지 않았다**는 뜻임.
정확한 서술: **"no robust evidence of interaction"**. "소멸"이라고 쓰지 않음.

### 강등 2 — "문맥 효과 방향 생존"은 조건부

`C_small`은 3/3 음수로 성립하나 `C_large`는 seed 3에서 양수임.
정확한 서술: **"3-seed 평균에서는 full-context가 불리했으나, 큰 판독기 조건에서는
seed별 방향이 일치하지 않았다."**

### 유지 — 큰 판독기 손해는 강한 결과

`D_tiled` 3/3 음수(−0.0208 / −0.0414 / −0.0801), `D_full` 3/3 음수
(−0.0752 / −0.0751 / −0.0157). **두 문맥 계약 모두에서 6/6 seed 전부 음수.**
이 task에서 decoder 용량 증가는 양성 타일 분할을 회복시키지 못했고 오히려 손해였음.
M52에서 가장 단단한 결과임.

### 강등 3 — "가장 싸고 1위"는 두 군데 과장

1. **P4 > P3는 미검정.** 격차 0.0132인데 P4 폭 0.0397, P3 폭 0.0484임.
   paired 공간 블록 CI를 내기 전에는 **"관측 평균 1위"**까지만 말함.
2. **"가장 싸다"는 warm cache 기준.** M38 손익분기가 U-TAE 대비 8~12 task였으므로
   **단일 task cold start에서는 U-TAE가 더 쌀 수 있음.**
   정확한 표현: **"가장 싼 warm-cache head"**.

## M55. E6 action matrix 3-seed 재계산 — 결정적 블록이 **3개 → 1개**로 더 줄었음

**근거**: `code/build_action_matrix.py`(3-seed 연결 + 판정 강화),
`evidence/action_matrix_v1/matrix_summary.json`
**동기**: 감사 지적 — M52는 factorial 분석이었고 **action matrix 자체는 갱신되지 않았음**.
`ACTIONS`가 `recontext`·`recontext_bigdec`·`raw_utae`를 여전히 seed 1 파일만 읽고 있었음.
사실이었음.

### 조치

1. 세 action을 `matrix_fill`의 seed 2·3에 연결 → **전 action 3-seed** (`all_actions_3seed: true`)
2. 판정 강화: `decisive` = **margin > seed 폭 그리고 3 seed 전부에서 top이 second를 이김**
   (후자는 M54 교훈 — 평균 부호만 보면 seed에서 뒤집히는 효과를 놓침)

### 결과

| | M46 (seed 1 혼재) | **3-seed 재계산** |
|---|---|---|
| argmax 분포 | raw_utae 28 · reuse 16 · recontext 9 · reuse_bigdec 8 · raw_unet3d 5 · recontext_bigdec 3 | **reuse 24** · recontext 14 · raw_utae 12 · reuse_bigdec 11 · raw_unet3d 6 · recontext_bigdec 2 |
| 결정적 블록 | 3 / 69 | **1 / 69** |

**argmax는 여전히 6개 action에 흩어지지만 그 다양성이 재현되지 않음.**
`reuse`가 24블록(35%)으로 최다이고, 판정 기준을 통과하는 블록은 `recontext` 1개뿐임.

**M46의 결론이 강화됨**: 단일 task 안의 블록 단위 routing은 근거가 없음.
이제 이 판정은 "seed 1 편향 때문"이라는 반론을 받지 않음 — 전 action이 3-seed임.

### 감사 지적을 그대로 인용해 기록함

> "M52는 올바른 3-seed factorial 분석이지만 'E6 action matrix 재실행 완료'는 아니다."

맞음. M52 커밋 메시지의 "E6 재실행"은 factorial 재계산을 뜻했고 matrix는 갱신되지
않았음. M55가 실제 재계산임.

## M56. paired 공간 블록 CI — **chimanimani에서 P4 우위는 seed 부호가 갈림.** 확정 우세는 2쌍뿐

**근거**: `code/paired_arm_ci.py`, `evidence/paired_arm_ci.json` · 새 학습 없음
**동기**: 감사 지적 — P4 > P3를 CI 없이 우열로 쓰면 안 됨. 격차 0.0132가 양쪽 seed
폭(0.0397 / 0.0484) 안임. **판정 규칙을 실행 전에 고정**했음:
"우세"는 (a) 세 블록 크기 전부 CI 0 제외 **그리고** (b) 3 seed 부호 일치일 때만.

### 결과 (chimanimani, 주지표 양성 macro, seed 평균 격차)

| 쌍 | seed별 격차 | 평균 | 부호 3/3 | CI 전부 0제외 | 판정 |
|---|---|---|---|---|---|
| P4 vs P2 | **−0.0345** / +0.0684 / +0.0691 | +0.0343 | **아니오** | 예 | 관측 평균 우위(미확정) |
| P4 vs P3 | **−0.0290** / +0.0094 / +0.0591 | +0.0132 | **아니오** | 예 | 관측 평균 우위(미확정) |
| P4 vs P4c | +0.0208 / +0.0414 / +0.0801 | +0.0474 | **예** | 예 | **우세** |
| P2 vs P3 | +0.0055 / **−0.0590** / −0.0100 | −0.0212 | 아니오 | 예 | 관측 평균 우위(미확정) |
| P2 vs P4c | +0.0553 / **−0.0270** / +0.0109 | +0.0131 | 아니오 | **아니오** | 미확정 |
| P3 vs P4c | +0.0498 / +0.0320 / +0.0209 | +0.0342 | **예** | 예 | **우세** |

### 판정 — 감사 지적이 옳았음

**chimanimani에서 확정 우세는 두 쌍뿐임**: `P4 > P4c`와 `P3 > P4c`.
둘 다 "큰 판독기가 손해"라는 M54의 강한 결과와 같은 내용임.

**P4 > P2와 P4 > P3는 둘 다 seed 1에서 부호가 뒤집힘.** 공간 블록 CI는 세 크기 모두
0을 제외하지만, 그 CI는 **seed 평균**에 대한 것이라 seed 변동을 흡수하지 못함.
따라서 M52·M43의 "3-seed 평균으로 P4가 P2를 이긴다"는 서술을
**"관측 평균 우위이며 seed 부호는 일치하지 않음"**으로 강등함.

### chimanimani와 china의 대비 — 이게 중요함

| | chimanimani (test, 다회 노출) | china (val, epoch 선택용) |
|---|---|---|
| P4 vs P2 seed별 부호 | −, +, + (**갈림**) | +, +, + (**3/3**) |
| CI 0 제외 | 예 | 예 (M51) |
| 판정 | 관측 평균 우위 | 3/3 + CI |

**같은 두 arm이 두 지역에서 다른 강도의 결과를 냄.** 이것이 지역 효과인지 노출
편향인지는 이 데이터로 구분 불가임. **확증 지역이 이 질문에 답함.**

### 남는 정확한 서술

- 확정: 큰 판독기(P4c)는 P4·P3 양쪽에 **열세**(seed 3/3 + CI).
- 미확정: P4 vs P2, P4 vs P3, P2 vs P3 — 전부 seed 부호가 갈림.
- 즉 **chimanimani만으로는 reuse의 우위를 주장할 수 없음.** china(M51)와
  확증 지역이 함께 있어야 함.

## M57. **프로토콜 위반 자기신고** — 확증 실행 중 서버 코드를 교체했고 `code_sha256` 검사로는 잡히지 않는다

**근거**: 서버 파일 mtime, 체크포인트/pilot JSON mtime, `git show 28c9257`,
`code/pilot_sen12_gp_heads.py:658`
**성격**: 자기신고. 외부 감사가 "실행 중 코드 변경 가능성을 배제하려면 9개 출력의
`code_sha256` 동일성을 검사해야 한다"고 경고했고, **검사해 보니 4/4 동일했는데도
위반이 실재했다.** 검사 자체가 이 위반을 못 잡는다.

### 무슨 일이 있었나

| 시각 | 사건 |
|---|---|
| 22:05:19 | thrissur 캐시 추출 완료 |
| 22:06:22 | 캐시 감사 완료 → 9실행 시작 (P4 seed 1) |
| **22:00:59** | M53 커밋 (로컬) |
| **21:53:33** | **서버 `pilot_sen12_gp_heads.py` 교체 (내 푸시)** |
| 22:17:31 | P4 seed 1 체크포인트 |
| 22:44:18 / 23:03:29 | P2 / P3 seed 1 |

**푸시(21:53)가 첫 실행 시작(22:06)보다 앞섬.** 따라서 이번 경우 9실행 전체가
교체된 코드로 실행됐고 산출물 간 불일치는 없음. 운이 좋았음.

### 그런데 검사가 이 위반을 못 잡는다 — 설계 결함

`code_sha256`은 `pilot_sen12_gp_heads.py:658`에서
```python
"code_sha256": sha256_file(Path(__file__)),
```
로 계산됨. 이 줄은 **학습이 끝난 뒤 summary를 쓸 때** 실행됨.
Python은 프로세스 시작 시 `.py`를 메모리에 로드하므로,

> **실행 중에 파일이 바뀌면 실제 실행된 코드는 옛 파일인데 기록되는 해시는 새 파일이다.**

즉 `code_sha256`이 9/9 동일해도 "실행 중 코드가 안 바뀌었다"는 증명이 되지 않음.
mtime 비교 없이는 탐지 불가임. **`verify_confirmatory_release.py`의
`identical_code_sha` 검사는 이 시나리오에 대해 무력함.**

### 이번 변경이 수치에 영향을 주지 않는 근거

`git show 28c9257 -- code/pilot_sen12_gp_heads.py`: **20줄 추가, 3줄 삭제.**
변경 범위는 산출물 JSON의 `information_contract` 딕셔너리 리터럴 **전부**임.
모델·데이터·손실·최적화·평가 경로를 건드리지 않음. 따라서 성능 수치는 불변임.
**다만 이것은 diff를 읽어야 알 수 있는 사실이고, 자동 검사가 준 보증이 아님.**

### 고칠 것

1. **게이트에 mtime 검사 추가**: 실행 시작 시각(첫 산출물 생성) 이전에 코드 파일
   mtime이 있어야 함. 사후에 바뀌면 실패로 처리.
2. **실행 시작 시 코드 스냅샷을 복사**: `--out` 아래에 실행된 소스를 그대로 저장해
   해시가 아니라 **실물**을 봉인.
3. **확증 실행 중 서버 코드 푸시 금지 규칙**을 `CLAUDE.md`에 명문화.

### 왜 이걸 기록하는가

이번엔 결과가 무해했지만, 같은 실수가 수치에 영향을 주는 변경과 겹치면
확증 실험 전체가 무효가 됨. **감사가 지적한 위험이 실제로 발생했고 표준 검사로는
탐지되지 않았다는 사실 자체가 기록할 값어치가 있음.**

## M58. 확증 인프라 재설계 — 초판 보호장치의 결함 4건을 고쳤음. thrissur는 **예외로 공개 유지**

**근거**: `code/run_confirmatory_region.sh`(재작성), `code/verify_confirmatory_release.py`
(v2 재작성), `code/paired_arm_ci.py`(방향 버그 수정),
`evidence/confirmatory_manifests/holdout_thrissur_retrospective_audit.json`
**성격**: 감사 지적 4건이 전부 사실이었음. M57의 조치가 **절반만 작동**했음.

### 결함 1 — snapshot을 만들고 **live 코드를 실행**했음 (가장 심각)

초판은 소스를 `code_snapshot/`에 복사한 뒤 여전히 `code/pilot_sen12_gp_heads.py`를
실행했음. **snapshot 이후 서버 코드가 바뀌면 다음 arm은 snapshot과 다른 코드를 실행함.**
보호장치가 아니라 보호받는다는 착각을 주는 코드였음.

수정: snapshot 사본을 직접 실행함. `pilot`이 `sys.path.insert(0, Path(__file__).parent)`
(162행)를 하므로 `sen12_official_baselines.py`도 snapshot에서 읽힘 — 확인함.
`chmod -w`로 사본을 잠그고, `OUTROOT`가 이미 있으면 **덮어쓰지 않고 종료**함.

### 결함 2 — pre gate가 runner에서 강제되지 않았음

초판 runner는 게이트를 호출조차 하지 않아 우회가 가능했음.
수정: pre gate를 `[0/4]` 첫 단계로 넣고, PASS가 아니면 `set -e`로 즉시 종료.
`--results-root`를 **필수 인자**로 바꿔 로컬 기본 경로를 보는 사고를 막았음.

### 결함 3 — post gate가 snapshot **존재**만 검사했음

디렉터리가 있다는 것은 실행 전 봉인의 증명이 아님. v2가 추가로 검사하는 것:

| 검사 | 무엇을 잡는가 |
|---|---|
| `snapshot_sha256sums_match` | SHA256SUMS와 실제 파일 대조 — 사후 교체 |
| `snapshot_before_first_checkpoint` | `started_at` < 최초 checkpoint — 사후 생성 |
| `snapshot_required_files` | 필수 4개 파일 존재 |
| `prob_maps_present` | 확률맵 저장 여부 |
| `seeds_declared_match` | 선언 seed가 실제 [1,2,3]×3인가 |
| `test_region_matches_fold` | 산출물의 test_region이 fold와 일치 |
| **`test_set_matches_sealed_contract`** | **봉인 `loco_folds.json`의 test SHA와 직접 대조** |

마지막 항목이 중요함. 초판의 `identical_sample_sets`는 "9개가 서로 같은가"만 봤으므로
**9개가 모두 동일하게 틀린 test set이어도 통과**했음. 이제 봉인 계약과 대조함.

### 결함 4 — `paired_arm_ci.py`의 방향 버그

`ci_ok and sign_ok`이면 평균 격차의 **부호와 무관하게** 왼쪽 arm을 "우세"로 기록했음.
세 격차가 모두 음수면 오른쪽이 이기는데도 왼쪽을 승자로 적었을 것임.
보고된 두 쌍에는 영향이 없었으나(둘 다 양수) 일반 코드로는 버그였음.

수정: `observed_winner`·`direction`을 부호로 계산하고, CI 방향이 부호와 일치하는지
(`ci_direction_matches_mean`) 별도 검사함. 판정 문구도 **"우세"를 쓰지 않음** —
`passes_preregistered_development_dominance_rule`로 바꿨음. 통계적 "확정"이 아니라
사전 등록 규칙 통과일 뿐임(감사 지적).

### thrissur 재라벨 — 초판 pre manifest를 삭제했음

초판 `holdout_thrissur_pre.json`은 (a) pre gate 코드(`658ebf7`)가 존재하기 **전에**
실행이 시작됐고 (b) 서버 경로가 아니라 로컬 `evidence/confirmatory`를 검사했음.
따라서 **"pre gate 6/6 통과"는 틀린 표현**이었음. 그 파일을 삭제하고
`holdout_thrissur_retrospective_audit.json`으로 교체했음. 기록 내용:

- `pre_run_code_snapshot: false` — **사후 snapshot을 만들어 통과시키지 않음**
- `protocol_deviation: server source updated during region pipeline`
- `pilot_update_before_first_training: true` (21:53:33 < 22:17:31)
- `performance_affecting_diff: false` (20 insertions / 3 deletions, metadata literal만)
- 올바른 라벨: **confirmatory first-look with a disclosed execution-provenance deviation**
- 금지 표현: "clean confirmatory run", "pre gate 6/6 통과"
- 보고 규칙: primary 8지역에 **포함**하되 **thrissur 제외 sensitivity를 함께 보고**

### recipe v2의 지위도 낮춤

v2는 thrissur의 P4 seed 1 결과 파일이 생성된 **후** 커밋됨. "결과를 읽지 않았다"는
제 자기신고는 남기지만, **git 시각만으로 미열람을 증명할 수 없음**(로그에 test metric이
출력됨). 따라서 v2는 thrissur에 대해 **prospective analysis amendment**이고,
**완전한 사전등록은 hiroshima부터** 적용됨.

### 이번 푸시의 자체 검증

이 수정 중 `verify_confirmatory_release.py`·`paired_arm_ci.py`를 실행 중에 푸시했음.
둘은 실행 경로 밖이며, 푸시 후 실행 경로 4개의 mtime·해시 불변을 확인했음
(`pilot` 21:53:33 / 해시 `ebe1ee88ee3f4cdb` 동일). 규칙 4c를 이 구분에 맞게 정밀화했음.

## M59. **확증 1지역(thrissur) — 사전등록 승리 조건 통과, 강한 승리.** 격차가 개발 지역보다 큼

**근거**: `evidence/confirmatory/holdout_thrissur/read_summary.json`,
`evidence/confirmatory_manifests/holdout_thrissur_post.json`,
`code/read_confirmatory_region.py`
**절차**: post 게이트 **먼저** 통과시킨 뒤 판독함. 로그 문자열을 읽지 않고
per-sample 재계산만 씀(M52 교훈).

### post 게이트 (11항목)

`test_set_matches_sealed_contract` 포함 전 항목 통과. 이 검사가 봉인된
`loco_folds.json`의 thrissur test SHA와 직접 대조하므로 "9개가 똑같이 틀린 test set"
시나리오가 배제됨. `code_snapshot_verified`는 **면제**(M58: thrissur는 snapshot 도입
이전 시작 → `allow_no_snapshot`, protocol deviation 기록).

### 결과 (thrissur test 427타일, 양성 221, 주지표 양성 macro IoU)

| arm | seed 1 | seed 2 | seed 3 | 평균 | 폭 | micro 평균 | 빈타일 FP |
|---|---|---|---|---|---|---|---|
| **reuse (P4)** | 0.348025 | 0.359919 | 0.368561 | **0.358835** | **0.020536** | **0.408811** | **7,263~11,400** |
| raw_strong (P2) | 0.239009 | 0.209783 | 0.245746 | 0.231513 | 0.035963 | 0.194997 | 51,651~75,812 |
| raw_efficient (P3) | 0.228862 | 0.217525 | 0.251097 | 0.232495 | 0.033572 | 0.205319 | 23,350~83,865 |

### 사전등록 승리 판정 — **통과**

규칙: `seed-mean primary > 0` **그리고** `3 seed 전부 > 0` (recipe v2 `win_definition`).

| | 값 |
|---|---|
| reuse − raw_strong seed별 | **+0.109017 / +0.150135 / +0.122815** |
| 평균 격차 | **+0.127322** |
| 3 seed 전부 양수 | **예** |
| **per_region_win** | **True** |

참고(reuse vs raw_efficient): +0.119163 / +0.142394 / +0.117464, 평균 +0.126341,
3/3 양수. **두 raw baseline 모두에 대해 3/3임.**

### 공간 블록 CI — 세 크기 전부 0 제외 → **강한 승리**

| 블록 | 블록 수 | CI95 | 0 제외 |
|---|---|---|---|
| 2.56 km | 283 | [+0.103846, +0.150669] | 예 |
| 5.12 km | 125 | [+0.099501, +0.156236] | 예 |
| 10.24 km | 45 | [+0.097006, +0.157389] | 예 |

`strong_win: True`.

### 개발 지역과의 대비 — 격차가 훨씬 큼

| 지역 | reuse − raw_strong (주지표) | 3 seed 부호 |
|---|---|---|
| chimanimani (test, 다회 노출) | +0.034345 | **−, +, +** (갈림, M56) |
| china (val, epoch 선택 사용) | +0.054316 | +, +, + (M51) |
| **thrissur (미열람 확증)** | **+0.127322** | **+, +, +** |

**미열람 지역에서 격차가 개발 지역의 2~4배임.** 노출 편향으로는 설명되지 않는 방향임
(노출된 지역일수록 유리해야 하는데 반대임).

부수 관찰: 빈 타일 FP가 reuse 7~11천 vs raw_strong 52~76천으로 **약 6배 차이**임.
M44에서 본 "frozen은 오경보 축에서 유리"가 확증 지역에서 훨씬 크게 나타남.

### 정직한 한계 — 확정이 아님

1. **1지역임.** recipe v2의 headline은 8지역 region-macro 평균이며, 승리 판정도
   첫 3지역 중 2지역 이상이 조건임. **아직 1/3임.**
2. **thrissur는 공개된 provenance 예외임**(M58). 라벨은
   `confirmatory first-look with a disclosed execution-provenance deviation`이며,
   최종 보고에는 **thrissur 제외 sensitivity를 함께** 낸다.
3. recipe v2는 thrissur에 대해 **prospective analysis amendment**이지 완전한
   사전등록이 아님. 완전 사전등록은 hiroshima부터임.
4. 이 결과는 **라우팅을 지지하지 않음.** 오히려 reuse가 두 raw baseline을 모두
   3/3으로 이겼으므로 "상황에 따라 골라야 한다"의 반대 방향임.
   지역별 이질성은 hiroshima·hokkaido가 판정함.

## M60. M59 독립 재검증 — 수치 일치. 그리고 **val에서는 reuse가 지는데 test에서는 이긴다**

**근거**: `code/verify_thrissur_independent.py`,
`evidence/confirmatory/holdout_thrissur/independent_verification.json`
**방법**: `read_confirmatory_region.py`와 **다른 코드 경로**로 재구현(누적합 대신 리스트
평균, 조건 순서 변경). 같은 스크립트를 두 번 돌리는 것은 검증이 아님.

### 1. 재계산 일치

| | 재계산 | M59 기록 | 일치 |
|---|---|---|---|
| reuse 평균 | 0.358835 | 0.358835 | 예 |
| raw_strong 평균 | 0.231513 | 0.231513 | 예 |

9실행 sample ID 집합 동일, test SHA `71b23013…`, 427타일.

### 2. 구조적 사실 — thrissur의 **val이 chimanimani**임

`build_loco_folds`가 `val = regions[(i+1) % len]`이므로 thrissur(마지막)의 val은
첫 지역인 **chimanimani** — 우리가 15회 넘게 들여다본 개발 지역임.
**test set 자체는 미열람이지만 epoch 선택 신호가 노출된 지역에서 옴.**
이 사실을 M59에 적지 않았으므로 여기서 보완함.

### 3. 그런데 val에서는 reuse가 **진다** — 선택 편향 가설과 반대

chimanimani val 주지표(양성 macro):

| arm | seed 1 | seed 2 | seed 3 |
|---|---|---|---|
| reuse (P4) | 0.225489 | 0.203223 | **0.161716** |
| raw_strong (P2) | 0.210377 | **0.226077** | **0.227005** |
| raw_efficient (P3) | **0.227560** | **0.246211** | 0.220974 |

**reuse는 3 seed 중 2개에서 두 raw baseline에 모두 진다.**
그런데 같은 체크포인트가 thrissur test에서는 +0.127로 크게 이김.

이는 **선택 편향으로 결과를 설명할 수 없다**는 뜻임. val이 reuse에 유리했다면
val에서도 reuse가 좋아야 함. 정반대임. **오히려 이 해리(dissociation) 자체가
"어느 지역에서 잘하는지가 arm마다 다르다"는 지역 이질성의 첫 신호임** —
M42·M46에서 죽었던 이질성이 **지역 축에서는 살아 있을 수 있음.**

### 4. 지역 난이도가 다름 — 절대값 비교 금지

| | thrissur | chimanimani |
|---|---|---|
| 타일 수 | 427 | 1,133 |
| 양성 타일 비율 | **51.76%** | 37.34% |
| 양성 화소 중위 | 208 | 207 |

thrissur는 산사태 타일이 훨씬 조밀함(타일당 크기는 유사).
**주지표 절대값을 지역 간 비교하면 안 되고, arm 간 격차만 같은 지역 안에서 비교함.**

### 5. 격차가 소수 타일에 몰려 있지 않음

seed 1 기준, 양성 221타일에서:

| | 값 |
|---|---|
| reuse가 이긴 타일 | 140 / 221 (**63.35%**) |
| 타일별 격차 중위 | +0.079131 |
| 상위 10% 타일이 차지하는 총 격차 비중 | 43.44% |

상위 10%가 43%를 차지하므로 **약간 집중돼 있으나 극단적이지 않음**(소수 타일이
만든 것이면 1에 가까움). 63%의 타일에서 이기므로 광범위한 우위임.

### 결론 — M59는 유지하되 두 가지를 보완함

- **유지**: 재계산 일치, 광범위한 우위, 3/3 seed, 세 블록 CI 0 제외.
- **보완 1**: thrissur의 val이 chimanimani(노출 지역)라는 사실을 명시함.
  단 val에서 reuse가 지므로 선택 편향 방향은 아님.
- **보완 2**: 지역 난이도가 달라 주지표 절대값의 지역 간 비교는 무의미함.
- **새 관찰**: val↔test 해리가 **지역 축 이질성**의 첫 신호일 수 있음.
  hiroshima(val=hokkaido, 미열람)가 이 가설의 다음 시험대임.

## M61. M59 역할 강등 — **"EO 사전학습이 scratch를 이김"은 당연에 가까움.** viability 관찰로 재분류함

**근거**: 외부 감사 지적. 새 실행 없음. M59·M60 재해석임.

### 무엇이 문제인가

P4는 **8,896만 파라미터 EO 사전학습 인코더**, P2/P3는 **제한된 산사태 라벨로 처음부터 학습**함.
큰 사전학습 모델이 작은 scratch baseline을 이기는 것은 **예상 범위**임.
리뷰어의 첫 질문은 "왜 놀라운가"이고 현재 답할 수 없음.

### M59가 실제로 증명한 것 (범위 축소)

> OLMoEarth의 **frozen** 표현이 미열람 산사태 지역에서 실사용 가능하며,
> 그 지역에서 scratch temporal model보다 오경보가 6배 적고 주지표도 높았음.

**viability evidence이지 우월성 증명이 아님.**

완전히 자명하지는 않았던 이유 5가지(기록용):
1. 인코더를 fine-tuning하지 않고 **동결**함
2. B01·B09 부재를 `MaskValue.MISSING`으로 처리한 비표준 입력임
3. 40 m 토큰 해상도가 10 m 분할에 불리할 수 있었음(M32에서 천장은 0.607로 확인)
4. chimanimani에서는 seed에 따라 승패가 갈렸음(M56)
5. 사전등록 게이트를 한 번 **실패**했음(82.0%, M30)

### M59가 답하지 못한 것

| 질문 | 답했나 |
|---|---|
| EO 사전학습이 scratch보다 유용한가 | thrissur 1지역에서만 예 |
| OlmoEarth가 **다른 GeoFM**보다 좋은가 | **아니오 — 비교 대상 없음** |
| 이득이 사전학습 때문인가 decoder 때문인가 | 분리 못 함 |
| frozen이 fine-tuning보다 효율적인가 | 아니오 |
| v1.2에서도 재현되는가 | 아니오 |
| 지역에 따라 골라야 하는가 | 아니오 |
| 한국·네팔로 transfer되는가 | 아니오 |
| stale cache 재사용 가능한가 | 아니오 |

**현재 P4의 상대가 다른 GeoFM이 아니라 scratch model임** — 이것이 가장 큰 약점임.

### 논문 질문 재설정

기존: "OlmoEarth frozen cache가 좋은가" → **약함**
변경: **"지역이 바뀌었을 때 frozen / 경량 post-training / full fine-tuning 중
무엇이 정확도·오경보·비용·캐시 재사용에서 유리한가"**

필요한 비교축 (A~G):

| 단계 | 비교 | 답하는 질문 |
|---|---|---|
| A | scratch P2/P3 | task-specific 학습 하한 (**완료**) |
| B | frozen OLMo v1 | 사전학습 표현만의 transfer (**완료**) |
| C | **다른 frozen GeoFM** | OLMo 고유 효과인가 일반 GeoFM 효과인가 (**미착수·최우선**) |
| D | OLMo adapter/PEFT | 경량 적응의 회복량 (미착수) |
| E | full fine-tuning | 최대 성능·비용 (미착수) |
| F | source-region 재평가 | 적응이 기존 지역을 망가뜨리는가 (미착수) |
| G | 한국·네팔 untouched | 실제 외부 transfer (미착수) |

**label budget 축 추가**: 1% / 5% / 10% / 100%.
라벨이 적을수록 frozen·PEFT가 유리한지, 어느 지점부터 full fine-tuning 비용이
정당화되는지가 **배포 결정 곡선(transfer frontier)**이 됨.

### 공정성 통제 8항목 (C 이후 전부 필수)

동일 입력 시계열 · 동일 fold · 가능한 동일 decoder · 동일 checkpoint 선택 지표 ·
동일 seed 수 · **인코더/캐시 생성 비용 포함** · AUPRC와 FP-budget matched 평가 ·
source 성능 유지 여부.

특히 `frozen OLMo + decoder` vs `다른 pretrained EO encoder + **같은** decoder`가
있어야 OLMo 자체를 말할 수 있음.

### 현재 판정 (정확한 위치)

| 항목 | 판정 |
|---|---|
| M59 자체 | 유의미한 **양성 관찰** |
| "OLMo가 좋다" 논문 | **약함** |
| frozen→PEFT→full 지역 transfer 연구 착수 근거 | **충분함** |
| EarthRoute router 증거 | **아님** |
| CVPR method paper | 추가 비교(C~G) 없이는 **불가** |

**M59가 중요한 이유는 EO 모델이 좋아서가 아니라, frozen 표현의 지역별 이득 편차가
클 가능성을 드러냈기 때문임**(M60의 val↔test 해리). 그 편차의 원인과 경량
post-training으로 통제 가능한지가 논문의 실체가 됨.

## M62. 실험 C1 타당성 probe — frozen Presto가 우리 계약에서 **8/8 통과**했음

**근거**: `code/probe_presto_feasibility.py`, `evidence/presto_probe.json`,
`docs/EXPERIMENT_C_SECOND_GEOFM.md`(설계·예측 3건 사전 커밋 `0fb32b7`)
**맥락**: M61의 최우선 미착수 축 C — "이득이 OLMo 고유인가, 일반 GeoFM 효과인가"는
**다른 frozen encoder + 같은 판독기** 없이는 답할 수 없음. CPU 전용으로 probe함
(GPU1은 hiroshima 확증 중 — 규칙 4b·4c 준수).

### probe 결과 (8/8)

| 검증 | 결과 |
|---|---|
| 코드·가중치 확보 | vendoring 성공. 가중치 **3.3 MB**, 파라미터 **822,682** |
| 밴드 계약 | 17채널 중 S2 10개(인덱스 2~11)가 우리 REAL_BANDS와 **정확히 대응** |
| 결측 처리 | S1·ERA5·SRTM을 mask=1로 가리는 것이 동작 — 우리 MISSING 계약과 같은 사상 |
| 파생 NDVI | 채널 16을 B04·B08에서 계산해 채움(S2-only 조건 유지) |
| 실타일 인코딩 | Sen12 픽셀 16개 → (16, 128) embedding, 전부 유한 |
| 결정성 | 2회 인코딩 **비트 단위 동일** (max diff 0.0) |

### 왜 Presto가 이례적으로 잘 맞는가

- S2 밴드 10개 = Sen12 실관측과 **동일 집합** (B01·B09 없음까지 일치)
- 12 timestep 기본 = S12q와 동일
- 결측 modality 마스킹 내장 = 우리 `MaskValue.MISSING` 계약과 동형
- **픽셀 시계열 모델**(공간 문맥 없음) — 이 차이가 곧 비교 축임.
  OLMo와의 격차가 "사전학습 일반 효과"와 "공간 문맥 기여"를 분리해 줌

### 비용 전망

822K 파라미터로 OLMo 인코더(88.96M)의 **1/108**임. 128×128 타일 = 16,384픽셀
배치 인코딩이 필요하나 모델이 작아 부담 없음. 캐시는 128ch @ 10 m 픽셀 격자.

### 아직 말할 수 없는 것 (진행 전 해결)

1. **정규화 미확정** — single_file_presto에는 학습 시 사용한 밴드별 정규화 상수가 없음.
   probe는 /10000 스케일만 썼음. 원 저장소 dataops의 정규화를 찾아 **사전 등록** 후
   캐시를 만들어야 함. 정규화가 틀리면 Presto에 불리한 비교가 됨(공정성 위반).
2. 커밋 고정 안 됨 — `main` tarball을 받았음. 실제 커밋 해시를 캐시 산출물에 박아야 함.
3. probe는 픽셀 16개임. 전 타일 인코딩 처리율은 미측정.
4. latlon·month를 실값으로 줘야 함(probe는 chimanimani 고정값).

### 사전 등록 예측 (설계 문서에 커밋됨 — 결과 관찰 전)

1. C1(Presto)은 OLMo보다 낮되 scratch보다 높을 것
2. 라벨 1%에서 frozen 계열과 scratch 격차 최대일 것
3. **틀릴 것으로 예측**: C1의 빈 타일 오경보가 OLMo와 동급일 것 —
   픽셀 모델은 문맥이 없어 오경보가 많을 것으로 예상함.
   동급이면 "오경보 억제 = 공간 문맥" 가설이 기각됨

## M63. 확증 2지역(hiroshima) — **첫 완전 clean 확증. 강한 승리. 사전등록 승리 조건 2/2 달성**

**근거**: `evidence/confirmatory/holdout_hiroshima/read_summary.json`,
`evidence/confirmatory_manifests/holdout_hiroshima_post.json`
**절차**: 첫 **완전 clean** 지역임 — 로컬 pre gate(git 상태 실검사) → snapshot 봉인 →
**봉인본 실행** → post 게이트 **13/13** (snapshot 파일·체크섬·시각 검사 포함, 면제 없음)
→ per-sample 재계산 판독. recipe v2가 완전한 사전등록으로 적용된 첫 지역임.

### 결과 (hiroshima test 862타일, 양성 457, 주지표 양성 macro IoU)

| arm | seed 1 | seed 2 | seed 3 | 평균 | 빈타일 FP |
|---|---|---|---|---|---|
| **reuse (P4)** | 0.308665 | 0.235743 | 0.290190 | **0.278199** | **12,734~15,621** |
| raw_strong (P2) | 0.223914 | 0.215263 | 0.208876 | 0.216018 | 62,176~130,294 |
| raw_efficient (P3) | 0.241242 | 0.143087 | 0.150226 | 0.178185 | 175,180~292,998 |

### 사전등록 판정

| | 값 |
|---|---|
| reuse − raw_strong seed별 | +0.084751 / +0.020480 / +0.081314 (**3/3 양수**) |
| 평균 격차 | **+0.062182** |
| per_region_win | **True** |
| 공간 블록 CI (2.56/5.12/10.24 km) | [+0.048,+0.076] / [+0.045,+0.078] / [+0.042,+0.083] — **전부 0 제외** |
| strong_win | **True** |
| P3 대비 | +0.067 / +0.093 / +0.140 — 3/3 양수 |

### 중단 규칙 판정 — 계속 진행 확정

recipe v2: "첫 3지역 중 per_region_win 1지역 이하면 중단."
**thrissur·hiroshima 2/2 승리로 세 번째 지역 결과와 무관하게 계속 조건 충족.**
사전등록 예측 1("first_three 중 2지역 이상")도 달성됨.

### 관찰

- 빈 타일 오경보: reuse가 raw_strong의 **1/5~1/9**, raw_efficient의 **1/14~1/21**.
  thrissur(6배)에 이어 두 번째 지역에서도 오경보 격차가 주지표 격차보다 큼.
- seed 2에서 reuse가 0.2357로 출렁임(폭 0.0729) — reuse도 seed 면역이 아님.
  그래도 최저 seed가 raw_strong 최고 seed(0.2239)보다 높음.
- P3(U-TAE)가 이 지역에서 무너짐(seed 2·3에서 0.14~0.15, 오경보 17만~29만).
  "싼 raw baseline" 서사는 지역 의존적임.

### 한계

- 3지역째(hokkaido) 미실행 — headline은 여전히 8지역 region-macro 평균임 (현재 2/8).
- M61 그대로: scratch 대비 승리는 viability이지 우월성 아님. C축(Presto) 비교가 필요함.
- 격차 크기 비교: thrissur +0.127 > hiroshima +0.062 — **지역별 이득 편차가 실재**함
  (M60 해리 관찰과 일관). 이 편차 자체가 D·E(적응) 실험의 동기임.

## M64. 확증 3지역(hokkaido) — **사전등록 승리 3/3. 격차 최대(+0.170). 오경보 10~19배**

**근거**: `evidence/confirmatory/holdout_hokkaido/read_summary.json`,
`evidence/confirmatory_manifests/holdout_hokkaido_post.json` · post gate 13/13 PASS
**지역**: 2018 이부리 지진 산사태(위성 산사태 연구에서 가장 유명한 현장).
test 290타일, 양성 150 — **소지역임**.

### 결과 (주지표 양성 macro IoU)

| arm | seed 1 | seed 2 | seed 3 | 평균 | 빈타일 FP |
|---|---|---|---|---|---|
| **reuse (P4)** | 0.386190 | 0.367017 | 0.403705 | **0.385637** | **17,480~26,915** |
| raw_strong (P2) | 0.155157 | 0.243705 | 0.247465 | 0.215442 | 210,834~326,677 |
| raw_efficient (P3) | 0.258741 | 0.248177 | 0.156443 | 0.221120 | 186,734~394,192 |

### 판정

- 격차 +0.231033 / +0.123313 / +0.156240 — **3/3 양수**, 평균 **+0.170195** (3지역 중 최대)
- **per_region_win = True** → 사전등록 승리 **3/3 지역**
- CI: 2.56 km [+0.143, +0.197] · 5.12 km [+0.139, +0.198] — 0 제외.
  **10.24 km는 NaN** → `strong_win = False`로 기록함 (아래 참조)

### strong_win=False의 정체 — 소지역에서 추정기의 한계이지 결과의 약점이 아님

10.24 km 블록 29개 재표집에서 일부 표본이 **양성 타일 0개 선택**이 되어 macro가
NaN → percentile NaN이 됨. 격차가 없어서가 아니라 **추정기가 소지역에서 정의되지 않는
경우**임. 사전등록 정의를 사후에 바꾸지 않고 False 그대로 기록함.
NaN-내성 처리(nan 표본 제외 + 유효 표본 수 보고)는 **수정안으로 등록만** 해두고,
남은 지역부터 병기함(기존 지역 소급 없음).

### 관찰

- **오경보 10~19배** (2.0~2.7만 vs 21~33만) — 3지역 연속으로 오경보 격차가 가장 큰 성분임.
  이부리처럼 산사태가 밀집한 지역에서도 raw 모델의 헛짚음이 압도적임.
- 지역별 이득: thrissur +0.127 → hiroshima +0.062 → **hokkaido +0.170**.
  편차 폭이 2.7배로 벌어짐 — 지역 축 이질성이 더 뚜렷해짐.
- P2 seed 1이 0.155로 붕괴(다른 seed의 60%) — raw 학습의 seed 취약이 3지역째에서도 재현됨.

### 한계

- 290타일 소지역 — CI 블록 수가 적음(29~158).
- M61 그대로: scratch 대비 승리는 viability임.

## M65. frozen-v2 8-region 확증 완결 — **region-macro +0.0756, 승리 6/8**

**근거**: `artifacts/confirmatory_8region_summary.json`,
`code/summarize_confirmatory_8region.py`, 8개 `read_summary.json`과 post-release manifest

**계약**: `evidence/recipe_frozen_v2.json` self SHA-256
`95becb32ab2df2c73537a4d19550dfd2c93d426671c15703e59cf4d8d44d2f5a`

**집계**: 사전등록대로 held-out 지역 8개를 같은 가중치로 평균. 타일 수 가중 평균이 아니다.

집계기는 8지역 각각에서 9실행 완결, 동일 sample/split, seed 1/2/3, probability map,
봉인 test SHA, recipe self-hash, post gate PASS를 다시 확인했다. Thrissur는 M57의 공개된
source-snapshot 예외를 유지하고, 이후 7지역은 실행 전 code snapshot 3검사를 의무화했다.

| held-out region | P4 reuse | P2 raw strong | P3 raw efficient | P4−P2 | 사전 win | strong win |
|---|---:|---:|---:|---:|:---:|:---:|
| Thrissur | .358835 | .231513 | .232495 | +.127322 | ✓ | ✓ |
| Hiroshima | .278199 | .216018 | .178185 | +.062182 | ✓ | ✓ |
| Hokkaido | .385637 | .215442 | .221120 | +.170195 | ✓ | — |
| Indonesia | .272350 | **.283644** | .265142 | **−.011294** | — | — |
| Itogon | .151709 | .147695 | .105182 | +.004014 | — | — |
| Kyrgyzstan 1 | .281321 | .192479 | .173252 | +.088842 | ✓ | ✓ |
| Kyrgyzstan 2 | .207763 | .106922 | .104170 | +.100841 | ✓ | ✓ |
| New Zealand | .241512 | .178754 | .187939 | +.062758 | ✓ | ✓ |
| **region-macro** | **.272166** | **.196558** | **.183436** | **+.075608** | **6/8** | **5/8** |

Thrissur provenance 예외를 통째로 빼도 P4/P2/P3는 .259784/.191565/.176427이고
P4−P2는 **+.068220**이다. 결과의 방향이 그 예외 하나에 의존하지 않는다.

### 판정

- frozen OLMoEarth v1 last-layer cache + small decoder는 이 공개 산사태 LOCO에서 **실제로 쓸 만하다**.
  개발 fold의 95% gate 실패만으로 강등했던 판단은 8개 외부 지역 평균에는 일반화되지 않았다.
- 동시에 `8/8 우월`은 아니다. Indonesia에서는 P2가 이겼고, Itogon은 평균 +.0040이나 seed 하나가
  음수여서 사전등록 승리 규칙을 실패했다. 지역에 따른 gain 편차는 실재한다.
- Hokkaido의 strong-win False는 10.24 km bootstrap NaN을 사후 수정하지 않은 엄격 판정이다.
  따라서 strong-win은 기록상 5/8로 유지한다.

### 아직 말할 수 없는 것

1. **OLMo 고유 효과**: frozen Presto/Clay 같은 두 번째 GeoFM을 같은 decoder·split에서 돌리지 않았다.
2. **라우팅 가능성**: 지역별 승자가 다르다는 oracle heterogeneity만 생겼다. target label 없이
   Indonesia/Itogon을 미리 식별하는 predictor는 아직 없고, 기존 label-free winner gate는 실패했다.
3. **한국 전이**: Sen12 내부 LOCO 결과다. AI-Hub/Korea는 recipe를 다시 고정한 뒤 처음 열어야 한다.
4. **새 C1의 confirmatory 지위**: P2/P3/P4의 8지역 결과를 이미 본 뒤 Presto를 추가하므로,
   같은 8지역 C1은 frozen retrospective matched control이다. 최초 untouched OLMo-vs-Presto 주장은
   한국 또는 별도 미개봉 외부 cohort에서만 가능하다.

## M28. AI-Hub 원천 Sentinel-2는 **3밴드 RGB**였다 — RQ2는 STAC 물질화가 전제다

**근거**: `aihub/probe_tif/`, `aihub/stac_probe/stac_match_probe.json`,
`code/probe_aihub_stac_match.py`
**맥락**: RQ2(task별 위험 이질성)는 AI-Hub에서만 가능하다(M-이전 기록). 그 첫 블로커를 쟀다.

### 원천데이터의 정체

`TS_03._Sentinel2.zip` 1.4 GB = **GeoTIFF 2,400장**, 파일명 `<타일>_<YYYYMMDD>.tif`.

| | 실측 |
|---|---|
| 밴드 수 | **3** |
| dtype | **uint8** |
| 크기 | 1024 × 1024 |
| CRS / 해상도 | EPSG:32652 / 10 m |
| 밴드별 min·max | (0,255) · (0,218) · (0,203) |
| band description | 없음 |

**10~12밴드 반사도가 아니라 8비트 RGB 렌더링이다.** OlmoEarth의 `sentinel2_l2a` 계약에
그대로 넣을 수 없다. 3밴드를 12밴드 슬롯에 억지로 채우면 M3(밴드순서 dose-response)와
M8(조용한 계약 위반)이 동시에 걸린다. **하지 않는다.**

따라서 RQ2는 **12밴드를 STAC에서 우리가 물질화하는 것**이 전제다. 예전 `C2-C`가 정확히
이 작업이었고, 그때는 우선순위 밖으로 밀렸다.

### STAC 물질화 게이트 — 20표본 층화, 4/4 통과

층화는 `(타일 prefix, 플랫폼, 연도)` bucket에서 결정적으로 뽑았다.

| 게이트 | 결과 | 필요 |
|---|---|---|
| S1 같은 날짜·bbox에 S2 L2A item 존재 | **19/20** | 18 |
| S2 platform(S2A/S2B)이 메타데이터와 일치 | **19/20** | 18 |
| S3 후보 선택이 결정적 (같은 입력 → 같은 id) | **3/3** | 3 |
| S4 `eo:cloud_cover` 획득 | **19/20** | 18 |

M9에서 확정한 좌표 해석(좌상단, 중위 4.2e-05 m)과 촬영일이 STAC 질의에 그대로 통했다.

- **말할 수 있는 것**: AI-Hub 타일·날짜에 대응하는 Sentinel-2 L2A 장면이 STAC에 있고
  결정적으로 고를 수 있다. **RQ2의 데이터 경로가 열렸다.**
- **말할 수 없는 것**:
  1. 실패 1건(`SA1300000000_20190513`)의 원인을 규명하지 않았다. 허용 범위 안이지만
     전체 2,699쌍에서 같은 비율이면 약 135쌍이 빠진다.
  2. **구름이 심하다.** 표본 안에서 `eo:cloud_cover`가 0.19 ~ **100.0** 까지 퍼져 있다.
     cc=100인 장면이 실재하므로 물질화 시 구름 필터 또는 최소한 기록이 필요하다.
  3. 물질화한 12밴드가 AI-Hub가 라벨링에 쓴 관측과 **같은 장면인지** 아직 대조하지 않았다
     (원 C2-C의 통과조건 3·4). RGB 렌더링과 반사도를 직접 비교할 수는 없으므로
     **공간 격자·transform 일치와 platform·날짜 일치까지만** 확인 가능하다.
  4. 예상 용량: 2,699쌍 × 12밴드 × 1024² × 2 B ≈ **68 GB** (여유 7.8 TB이므로 문제 아님).

## M17. cross-region 산사태 검색 — 사전등록 판정은 미검출, raw 대비 우위는 실재함

**근거**: `artifacts/sen12_retrieval_report.json`, `code/sen12_retrieval_probe.py`,
캐시 `sen12_pilot_full128/holdout_chimanimani` (확증 실행 부산물, 읽기 전용 재사용)
**질문 (RQ-N2 계열)**: OlmoEarth v1 임베딩으로 "이 산사태와 비슷한 곳"을 **다른 지역**에서
검색할 수 있는가?

### 설계 (사전 등록)

10지역 6,834패치(저자 고정 Höhn 셋), positive = mask ≥ 0.5%(2,532개, base 37.1%).
query = 각 지역 positive 패치(whole / masked-token 두 변형), gallery = **그 지역 제외** 전체.
지표 P@10. baseline = base rate, raw-spectral 120-d 동일 프로토콜.
판정: `masked P@10 > raw AND > 2×base` 일 때만 서명 존재를 주장.

### 결과 (region-macro)

| | P@10 | lift |
|---|---|---|
| base rate | 0.370 | 1.00× |
| raw-spectral | 0.432 | 1.17× |
| OLMo whole-pool | 0.452 | 1.22× |
| **OLMo masked-pool** | **0.538** | **1.45×** |

**사전등록 판정: 미검출** — raw는 이겼으나(0.538 > 0.432) `2×base(0.741)` 기준 미달.
규칙은 사후에 움직이지 않는다(L4). 다만 두 가지를 함께 기록한다.

1. **기준 보정 실패의 교훈**: base rate가 37%인 갤러리에서 2×base(74%)는 사실상
   ceiling(100%)에 가까운 기준이었다. **임계값을 base rate를 모른 채 등록**한 것이 원인.
   다음 사전등록부터 임계는 base-rate 조건부(예: lift ≥ 1.5 또는 정규화 지표 AP)로 정의한다.
2. **부차 관찰(주장 아님)**: masked-pool이 whole-pool보다 +0.086, raw보다 +0.107 높다.
   특히 Hiroshima(0.756 vs raw 0.302)·Newzealand(0.736 vs 0.490)에서 크게 벌어지고,
   Chimanimani·Thrissur에서는 base 수준이다 — **지역 간 이질성이 크다**(M12의 annotation
   구도와 대조할 가치).

- **말할 수 있는 것**: masked 토큰 풀링이 raw-spectral 검색을 10개 중 7개 지역에서 이겼고
  macro +0.107. 계산은 CPU 62초(전 과정 캐시 재사용, GPU 0).
- **보조지표 AP@100 정정 (2026-08-28 독립 감사)**: 최초 보고한 raw 0.425 / OLMo whole
  0.503 / masked 0.553은 top-100 안에서 *찾은 양성 수*를 분모로 쓴 값이라 표준 AP@100이
  아니다. 양성을 적게 찾아도 앞에만 있으면 과대평가되는 구현 결함이다. 세 수치는 철회하며,
  `min(전체 gallery 양성 수, 100)`을 분모로 쓰는 AP@100과 Recall@100을 재실행하기 전까지
  P@10 외 검색 우위 주장을 추가하지 않는다. 사전등록 판정 미검출은 변하지 않는다.
- **말할 수 없는 것**: 이 캐시는 12 timestep 전체 인코딩이라 **변화 벡터가 아니라 상태
  서명** 검색임. "산사태 발생을 찾았다"가 아니라 "산사태가 포함된 패치의 상태가 비슷한
  패치를 찾았다"임. 라벨 정확도 미검증, positive 임계 민감도 미실시.

## M66. 다지점 사건 Δz 파일럿 — 3지역 모두 사전등록 기준 통과 (2026-08-28)

**질문**: Nepal에서 설계한 pre/post 임베딩 Δz가 실제 산사태 위치를 골라내는가 —
단일 사건이 아니라 **여러 지역·여러 사건에서 동시에**.

**방법** (`code/sen12_event_delta_pilot.py`, 판정 기준을 실행 전에 스크립트에 등록함):
Sen12Landslides 주석 패치(event_date 신뢰도 1.0)의 시간 축을 사건 날짜에서 갈라
pre 4시점 / post 4시점을 SCL clear 상위로 라벨 미참조 선택 → frozen OlmoEarth v1로
각각 임베딩(기존 캐시 스크립트와 동일 계약: 12밴드+MISSING, patch4, crop64×4) →
토큰별 cosine Δz를 MASK(토큰 평균 ≥0.25 양성)로 AUROC 채점. placebo = pre 구간
전반 4 vs 후반 4 (pre clear ≥8일 때만). 다운로드 0, GPU1 총 147초.

| 지역 (사건) | 패치 | pooled AUROC | placebo AUROC (n) | 판정 |
|---|---|---|---|---|
| Hokkaido (2018-09-06 Iburi) | 120 | **0.853** | 0.564 (110) | candidate localization signal |
| Hiroshima (2018-06-28 호우) | 120 | **0.952** | 0.602 (85) | candidate localization signal |
| DominicaMaria (2017-09-23 Maria) | 120 | 0.605 | 0.433 (**12**) | 통과 — 단 placebo 비교는 무효 |

**정직한 한계**:
- DominicaMaria는 placebo 표본 12패치 < 30 — 사전 등록한 무효 조건에 해당하므로
  placebo 비교는 버리고 AUROC ≥0.60(0.605, 경계선)만 남음. 허리케인 사건이라
  Δz가 산사태 외 광역 변화(식생 파괴·홍수)와 얽혔을 가능성이 큼.
- 지역당 사건 1개씩(패치는 다수) — "3사건 × 120패치"이지 "360사건"이 아님.
- placebo AUROC가 0.5보다 높음(0.53~0.60) — 사건 전에도 Δz가 산사태-발생-예정
  지형과 약하게 상관(급경사·나지 등 관측 변동이 큰 곳). 이 자체가 후속 질문임.
- 상태 서명 검색(M17, 미검출)과 다른 태스크임: 이것은 **변화 지역화**이고 라벨이
  같은 패치 안의 토큰 대비라 훨씬 쉬운 문제임.

**의미**: Nepal Rasuwa 프로토콜(단일 사건)이 우연이 아닐 조건이 생겼음.
Δz는 최소 2개 지역(Hokkaido·Hiroshima)에서 placebo 대비 +0.29/+0.35의
지역화 신호를 냄. 봉인: report.json `c7aa4ab4…` / per_patch.jsonl `87e432c4…`
(서버·로컬 미러 sha 일치, `artifacts/sen12_event_delta_pilot/`).

## M67. 사건 전 임베딩만의 취약지도(LOCO)는 미검출 — S2 광학의 한계가 드러남 (2026-08-28)

**질문**: "예방" 방향 — 사건 **전** 임베딩만으로 산사태가 날 자리를 처음 보는 지역에서
구분할 수 있는가 (`code/sen12_susceptibility_probe.py`, 판정 기준 사전 등록함).

**방법**: M66과 같은 3지역×120패치. z_pre(사건 전 clear 4시점, frozen v1 768d 토큰)로
선형 로지스틱(LOCO: 2지역 학습→1지역 채점). 대조 = raw 밴드 시간 평균·표준편차 20d.
성공 기준: 3지역 모두 AUROC ≥0.65 그리고 raw+0.03.

| held-out | olmoearth | raw | 판정 |
|---|---|---|---|
| hokkaido | 0.582 | 0.609 | 미검출 |
| hiroshima | 0.606 | 0.581 | 미검출 |
| dominicamaria | 0.533 | 0.566 | 미검출 |

**해석 (실패가 알려주는 것)**:
- M66 placebo 0.53~0.60의 "사건 전 신호"는 지역 안에서만 있고 **지역 간 전이가 안 됨**.
  raw 대비 우위도 없음 (2/3에서 raw가 오히려 높음).
- 산사태 취약성의 지배 변수는 경사·지질(DEM 파생) — S2 광학 외형만으로는
  국경을 넘는 취약 신호가 부족함. Sen12 패치에 **DEM 밴드가 있으므로**
  "DEM 파생 + 임베딩" 결합이 다음 측정임 (임베딩의 한계 규정 실험으로 가치 있음).
- 미검출 자체가 M66 해석을 보호함: M66의 지역화 신호는 "원래 취약지를 외운 것"이
  아니라 **실제 사건 전후 변화**에서 온 것임 (취약성만으로는 0.53~0.61이 천장).

봉인: report.json `c0d1e2bb…` (서버·로컬 일치). torch 로지스틱(LBFGS, balanced, L2 1e-4)
사용 — venv-master에 sklearn 없음.

## M68. 다지점 사건 Δz — 15지역 전수 재생, 9지역 판정·6지역 데이터 부적격 (2026-08-29)

M66(3지역)을 Sen12 전 지역으로 확장했음(`code/sen12_event_delta_pilot.py`, 같은 계약,
지역당 ≤120패치, 보조지표 recall@5%FPR 추가 = 오경보 5%로 고정할 때 실제 산사태 토큰 커버율).
GPU1 유휴 시간에 실행, 총 863패치.

| 지역 (트리거) | 패치 | AUROC | recall@5%FPR | placebo | 판정 |
|---|---|---|---|---|---|
| Hiroshima 2018 (호우) | 120 | **0.951** | 0.80 | 0.60 | 통과 |
| Indonesia (지진·호우 혼합, 단일날짜만) | 52 | **0.919** | 0.61 | 0.47 | 통과 |
| Thrissur 2018 (몬순) | 120 | **0.859** | 0.54 | 0.53 | 통과 |
| Hokkaido 2018 (지진) | 120 | **0.852** | 0.38 | 0.56 | 통과 |
| Itogon 2018 (태풍) | 120 | 0.764 | 0.35 | 0.55 | 통과 |
| Puerto Rico 2017 (허리케인) | 47 | 0.675 | 0.29 | — | 통과(placebo 없음) |
| Italy 2023 (호우) | 120 | 0.623 | 0.14 | 0.57 | 경계선 |
| Dominica 2017 (허리케인) | 120 | 0.605 | 0.12 | 0.43(n=12) | 경계선 |
| USA Alaska (관측 부족 34/78) | 44 | 0.552 | 0.08 | 0.53 | **미검출** |

**데이터 부적격 6지역**: nepal·kyrgyzstan1/2·china·newzealand·lanaodelnorte — 사건 날짜
신뢰도 <1.0 또는 다중 날짜(예: `2018-09-28,2017-05-29`)라 사전 등록 규칙으로 제외함.
특히 Sen12의 nepal은 2015 지진이 아니라 날짜 불확실한 몬순 산사태임(신뢰도 0.4~0.5).

**읽기**: 지진(홋카이도)·호우(히로시마·트리슐)·태풍(이토곤)·허리케인(푸에르토리코) 등
**트리거 종류와 무관하게** 지역화 신호가 나옴 — 프로토콜은 원인이 아니라 "표면이 달라졌는가"를
봄. 약한 곳의 공통점은 관측 조건(Alaska 눈·구름으로 34패치 탈락, Dominica placebo 12)임.
recall@5%FPR이 0.08~0.80로 넓음 = "산사태 표시 부분을 전부 커버"하지는 못함. 오경보 5%
예산에서 잡는 비율이 지역별로 크게 다르며, 이것이 운영 임계 설정의 실측 근거임.
8-region transfer(M65)에서 진 Indonesia가 여기선 0.919 — 태스크가 다름(분할 vs 사건 전후 지역화).

봉인: report `d00beaec…` / per_patch(863행) `5b383708…` 서버·로컬 일치,
`artifacts/sen12_event_delta_all/`.

## M69. 회랑 전체 S2-only 후보 지도 — 사람이 찍지 않은 27창에서 모델이 순위를 냄 (2026-08-29)

**질문**: 사람이 지정한 앵커 없이, 강 회랑 전체를 자동 창으로 잘라 frozen OlmoEarth가
"사건 후 자기 과거와 달라진 곳"을 스스로 골라낼 수 있는가. 레이더(RTC) 없이 광학만으로
— M66/M68에서 검증된 조건과 같음.

**설계(실행 전 고정)**: OSM 강 중심선(국경→Devighat)을 2km 간격 24창 + Lhende 상류 3창 =
27창(각 2.56km, 12밴드). 기준 3장(07-03·07-23·08-07) vs 사건 후 1장(08-27) = Δ_event;
같은 기준 3장 vs 08-12 = Δ_placebo(3:1 구조 동일). 임계 = 전 회랑 placebo 토큰 p99.
밝은 픽셀(B02>2600) 토큰 마스크. 판정 문구는 candidate change(S2-only, unsealed)까지만.

**v1(있는 그대로 보존)의 결함 2개**: ① 유효 토큰 0%인 창(Lhende w24)의 빈 집합 NaN이 1위로
올라옴 ② 기준 마스크가 "3장 중 최대"라 몬순 7월 때문에 27창 중 12창이 유효 20% 미만.
→ **v2**: 기준 마스크를 3장 평균으로, 유효 <20% 창은 "관측불가"로 순위 제외. 두 보고서 모두 봉인.

**v2 결과** (임계 0.281, placebo 토큰 77,628, 순위 23창 / 관측불가 4창 = Betrawati 1 + Lhende 상류 3):

| 순위 | 창 | 위치 | 후보 토큰 | 유효 | Δ_event / Δ_placebo |
|---|---|---|---|---|---|
| 1 | w03 | Timure 남쪽 (85.355, 28.217) | 18.4% | 34% | 0.223 / 0.098 |
| 2 | w18 | Trishuli Bazar 북 (85.184, 27.973) | 18.1% | 86% | 0.179 / 0.115 |
| 3 | w02 | Timure (85.358, 28.238) | 16.3% | 64% | 0.221 / 0.112 |
| 4 | w23 | Devighat (85.126, 27.879) | 13.5% | 95% | 0.203 / 0.149 |
| 5 | w15 | Betrawati 하류 (85.193, 28.031) | 11.7% | 57% | 0.181 / 0.107 |
| 12 | w00 | **Rasuwagadhi**(사용자 앵커 A) | 7.9% | 53% | 0.176 / 0.136 |

**읽기**: 모델이 스스로 고른 상위권이 Timure(보도: 마을 매몰)·Trishuli Bazar(60채 유실)·
Devighat(수력 피해)와 겹침 — 사람이 찍지 않은 창에서 나온 결과임. 반면 사용자 앵커
Rasuwagadhi(w00)는 12위: placebo Δ 자체가 높아(0.136) 사건 전에도 변동이 컸던 창임
(국경 공사·구름 잔재 가능) — 이것이 placebo 대조의 존재 이유임. Lhende 상류·발원은 구름으로
관측불가 → 레이더 필요. **정직한 한계**: 광학 전용·미봉인 프로토콜, 라벨 없음, 순위는
현장 확인 순서이지 피해 크기가 아님. 후보 토큰 비율 상위도 18%에 불과함.

봉인: v1 `f55a2b5f…`, v2 `3a09d888…` (서버·로컬 일치), `artifacts/corridor_s2_candidates/`.
앱: AI 후보 층(주황 채움=후보 비율, 상위 5 굵은 테두리) + 우측 목록·GO 버튼.

## M70. [SUPERSEDED BY M75] 첫 라이브 Δz 판정 — 봉인 S1+S2 계약, 5앵커 중 3앵커 candidate change (2026-08-29)

**게이트 통과 경로**: 8/28 S1D 제품이 Copernicus·PC GRD에 있었고 RTC 파생물은 촬영 24시간
뒤 배치로 생성됨(실측: <24h 0/200, 24~30h 80/80). 도착 직후 `build_nepal_live_catalog` →
`prepare s1_live`(preflight 5/5 앵커에 8/28 선택, seal valid, exact 4+4) → 서버 GPU1
`run_nepal_olmo_embeddings.sh s1_live`(seal `661b19c8…`) → `analyze_nepal_delta.py --live-mode s1_live`.
s2_live는 S1 4번째 레이어가 미물질화(3/4)라 invalid로 남김 — s1_live가 두 센서를 모두 포함하므로 대체함.

**판정** (placebo 표본 2개 → 사전 등록대로 percentile 대신 max(placebo) 초과 + rank):

| 앵커 | live Δ (baseline↔s1_live) | placebo A / B | 판정 |
|---|---|---|---|
| rasuwagadhi | 0.01559 | 0.01462 / 0.00835 | **candidate change** |
| syabrubesi | 0.01538 | 0.01462 / 0.01028 | **candidate change** |
| timure | 0.01487 | 0.01212 / 0.01301 | **candidate change** |
| source_provisional | 0.02317 | 0.03434 / 0.00800 | not detected above daily variability |
| dhunche | 0.01101 | 0.04981 / 0.00807 | not detected above daily variability |

**읽기 (약점 먼저)**: 초과 폭이 작음(rasuwagadhi 0.0156 vs 0.0146, 6.6%). placebo가 2개라
"평소 분포"가 아니라 "평소 두 표본"임 — handoff 조건 4대로 percentile·이상치 주장은 금지, 서술적
candidate change만 허용. 발원(source)·Dhunche는 placebo 자체가 큼(눈·구름 변동) → 관측 조건이
지배하는 창이라 판정 불가가 정직함. 회랑 하류 3앵커의 방향 일치는 M69(S2-only 27창)와 정합함.
이 결과는 피해·원인·규모를 말하지 않음.

봉인: delta report `artifacts/external_data/nepal_olmo_live_v1/delta/20260829T085533Z/`
(서버·로컬 sha 일치), embedding_manifest s1_live valid, code_snapshot 포함.

## M71. 스캔 v2 — 연속 강변 + 발원 주변 산사면 격자 100창 (S2-only, 2026-08-29)

**설계**: 발원(E)→Galchhi 강 중심선을 1.28 km 간격(절반 겹침)으로 연속 창, Lhende 상류 창,
그리고 발원 주변 ±7.7 km 7×7 산사면 격자(강변 밖 산사태 탐색) = 100창. M69와 같은 3:1 S2 계약,
placebo p99 임계(0.282), 유효 <20% 창은 관측불가.

**결과**: 47창 판정 / 53창 관측불가. 관측불가는 산사면 격자 49 중 **43**, Lhende 8, 강변 2 —
발원 주변은 몬순 구름·눈으로 광학이 거의 눈을 감고 있음(정직한 공백, 레이더 필요).

| 순위 | 창 | 종류 | 지명 | 후보 토큰 | 유효 |
|---|---|---|---|---|---|
| 1 | v003 | 강변 | Dalphedi (Timure 남쪽) | 25% | 45% |
| 2 | v064 | **산사면** | Salê (국경 북동, 티베트) | 19% | 21% |
| 3 | v025 | 강변 | Bhainse, Bidur | 18% | 91% |
| 4 | v024 | 강변 | Bidur 북 | 15% | 95% |
| 6 | v031 | 강변 | Bidur/Devighat | 14% | 94% |
| 7 | v056 | **산사면** | Gosaikunda 북 | 13% | 23% |

**읽기**: 강변 상위는 M69(27창)와 일관됨(Timure 남쪽·Bidur 구간). 강변 밖에서 **v064·v056**이
새로 올라옴 — 국경 북동 10~12 km 산사면. 단 유효 21~23%로 관측성이 낮아 "lead"로만 표시하고
레이더/고해상도 확인 대상으로 둠. 6 산사면 창만 판정됐으므로 "산사태가 심한 곳을 찾았다"가
아니라 "광학이 보이는 6곳 중 2곳에 변화 후보"임. 첫 실행은 파일 glob 버그(v* 미포함)로 0창
처리됐고 수정 후 재실행함(L3 기록).

봉인: `artifacts/corridor_s2_candidates/embed_scan_v2/report.json`, 창 자산·지명 앱 반영.

## M72. [S1+S2 RESULTS SUPERSEDED BY M75] placebo 10개로 재판정 — M70의 "3/5 candidate"는 철회, 매칭 설계에서 Rasuwagadhi만 1위 (2026-08-29)

**무엇을 했나**: 사건 전 rolling 창 8개(END 06-17…08-05, 주 단위)를 같은 4×14d 계약으로 물질화·
봉인·임베딩해 placebo를 2 → 10개로 늘리고 `analyze_nepal_delta.py`를 재실행함.

**결과 1 (기존 분석기, placebo_k vs baseline)**: 5앵커 **전부 "not detected above daily variability"**.
6~7월 창의 Δ(0.03~0.08)가 사건 Δ(0.011~0.023)보다 큼. → M70의 3/5 판정은 표본 2개의 우연이었음.
**철회함.**

**왜 그런가 (설계 결함)**: 기존 placebo Δ는 전부 baseline(END 08-26)과의 거리라, END가 멀수록
공유하는 14일 기간이 줄어(06-17 창은 겹침 0) 거리가 구조적으로 커짐. 사건 쌍(baseline↔s1_live)은
4기간 중 3기간을 공유하므로 비교 대상이 아니었음.

**결과 2 (매칭 설계, `analyze_nepal_delta_matched.py`)**: placebo를 **정확히 1기간(14일) 차이의
연속 쌍 9개**로 다시 정의(사건 쌍과 같은 겹침 구조).

| 앵커 | 사건 Δ | placebo 쌍 Δ 범위 (n=9) | rank | 판정 |
|---|---|---|---|---|
| rasuwagadhi | 0.0156 | 0.0097–0.0154 | **1/10** | candidate change (matched) |
| syabrubesi | 0.0154 | 0.0107–0.0177 | 4/10 | not detected |
| timure | 0.0149 | 0.0099–0.0162 | 4/10 | not detected |
| source_provisional | 0.0232 | 0.0108–0.0343 | 4/10 | not detected |
| dhunche | 0.0110 | 0.0094–0.0516 | 9/10 | not detected |

**읽기 (약점 먼저)**: 앵커 평균(2.56 km 창 전체 평균 Δ)은 무딘 지표임 — 몬순 계절 변동과
관측 조건이 지배해서 사건 신호가 창 전체 평균에서는 묻힘. Rasuwagadhi도 1위지만 초과 폭이
0.0002로 사실상 동률. **결론: 앵커 평균 Δ로는 이 사건을 "판정"할 수 없음.** 토큰 수준
(p95·후보 토큰 비율, M69/M71 방식)이 맞는 지표이고, 그쪽은 3:1 대칭 설계라 이 결함이 없음.
앱 판정 카드는 이 결과대로 "NOT DETECTED ABOVE VARIABILITY"(매칭에서 1/5)로 내림.

봉인: `delta/20260829T115424Z`(10 placebo naive), `delta_matched/20260829T115626Z`(매칭 9쌍).

### M72 보론 — [SUPERSEDED BY M75] 토큰 수준 매칭 판정: Rasuwagadhi에서 사건 신호가 분리됨

같은 매칭 9쌍에서 **토큰 수준**(모든 placebo 쌍 토큰 Δ의 p99를 임계로, 사건 쌍에서 그 임계를 넘는
40 m 토큰 비율)으로 다시 잼 (`delta_matched/20260829T121127Z`):

| 앵커 | 사건: 임계 초과 토큰 | placebo 9쌍 최대 | rank | 판정 |
|---|---|---|---|---|
| **rasuwagadhi** | **9.8%** | 2.7% | **1/10** | candidate change (token-level, matched) |
| syabrubesi | 0.6% | 2.8% | 6/10 | not detected |
| timure | 0.3% | 4.8% | 7/10 | not detected |
| source_provisional | 0.1% | 5.8% | 4/10 | not detected |
| dhunche | 0.0% | 5.5% | 10/10 | not detected |

Rasuwagadhi는 평균(0.0002 차)과 달리 토큰 수준에서 **3.6배 초과**로 분명히 분리됨 — 창 전체가
변한 게 아니라 창 안 일부(합류부 debris 판)가 크게 변했다는 뜻이며, 평균이 그것을 희석했음.
Timure·Syabrubesi는 봉인 S1+S2 큐브에서는 미검출(광학 전용 스캔의 v003/w02와 창 위치·센서가
다름 — 별도 비교 필요). 앱 판정 카드는 이 토큰 수준 결과로 "REVIEW CANDIDATE EVIDENCE
(token-level, rasuwagadhi)"를 표시하고, 평균 Δ 단독으로는 미검출임을 함께 적음.

## M73. AI가 유의미한가 — 같은 조건의 고전 변화탐지와 직접 비교, 9/9 지역 AI 우위 (2026-08-29)

**질문**: frozen OlmoEarth Δz(M68)가 "AI 없이 밴드 차이만 봐도 되는 것"보다 실제로 나은가.
**방법**(`code/sen12_classical_baseline.py`, 사전 등록: AI − 최선 고전 ≥ +0.05면 "AI 우위"):
M68과 동일 패치·동일 pre/post 시점 선택(라벨 미참조 SCL 상위 4)·동일 라벨(토큰 MASK ≥0.25)·동일 AUROC.
고전 ① 정규화 10밴드 절대차 평균, ② |ΔNDVI|+|ΔNBR| 지수 변화. 라벨은 채점에만 씀.

| 지역 | 고전 ①밴드 | 고전 ②지수 | **AI Δz** | AI − 최선 고전 |
|---|---|---|---|---|
| Hiroshima | 0.641 | 0.767 | **0.952** | **+0.184** |
| Indonesia | 0.707 | 0.734 | **0.920** | **+0.186** |
| Italy | 0.433 | 0.372 | **0.624** | **+0.191** |
| Hokkaido | 0.542 | 0.726 | **0.853** | **+0.127** |
| Thrissur | 0.651 | 0.703 | **0.859** | **+0.156** |
| Dominica | 0.492 | 0.492 | **0.605** | **+0.113** |
| Itogon | 0.541 | 0.654 | **0.764** | **+0.110** |
| USA Alaska | 0.413 | 0.498 | 0.553 | +0.055 (경계) |
| Puerto Rico | 0.672 | 0.578 | 0.675 | +0.003 (동률) |

**읽기**: 9/9에서 AI ≥ 고전, 8/9에서 사전 등록 기준(+0.05) 충족(Alaska +0.055 경계). 고전 방법은 구름·계절 잔재에 그대로
반응해 AUROC가 0.4~0.7에 머무는 반면 임베딩 Δz는 같은 입력에서 0.6~0.95. 예외 2곳(Alaska·
Puerto Rico)은 관측 조건이 나쁘거나 표본이 적은 곳으로, "AI가 항상 이긴다"가 아니라 "관측이
성립할 때 AI가 고전보다 국소 변화를 훨씬 잘 분리한다"임.
네팔 100창에서도 같은 비교(`corridor_classical_baseline.py`): 상위 10 중 보도 피해지 적중 AI 6 vs
고전 5, Spearman 0.22(두 방법이 다른 걸 봄) — 라벨이 없어 약한 증거이며 Sen12 표가 본증거임.
봉인: `artifacts/sen12_classical_baseline/report.json`, `artifacts/corridor_s2_candidates/embed_scan_v2/classical_vs_ai.json`.

### M72 보론 2 — [SUPERSEDED BY M75] 감사 사슬 사고와 재도출 (2026-08-29 21:28 KST)

**사고**: 회랑 27창 임베딩을 돌리려던 러너 스크립트의 `MATERIALIZED_DIR` 지원판이 터널 단절로
서버에 업로드되지 않아, 구버전 러너가 **5앵커 `materialized/baseline` 임베딩을 재계산·덮어씀**
(rasuwagadhi tif sha `626d6df1…` → `70b4d7b9…`, bf16 autocast 비결정성으로 바이트 불일치).
M70·M72 보고서의 입력 sha가 더 이상 디스크와 맞지 않게 됨.

**조치**: 러너 재업로드(확인 후) → 회랑 임베딩을 올바른 경로로 재실행. 5앵커 판정은 새 baseline으로
**재도출**해 새 보고서로 교체함(`delta/20260829T130711Z`, `delta_matched/20260829T130711Z`).
수치는 4자리까지 동일(rasuwagadhi 평균 0.015587→0.015585, 토큰 9.8%→9.8%, 순위 전부 동일)이라
**판정은 변하지 않음**. 이전 보고서 두 개는 "입력 sha 불일치, 재도출로 대체됨"으로 보존함.

**교훈(L3)**: nx push 결과줄에 `✔ 완료`가 없으면 실패로 간주하고 재시도할 것; 서버 러너는 출력 경로를
인자로 받아 잘못된 대상에 쓰지 못하게 할 것(다음 커밋에서 러너에 경로 검사 추가).

## M74. [SUPERSEDED BY M75] 회랑 27창 봉인 계약(S1+S2) Δz — Lhende 상류가 1~3위, 하류는 광학 순위와 부분 일치 (2026-08-29)

**설계**: M69의 27창을 5앵커와 같은 봉인 계약(4×14d S1+S2, exact 4+4, 8/28 RTC 포함)으로 baseline·
s1_live 물질화(각 27/27 valid) → GPU1 임베딩 → 토큰 Δz. 임계는 회랑 자체 placebo가 아직 없어
5앵커 매칭 9쌍 토큰 p99의 중앙값(0.0330)을 **차용**함(사전 등록: 차용 임계·라벨은 candidate까지).

| 봉인 순위 | 창 | 위치 | 임계 초과 토큰 | 광학(M69) 순위 |
|---|---|---|---|---|
| 1 | w24 | Lhende 상류 (A→E 1/3) | **27.9%** | 관측불가(구름) |
| 2 | w26 | Lhende 발원(E) | 11.5% | 관측불가 |
| 3 | w25 | Lhende 상류 2/3 | 3.5% | 관측불가 |
| 4 | w00 | Rasuwagadhi | 3.1% | 12 |
| 5 | w23 | Devighat | 2.5% | 4 |
| 6–7 | w21·w22 | Bidur | 2.2 / 1.9% | 6 / 7 |

Spearman(봉인 vs 광학) −0.14, 상위10 교집합 3(w23·w21·w22).

**읽기 (약점 먼저)**: 봉인 프로토콜에는 구름 마스크가 없음. Lhende 3창은 광학에서 구름·눈으로
전면 제외됐던 창이라, 이 Δ가 "레이더가 본 협곡 변화"인지 "S2 구름 잔재"인지 **아직 분해되지
않음** — S1 단독 임베딩으로 분해하기 전에는 lead로만 둠. 하류(Rasuwagadhi·Devighat·Bidur)는
두 프로토콜이 일치해 신뢰도가 높음. 차용 임계라 절대 비율(27.9%)은 회랑 placebo 확보 후 재산정.

**육안 확인(L5)**: w24 봉인 Δ 히트맵을 8/27 광학 위에 겹쳐 보니 창 대부분이 구름·눈(백색)이고 초과
토큰이 구름 위에 흩어져 있음 → Lhende 1~3위는 **S2 구름 잔재로 인한 artifact일 가능성이 높음**.
따라서 "레이더가 협곡 변화를 봤다"고 쓰지 않음. 하류 3창 일치만 결과로 침.

**의미**: 봉인 계약에도 관측성 마스크가 필요함이 드러남(광학 스캔은 마스크가 있어 이 창들을 거부했음).
다음 실험 =
S1-only 임베딩 분해 + 회랑 placebo_a/b 물질화(임계 자체 산정).
봉인: `artifacts/external_data/nepal_olmo_live_v1/corridor_sealed/report.json`, 매니페스트 baseline/s1_live.

### M74 보론 — [SUPERSEDED BY M75] 레이더(S1) 단독 분해: w24(Lhende 협곡)는 구름 artifact가 아님

같은 27창을 **Sentinel-1만**으로 재임베딩(`model_s1only.yaml`, 출력 `embeddings_s1`)해 baseline↔s1_live Δ를
다시 잼. 레이더는 구름에 무관하므로 광학 구름 잔재가 섞일 수 없음.

| S1-only 순위 | 창 | 평균 Δ | 비고 |
|---|---|---|---|
| **1** | **w24 Lhende 협곡(국경 상류 1/3)** | **0.0207** | 2위의 **8×**, 나머지 26창 중앙값의 ~70× |
| 2 | w25 Lhende 상류 2/3 | 0.0025 | |
| 3 | w26 발원(E) | 0.0014 | |
| 4~27 | 하류 전부 | ≤0.0006 | 레이더 단독으로는 하류 변화가 거의 안 잡힘 |

**읽기**: w24의 레이더 단독 신호는 **구름 artifact가 아니라 실제 지표 변화**로 봄 — 보도된 토석류 경로
(Lhende 협곡 → 국경)와 위치가 일치함. 반대로 하류(Rasuwagadhi·Bidur)는 레이더 단독으로는 작고
광학·복합 계약에서 잡힘 → **두 센서가 서로 다른 구간을 봄**(협곡은 레이더, 하류 하상은 광학).
한계: 임계는 여전히 차용값이고 S1 단독 Δ의 절대 스케일은 복합과 다름(비율·순위만 해석), 회랑 placebo가
오면 재산정. w25·w26(발원)은 약해서 발원 자체는 여전히 미확인.

봉인: `artifacts/external_data/nepal_olmo_live_v1/corridor_sealed_s1only/report.json`.

## M75-P. [SUPERSEDED BY M76] Sentinel-1 입력계약 역감사 뒤의 단일-placebo 27창 screening (2026-08-29)

**발견한 결함**: 공식 rslearn OLMoEarth 문서의 Planetary Computer Sentinel-1 경로는 RTC
linear intensity에 `Sentinel1ToDecibels`를 적용한 뒤 `OlmoEarthNormalize`를 요구한다. 기존
`code/model.yaml`은 dB 변환 없이 normalize했고, M70·M72·M74 및 M74 S1-only의 수치는 입력계약
밖에서 만들어졌다. 따라서 해당 S1 포함 결과를 전부 **SUPERSEDED**로 내렸다. S2-only M69·M71·M73과
Sen12 S2 기반 transfer M65에는 이 결함이 적용되지 않는다.

**재실행**: `code/model_s1db.yaml`로 placebo_b·baseline·s1_live 각 27창을 다시 forward했다.
세 embedding manifest 모두 27/27 valid, 각 출력은 768×64×64이며 총 **81 raster**다. 사건 전이는
baseline→s1_live, 동일 위치의 한 평시 전이는 placebo_b→baseline이다. 임계는 창별 평시 token p99로
정하고 사건 token의 초과 비율을 계산했다.

| 순위 | 창 | 위치 | p99 초과 token | 사건 평균 / 평시 평균 |
|---:|---|---|---:|---:|
| 1 | w23 | Devighat | 17/4096 = **0.415%** | 73.4% |
| 2 | w21 | Bidur | 17/4096 = **0.415%** | 55.5% |
| 3 | w22 | Bidur | 6/4096 = 0.146% | 66.8% |
| 4 | w18 | corridor | 5/4096 = 0.122% | 52.1% |
| 5 | w00 | Rasuwagadhi | 3/4096 = 0.073% | 56.2% |
| 10 | w24 | Lhende | 0/4096 | 44.8% |

27창 중 9창에 초과 token이 하나 이상 있지만 최대도 0.415%이고, **27/27 모두 사건 평균이 평시
평균보다 작다**. M74의 Lhende 27.9%와 M72의 Rasuwagadhi 9.8%는 교정 결과에서 재현되지 않았다.

- **말할 수 있는 것**: 계약에 맞는 OLMoEarth가 Devighat·Bidur를 약한 human-review queue 상단에
  놓았다. 이전의 강한 양성 결론은 전처리 결함의 산물이었다.
- **말할 수 없는 것**: calibrated anomaly, 피해 여부·면적·원인·확률. 창당 평시 전이가 하나뿐이고
  Nepal 독립 피해 polygon이 없기 때문이다.
- **근거**: `artifacts/external_data/nepal_olmo_live_v1/contract_audit_s1_db.json`,
  `artifacts/external_data/nepal_olmo_live_v1/corridor_sealed_s1db/report.json`, 세 arm의
  `embedding_manifest.json`, `code/model_s1db.yaml`, `code/analyze_corridor_sealed.py`.

## M75. Sentinel-1 정규화 결함 — 모든 S1 포함 임베딩이 선형 강도를 dB 정규화기에 넣었음 (2026-08-30 00:10 KST)

**발견 경로**: 회랑 27창 placebo_a↔baseline Δ가 0.20(앵커는 0.015)으로 튀어 추적 → 회랑 baseline/s1_live
첫 임베딩의 code_snapshot `model.yaml`(sha `ac742b84…`)에 `Sentinel1ToDecibels` 변환이 있고, 현재·5앵커의
`model.yaml`(sha `c460884a…`)에는 없음. 병렬 세션이 "PC S1 RTC는 선형 강도, OlmoEarth는 dB 기대"를 발견해
`model_s1db.yaml`로 회랑을 재계산하던 중이었고, 나는 그 사실을 모른 채 선형판으로 회랑 baseline·s1_live·
placebo_a를 **재계산해 덮어씀**(23:5x~00:0x KST). 두 세션이 같은 서버 산출물을 교차 수정한 사고.

**독립 검증(L6)**: OlmoEarth v1 정규화 상수 `norm_configs/computed.json` → sentinel1 vv mean −11.65 / std 10.84,
vh mean −17.75 / std 10.22, `predefined.json` min −50 max 0 → **dB 스케일**이 맞음. PC RTC는 선형(≈0~1)이므로
dB 변환 없이 넣으면 S1 채널이 거의 상수(정규화값 ≈ +1.1)로 들어가 **레이더 정보가 사실상 소실**됨.

**영향 범위**:
- 무효(재계산 필요): M70·M72(5앵커 봉인 계약, 토큰 9.8% 포함) — S1 채널이 죽은 상태의 결과. S2가 실질
  신호를 냈을 가능성이 크나 재계산 전엔 인용 금지. M74(회랑 봉인, 차용·자체 임계) 전부. **M74 보론의
  "레이더 단독 w24 8배"도 무효** — `model_s1only.yaml`이 선형판에서 파생됨.
- 유효(S2 전용): M66·M68·M69·M71·M73(AI vs 고전 비교) — 레이더 미사용.
- 앱의 판정 카드("token-level candidate")는 **재계산 전까지 "under re-computation (S1 dB fix)"로 내려야 함.**

**조치**: 회랑 임베딩 실행을 이 세션에서 중단함. dB 파이프라인(model_s1db.yaml)은 병렬 세션이 소유하며,
5앵커 baseline·placebo 10종·s1_live·회랑 3모드 전부를 dB로 재계산한 뒤 M70/M72/M74를 재도출해야 함.
교훈: 서버 `code/model.yaml` 교체는 커밋·공지 없이 하지 말 것; 러너 code_snapshot의 model.yaml sha를 결과
보고서에 항상 실을 것(이미 실려 있어 이번 추적이 가능했음).

## M76. dB 정규화로 재계산한 봉인 계약 — 5앵커·회랑 모두 사전 등록 기준 미달 (2026-08-30 00:25 KST)

M75의 결함을 고친 레시피(`model_s1db.yaml`, Sentinel1ToDecibels 포함, 스냅샷 sha `ac742b84…`)로 5앵커
12모드(baseline·placebo 10·s1_live)와 회랑 3모드를 전부 재계산함(선형판은 `embeddings_linear_s1`로 보존).
같은 분석기·같은 사전 등록 규칙으로 재도출:

**5앵커 (placebo 10개, naive)**: 5/5 not detected. 사건 Δ 0.022~0.043 vs placebo 0.04~0.15.
**5앵커 매칭 9쌍 (평균 rank / 토큰 초과 비율)**:

| 앵커 | 평균 rank | 사건 토큰 % | placebo 최대 % | 판정 |
|---|---|---|---|---|
| rasuwagadhi | 4/10 | 1.4 | 6.1 | not detected |
| source_provisional | 2/10 | 1.5 | 7.4 | not detected |
| timure | 4/10 | 0.0 | 6.7 | not detected |
| syabrubesi | 6/10 | 0.1 | 7.7 | not detected |
| dhunche | 9/10 | 0.0 | 7.3 | not detected |

**회랑 27창**: 자체 1기간 임계(0.0716, 관측성 마스크 적용) 아래 후보 0. 차용 임계 순위 상위 = Devighat(w23)·
Bidur(w21·w22)·w18·Rasuwagadhi(w00) — 하류 순위는 광학 스캔과 일치하나 초과 비율 ≤0.4%로 미미.

**해석 (L3, 실패를 결과로)**: M72 보론의 "Rasuwagadhi 9.8% vs 2.7%"는 **레이더 채널이 상수로 죽어 있을 때의
artifact**였음 — 철회. 레이더를 제대로 넣으면 몬순 기간 placebo 변동(수분·식생에 민감)이 커져 사건 창이
분리되지 않음. 즉 현재 계약(4×14d, 2.56 km 창, 앵커/창 단위 통계)으로는 **봉인 S1+S2 계약이 이 사건을
후보로 내지 못함**. 유효한 AI 증거는 여전히 광학 전용 프로토콜(M66·M68·M69·M71·M73)임.
후속: (a) 계약 변경 실험 — 창 안 국소 클러스터 통계(연결 토큰 면적), S1/S2 분리 Δ 후 late fusion,
(b) 회랑 placebo 확장(1쌍 → 여러 쌍), (c) 레이더 단독(dB) 분해 결과는 아래 보론에.
봉인: `delta/20260829T152418Z`, `delta_matched/20260829T152433Z`, `corridor_sealed_s1db/`, `corridor_matched/`,
감사 `contract_audit_s1_db.json` (five_anchor_rerun=recomputed).

### M76 보론 — 레이더 단독(dB) 회랑 분해

S1만(dB)으로 27창을 재임베딩해 baseline↔s1_live Δ를 잼. **차용 임계 기준** w24(Lhende 협곡) 평균 0.0207·초과 12%로
여전히 1위(2위 w25 0.0025의 8배). 그러나 **자체 레이더 placebo(placebo_a↔baseline, S1-only, 마스크 없음)** 로
매칭하면 임계 0.122·후보 0 — w24의 레이더 Δ는 같은 창의 평소 2주 변동(급경사·눈·수분에 레이더가 민감) 안에 있음.
결론: w24는 "다른 창보다 튀는 창"이지 "자기 과거보다 튀는 창"은 아님 → lead로만 유지, 후보 아님.
봉인: `corridor_sealed_s1only/`, `corridor_matched_s1only/` (dB).

## M77. 잠정 음성 대조 — Rishing(구름 100%) 대신 Tadi Khola (2026-08-30)

사건 없는 지역 4곳(Melamchi·Tadi Khola·Ankhu Khola·Rishing)을 스캔과 같은 5날짜·12밴드 계약으로 받아
같은 3:1 Δ 프로토콜(GPU 임베딩)로 잼. 08-27 관측성: Tadi 84% > Melamchi 35% > Ankhu 15% > Rishing 0%.

| 창 | 관측성(08-27) | Δ_event | Δ_placebo | 후보 토큰(회랑 공통 임계 0.281885) |
|---|---|---|---|---|
| **Tadi Khola (새 C)** | **0.845** | 0.1287 | 0.1245 | **124/3461 = 3.58%** |
| Melamchi | 0.35 | 0.172 | 0.161 | ~0 |
| Ankhu Khola | 0.15 | 0.201 | 0.199 | (관측 부족) |
| Rishing (구 C) | 0.00 | — | — | 판정 불가 |

**두 임계의 차이**: 위 3.58%는 회랑 100창과 공정 비교하기 위해 회랑의 고정 p99를 Tadi에 적용한
값이다. `embed_ctrl/report.json`은 대조 후보 4곳의 placebo로 p99=0.347933을 새로 산정하므로
19/3461=**0.55%**를 기록한다. 둘 다 같은 Δ raster에서 재계산되며, 목적이 다르다.

**읽기**: 맑은 잠정 no-event 창에서 사건 Δ와 평시 Δ가 비슷하고, 공통 임계 후보 비율은 회랑
1위 Dalphedi 25.43%의 14.1%다. 이는 유용한 개발 음성 대조다. 그러나 Tadi가 현장 조사로
`no change`라고 확인된 것은 아니며, 네 후보 중 관측성으로 사후 선택됐다. 따라서 confirmatory
specificity나 false-positive rate 근거로 쓰지 않는다. Rishing은 관측불가라 대조군으로 부적격이었다.

봉인: `artifacts/corridor_s2_candidates/prepare_ctrl/`, `embed_ctrl/report.json`,
`artifacts/nepal_m77_m78_audit.json`.

## M78. 레이더 표현의 조건부 가치 — Sen12 라벨 7지역, S1 전용 vs S2 vs 결합 (2026-08-30)

**질문**: 레이더(S1 asc, dB)만으로 산사태 위치 신호가 존재하는가. 그리고 OlmoEarth가
고전 레이더 변화량(|Δ dB| VV+VH, 시간 중앙값)보다 나은가. M68/M73 과 같은 패치·시점·라벨·AUROC(토큰 MASK≥0.25).
Sen12 S1 은 이미 dB 였음(평균 음수). Indonesia·Thrissur 는 S1 pre/post 4시점 부족으로 제외.
사전 기준: 결합 이득 ≥ +0.03 이면 "레이더가 광학에 보탬"; S1 전용 AUROC ≥ 0.70 이면 "구름 아래 단독 탐지 가능".

**중요한 설계 경계**: 패치와 pre/post 시간은 각 면에서 **S2 clear fraction이 가장 높은 4시점**으로
선택하고, 그 시점에 가까운 S1을 붙였다. 따라서 이 실험은 실제 cloudy-S2 subset에서 radar가
복구하는지를 직접 시험하지 않는다. 아래 S1-only 결과는 `광학 pixel 없이도 표현 신호가 존재하는가`의
viability이지, 일반적인 `through-cloud 성능`의 확증이 아니다.

| 지역 | n | S2 전용 | S1+S2 | 이득 | **S1 전용 OLMo** | S1 고전 log-ratio |
|---|---|---|---|---|---|---|
| Hokkaido (지진) | 120 | 0.853 | 0.856 | +0.003 | **0.768** | 0.717 |
| Hiroshima (호우) | 120 | 0.952 | 0.955 | +0.004 | **0.731** | 0.609 |
| Dominica Maria (허리케인) | 120 | 0.605 | 0.619 | +0.014 | 0.516 | 0.567 |
| Italy | 120 | 0.627 | 0.631 | +0.003 | 0.489 | 0.492 |
| Itogon (태풍) | 120 | 0.764 | 0.776 | +0.011 | 0.655 | 0.664 |
| USA Alaska | 43 | 0.547 | 0.547 | +0.000 | 0.553 | 0.516 |
| USA Puerto Rico | 47 | 0.675 | 0.679 | +0.004 | 0.462 | 0.481 |

**읽기**
1. S1+S2 이득은 7/7 양수지만 최대 +0.014이고 **+0.03 gate는 0/7**이다. 이 계약에서는 fusion 기여를 승인하지 않는다.
2. **S1-only**는 Hokkaido·Hiroshima에서 0.768/0.731로 사전 0.70 gate를 통과했고, 두 곳 모두
   OlmoEarth가 고전 log-ratio보다 높다(+0.051/+0.122). 나머지 5지역은 gate 실패다. OlmoEarth가
   고전보다 수치상 높은 지역은 Alaska까지 3/7이지만 Alaska의 절대 AUROC는 0.553으로 작동 주장에 쓰지 않는다.
3. 네팔 M76(dB 재계산 후 5앵커·회랑 S1 미검출)은 이 결과와 모순되지 않음: 네팔은 S1 단독이 되는 유형인지 아직 모름 → 현장 검증 대상.

**통계 한계**: 총 690패치지만 AUROC는 지역 안 spatial token을 pooling한 값이고 spatial-block CI가
없다. seed·두 번째 frozen GeoFM 대조도 없다. 따라서 2/7은 조건부 viability이며 일반화 비율이 아니다.

**봉인**: 로컬은 `code/sen12_radar_value.py`(v2), `artifacts/sen12_radar_value/report.json`,
`artifacts/nepal_m77_m78_audit.json`. 실행 때 기록한 서버 로그 경로는 `logs/sen12_radar_value_v2.log`지만
현재 로컬 workspace에는 동기화되지 않아 로컬 seal 근거로 세지 않는다. GPU1, 약 7분.

## M79. 두 번째 frozen GeoFM 대조군 — Presto vs OlmoEarth, 같은 패치·시점·라벨 (2026-08-30)

**질문**: M73/M78의 우위가 "OlmoEarth의 공간 표현" 때문인가, "아무 FM 임베딩 Δ"라도 되는 것인가.
**방법**: Presto(nasaharvest, 픽셀 시계열 FM, 128-d) 사전학습 가중치 그대로. M78과 같은 7지역·690패치·같은 시점 선택
(S2 clear 상위 4 + 같은 쪽 S1 4)·같은 라벨(토큰 MASK≥0.25). 픽셀 임베딩을 4×4 평균해 OlmoEarth와 같은 32×32 토큰 격자에서
코사인 Δ → AUROC. dynamic_world는 missing, ERA5/SRTM 없음(마스크). v1은 월 인코딩을 연속 월로 잘못 넣어 폐기(`report_v1_wrong_months.json`), v2는 시점별 실제 월.
사전 기준: OlmoEarth − Presto ≥ +0.03인 지역 수.

| 지역 | n | Presto S2 | Presto S1+S2 | OlmoEarth S2 | 차(S2) |
|---|---|---|---|---|---|
| Hokkaido | 120 | 0.625 | 0.649 | 0.853 | +0.228 |
| Hiroshima | 120 | 0.490 | 0.514 | 0.952 | +0.462 |
| Dominica | 120 | 0.456 | 0.459 | 0.605 | +0.149 |
| Italy | 120 | 0.431 | 0.429 | 0.627 | +0.196 |
| Itogon | 120 | 0.537 | 0.557 | 0.764 | +0.228 |
| USA Alaska | 43 | 0.619 | 0.609 | 0.547 | **−0.073** |
| USA Puerto Rico | 47 | 0.488 | 0.471 | 0.675 | +0.187 |

**읽기**: OlmoEarth가 +0.03 이상 앞선 지역 **6/7**; Presto가 앞선 곳은 Alaska(표본 43, 양쪽 다 약함). Presto 단독이 0.60을 넘는 곳 2/7.
진단(`sen12_presto_diag.py`, 히로시마): Presto 임베딩은 살아 있고(분산 1.1) |ΔNDVI|와 약한 양의 상관(ρ=0.09)이나,
산사태 픽셀 Δ(0.0948) ≈ 비산사태(0.0968) — 픽셀 시계열 표현의 변화가 표면 변화보다 계절·위치 성분에 지배됨.
**한계(먼저)**: Presto는 12개월 연속 시계열용이라 4시점 계약은 Presto에 불리 → 이 수치는 Presto의 하한이지 Presto 판정이 아님.
Presto 정규화·마스크는 `construct_single_presto_input`을 벡터화한 것으로, 원 함수와 동일함을 픽셀 1개로 확인했으나 전수 대조는 안 함.
결론 범위: "같은 조건에서 픽셀 전용 표현으로는 이 분리가 재현되지 않는다" 까지. "OlmoEarth가 모든 GeoFM보다 낫다"는 아님(Prithvi/Clay/TerraMind 미실행).

**봉인**: `code/sen12_presto_control.py`(v2), `code/sen12_presto_diag.py`, `artifacts/sen12_presto_control/report.json`,
서버 `third_party/presto`(EE 의존성만 try/except로 우회, 모델 코드 무수정), 로그 `logs/sen12_presto_control_v2.log`. GPU1, 약 50분(CPU 정규화 병목).

## M80. 구름 층화 레이더 실험 — post 시점을 "흐린 날"로 고정했을 때 (2026-08-30)

**동기**: M78은 S2가 맑은 시점을 골랐으므로 "구름 투시" 확증이 아니었음(병렬 세션 지적). post 4시점을 SCL clear 비율이
목표치(0.4, 0.1)에 가장 가까운 순으로 고르고(결과 보기 전 고정) 달성 clear 평균을 기록함. pre 는 M78 그대로(맑음).
**한계 먼저**: Sen12 는 애초에 맑은 장면 위주라 흐린 post 시점이 실제로 존재한 지역은 **Hokkaido(달성 0.10)·Alaska(0.11)** 뿐.
나머지는 목표 0.1을 줘도 0.49–0.96으로 사실상 맑음 → 층화 실패, M78과 같은 표본.

| 지역 | 달성 post clear | S2 전용 | S1 전용 OLMo | S1+S2 | 이득 | S1 고전 |
|---|---|---|---|---|---|---|
| **Hokkaido (t0.1)** | **0.10** | 0.795 (맑음 0.853) | **0.770** | 0.803 | +0.008 | 0.713 |
| Hokkaido (t0.4) | 0.28 | 0.833 | 0.742 | 0.834 | +0.001 | 0.702 |
| Alaska (t0.1) | 0.11 | 0.508 | 0.497 | 0.508 | +0.000 | 0.450 |
| Hiroshima | 0.66 | 0.896 | 0.739 | 0.902 | +0.006 | 0.600 |
| Dominica | 0.49 | 0.575 | 0.489 | 0.589 | +0.014 | 0.559 |
| Italy | 0.83 | 0.652 | 0.496 | 0.660 | +0.008 | 0.490 |
| Itogon | 0.85 | 0.756 | 0.647 | 0.765 | +0.009 | 0.649 |
| Puerto Rico | 0.96 | 0.707 | 0.484 | 0.711 | +0.004 | 0.516 |

**읽기**: 유일하게 진짜 흐린 Hokkaido에서 광학 전용은 0.853→0.795로 떨어지고, 레이더 전용은 0.770으로 **유지**(맑을 때 0.768).
결합 0.803 — 이득 +0.008로 여전히 +0.03 게이트 미달. 즉 "레이더가 구름 아래서도 신호를 유지한다"는 1지역에서 확인됐고,
"레이더를 보태면 광학 손실을 메운다"는 이 계약에서는 아직 아님(광학 토큰이 구름 10%에서도 0.795를 냄 — SCL 마스크로 유효 토큰만
남긴 효과). 일반화는 2지역으로 불가. 다음은 Sen12 밖의 흐린 장면(PC에서 직접 수집)이어야 함.
봉인: `code/sen12_radar_value.py`(--post-clear-target), `artifacts/sen12_radar_cloud_t40/report.json`, `.../t10/report.json`.

## M81. 사전 등록 대조 창 10곳 — 관측성을 보기 전에 위치 고정 (2026-08-30)

M77의 약점(대조 창을 관측성으로 사후 선택)을 고치기 위해 규칙+난수 시드(20260830)로 10곳을 먼저 파일에 고정하고
(`prepare_ctrl_prereg/preregistered_sites.json`: 회랑·발원에서 ≥30 km, 창끼리 ≥10 km, 네팔 중부 bbox), 그 뒤 같은 5날짜 계약으로 받음.

| 창 | 위치 | 08-27 관측 | Δ_event | Δ_placebo | 후보 토큰(회랑 임계 0.2819) |
|---|---|---|---|---|---|
| p009 | 85.603E 27.632N | **0.97** | 0.156 | 0.149 | **1.0%** |
| p004 | 85.857E 28.218N | 0.15 | 0.196 | 0.077 | 4.4% (관측 부족) |
| p000·p001·p003·p005 | — | 0.00 | 판정 불가 | | |
| p002·p006·p007·p008 | — | 해당 날짜 장면 없음(타일 밖) | | |

**읽기**: 사전 등록 10곳 중 8/27에 판정 가능한 곳은 1곳(p009)뿐 — 몬순 구름의 실태. 그 1곳은 Δ_event ≈ Δ_placebo, 후보 1.0%로
"변화 없음"이 재현됨(Tadi 3.6%, 회랑 1위 25.4%). 표본 1이라 specificity 수치로 쓰지는 않되, 사후 선택 비판은 해소됨.
봉인: `code/fetch_controls_prereg.py`, `artifacts/corridor_s2_candidates/prepare_ctrl_prereg/`, 서버 `embed_ctrl_prereg/`.

## M83. 언색호(D) 수색 — 모델 없이 NDWI ∩ 같은 궤도 S1 급감 (2026-08-30)

D 수색 구역(85.48E 28.285N) ±5 km, 20 m 격자. 광학: 8/27 맑은 비율 **15%** → 신규 수체(NDWI post>0.2, pre<0) 판정 불가(0 px).
레이더: 첫 실행은 궤도를 섞어 AOI 21%가 "급감"으로 나옴(산악 레이오버 차이) → **같은 상대궤도(85 asc)** 7/23·8/04·8/16 중앙값 vs 8/28로 고침 → ≥3 dB 급감 13,328 px(5.3 km², 5.3%).
연결 성분 287개, 상위: 0.38 km²(85.507E 28.251N), 0.30(85.515E 28.291N), 0.26(85.519E 28.286N) — 발원 E 남서쪽 렌데 계곡에 군집.
**읽기**: 레이더 급감은 물·젖은 토사·거친 표면 변화 모두 가능 → "수색 표적"까지. 언색호 위치 확정은 다음 맑은 S2 또는 SkySat 필요.
봉인: `code/lake_search_d.py`, `artifacts/lake_search_d/report.json`, PNG 3장(`public/data/story/lake_*.png`).

## M82. 평시 기준 확장 — 100창 플라시보 3쌍으로 임계 재설정 (2026-08-30)

기존 임계는 평시 쌍 하나(base 7-03·7-23·8-07 → 8-12)의 p99=0.2819. 5-19·6-03·6-18 을 추가 다운로드해(100/100창) 평시 쌍을 셋으로:
P1 기존, P2 base{6-03,6-18,7-03}→7-23, P3 base{5-19,6-03,6-18}→7-03. 사건 쌍은 그대로(base→8-27).

| 임계 | p99 |
|---|---|
| P1(기존) | 0.2819 |
| P2(몬순 시작기) | **0.3606** |
| P3 | 0.2987 |
| **P1∪P2∪P3 pooled** | **0.317** |

| 창 | 후보 비율 pooled3 | P1만 | 창별 local3 | 관측 |
|---|---|---|---|---|
| v003 Dalphedi | **13.3%** | 25.4% | 13.0% | 0.45 |
| v025 Bidur 부근 | 13.2% | 18.0% | 9.9% | 0.91 |
| v064 Salê(강 밖) | 11.9% | 19.2% | 21.5% | 0.21 |
| v024 | 10.7% | 14.6% | 14.4% | 0.95 |
| v041 (A 부근) | 8.2% | 12.0% | 6.6% | 0.22 |
| Tadi 대조(x001) | **1.3%** | 3.6% | — | 0.84 |
| Melamchi 대조(x000) | 0.1% | — | — | 0.35 |

**읽기**: 평시 변동을 셋으로 넓히니 임계가 0.28→0.32로 올라 후보 비율은 대략 절반으로 줄었지만 **순위는 유지**(Spearman 0.94, 상위 3 동일).
즉 "몇 %"는 평시 기준 정의에 민감하고 "어디가 먼저인가"는 안정적 — 앱은 순위를 앞세우고 비율은 임계 표기와 함께 보여야 함.
P2가 가장 큰 이유는 6→7월 몬순 시작기의 식생·수분 변화(진짜 평시 변동) — 이게 빠져 있던 것이 기존 임계가 낮았던 이유.
봉인: `code/corridor_placebo_extended.py`, `artifacts/corridor_s2_candidates/embed_placebo_ext/report.json`(+ 서버 deltas), `prepare_v2_early/`.

## M84. 지형 매개변수 — 발원→충격(1구역) 종단면, 충격→하류(2구역) 계곡 형태 vs AI 후보 비율 (2026-08-30)

DEM = Copernicus GLO-30(PC). 모델·물리 시뮬레이션 없음.
**1구역(E→A)**: 직선 표본은 능선을 가로질러 무의미(3 km 지점 5,828 m) → D8 최급경사 경로(목표 가중 웅덩이 탈출)로 재추적.
경로 38.09 km, 낙차 3040 m, 평균 4.6°. 0–15 km 협곡(4,885→2,300 m, 국소 경사 11°→3°, 폭 0.4–1.3 km),
19–24 km 저경사 협착부(폭 **0.24 km** 최소, 85.413E 28.321N), 마지막 3 km 급강하 후 A.
**한계**: 30 m DEM의 평탄 구간(19–24 km, 26–31 km 되돌이)은 웅덩이·잡음 가능. "병목→가속"은 정성 서술까지만(유속 계산 안 함).

**2구역(강 창 39개, M82 pooled3 후보 비율과 Spearman)**
| 매개변수 | ρ | p | n |
|---|---|---|---|
| 계곡 폭(+150 m 등고까지 양측 거리) | **+0.364** | 0.0229 | 39 |
| 기복(창 내 최고−바닥) | -0.307 | 0.0576 | 39 |
| 하도 경사 | -0.168 | 0.3134 | 38 |
| 굴곡도(경로/직선) | 0.102 | 0.5429 | 38 |
| A로부터 거리 | 0.034 | 0.8391 | 39 |

**읽기**: 넓은 계곡 바닥일수록 후보 비율이 높고(ρ=+0.36, p=0.02), 기복이 큰 협착 구간은 낮음(ρ=−0.31, p=0.06). 경사·굴곡도는 무관.
→ 이 사건의 "변화"는 사면 붕괴가 아니라 **범람원 퇴적·침수**가 주도 — 사면 흉터가 안 보인다는 육안 관찰과 일치.
n=39 탐색적 결과. "다음 홍수에서 어느 구간이 위험한가"로 쓰려면 다른 사건에서 재현 필요(Gorkha 2015 등).
봉인: `code/corridor_geomorph.py`, `artifacts/corridor_geomorph/report.json`.

## M85. OlmoEarth v1 vs v1.2 Base — 같은 Sen12 계약에서 버전 비교 (2026-08-30)

사용자 질문("왜 v1.2가 아니라 v1?")에 답하기 위해 `sen12_radar_value.py --model-id OLMOEARTH_V1_2_BASE`로 7지역 690패치 재실행(시점 선택 M78과 동일).

| 지역 | S2 v1 | S2 v1.2 | S1+S2 v1 | S1+S2 v1.2 | S1단독 v1 | S1단독 v1.2 |
|---|---|---|---|---|---|---|
| Hokkaido | 0.853 | 0.838 | 0.856 | **0.870** | 0.768 | 0.722 |
| Hiroshima | 0.952 | 0.941 | 0.955 | 0.954 | 0.731 | 0.690 |
| Dominica | 0.605 | **0.647** | 0.619 | 0.647 | 0.516 | 0.520 |
| Italy | 0.627 | 0.599 | 0.631 | 0.599 | 0.489 | 0.488 |
| Itogon | 0.764 | 0.773 | 0.776 | 0.781 | 0.655 | 0.579 |
| Alaska | 0.547 | 0.511 | 0.547 | 0.529 | 0.553 | 0.548 |
| Puerto Rico | 0.675 | 0.674 | 0.679 | 0.679 | 0.462 | 0.490 |

**읽기**: 광학 전용은 2승 4패 1무(±0.04 이내), 레이더 단독은 v1이 6/7에서 높음, 결합은 v1.2가 Hokkaido에서 +0.032로 처음 fusion 게이트 통과.
버전을 바꿀 근거가 없음 — v1 유지. v1을 쓴 이유는 애초 확증 실험(M57/58)·정규화 설정·봉인 계약이 v1 기준이었기 때문이며 측정에 근거한 선택은 아니었음(정직 기록). 이제는 측정 근거가 생김.
봉인: `artifacts/sen12_radar_value_v1_2/report.json`.

## M88. 동결 외부 라벨과 40 m 토큰 규모 대조 — 창 규모 무판별(M86)의 다음 관문 통과 (2026-09-01)

**근거**: `code/score_external_tokens.py`, `code/score_external_tokens_classical.py`,
`artifacts/external_label_score/token_report.json`, `token_classical.json`. 라벨은 M86과 동일한
2026-08-31 동결본(IWM PlanetScope · TASA FORMOSAT-5 · JAXA ALOS-2 합집합), 순위·문턱·Δ 래스터 일절 재계산 없음.
사전 등록: pooled 토큰 AUROC ≥0.60 → 순위 지지, ≤0.50 → 토큰 규모에서도 무판별로 기록.

| 지표 | 값 |
|---|---|
| 채점 토큰 (47창, 유효만) | 122,558 |
| 라벨 토큰 기저율 | 5.47% |
| **OlmoEarth Δz pooled AUROC** | **0.846** |
| 고전 \|ΔNDVI\| (같은 토큰·라벨) | 0.750 |
| 고전 \|Δ밴드\| 평균 | 0.694 |
| 창별 AUROC 중앙값 (IQR) | 0.884 (0.818–0.927) |
| AUROC ≥0.60 창 | 39/40 |

**읽기**: 창(2.56 km) 규모에서 무판별이던 외부 라벨(M86: 기저율 87.8%)이 40 m 토큰 규모에서는
분리 가능해지고, OlmoEarth Δz가 홍수 대리 라벨 토큰을 비라벨 토큰보다 뚜렷이 높게 매김 —
그리고 같은 조건의 고전 변화량보다 +0.10/+0.15 높음. 네팔 축이 처음으로 독립 제3자 라벨과 정합함.
**한계**: 라벨은 홍수 '대리'(피해 확정 아님)·발표 수일 내 제작물이라 자체 오류 가능; 중심점 래스터화
규칙의 경계 오차; 라벨이 강줄기를 따르므로 "강을 찾는 능력"과 "변화를 찾는 능력"이 얽혀 있음(강 마스크
층화 분석이 후속). specificity·피해 면적·확률 주장은 여전히 하지 않음.

## M89. M88의 강 마스크 층화 — 정합이 "강 근접성" 때문이 아님 (2026-09-01)

강 마스크 = OSM 중심선 버퍼(150/300/600 m). 사전 등록: 강 밖 pooled AUROC ≥0.60 이면 통과.
`code/score_external_tokens_river.py`, `artifacts/external_label_score/token_river_strata.json`.

| 층 | 토큰 | 기저율 | OlmoEarth | \|ΔNDVI\| |
|---|---|---|---|---|
| 강 안 300 m | 31,314 | 14.0% | 0.795 | 0.704 |
| **강 밖 300 m** | 91,244 | 2.6% | **0.846** | 0.777 |
| 강 밖 600 m | 59,530 | 2.2% | 0.873 | 0.829 |
| 강 안 150 m | 14,413 | 23.6% | 0.734 | 0.677 |

**읽기**: 강에서 떨어진 토큰만 남겨도 정합이 유지·오히려 상승(0.846→0.873) → M88은 "강줄기를 그리는 능력"이
아니라 강 밖 라벨 변화까지 찾는 신호임. 모든 층에서 고전 대비 +0.04~+0.09. 강 안 AUROC(0.73~0.79)는
강 안에서도 라벨/비라벨을 가름. 한계: 버퍼 폭은 임의(3폭 병기), 라벨은 홍수 대리.

## M90. P2×P4 확률 수준 융합 — 사전 기준 미달, oracle headroom 은 단순 융합으로 안 회수됨 (2026-09-01)

**설계**: 봉인된 prob_maps(u8)·mask 만 읽는 CPU 재분석(재학습 없음). seed 짝 맞춰(1↔1,2↔2,3↔3) 융합.
사전 등록: F_mean=(P2+P4)/2 의 positive-tile macro IoU@0.5 가 best single +0.01 이상인 지역 ≥5/8 → 통과.
`code/fuse_p2_p4_prob_level.py`, `artifacts/fusion_prob_level/report.json`.

| region | P2 | P4 | F_mean | F_max | F_α(val) | F_mean 이득 |
|---|---:|---:|---:|---:|---:|---:|
| hiroshima | .2160 | .2782 | **.3182** | .2295 | .3103 | **+.0400** |
| hokkaido | .2155 | .3856 | .3773 | .2994 | .3594 | −.0083 |
| indonesia | .2836 | .2723 | .3069 | .2857 | .3166 | **+.0233** |
| itogon | .1477 | .1517 | .1702 | .1364 | .1683 | **+.0185** |
| kyrgyzstan1 | .1925 | .2813 | .2751 | .2375 | .2813 | −.0062 |
| kyrgyzstan2 | .1069 | .2078 | .2070 | .1187 | .2198 | −.0008 |
| newzealand | .1788 | .2415 | .2307 | .2404 | .2457 | −.0108 |
| thrissur | .2315 | .3588 | .3422 | .3087 | .3125 | −.0166 |
| **macro** | .1966 | .2722 | **.2785** | .2320 | .2767 | +.0063 |

**판정: 불통과(3/8 ≥ +0.01).** macro 는 F_mean +0.0063 으로 오르지만, P4 가 강한 지역(hokkaido·thrissur 등)에서는
평균 융합이 P4 를 되레 깎음 — M86 의 oracle headroom(+0.0238)은 "타일별로 나은 arm 을 고르는" 상한이고,
고정 가중 평균으로는 그 구조를 못 흉내 냄. val-α 도 유사(macro .2767). F_max 는 전반 악화(FP 결합).
**허용 해석**: 융합 이득은 학습된 타일/픽셀 게이트(무엇을 믿을지 입력에서 예측)가 필요하다는 증거. 이는 GPU 실험(다음 후보)로 넘김.
**정직 기록**: 지역 선별 없이 8/8 전부 공개; hiroshima +0.040 단독으로 일반화 주장하지 않음.

## 이 장부에 없는 것 (혼동 방지)

M23 이후 개발 pilot에는 Sen12Landslides S2가 실제로 들어갔다. 그러나 아래 지역·공공데이터의
**표현 기여**는 여전히 어떤 성능표에도 들어가지 않았다.

| | 사용량 |
|---|---|
| GLAMOS·swissALTI3D (스위스) | **0** |
| ICIMOD·HKH (네팔) | **0** |
| 한국 공공데이터 — 표현 기여(모델 성능) | **0** (2026-08-25 현재도 미측정) |
| 한국 공공데이터 — 접근·계약 감사 | M9·M10에서 수행 (AI-Hub 71363, GK2A 10/10, VWorld) |
| 사람 판독 라벨 | **0** |

Sen12Landslides frozen OLMo 수치는 이미 열람한 Chimanimani 1개 개발 fold에서만 나왔다.
미열람 9지역·공식 P2/P3·timestamp parity를 갖춘 full G-P는 0이다. 네팔 BIPAD/ICIMOD와
스위스 event join도 0이다.

---

## 다음 측정 후보 (우선순위는 `K_ALIGN_WIDE_ANGLE.md`)

1. **downstream task** — M3/M5의 R@1 붕괴가 실제 태스크를 망가뜨리는지. 남은 최대 위협.
2. **ADC baseline** — 새 query → 선형 map → old float 공간 → old PQ codebook.
   통과하면 quantizer-aware 방법 논문이 없어진다.
3. **두 번째 계약 축** — 정규화 scaling. 밴드 순서 하나로는 일반화 못 한다.
4. **세 번째 릴리스** — Clay v1.0/v1.5는 둘 다 공개돼 있고 Major TOM에 v1.5 임베딩도 있다.
5. **embeddings-stac gap 이슈/PR** — M2가 이미 1차 증거다.
