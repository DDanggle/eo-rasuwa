#!/usr/bin/env python3
"""확장 스캔 상위 창의 공개 자산: pre/post/delta PNG + neighbors.geojson.

상위 N개(기본 12)만 이미지화해 용량을 아낀다. 나머지 창은 리본 색으로만 존재.
delta는 delta_style 등고선 밴드(확장 스캔 자체 p99), pre=08-12, post=08-27 트루컬러.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

from delta_style import render_delta_contour

REPO = Path(__file__).resolve().parents[2]
NB = REPO / "research-private/artifacts/neighbor_scan"
PUB = REPO / "web/public/data"
OUT = PUB / "neighbors"
OUT.mkdir(exist_ok=True)
TOP_N = 12

def stretch(ch):
    finite = ch[np.isfinite(ch) & (ch > 0)]
    if finite.size == 0:
        return np.zeros(ch.shape, np.uint8)
    lo, hi = np.percentile(finite, [2, 98])
    hi = max(hi, lo + 1)
    return np.clip((ch - lo) / (hi - lo) * 255, 0, 255).astype(np.uint8)

report = json.loads((NB / "embed/report.json").read_text())
thr = float(report["threshold_placebo_p99"])
ranked = sorted([w for w in report["windows"] if w.get("status") == "ranked"],
                key=lambda w: -w["candidate_token_frac"])[:TOP_N]

features = []
for w in ranked:
    wid = w["id"]
    cube = np.load(NB / f"prepare/{wid}.npz")["cube"].astype("float32")  # (12,5,256,256)
    for name, ti in (("pre", 3), ("post", 4)):
        rgb = np.stack([stretch(cube[b, ti]) for b in (2, 1, 0)], axis=-1)  # B04,B03,B02
        Image.fromarray(rgb).save(OUT / f"{wid}_{name}.png", optimize=True)
    dd = np.load(NB / f"embed/{wid}_delta.npz")
    render_delta_contour(dd["d_event"], dd["valid_event"], thr, OUT / f"{wid}_delta.png")
    x0, y0, x1, y1 = w["bounds_utm"]
    from pyproj import Transformer
    to_ll = Transformer.from_crs("EPSG:32645", "EPSG:4326", always_xy=True).transform
    ring = [list(to_ll(x0, y0)), list(to_ll(x1, y0)), list(to_ll(x1, y1)), list(to_ll(x0, y1)), list(to_ll(x0, y0))]
    features.append({"type": "Feature",
        "properties": {"id": wid, "rank": w["rank"], "candidate_token_frac": round(w["candidate_token_frac"], 4),
                        "valid_event_frac": round(w["valid_event_frac"], 4), "center_lonlat": w["center_lonlat"]},
        "geometry": {"type": "Polygon", "coordinates": [ring]}})

# ── 전 269창: 위성 타일 모드용 128px post 썸네일 + 폴리곤(히트/좌표) ──
from pyproj import Transformer
to_ll = Transformer.from_crs("EPSG:32645", "EPSG:4326", always_xy=True).transform
thumbs = OUT / "thumbs"
thumbs.mkdir(exist_ok=True)
all_feats = []
top_ids = {w["id"] for w in ranked}
for w in report["windows"]:
    wid = w["id"]
    cube = np.load(NB / f"prepare/{wid}.npz")["cube"].astype("float32")
    rgb = np.stack([stretch(cube[b, 4]) for b in (2, 1, 0)], axis=-1)
    Image.fromarray(rgb).resize((128, 128)).save(thumbs / f"{wid}_post128.png", optimize=True)
    x0, y0, x1, y1 = w["bounds_utm"]
    ring = [list(to_ll(x0, y0)), list(to_ll(x1, y0)), list(to_ll(x1, y1)), list(to_ll(x0, y1)), list(to_ll(x0, y0))]
    all_feats.append({"type": "Feature",
        "properties": {"id": wid, "status": w.get("status"),
                        "candidate_token_frac": (round(w["candidate_token_frac"], 4) if w.get("candidate_token_frac") is not None else None),
                        "valid_event_frac": round(w["valid_event_frac"], 4),
                        "rank": w.get("rank"), "has_assets": wid in top_ids},
        "geometry": {"type": "Polygon", "coordinates": [ring]}})
(PUB / "neighbors-windows.geojson").write_text(json.dumps({
    "type": "FeatureCollection",
    "claim": "all 269 windows of the 2 Sep neighbor-river extension scan (S2-only, single-placebo p99); separate from the sealed six-lead funnel",
    "features": all_feats}) + "\n")
tk = sum(f.stat().st_size for f in thumbs.glob("*.png")) // 1024
print(f"thumbs: {len(all_feats)} windows, {tk} KB")

(PUB / "neighbors.geojson").write_text(json.dumps({
    "type": "FeatureCollection",
    "claim": "top windows from the 2 Sep neighbor-river extension scan (S2-only, single-placebo p99) — separate from the sealed six-lead funnel; review order, not damage",
    "threshold_placebo_p99": thr, "scanned": len(report["windows"]),
    "ranked": sum(1 for w in report["windows"] if w.get("status") == "ranked"),
    "features": features}) + "\n")
size = sum(f.stat().st_size for f in OUT.glob("*.png")) // 1024
print(f"top {len(features)} neighbor windows → {size} KB of PNGs")
