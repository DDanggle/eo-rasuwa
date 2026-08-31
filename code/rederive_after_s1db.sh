#!/usr/bin/env bash
# M75 recovery stage 2: rederive five-anchor and corridor reports from dB embeddings.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${OLMOEARTH_SERVER_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
if [[ -n "${NEPAL_ARTIFACT_ROOT:-}" ]]; then
  ARTIFACT_ROOT="$NEPAL_ARTIFACT_ROOT"
elif [[ -d "$REPO_DIR/artifacts/external_data/nepal_olmo_live_v1" ]]; then
  ARTIFACT_ROOT="$REPO_DIR/artifacts"
else
  ARTIFACT_ROOT="$REPO_DIR/research-private/artifacts"
fi
PYTHON_BIN="${PYTHON_BIN:-$REPO_DIR/.venv-master/bin/python}"
RSLEARN_BIN="${RSLEARN_BIN:-$REPO_DIR/.venv-master/bin/rslearn}"
HF_HOME="${HF_HOME:-/home/work/data/.cache/huggingface}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${NEPAL_EMBED_LOG_ROOT:-$REPO_DIR/logs}"
mkdir -p "$LOG_ROOT"

env -u PYTHONPATH "$PYTHON_BIN" "$SCRIPT_DIR/analyze_nepal_delta.py" --live-mode s1_live
env -u PYTHONPATH "$PYTHON_BIN" "$SCRIPT_DIR/analyze_nepal_delta_matched.py"
env -u PYTHONPATH "$PYTHON_BIN" "$SCRIPT_DIR/analyze_corridor_sealed.py"
env -u PYTHONPATH "$PYTHON_BIN" "$SCRIPT_DIR/analyze_corridor_matched.py"

for mode in baseline s1_live placebo_a; do
  dataset="$ARTIFACT_ROOT/external_data/nepal_olmo_live_v1/materialized_corridor/$mode/dataset"
  while IFS= read -r layer; do
    archive="$(dirname "$layer")/embeddings_s1_superseded_$STAMP"
    [[ ! -e "$archive" ]] || { echo "refusing overwrite: $archive" >&2; exit 3; }
    mv "$layer" "$archive"
  done < <(find "$dataset/windows/nepal" -mindepth 3 -maxdepth 3 -type d -name embeddings_s1 | sort)
  DATASET_PATH="$dataset" CUDA_VISIBLE_DEVICES=1 HF_HOME="$HF_HOME" \
    env -u PYTHONPATH "$RSLEARN_BIN" model predict \
    --config "$SCRIPT_DIR/model_s1db_only.yaml" \
    --data.init_args.num_workers=2 --data.init_args.batch_size=4 \
    >"$LOG_ROOT/s1db_only_corridor_${mode}_$STAMP.log" 2>&1
done
EMB_LAYER=embeddings_s1 OUT_NAME=corridor_sealed_s1only \
  env -u PYTHONPATH "$PYTHON_BIN" "$SCRIPT_DIR/analyze_corridor_sealed.py"
echo REDERIVE_DONE
