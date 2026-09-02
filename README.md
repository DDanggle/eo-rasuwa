# Nepal AI Twin — Rasuwa 2026 × OlmoEarth

> 한국어판: [README.ko.md](./README.ko.md) · Live site: https://eo-rasuwa.dev
> Large research inputs and intermediates live in `research-private/` (git-excluded); the path
> contract is documented in [`docs/RESEARCH_STORAGE.md`](./docs/RESEARCH_STORAGE.md).

A public analysis of the 26 August 2026 Rasuwa–Bhote Koshi flash flood in Nepal, built on a
**general-purpose Earth embedding model reused frozen — no disaster-specific detector was trained**.

The single headline result:

> We compared 100 Sentinel-2 windows under one pre-registered contract, could read 47 of them, and
> kept the 6 that exceeded the pooled p99 of three ordinary fortnight transitions as places for
> people to review first. A lead is not confirmed damage, not an area, not a cause, and not a
> probability.

## Public pages and artifacts

| path | contents |
|---|---|
| `web/app/page.tsx` | landing page carrying the 100 → 47 → 6 message |
| `web/app/map/page.tsx` | MapLibre evidence map, before/after scenes, 100 scan centres, 6 leads, re-observation list, methods story |
| `web/public/data/review-leads.geojson` | the six public review leads |
| `web/public/data/candidates.geojson` | all 47 observable windows (kept separate from leads) |
| `web/public/data/scenario.json` | the single contract the app reads: results, provenance, corrections ledger |
| `artifacts/` | primary `report.json` per experiment |
| `docs/MEASURED_FINDINGS_full.md` | the M66–M89 measurement, refutation and correction ledger |
| `code/` | candidate scan, controls, Sen12 validation, radar, terrain, external-label scoring |

`web/public/data/` is ~130 MB of derived PNG/GeoJSON/JSON/WASM needed by the public UI — no raw
research data. Raw cubes, embeddings and deltas (~5.9 GB) are excluded; point `NEPAL_ARTIFACT_ROOT`
at a copy to recompute.

## The AI pipeline, by file

