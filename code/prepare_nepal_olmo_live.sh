#!/usr/bin/env bash
# Materialize five 2.56 km OLMoEarth anchors as four 14-day S1+S2 periods.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ -n "${NEPAL_ARTIFACT_ROOT:-}" ]]; then
  ARTIFACT_ROOT="$NEPAL_ARTIFACT_ROOT"
elif [[ -d "$REPO_DIR/artifacts/external_data/nepal_olmo_live_v1" ]]; then
  ARTIFACT_ROOT="$REPO_DIR/artifacts"
else
  ARTIFACT_ROOT="$REPO_DIR/research-private/artifacts"
fi
WORKSPACE_DIR="$(cd "$REPO_DIR/.." && pwd)"
MODE="${1:-baseline}"
# ANCHOR_SET=five(기본, 사용자 앵커 5개) | corridor(M69의 27 자동 창, 봉인 계약 재실행용)
ANCHOR_SET="${ANCHOR_SET:-five}"
if [[ "$ANCHOR_SET" == "corridor" ]]; then
  DATASET_ROOT="${2:-$ARTIFACT_ROOT/external_data/nepal_olmo_live_v1/materialized_corridor/$MODE/dataset}"
  export EXPECTED_ANCHORS=27
else
  DATASET_ROOT="${2:-$ARTIFACT_ROOT/external_data/nepal_olmo_live_v1/materialized/$MODE/dataset}"
fi
RSLEARN_BIN="${RSLEARN_BIN:-$WORKSPACE_DIR/.venv/bin/rslearn}"

case "$MODE" in
  baseline)
    START="2026-07-01T00:00:00+00:00"
    END="2026-08-26T00:00:00+00:00"
    PREPARE_FORCE_ARGS=()
    ;;
  s2_live)
    # 기간 경계 정렬 (2026-08-28 수정). PER_PERIOD_MOSAIC은 기간을 END 기준으로 자르고
    # 기간 안에서는 MOSAIC max_matches=1 — S2는 sort_by cloud_cover라 같은 기간에
    # 8/24(구름 51%)가 있으면 8/27(78%)이 영원히 선택되지 않음 (실측: PC STAC에 8/27이
    # 이미 인덱스됐는데도 preflight 5/5 실패). 마지막 기간이 사건(8/26) 직후에 시작하도록
    # END를 옮겨 post-event 관측만 담기게 함. 4x14d 계약은 유지됨.
    #   periods: 7/15~7/29, 7/29~8/12, 8/12~8/26(8/24 포함), 8/26~9/9(8/27+)
    START="2026-07-15T00:00:00+00:00"
    END="2026-09-09T00:00:00+00:00"
    PREPARE_FORCE_ARGS=(--force)
    ;;
  s1_live)
    # 같은 정렬 수정. S1은 정렬 미지정이라 8/24 vs 8/28 선택이 비결정적이었음.
    #   periods: 7/14~7/28, 7/28~8/11, 8/11~8/25(8/24 포함), 8/25~9/8(8/28 S1D만)
    START="2026-07-14T00:00:00+00:00"
    END="2026-09-08T00:00:00+00:00"
    PREPARE_FORCE_ARGS=(--force)
    ;;
  placebo_a)
    # 사건 전 구간만 담는 shifted window — RQ-N1의 "일상 rolling delta" 표본.
    # baseline과 같은 계약(4x14d), END만 2026-08-12로 이동. START=END-56d.
    START="2026-06-17T00:00:00+00:00"
    END="2026-08-12T00:00:00+00:00"
    PREPARE_FORCE_ARGS=()
    ;;
  placebo_b)
    START="2026-06-24T00:00:00+00:00"
    END="2026-08-19T00:00:00+00:00"
    ;;
  # 2026-08-29 placebo 확장: 사건 전 END를 주 단위로 되돌린 rolling 창 8개 (같은 4x14d 계약, START=END-56d)
  placebo_20260805) START="2026-06-10T00:00:00+00:00"; END="2026-08-05T00:00:00+00:00"
    ;;
  placebo_20260729) START="2026-06-03T00:00:00+00:00"; END="2026-07-29T00:00:00+00:00"
    ;;
  placebo_20260722) START="2026-05-27T00:00:00+00:00"; END="2026-07-22T00:00:00+00:00"
    ;;
  placebo_20260715) START="2026-05-20T00:00:00+00:00"; END="2026-07-15T00:00:00+00:00"
    ;;
  placebo_20260708) START="2026-05-13T00:00:00+00:00"; END="2026-07-08T00:00:00+00:00"
    ;;
  placebo_20260701) START="2026-05-06T00:00:00+00:00"; END="2026-07-01T00:00:00+00:00"
    ;;
  placebo_20260624) START="2026-04-29T00:00:00+00:00"; END="2026-06-24T00:00:00+00:00"
    ;;
  placebo_20260617) START="2026-04-22T00:00:00+00:00"; END="2026-06-17T00:00:00+00:00"
    PREPARE_FORCE_ARGS=()
    ;;
  *)
    echo "mode must be baseline, s2_live, s1_live, placebo_a, placebo_b, or placebo_YYYYMMDD (2026-06-17..08-05 weekly)" >&2
    exit 2
    ;;
