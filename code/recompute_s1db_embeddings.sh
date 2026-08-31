#!/usr/bin/env bash
# M75 recovery: recompute every S1-containing Nepal embedding with the dB contract.
# Existing embeddings are moved to a timestamped archive; this script never deletes them.
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
RSLEARN_BIN="${RSLEARN_BIN:-$REPO_DIR/.venv-master/bin/rslearn}"
PYTHON_BIN="${PYTHON_BIN:-$REPO_DIR/.venv-master/bin/python}"
HF_HOME="${HF_HOME:-/home/work/data/.cache/huggingface}"
MODEL_CONFIG="${MODEL_CONFIG:-$SCRIPT_DIR/model_s1db.yaml}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${NEPAL_EMBED_LOG_ROOT:-$REPO_DIR/logs}"
mkdir -p "$LOG_ROOT"

run_mode() {
  local materialized_dir="$1"
  local mode="$2"
  local root="$ARTIFACT_ROOT/external_data/nepal_olmo_live_v1/$materialized_dir/$mode"
  [[ -f "$root/materialization_manifest.json" ]] || {
    echo "SKIP $materialized_dir/$mode (no manifest)"
    return
  }
  while IFS= read -r layer; do
    local archive="$(dirname "$layer")/embeddings_superseded_s1db_$STAMP"
    [[ ! -e "$archive" ]] || { echo "refusing overwrite: $archive" >&2; return 3; }
    mv "$layer" "$archive"
  done < <(find "$root/dataset/windows/nepal" -mindepth 3 -maxdepth 3 -type d -name embeddings | sort)
  if [[ -f "$root/embedding_manifest.json" ]]; then
    local manifest_archive="$root/embedding_manifest.superseded_s1db_$STAMP.json"
    [[ ! -e "$manifest_archive" ]] || { echo "refusing overwrite: $manifest_archive" >&2; return 4; }
    mv "$root/embedding_manifest.json" "$manifest_archive"
  fi
  local log="$LOG_ROOT/s1db_${materialized_dir}_${mode}_$STAMP.log"
  if MATERIALIZED_DIR="$materialized_dir" RSLEARN_BIN="$RSLEARN_BIN" PYTHON_BIN="$PYTHON_BIN" \
      HF_HOME="$HF_HOME" MODEL_CONFIG="$MODEL_CONFIG" \
      bash "$SCRIPT_DIR/run_nepal_olmo_embeddings.sh" "$mode" >"$log" 2>&1; then
    echo "OK $materialized_dir/$mode"
  else
    echo "FAIL $materialized_dir/$mode; see $log" >&2
    return 5
  fi
}

for mode in baseline placebo_a placebo_b placebo_20260617 placebo_20260624 \
  placebo_20260701 placebo_20260708 placebo_20260715 placebo_20260722 \
  placebo_20260729 placebo_20260805 s1_live; do
  run_mode materialized "$mode"
done
for mode in baseline placebo_a s1_live; do
  run_mode materialized_corridor "$mode"
done
echo S1DB_RECOMPUTE_DONE
