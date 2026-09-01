# NP-88 robustness audit

The original NP-88 result remains evidence that frozen OlmoEarth change distance agrees with three
third-party flood-proxy products at a 40 m readout. It is not evidence of field-confirmed damage or
general superiority over classical flood mapping.

## Corrected result

| score | pooled AUROC | pooled AUPRC | 5.12 km block-macro AUROC |
|---|---:|---:|---:|
| OlmoEarth change distance | **0.8459** | 0.2548 | **0.8573** |
| post-event NDWI | 0.8276 | **0.2911** | 0.8497 |
| spectral angle | 0.7896 | 0.1493 | 0.7928 |
| absolute NDVI change | 0.7503 | 0.1881 | 0.7518 |

Provider-specific OlmoEarth AUROC was 0.8865 for IWM, 0.8783 for TASA, and 0.7961 for JAXA.
The paired 5.12 km block mean difference between OlmoEarth and post-event NDWI was +0.00768, with a
post-hoc block-bootstrap 95% interval of [-0.06198, 0.09016]. Same-window, same-80 m-river-distance-bin
conditional AUROC was 0.8006 for OlmoEarth and 0.7518 for post-event NDWI.

## Claim boundary

- The token count 122,558 is descriptive; overlapping windows and spatial correlation make it an
  invalid independent sample size. The independent event count is one.
- IWM, TASA, and JAXA products are image-derived flood proxies, not field damage labels.
- Strong water-index controls were added after NP-88 was opened, so this is post-hoc robustness work.
- External-label agreement survives. The initial claim of a 0.10–0.15 AI advantage over classical
  methods does not survive the stronger post-event NDWI baseline.
- Another event under a frozen first-look protocol is required before treating this as external
  generalization evidence.

The reproducible audit implementation and compact source-hashed result live in the main research
repository as `code/audit_nepal_m88_robustness.py` and
`artifacts/nepal_np89_robustness_audit_v1.json`.

## Route-buffer follow-up

The later legacy-M89 sensitivity retained AUROC 0.8458 and 0.8726 after excluding tokens within
300 m and 600 m of the single mapped OSM `simulation_route`. This makes distance to that one
centreline an insufficient explanation. It is not a complete hydrographic-network control:
unmapped tributaries, floodplains, elevation and the single-event dependence remain. Its only
classical comparator was absolute NDVI change, so the stronger post-event NDWI and spatial-block
limitations above remain authoritative.
