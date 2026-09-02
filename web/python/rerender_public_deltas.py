#!/usr/bin/env python3
"""Regenerate every public window delta PNG in the contour-band style.

Uses the pooled three-pair threshold so the bright line matches the published
candidate_token_frac numbers (the old renders used the earlier single-pair scan
threshold, which showed roughly twice as many bright cells as the public 13.3%).
"""
from pathlib import Path
import json
import numpy as np

from delta_style import render_delta_contour

REPO = Path(__file__).resolve().parents[2]
SCAN = REPO / "research-private/artifacts/corridor_s2_candidates/embed_scan_v2"
SEALED = REPO / "research-private/artifacts/external_data/nepal_olmo_live_v1/corridor_sealed_s1db"
PUB = REPO / "web/public/data"

scenario = json.loads((PUB / "scenario.json").read_text())
pooled3 = float(scenario["placebo_extended"]["threshold_pooled3"])

count = 0
for npz_path in sorted(SCAN.glob("deltas/*_delta.npz")):
    wid = npz_path.name.split("_")[0]
    out = PUB / "candidates" / f"{wid}_delta.png"
    if not out.exists():
        continue  # 공개된 창만 다시 그린다
    z = np.load(npz_path)
    render_delta_contour(z["d_event"], z["valid_event"], pooled3, out)
    count += 1
print(f"candidates: {count} rewritten (threshold pooled3={pooled3:.4f})")

# canonical 27창(봉인 S1+S2)은 창마다 local placebo p99를 쓴다 — 원 계약 유지.
report = json.loads((SEALED / "report.json").read_text())
rows = {r["id"]: r for r in report.get("windows", report.get("rows", []))}
count = 0
for npy_path in sorted(SEALED.glob("deltas/*_sealed_delta.npy")):
    wid = npy_path.name.split("_")[0]
    out = PUB / "canonical" / f"{wid}_delta.png"
    row = rows.get(wid)
    if not out.exists() or not row:
        continue
    d = np.load(npy_path)
    render_delta_contour(d, np.isfinite(d), float(row["placebo_p99"]), out)
    count += 1
print(f"canonical: {count} rewritten (per-window local p99)")