The model is a single frozen encoder — [OlmoEarth v1 Base](https://huggingface.co/allenai/OlmoEarth-v1-Base)
by Ai2 — with no fine-tuning for this event.

```text
Copernicus catalog seal → scene-selection preflight → pixel materialization (rslearn)
      → frozen OlmoEarth embeddings (768ch × 64×64 tokens, 40 m/token)
      → Δz = 1 − cos(z_before, z_after)
      → pooled p99 threshold from three ordinary transitions → review ranking (not detection)
      → derived public assets in web/public/data
```

| step | code | output |
|---|---|---|
| seal the observation catalog (metadata only) | `code/build_nepal_live_catalog.py` | `catalog/<snapshot>/` + SHA-256 seal |
| required-scene preflight (blocks bad downloads) | `code/check_nepal_live_selection.py` | `selection_preflight.json` |
| materialize 4×14-day S1+S2 cubes | `code/prepare_nepal_olmo_live.sh` | `materialized/<mode>/dataset` |
| extract frozen embeddings | `code/run_nepal_olmo_embeddings.sh` + `code/model.yaml` | embedding GeoTIFFs + sealed manifest |
| corridor Δz, ordinary threshold, ranking | `code/analyze_corridor_sealed.py`, `code/corridor_change_retrieval.py` | `report.json` (100→47→6) |
| past-label validation (M73/M78/M79) | `code/sen12_*.py` | `artifacts/sen12_*/report.json` |
| external-label scoring (NP-86/NP-88) | `code/score_external_extents.py` | `artifacts/external_label_score/report.json` |
| build public assets | `web/python/build_live_twin_data.py` | `web/public/data/*` |

The contract is short: for the same location, `score = 1 − cosine(z_before, z_after)`, and a window
is ranked by the share of tokens above the pooled p99 of three pre-registered ordinary fortnight
transitions. The ranking is an order for human review, not a damage verdict.

## What we can say

- **A review queue for Nepal:** 47 of 100 windows observable, 6 leads. Dalphedi ranks #1 at 13.3%
  under the pooled three-pair threshold; the Tadi Khola control window sits at 2.3% (corrected 2026-09-02: 35% of that window is off-scene zero-fill; the earlier 1.3% was diluted).
- **Past-label validation (M73):** on the same patches, dates and labels across 9 Sen12-Landslides
  regions, OlmoEarth Δz beat classical band/index change 9/9, with 8/9 above the pre-set +0.05.
- **Second-representation control (M79):** OlmoEarth ahead of Presto by ≥ +0.03 in 6/7 regions under
  the same four-date contract (a lower-bound comparison unfavourable to the 12-month Presto).
- **Radar limits (M78·M80):** S1-only signal was strong only in Hokkaido and Hiroshima; under real
  10%-clear scenes, Hokkaido 0.770 vs Alaska 0.497 — no universal "sees through cloud" claim.
- **NP-86 (2026-08-31):** external flood extents (IWM, TASA, JAXA) frozen as published cannot
  confirm or refute the ranking at the 2.56 km window scale — precision@6 is 6/6 but the non-lead
  base rate is 87.8%, and in-window overlap is 6.0% vs 6.3%.
- **NP-88 (2026-09-01):** at the 40 m token scale, OlmoEarth change distance agrees with the frozen
  proxies (pooled AUROC 0.846) but does not beat a strong post-event NDWI baseline; see
  `docs/NP88_ROBUSTNESS_AUDIT_2026_09_01.md`.
- **NP-89B route-buffer sensitivity (legacy M89):** the agreement remains outside 300/600 m buffers
  around the single OSM `simulation_route` (AUROC 0.846/0.873). This weakens a one-centreline
  explanation, but it is not a complete river-network control and does not establish superiority
  over the stronger post-event NDWI baseline.
- **Corrections (M75·M76):** an early 9.8% result and related candidates were retracted after a
  linear-vs-dB radar unit error was found and fixed. Public results use corrected artifacts only.

## What we cannot say

- That the 6 leads are confirmed damage — the field-verified label count is zero.
- That 13.3% is a damage area or a probability.
- That the Rust/WASM particles predict depth, velocity or arrival time — they are an
  **illustrative kinematic view** along the OSM centreline.
- That OlmoEarth beats all GeoFMs — Prithvi, Clay and TerraMind were not run under this contract.
- That one event's terrain correlation generalizes into a hazard model.

## Verify locally

Requires Node.js 22.13+ and pnpm 11.19.0.

```bash
cd web
pnpm install --frozen-lockfile
pnpm check
pnpm start
```

`pnpm check` runs the public-asset invariants, ESLint, TypeScript and a production build. The data
generator needs the original research workspace; the public repo treats the committed
`scenario.json` as canonical. After changing any result, run `node scripts/sync-review-contract.mjs`
then `pnpm verify`.

Deployment and rollback: [DEPLOYMENT.md](./DEPLOYMENT.md). Attribution and redistribution
boundaries: [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## External sources

- [USGS preliminary extent map](https://www.usgs.gov/media/images/2026-nepal-debris-avalanche-and-flash-flood-map)
- [Sentinel Asia activation and products](https://sentinel-asia.org/EO/2026/article20260826NP.html)
- [WHO Nepal health response](https://www.who.int/nepal/emergencies/2026-rasuwa-flash-floods)
- [Ai2 OlmoEarth embeddings](https://allenai.org/blog/olmoearth-embeddings)

## License

Code and documentation are under the [Apache License 2.0](./LICENSE) — the same terms Ai2 uses for
OlmoEarth. Third-party derived assets under `web/public/data/` keep their original licenses:
Planet crops CC-BY-NC-4.0, Sentinel derivatives CC-BY-4.0 (ESA Copernicus), map geometry ODbL
(OpenStreetMap). See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
