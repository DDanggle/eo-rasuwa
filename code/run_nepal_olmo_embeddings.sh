#!/usr/bin/env bash
# Extract primary OLMoEarth v1 Base 768-d embeddings after materialization gates pass.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="$(cd "$REPO_DIR/.." && pwd)"
MODE="${1:-baseline}"
RUN_ROOT="$REPO_DIR/artifacts/external_data/nepal_olmo_live_v1/${MATERIALIZED_DIR:-materialized}/$MODE"
DATASET_PATH="$RUN_ROOT/dataset"
MODEL_CONFIG="${MODEL_CONFIG:-$REPO_DIR/code/model.yaml}"
EMBEDDING_LAYER="${EMBEDDING_LAYER:-embeddings}"
EMBEDDING_MANIFEST="${EMBEDDING_MANIFEST:-embedding_manifest.json}"
EMBEDDING_SEAL="${EMBEDDING_SEAL:-EMBEDDING_SHA256SUMS}"
RSLEARN_BIN="${RSLEARN_BIN:-$WORKSPACE_DIR/.venv/bin/rslearn}"
PYTHON_BIN="${PYTHON_BIN:-$WORKSPACE_DIR/.venv/bin/python}"

echo "run_root=$RUN_ROOT (MATERIALIZED_DIR=${MATERIALIZED_DIR:-materialized})" >&2
# 2026-08-29 사고 재발 방지: 매니페스트의 mode·앵커 수가 이 실행과 맞지 않으면 거부함
if [[ -f "$RUN_ROOT/materialization_manifest.json" ]]; then
  "$PYTHON_BIN" - "$RUN_ROOT/materialization_manifest.json" "$MODE" <<'PY'
import json, sys
m = json.load(open(sys.argv[1]))
if m.get("mode") != sys.argv[2]:
    raise SystemExit(f"manifest mode {m.get('mode')} != requested {sys.argv[2]}")
print(f"anchors={m.get('found_anchor_count')} mode={m.get('mode')}", file=sys.stderr)
PY
fi
if [[ ! -f "$RUN_ROOT/materialization_manifest.json" ]]; then
  echo "missing materialization manifest: $RUN_ROOT/materialization_manifest.json" >&2
  exit 2
fi
"$PYTHON_BIN" - "$RUN_ROOT/materialization_manifest.json" <<'PY'
import json, sys
manifest = json.load(open(sys.argv[1], encoding="utf-8"))
if (not manifest.get("valid") or not manifest.get("exact_four_periods_per_modality")
        or not manifest.get("required_scene_present")):
    raise SystemExit("materialization gate failed")
PY

STARTED_AT="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT="$RUN_ROOT/code_snapshot/$STARTED_AT"
mkdir -p "$SNAPSHOT"
cp "$MODEL_CONFIG" "$SNAPSHOT/model.yaml"
cp "$DATASET_PATH/config.json" "$SNAPSHOT/dataset_config.json"
cp "$SCRIPT_DIR/run_nepal_olmo_embeddings.sh" "$SNAPSHOT/runner.sh"
cp "$SCRIPT_DIR/seal_nepal_olmo_embeddings.py" "$SNAPSHOT/sealer.py"
shasum -a 256 "$SNAPSHOT/model.yaml" "$SNAPSHOT/dataset_config.json" "$SNAPSHOT/runner.sh" "$SNAPSHOT/sealer.py" > "$SNAPSHOT/SHA256SUMS"

export DATASET_PATH
# 이 저장소의 confirmatory/sidecar 계약은 GPU1만 사용한다. 명시적 override는 긴급 복구용이다.
export CUDA_VISIBLE_DEVICES="${OLMO_GPU:-1}"
"$RSLEARN_BIN" model predict --config "$MODEL_CONFIG" \
  --data.init_args.num_workers="${OLMO_WORKERS:-2}" \
  --data.init_args.batch_size="${OLMO_BATCH_SIZE:-4}"

"$PYTHON_BIN" "$SCRIPT_DIR/seal_nepal_olmo_embeddings.py" \
  --dataset "$DATASET_PATH" --mode "$MODE" --code-snapshot "$SNAPSHOT" \
  --embedding-layer "$EMBEDDING_LAYER" --manifest-name "$EMBEDDING_MANIFEST" --seal-name "$EMBEDDING_SEAL"
