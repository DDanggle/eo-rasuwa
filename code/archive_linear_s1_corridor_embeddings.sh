#!/usr/bin/env bash
# Preserve the superseded linear-S1 OLMo outputs before the contract-correct dB rerun.
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
ROOT="$ARTIFACT_ROOT/external_data/nepal_olmo_live_v1/materialized_corridor"

if [[ "$#" -gt 0 ]]; then
  modes=("$@")
else
  modes=(baseline s1_live)
fi

for mode in "${modes[@]}"; do
  run_root="$ROOT/$mode"
  archive="$run_root/superseded_linear_s1"
  mkdir -p "$archive"
  for name in embedding_manifest.json EMBEDDING_SHA256SUMS; do
    if [[ -f "$run_root/$name" && ! -f "$archive/$name" ]]; then
      mv "$run_root/$name" "$archive/$name"
    fi
  done
  while IFS= read -r layer; do
    target="$(dirname "$layer")/embeddings_linear_s1"
    if [[ -e "$target" ]]; then
      echo "refusing overwrite: $target" >&2
      exit 3
    fi
    mv "$layer" "$target"
  done < <(find "$run_root/dataset/windows/nepal" -mindepth 3 -maxdepth 3 -type d -name embeddings | sort)
  count="$(find "$run_root/dataset/windows/nepal" -mindepth 3 -maxdepth 3 -type d -name embeddings_linear_s1 | wc -l)"
  [[ "$count" -eq 27 ]] || { echo "$mode archived layer count $count != 27" >&2; exit 4; }
  shasum -a 256 "$archive"/* > "$archive/SHA256SUMS"
done
