#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cargo build --manifest-path "$APP_ROOT/rust-flow/Cargo.toml" --target wasm32-unknown-unknown --release
mkdir -p "$APP_ROOT/public/wasm"
cp "$APP_ROOT/rust-flow/target/wasm32-unknown-unknown/release/nepal_flow_wasm.wasm" "$APP_ROOT/public/wasm/nepal_flow.wasm"
cp "$APP_ROOT/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs" "$APP_ROOT/public/maplibre-gl-worker.mjs"
cp "$APP_ROOT/node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs" "$APP_ROOT/public/maplibre-gl-shared.mjs"
shasum -a 256 "$APP_ROOT/public/wasm/nepal_flow.wasm"
