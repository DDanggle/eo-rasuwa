#!/usr/bin/env bash
# Re-validate already generated 27-window corridor embeddings after the legacy five-anchor sealer failed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="$(cd "$REPO_DIR/.." && pwd)"
if [[ -n "${NEPAL_ARTIFACT_ROOT:-}" ]]; then
  ARTIFACT_ROOT="$NEPAL_ARTIFACT_ROOT"
elif [[ -d "$REPO_DIR/artifacts/external_data/nepal_olmo_live_v1" ]]; then
  ARTIFACT_ROOT="$REPO_DIR/artifacts"
else
  ARTIFACT_ROOT="$REPO_DIR/research-private/artifacts"
fi
ROOT="$ARTIFACT_ROOT/external_data/nepal_olmo_live_v1/materialized_corridor"
PYTHON_BIN="${PYTHON_BIN:-$WORKSPACE_DIR/.venv/bin/python}"

for mode in baseline s1_live; do
  run_root="$ROOT/$mode"
  old_manifest="$run_root/embedding_manifest.json"
  if [[ ! -f "$old_manifest" ]]; then
    echo "missing prior embedding manifest: $old_manifest" >&2
    exit 2
  fi
  inference_snapshot="$($PYTHON_BIN -c 'import json,sys; print(json.load(open(sys.argv[1]))["code_snapshot"])' "$old_manifest")"
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  recovery="$run_root/seal_recovery/$stamp"
  mkdir -p "$recovery"
  cp "$old_manifest" "$recovery/embedding_manifest.invalid_five_anchor.json"
  [[ ! -f "$run_root/EMBEDDING_SHA256SUMS" ]] || cp "$run_root/EMBEDDING_SHA256SUMS" "$recovery/EMBEDDING_SHA256SUMS.invalid_five_anchor"
  cp "$SCRIPT_DIR/seal_nepal_olmo_embeddings.py" "$recovery/sealer.py"
  shasum -a 256 "$recovery"/* > "$recovery/SHA256SUMS"

  "$PYTHON_BIN" "$SCRIPT_DIR/seal_nepal_olmo_embeddings.py" \
    --dataset "$run_root/dataset" --mode "$mode" \
    --code-snapshot "$inference_snapshot" --seal-code-snapshot "$recovery"
done
