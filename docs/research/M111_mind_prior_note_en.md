# M111 — Can a coordinate prior (MIND) give a per-window "ordinary change" baseline? (2026-10-19)

**Setting.** Frozen OlmoEarth v1 Base embeddings of Sentinel-1 RTC (γ⁰ dB), 2.56 km river windows, 3-vs-1 memory. Change score per 40 m token = cosine distance between the 3-pass pre-flood memory and the post-flood pass. A window is flagged when the share of tokens above a threshold exceeds 5%. Today the threshold is one pooled p99 of the placebo (no-flood) distances across all windows.

**Question.** Can the placebo p99 of a window be predicted from its coordinates alone, using MIND (Corley, Rao, Rolf, Klemmer, Shelhamer, Lehmann, Rußwurm, Mai, Jacobs, Kerner; arXiv 2609.25454; weights `taylor-geospatial/MIND`)? If so, a per-window baseline would separate mountain, plain and wet-season effects without extra imagery.

**Design.** Training set: 231 windows on Sentinel-1 orbit 19 with identical placebo dates (07-07, 07-19, 07-31 → 08-12), six river groups (Tinau 34, upper Narayani 30, Narayani at Susta 43, lower Gandak 33, East Rapti 39, Bagmati 52). Target: log placebo p99. Features: MIND 3072-d, prefixes 64…2048, standard ridge and Chunked-Penalty ridge (α·γ^chunk, following the paper's formulation, features standardised on the training split, intercept unpenalised). Hold-outs: random 5-fold and **leave-one-river-group-out**. Baselines: constant (current method), quadratic in lat/lon, coordinate IDW (k=10). Grid selection was done on the test metric, so the best MIND row is optimistic by construction.

| model | R² random | R² regional (river group out) | ρ regional |
|---|---:|---:|---:|
| constant (pooled threshold) | −0.02 | −0.23 | — |
| lat/lon quadratic ridge | 0.43 | **0.23** | 0.62 |
| coordinate IDW k=10 | 0.66 | 0.06 | 0.34 |
| MIND, median over 47 grid points | 0.61 | **−1.36** | — |
| MIND best (prefix 64, α=1000) | — | 0.25 | — |
| MIND full + Chunked Penalty (α=100, γ=100–1000) | 0.53 | 0.06 | 0.26 |

**Transfer** (best model fitted on all 231, Spearman ρ against measured placebo p99): same windows in 2024 (2-vs-1 contract) ρ 0.67; Budhi Gandaki, mountains, other placebo dates (37) ρ −0.36; Koshi on orbit 12 (51) ρ −0.56.

**Application.** Per-window threshold = pooled p99 × exp(prediction − mean), predictions taken from the regional hold-out. Truth = Copernicus GFM flood fraction ≥ 2% in the window (229 windows with GFM, 88 positive).

| τ | pooled threshold CSI (P / R) | per-window threshold CSI (P / R) |
|---|---|---|
| 5% | **0.598** (0.93 / 0.62) | 0.511 (0.92 / 0.53) |
| 3% | **0.616** (0.85 / 0.69) | 0.560 (0.82 / 0.64) |
| 2% | **0.644** (0.83 / 0.74) | 0.614 (0.83 / 0.70) |

**Reading.** Ordinary change has clear spatial structure: with labels nearby, the coordinate embedding explains about 60% of its variance. Across river groups the skill collapses; only the coarsest 64-d prefix under heavy regularisation survives, and it matches a quadratic in lat/lon. This is the paper's own finding reproduced on an operational problem: fine-scale components help only near labels, and our deployment case (six basins over ~400 km, new events in new basins) is the far case. A per-window baseline built from the prior lowers agreement with GFM, so the pooled threshold stays. The prior remains a candidate for interpolating unobserved stretches inside an already-measured river, with the regional-hold-out caveat stated on the map.

Code `code/mind_prior_m111.py`; outputs `research-private/artifacts/mind_prior_m111/report.json` (per-window measured p99, regional-hold-out prediction, scale, both fractions).
