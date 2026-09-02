#!/usr/bin/env python3
"""이웃 하천 확장 스캔 — 1단계: 창 생성 + 5날짜 12밴드 큐브 다운로드.

2026-09-02 확장 (사용자 요청: "근처 강들도 봐줘야지"). 회랑 100창과 같은 S2-only
3v1 계약(07-03·07-23·08-07 기준 / 08-12 placebo / 08-27 사건 후)을, 지도 범위의
나머지 OSM 강(waterway=river)을 따라 ~2 km 간격으로 놓은 새 창(n###)에 적용한다.
기존 100창과 1.8 km 이내로 겹치는 위치는 제외한다. 봉인된 6-리드 퍼널과는 별개의
확장 레이어이며, 자체 placebo p99로만 이야기한다.
"""
from __future__ import annotations
import json, math, os, time
from pathlib import Path

os.environ.setdefault("SCAN", "v2")
import numpy as np
from rasterio.warp import transform

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT
import corridor_s2_candidates_prepare as base  # find_items / read_cube / DATES / MODEL_BANDS 재사용

OUT = ARTIFACT_ROOT / "neighbor_scan/prepare"
OUT.mkdir(parents=True, exist_ok=True)
PUB = REPO_ROOT / "web/public/data"
HALF_M = 1280
UTM = "EPSG:32645"
MIN_SEP_KM = 1.8

def utm_xy(lons, lats):
    xs, ys = transform("EPSG:4326", UTM, lons, lats)
    return list(zip(xs, ys))

def build_windows():
    sc = json.loads((PUB / "scenario.json").read_text())
    existing = [f["properties"]["center_lonlat"] for f in sc["candidates"]["geojson"]["features"]]
    ex_xy = utm_xy([c[0] for c in existing], [c[1] for c in existing])

    rivers = json.loads((PUB / "rivers-region.geojson").read_text())
    pts = []
    for feat in rivers["features"]:
        coords = feat["geometry"]["coordinates"]
        if len(coords) < 2:
            continue
        xy = utm_xy([c[0] for c in coords], [c[1] for c in coords])
        acc = 0.0
        last = xy[0]
        cand = [(coords[0], xy[0])]
        for c, p in zip(coords[1:], xy[1:]):
            acc += math.hypot(p[0] - last[0], p[1] - last[1]); last = p
            if acc >= 2000:
                cand.append((c, p)); acc = 0.0
        pts.extend(cand)

    wins, kept_xy = [], []
    for (lonlat, p) in pts:
        if any(math.hypot(p[0] - q[0], p[1] - q[1]) < MIN_SEP_KM * 1000 for q in ex_xy):
            continue
        if any(math.hypot(p[0] - q[0], p[1] - q[1]) < MIN_SEP_KM * 1000 for q in kept_xy):
            continue
        kept_xy.append(p)
        wins.append({"id": f"n{len(wins):03d}", "center_lonlat": [round(lonlat[0], 6), round(lonlat[1], 6)],
                     "bounds_utm": [p[0] - HALF_M, p[1] - HALF_M, p[0] + HALF_M, p[1] + HALF_M], "kind": "neighbor_river"})
    return wins

def main():
    import pystac_client, planetary_computer as pc, hashlib, time
    from concurrent.futures import ThreadPoolExecutor
    catalog = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
    wins = build_windows()
    print(f"neighbor windows: {len(wins)}", flush=True)
    manifest = []
    def work(w):
        out = OUT / f"{w['id']}.npz"
        if out.exists():
            return {**w, "status": "cached"}
        # PC STAC은 간헐적으로 502를 내므로 창 단위로 재시도한다.
        items = None
        for attempt in range(5):
            try:
                items = base.find_items(catalog, *w["center_lonlat"])
                break
            except Exception as err:
                if attempt == 4:
                    return {**w, "status": "api_error", "error": str(err)[:120]}
                time.sleep(8 * (attempt + 1))
        if items is None:
            return {**w, "status": "missing_scene"}
        t0 = time.time()
        try:
            cube, bright = base.read_cube(items, w["bounds_utm"])
        except Exception as err:
            return {**w, "status": "api_error", "error": str(err)[:120]}
        np.savez_compressed(out, cube=cube, dates=np.array(base.DATES), bounds_utm=np.array(w["bounds_utm"]),
                            center=np.array(w["center_lonlat"]), bright=np.array(bright))
        return {**w, "status": "ok", "scene_ids": {d: items[d].id for d in base.DATES}, "bright_fraction": bright,
                "sha256": hashlib.sha256(out.read_bytes()).hexdigest(), "seconds": round(time.time() - t0, 1)}
    with ThreadPoolExecutor(6) as ex:
        for r in ex.map(work, wins):
            manifest.append(r); print(r["id"], r["status"], r.get("seconds"), flush=True)
    (OUT / "windows_manifest.json").write_text(json.dumps({
        "design": "neighbor-river extension of the S2-only 3v1 scan; separate from the sealed 6-lead funnel",
        "dates": base.DATES, "band_order": base.MODEL_BANDS, "min_sep_km": MIN_SEP_KM, "windows": manifest}, indent=1))
    ok = sum(1 for m in manifest if m["status"] in ("ok", "cached"))
    print("DONE", ok, "/", len(wins))

if __name__ == "__main__":
    main()
