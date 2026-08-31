# Research storage contract

## 왜 분리했는가

앱 배포 자산과 원격탐사 원본/임베딩을 같은 Git 저장소 대상으로 취급하면 clone·build·배포가
수 GB로 커지고, 원본 데이터의 재배포 조건과 실험 계보가 뒤섞인다. 따라서 파일의 공개 가능성이
아니라 **재현 역할**로 나눈다.

| 위치 | Git | 역할 |
|---|---|---|
| `web/public/data/` | tracked | 공개 화면이 직접 읽는 파생 PNG/GeoJSON/JSON/WASM |
| `artifacts/` | tracked | 작고 검토 가능한 최종 report JSON |
| `code/`, `config/`, `tests/`, `docs/` | tracked | 생성·감사 계약 |
| `research-private/artifacts/` | ignored | raw cube, embedding, delta arrays, download/catalog snapshots |
| `research-private/legacy-app/` | ignored | 이전 앱의 byte-preserved snapshot |
| `research-private/source-original/` | ignored | 이전 작업공간에서 옮긴 원본 source snapshot |

## 경로 선택

Python 분석기는 `code/nepal_paths.py`를 사용한다.

1. `NEPAL_ARTIFACT_ROOT`가 있으면 그 값을 사용한다.
2. 기존 서버형 `artifacts/external_data/nepal_olmo_live_v1`가 있으면 `artifacts/`를 사용한다.
3. 그 외에는 `research-private/artifacts/`를 사용한다.

Sen12Landslides 원본은 이 저장소에 복제하지 않는다. CLI `--data-root` 또는
`SEN12_DATA_ROOT`로 지정한다. 대용량 자산은 Git에 강제로 추가하지 않는다.

## 배포 경계

배포는 `web/`만 필요하다. `research-private/`, `.env*`, cache, log, Python venv는 배포 입력이
아니다. 공개 파생물의 라이선스·출처 경계는 `THIRD_PARTY_NOTICES.md`를 따른다.
