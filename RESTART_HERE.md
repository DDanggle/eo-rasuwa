# Nepal AI Twin — 새 세션 인수인계

갱신: 2026-08-31

이 저장소는 Nepal 대응 앱과 그 근거 실험의 단일 소유자다. 이전 위치
`olmoearth_projects/_work`의 Nepal 전용 앱·코드·문서·원본·중간 산출물은 여기로 이관됐다.

## 저장소 경계

- `web/`: 공개 사이트. 배포에 필요한 파생 자산만 포함한다.
- `code/`, `config/`, `tests/`, `docs/`: 재현 가능한 분석 계약과 감사 코드.
- `artifacts/`: Git에 포함할 수 있는 작은 결과 보고서만 둔다.
- `research-private/`: 약 5.9 GB의 raw Sentinel cube, embedding, delta array, legacy app snapshot.
  `.gitignore` 대상이며 공개 배포·Git commit 대상이 아니다.

기본 로컬 분석 경로는 `research-private/artifacts`다. 서버의 기존 레이아웃을 쓸 때는:

```bash
export NEPAL_ARTIFACT_ROOT=/home/work/data/olmoearth/artifacts
export SEN12_DATA_ROOT=/home/work/data/sen12landslides/extracted
```

`code/nepal_paths.py`가 이 계약을 중앙에서 관리한다.

## 현재 공개 메시지

100개 Sentinel-2 관측창 가운데 47개가 판독 가능했고, 사전 정의한 세 평시 전이의 pooled p99를
넘은 6개를 **우선 검토 리드**로 남겼다. 이 리드는 피해 확정, 피해 면적, 원인, 확률이 아니다.

OLMoEarth는 새 재난 탐지기로 재학습된 것이 아니다. frozen embedding의 같은 위치 전후 거리
`Δz`를 평시 변화와 비교해 사람이 먼저 볼 창의 순서를 만든다. 물리/WASM 흐름은 설명용
운동학이며 수심·유속·도달시간 예측이 아니다.

## 재시작 순서

1. `README.md`의 허용/금지 주장을 읽는다.
2. `docs/MEASURED_FINDINGS_full.md`에서 M66–M85의 반증·정정 계보를 확인한다.
3. `python -m pytest tests/test_nepal_embedding_seal.py`로 봉인 계약을 확인한다.
4. `cd web && pnpm check`로 공개 자산·TypeScript·production build를 확인한다.
5. 새 데이터 재계산은 `NEPAL_ARTIFACT_ROOT`를 확인한 뒤에만 수행한다.

## 남아 있는 과학적 한계

- Nepal 현장 정답 라벨 0개: 6개 리드의 precision@k는 외부 범위가 독립 동결된 뒤에만 계산한다.
- OLMoEarth의 일반 우월성은 주장하지 않는다. M73/M79는 제한된 비교 계약이다.
- prospective detection, calibrated anomaly, damage map, causal attribution은 현재 범위 밖이다.
- 서버 경로와 대용량 자산은 Git만 clone해서는 복원되지 않는다. `research-private` 보관본 또는
  별도 데이터 manifest가 필요하다.

CVPR/transfer 본선은 이 저장소가 아니라
`/Users/dgyi/dong/ai_projects/olmoearth_projects/_work/RESTART_HERE.md`에서 M65부터 재개한다.
