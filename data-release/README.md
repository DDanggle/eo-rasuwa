# Rasuwa 2026 flash flood — satellite change-review priorities (UNVALIDATED)

Derived data from the public experiment at https://eo-rasuwa.dev
(code: https://github.com/DDanggle/eo-rasuwa, Apache-2.0).

## What this is — and is not

Review priorities for human analysts, computed by comparing before/after
Sentinel-2 observations with a frozen general Earth-embedding model
(Ai2 OlmoEarth v1 Base, no disaster-specific training).

**This is NOT a damage map.** Zero candidates have been field-verified.
Numbers are the share of cloud-free 40 m cells whose embedding change exceeds
the p99 of three pre-event ordinary fortnight transitions — a reason to look
first, not a finding. External flood proxies (IWM/TASA/JAXA, frozen 2026-08-31)
neither validate nor refute the ranking at window scale (NP-86), and at 40 m
scale the method does not outperform a post-event NDWI baseline (NP-88).

## Files

| file | contents |
|---|---|
| `review-leads.geojson` | the 6 public review leads (2.56 km windows, ranked) |
| `candidates.geojson` | all 47 observable windows of the 100-window scan |
| `change-ribbon.geojson` | river centrelines coloured by per-window change share |
| `methodology.md` | contract, dates, thresholds, corrections ledger pointers |

CRS: WGS84 (EPSG:4326). Event: 26 Aug 2026 Rasuwa–Bhote Koshi flash flood.
Observations: Sentinel-2 L2A 12 Aug (pre) / 27 Aug 2026 (post), R119.

## Caveats (read before use)

- Unvalidated: no ground-truth labels; ranking only.
- 53 of 100 windows were unreadable under monsoon cloud on 27 Aug.
- One event, one region: no generalisation is claimed.
- A radar unit error invalidated early results; only corrected artifacts are
  published (see the correction ledger in the repository).

## License & contact

Data: CC-BY 4.0 (derived from ESA Copernicus Sentinel-2; model © Ai2, Apache-2.0).
Contact: iameastroot@gmail.com
