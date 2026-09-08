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
Observations: Sentinel-2 L2A, before = mean of 3/23 Jul + 7 Aug 2026, after = 27 Aug 2026, R119 (the 12 Aug frame appears in the swipe views only, as a single illustrative before image).

## Caveats (read before use)

- Unvalidated: no ground-truth labels; ranking only.
- 53 of 100 windows were unreadable under monsoon cloud on 27 Aug.
- One event, one region: no generalisation is claimed.
- A radar unit error invalidated early results; only corrected artifacts are
  published (see the correction ledger in the repository).

## Credits

Built by [Donggeun Yi](https://careerly.co.kr/profile/719170).
Special thanks to [Jong Gil Park](https://profiles.rice.edu/student/jong-gil-park) for his advice.

## License & contact

Data: CC-BY 4.0 (derived from ESA Copernicus Sentinel-2; model © Ai2, Apache-2.0).
Contact: iameastroot@gmail.com

## External layers used for validation (not redistributed here)

The map overlays and the M94 validation use UNOSAT's rapid-mapping layers for event
`FL20260826NPL`, CC-BY-SA-4.0, obtained via HDX on 2026-09-08. They are not part of this
bundle — download them from the source and cite UNOSAT:

- barrier lakes: https://data.humdata.org/dataset/newly-formed-barrier-lakes-following-an-ice-rock-avalanche-in-rasuwa-district-nepal-as-of-
- mudflow/rockflow extent: https://data.humdata.org/dataset/mudflow-rockflow-extent-as-of-26-27-august-2026-in-rasuwa-district-bagmati-province-nepal

Official event figures (mechanism, wave arrival times, peak discharge, impact) are quoted from
Government of Nepal NDRRMA *Rasuwa Flood Situation Report #01*, as of 2026-09-01 09:00 NPT:
https://ndrrma.gov.np/mediafiles/rasuwa/Rasuwa_Flood_SitRep_Temp_ENG_01_01092026.pdf

The event was an ice-rock avalanche with temporary river damming, **not** a glacial lake
outburst flood, despite much early coverage describing it as one.
