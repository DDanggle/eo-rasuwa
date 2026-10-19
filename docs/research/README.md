# Research notes — Nepal river corridors with a frozen Earth embedding (study branch)

For researchers. The public map is https://eo-rasuwa.dev; the numbers below are copied from the measurement ledger `docs/MEASURED_FINDINGS_full.md` (sections M103–M111). Everything uses **OlmoEarth v1 Base, frozen, no fine-tuning**, on Copernicus Sentinel-1 RTC (and Sentinel-2 for pictures only). There are zero field labels; the external yardstick is the Copernicus Global Flood Monitoring product.

## One method, three events
| | event | pass used | windows | result |
|---|---|---|---|---|
| Ch.1 | 26 Aug 2026 Rasuwa / Bhote Koshi flash flood | Sentinel-2, 3 ordinary transitions → 1 | 100 → 47 readable → 6 leads | pooled p99 contract; leads are places to look first |
| Ch.2 | 24–29 Sep 2026 monsoon rain, five Terai rivers | Sentinel-1 orbit 19, 3 pre → 1 post, placebo in Jul–Aug | 268 | 55 "changed a lot", all Narayani/Gandak; CSI vs GFM 0.60 (precision 0.93); 2024 rerun on the same windows |
| Ch.3 | 11 Oct 2026 Budhi Gandaki landslide-dam flood | Sentinel-1 orbit 19 at 06:03, dam burst ~06:00 | 37 | only the Chumchet window changed; the satellite crossed before the flood wave (M110) |

Contract in one sentence: per 40 m token, cosine distance between the mean of three pre-event embeddings and the post-event embedding; a window is flagged when more than 5% of its tokens exceed the pooled p99 of the same distance measured on flood-free dates with the same gaps.

## Notes
- `M111_mind_prior_note_en.md` — **Can a coordinate prior (MIND, Corley·Rao·Rolf·Klemmer et al. 2026) replace the pooled threshold with a per-window baseline?** Random folds R² 0.61; river-group hold-out median −1.36, best 0.25 ≈ lat/lon quadratic 0.23; per-window thresholds lower GFM CSI 0.60 → 0.51. Pooled threshold kept. Figure `M111_mind_prior_figure.svg`. Code `code/mind_prior_m111.py`.
- `2026-10-11_budhi_gandaki_flood.md` — event facts, same-day coverage, chapter-3 plan (Korean).
- `2026-10-19_planet_agentic_ai_vs_nepal_twin.md` — positioning against commercial embedding-search assistants (Korean, internal; not on the public page).

## Reproduction
- Windows: `code/terai_flood_windows.json` (2.56 km, EPSG 32645), generator `web/python/make_budhi_gandaki_windows.py`.
- Scan: `code/terai_radar_scan.py` with contract names `r19` (Sep 2026), `y19` (Sep 2024), `b19` (11 Oct 2026); outputs `research-private/artifacts/terai_radar_scan_*/report.json`.
- Site data: `web/python/build_simple_view.py` writes `web/public/data/september/*`.

## Honest caveats that travel with every number
Values are 2.56 km window means, not channel widths. Shallow sheet flooding is under-detected (2024 Bagmati). Passes from other orbits are compared by class only. A flag is not confirmed damage.
