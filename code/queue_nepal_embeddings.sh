#!/usr/bin/env bash
# GPU1이 비고 SEN12 확증 실행이 끝난 뒤에만 nepal 임베딩을 순차 실행함.
#
# 규약 4b: GPU1에 다른 프로세스가 있으면 시작하지 않음 (2026-08-28 실측: SEN12 확증
# 실행이 GPU1 34.8GB 점유 중이었음). 이 러너는 그 조건이 풀릴 때까지 5분 간격 폴링함.
# 유휴 판정: GPU1 memory.used < 1024 MiB AND 확증 프로세스 패턴 0개.
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
cd "$REPO_DIR"
MODES=("$@")
[ ${#MODES[@]} -eq 0 ] && MODES=(baseline)
LOG="${NEPAL_EMBED_LOG:-$REPO_DIR/logs/nepal_embed_queue.log}"
mkdir -p "$(dirname "$LOG")"

idle() {
  local used
  used=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits -i 1)
  [ "$used" -lt 1024 ] || return 1
  ! pgrep -f "pilot_sen12_gp_heads|sen12_official_baselines|extract_sen12" >/dev/null
}

echo "[$(date -u +%FT%TZ)] queue start, modes=${MODES[*]}" >> "$LOG"
until idle; do
  echo "[$(date -u +%FT%TZ)] GPU1 busy — wait 300s" >> "$LOG"
  sleep 300
done
echo "[$(date -u +%FT%TZ)] GPU1 idle — begin" >> "$LOG"

for MODE in "${MODES[@]}"; do
  M="$ARTIFACT_ROOT/external_data/nepal_olmo_live_v1/materialized/$MODE/materialization_manifest.json"
  if [ ! -f "$M" ]; then
    echo "[$(date -u +%FT%TZ)] $MODE: manifest 없음 — skip" >> "$LOG"
    continue
  fi
  echo "[$(date -u +%FT%TZ)] $MODE: embedding 시작" >> "$LOG"
  if RSLEARN_BIN="${RSLEARN_BIN:-$REPO_DIR/.venv-master/bin/rslearn}" \
     PYTHON_BIN="${PYTHON_BIN:-$REPO_DIR/.venv-master/bin/python}" \
     HF_HOME="${HF_HOME:-/home/work/data/.cache/huggingface}" \
     OLMO_GPU=1 OLMO_WORKERS=2 OLMO_BATCH_SIZE=4 \
     bash "$SCRIPT_DIR/run_nepal_olmo_embeddings.sh" "$MODE" \
       >> "$LOG" 2>&1; then
    echo "[$(date -u +%FT%TZ)] $MODE: 완료" >> "$LOG"
  else
    echo "[$(date -u +%FT%TZ)] $MODE: 실패 (exit $?)" >> "$LOG"
  fi
done
echo "[$(date -u +%FT%TZ)] queue end" >> "$LOG"
