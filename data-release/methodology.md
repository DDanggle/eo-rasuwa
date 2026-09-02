# Methodology (short form)

1. **Windows**: 100 × 2.56 km windows sampled along the OSM river centreline
   (border → Devighat) at ~1.28 km spacing, plus hillslope and upstream grids.
2. **Cubes**: Sentinel-2 L2A, 12 bands, five dates
   (2026-07-03 / 07-23 / 08-07 baseline · 08-12 placebo target · 08-27 post-event),
   same relative orbit R119, from Microsoft Planetary Computer.
3. **Embeddings**: frozen OlmoEarth v1 Base (patch 4 → 768-d tokens at 40 m).
4. **Change score**: Δz = 1 − cos(z_baseline, z_post) per token.
5. **Ordinary baseline**: pooled p99 of three no-event fortnight transitions
   (M82); tokens with >50 % bright pixels (B02 > 2600 DN) masked as cloud/snow.
6. **Ranking**: share of valid tokens above the pooled p99; windows with <20 %
   valid tokens marked unobservable; one lead per place name; leads require
   ≥40 % observability.
7. **Corrections**: M75/M76 radar-unit retraction; NP-86 external-extent check
   (non-discriminative at window scale); NP-88 40 m robustness audit
   (does not beat post-event NDWI). Full ledger: docs/MEASURED_FINDINGS_full.md
   in the repository.

Reproduction: `code/` in https://github.com/DDanggle/eo-rasuwa
