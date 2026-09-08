# Methodology (short form)

1. **Windows**: 100 × 2.56 km windows sampled along the OSM river centreline
   (border → Devighat) at ~1.28 km spacing, plus hillslope and upstream grids.
2. **Cubes**: Sentinel-2 L2A, 12 bands, five dates
   (2026-07-03 / 07-23 / 08-07 baseline · 08-12 placebo target · 08-27 post-event),
   same relative orbit R119, from Microsoft Planetary Computer.
3. **Embeddings**: frozen OlmoEarth v1 Base (patch 4 → 768-d tokens at 40 m).
4. **Change score**: Δz = 1 − cos(z_baseline, z_post) per token.
5. **Ordinary baseline**: pooled p99 of three no-event pre-event transitions
   (M82) — P1 base 07-03/07-23/08-07 -> 08-12, P2 base 06-03/06-18/07-03 -> 07-23,
   P3 base 05-19/06-03/06-18 -> 07-03; tokens with >50 % bright pixels
   (B02 > 2600 DN) masked as cloud/snow.
   **Limitation:** these base->target intervals (40/20/5, 50/35/20, 45/30/15 days)
   are not matched to the event pair's 55/35/20 days, so "fortnight" is loose and
   P1 understates ordinary drift. P2, the most nearly matched, is the strictest
   single threshold (0.3606 vs pooled 0.3170), meaning published shares are on the
   permissive side. The radar contract was re-run time-matched (2026-09-04); the
   optical one has not been. Open correction.
6. **Ranking**: share of valid tokens above the pooled p99; windows with <20 %
   valid tokens marked unobservable; one lead per place name; leads require
   ≥40 % observability.
7. **Corrections**: M75/M76 radar-unit retraction; NP-86 external-extent check
   (non-discriminative at window scale); NP-88 40 m robustness audit
   (does not beat post-event NDWI). Full ledger: docs/MEASURED_FINDINGS_full.md
   in the repository.

Reproduction: `code/` in https://github.com/DDanggle/eo-rasuwa