esac

if [[ ! -x "$RSLEARN_BIN" ]]; then
  echo "rslearn not found: $RSLEARN_BIN" >&2
  exit 2
fi

mkdir -p "$DATASET_ROOT"
if [[ ! -e "$DATASET_ROOT/config.json" ]]; then
  cp "$REPO_DIR/config/nepal_olmo_dataset.json" "$DATASET_ROOT/config.json"
elif ! cmp -s "$REPO_DIR/config/nepal_olmo_dataset.json" "$DATASET_ROOT/config.json"; then
  if [[ -d "$DATASET_ROOT/windows" ]]; then
    echo "dataset config differs after windows were created; refusing mixed contract" >&2
    exit 3
  fi
  cp "$REPO_DIR/config/nepal_olmo_dataset.json" "$DATASET_ROOT/config.json"
fi

add_anchor() {
  local name="$1"
  local lon="$2"
  local lat="$3"
  if [[ -d "$DATASET_ROOT/windows/nepal/$name" ]]; then
    return
  fi
  "$RSLEARN_BIN" dataset add_windows \
    --root "$DATASET_ROOT" --group nepal --name "$name" \
    --utm --resolution 10 --src_crs EPSG:4326 --window_size 256 \
    --box="$lon,$lat,$lon,$lat" --start "$START" --end "$END"
}

if [[ "$ANCHOR_SET" == "corridor" ]]; then
  # M69 회랑 27창 중심 (artifacts/corridor_s2_candidates/prepare/windows_manifest.json)
  while read -r wid lon lat; do add_anchor "$wid" "$lon" "$lat"; done < <(python3 - <<'PY'
import json
m = json.load(open("artifacts/corridor_s2_candidates/prepare/windows_manifest.json"))
for w in m["windows"]:
    print(w["id"], w["center_lonlat"][0], w["center_lonlat"][1])
PY
)
else
add_anchor source_provisional 85.5194 28.2765
add_anchor rasuwagadhi 85.3780 28.2760
add_anchor timure 85.3630 28.2350
add_anchor syabrubesi 85.3470 28.1640
add_anchor dhunche 85.2960 28.1020
fi

"$RSLEARN_BIN" dataset prepare \
  --root "$DATASET_ROOT" --group nepal --workers 2 \
  ${PREPARE_FORCE_ARGS[@]+"${PREPARE_FORCE_ARGS[@]}"} \
  --disabled-layers embeddings --retry-max-attempts 5 --retry-backoff-seconds 5

# Live selection is cheap to inspect and expensive to materialize.  A provider
# catalogue can lag the official Copernicus catalogue, so stop before any pixel
# download unless every anchor actually selected the required post-event scene.
# preflight는 "특정 post-event 장면이 5/5 앵커에 선택됐는가" 검사이므로 live 모드 전용임.
# placebo는 사건 전 창이라 그런 장면이 없어야 정상 — 대신 seal의 cutoff 규칙이 검증함.
if [[ "$MODE" == "s1_live" || "$MODE" == "s2_live" ]]; then
  "$WORKSPACE_DIR/.venv/bin/python" "$SCRIPT_DIR/check_nepal_live_selection.py" \
    --dataset "$DATASET_ROOT" --mode "$MODE"
fi

# 공식 catalogue는 게시됐지만 rslearn provider index가 아직 따라오지 않았는지 확인할 때
# 대용량 pixel download 전에 멈출 수 있다. selection_preflight.json까지는 항상 남는다.
if [[ "${PREPARE_ONLY:-0}" == "1" ]]; then
  echo "PREPARE_ONLY=1: selection preflight complete; materialization skipped"
  exit 0
fi

"$RSLEARN_BIN" dataset materialize \
  --root "$DATASET_ROOT" --group nepal --workers 2 --no-use-initial-job \
  --disabled-layers embeddings --retry-max-attempts 5 --retry-backoff-seconds 5

"$WORKSPACE_DIR/.venv/bin/python" "$SCRIPT_DIR/seal_nepal_olmo_dataset.py" \
  --dataset "$DATASET_ROOT" --mode "$MODE" --start "$START" --end "$END"
