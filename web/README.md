# OLMoEarth Nepal Live Twin

A deployable GIS interface for the 26 August 2026 Rasuwa–Bhote Koshi event. It joins real
pre-event Sentinel-1/2 windows, the OLMoEarth input contract, an acquisition timeline, and a
browser-native Rust/WASM flow preview.

## What is real vs pending

- **Real:** eight locally materialized Sentinel scenes at the Rasuwagadhi anchor, five 2.56 km
  OLMoEarth input windows, and the OSM Bhote Koshi→Trishuli river centerline.
- **Pending:** the first usable post-event open scene and its OLMoEarth embedding delta.
- **Illustrative:** the Rust/WASM particles. They follow the verified river centerline but do not
  estimate water depth, velocity, arrival time, or hazard.
- **Separated:** the user-supplied Rishing point is 113.79 km from Rasuwagadhi and is not treated
  as the same event-flow endpoint.

## Architecture

```text
research GeoTIFF + items.json
           │
           ▼
Python compiler ──► RGBA overlays + GeoJSON + provenance manifest
                                              │
OSM river ways ───────────────────────────────┤
                                              ▼
                               MapLibre / React GIS
                                              ▲
                                    Rust → raw WASM
                                    particle preview
```

Python is an offline build/data plane so the hosted Cloudflare application remains self-contained.
The raw WASM ABI has no JavaScript glue dependency.

## Rebuild

```bash
/Users/dgyi/dong/ai_projects/olmoearth_projects/.venv/bin/python python/build_live_twin_data.py
bash scripts/build-wasm.sh
/Users/dgyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/verify-assets.mjs
/Users/dgyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vinext/dist/cli.js build
```

Use `--refresh-osm` on the Python compiler only when intentionally refreshing OSM ways
`201928141`, `809865767`, and `24624604`.
