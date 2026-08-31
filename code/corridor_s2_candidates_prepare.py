#!/usr/bin/env python3
"""회랑 전체 S2-only 후보 지도 — 1단계: 창 자동 생성 + 5날짜 12밴드 큐브 다운로드(로컬).

사전 등록 설계 (2026-08-29, 실행 전 고정):
  - 창: OSM 강 중심선(국경→Devighat)을 ~2 km 간격으로 샘플 + Lhende 상류(A→E) 3개. 각 2.56 km.
  - 날짜: 기준 3장 = 07-03·07-23·08-07 / placebo 표적 = 08-12 / 사건 후 = 08-27 (모두 R119 궤도)
  - 사건 Δ = z(기준 3장) vs z(08-27) ; placebo Δ = z(기준 3장) vs z(08-12)  → 3 vs 1 구조 동일
  - 밝은 픽셀(B02>2600 DN, 구름·눈) 비율을 날짜별로 기록 → 임베딩 단계에서 토큰 마스크
  - 이 산출물은 "S2-only 후보 지도"이며 봉인된 S1+S2 계약이 아님. 라벨은 candidate까지만.
"""
from __future__ import annotations
import json, math, hashlib, time, os
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import planetary_computer as pc
import pystac_client
import rasterio
from rasterio.windows import from_bounds
from rasterio.warp import transform

from nepal_paths import ARTIFACT_ROOT, WEB_DATA_ROOT

OUT = ARTIFACT_ROOT / ("corridor_s2_candidates/prepare_v2" if os.environ.get("SCAN","v1") == "v2" else "corridor_s2_candidates/prepare")
OUT.mkdir(parents=True, exist_ok=True)
MODEL_BANDS = ["B02","B03","B04","B08","B05","B06","B07","B8A","B11","B12","B01","B09"]
DATES = ["2026-07-03","2026-07-23","2026-08-07","2026-08-12","2026-08-27"]
HALF_M, SIZE = 1280, 256
UTM = "EPSG:32645"

import os
SCAN = os.environ.get("SCAN", "v1")  # v1: 2 km 샘플 27창 / v2: 연속 1.28 km + 발원 주변 격자

def build_windows_v2():
    h = json.loads((WEB_DATA_ROOT / "hydrography.geojson").read_text())
    route = h["simulation_route"]
    xs, ys = transform("EPSG:4326", UTM, [p[0] for p in route], [p[1] for p in route])
    pts, acc, last = [], 0.0, None
    for i,(x,y) in enumerate(zip(xs,ys)):
        if last is None: pts.append(("river", route[i][0], route[i][1], x, y)); last=(x,y); continue
        acc += math.hypot(x-last[0], y-last[1]); last=(x,y)
        if acc >= 1280: pts.append(("river", route[i][0], route[i][1], x, y)); acc = 0.0
    # Lhende 상류: A→E 를 1.28 km 간격으로
    ax, ay = transform("EPSG:4326", UTM, [85.378],[28.276]); ex, ey = transform("EPSG:4326", UTM, [85.5194],[28.2765])
    n = max(2, int(math.hypot(ex[0]-ax[0], ey[0]-ay[0]) // 1280))
    for k in range(1, n+1):
        f = k/n; x = ax[0]+f*(ex[0]-ax[0]); y = ay[0]+f*(ey[0]-ay[0])
        lon, lat = transform(UTM, "EPSG:4326", [x],[y]); pts.append(("lhende", lon[0], lat[0], x, y))
    # 발원(E) 주변 산사면 격자: ±7.68 km, 2.56 km 간격 (7x7) — 강변 밖 산사태 탐색
    for i in range(-3, 4):
        for j in range(-3, 4):
            x = ex[0] + i*2560; y = ey[0] + j*2560
            lon, lat = transform(UTM, "EPSG:4326", [x],[y]); pts.append(("hillslope", lon[0], lat[0], x, y))
    wins=[]
    for k,(kind,lon,lat,x,y) in enumerate(pts):
        wins.append({"id": f"v{k:03d}", "center_lonlat":[lon,lat], "bounds_utm":[x-HALF_M,y-HALF_M,x+HALF_M,y+HALF_M], "kind": kind})
    return wins

def build_windows():
    h = json.loads((WEB_DATA_ROOT / "hydrography.geojson").read_text())
    route = h["simulation_route"]
    xs, ys = transform("EPSG:4326", UTM, [p[0] for p in route], [p[1] for p in route])
    pts, acc, last = [], 0.0, None
    for i,(x,y) in enumerate(zip(xs,ys)):
        if last is None: pts.append((route[i][0], route[i][1], x, y)); last=(x,y); continue
        acc += math.hypot(x-last[0], y-last[1]); last=(x,y)
        if acc >= 2000: pts.append((route[i][0], route[i][1], x, y)); acc = 0.0
    # Lhende 상류: A(85.378,28.276) → E(85.5194,28.2765)
    for f in (1/3, 2/3, 1.0):
        lon = 85.378 + f*(85.5194-85.378); lat = 28.276 + f*(28.2765-28.276)
        x,y = transform("EPSG:4326", UTM, [lon],[lat]); pts.append((lon,lat,x[0],y[0]))
    wins=[]
    for k,(lon,lat,x,y) in enumerate(pts):
        wins.append({"id": f"w{k:02d}", "center_lonlat":[lon,lat], "bounds_utm":[x-HALF_M,y-HALF_M,x+HALF_M,y+HALF_M],
                     "kind": "lhende_upstream" if k >= len(pts)-3 else "corridor"})
    return wins

def find_items(catalog, lon, lat):
    items={}
    for d in DATES:
        s = catalog.search(collections=["sentinel-2-l2a"], intersects={"type":"Point","coordinates":[lon,lat]},
                           datetime=f"{d}T00:00:00Z/{d}T23:59:59Z")
        its = list(s.items())
        if not its: return None
        items[d] = pc.sign(its[0])
    return items

def read_cube(items, bounds):
    cube = np.zeros((12, len(DATES), SIZE, SIZE), dtype="uint16")
    bright = []
    for ti,d in enumerate(DATES):
        it = items[d]
        for bi,b in enumerate(MODEL_BANDS):
            with rasterio.open(it.assets[b].href) as ds:
                win = from_bounds(*bounds, transform=ds.transform)
                arr = ds.read(1, window=win, out_shape=(SIZE,SIZE), boundless=True, fill_value=0)
                cube[bi,ti] = np.clip(arr,0,65535)
        bright.append(float((cube[0,ti] > 2600).mean()))
    return cube, bright

def main():
    catalog = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
    wins = build_windows_v2() if SCAN == 'v2' else build_windows()
    print(f"windows: {len(wins)}", flush=True)
    manifest=[]
    def work(w):
        out = OUT/f"{w['id']}.npz"
        if out.exists():
            return {**w, "status":"cached"}
        items = find_items(catalog, *w["center_lonlat"])
        if items is None: return {**w, "status":"missing_scene"}
        t0=time.time()
        cube, bright = read_cube(items, w["bounds_utm"])
        np.savez_compressed(out, cube=cube, dates=np.array(DATES), bounds_utm=np.array(w["bounds_utm"]),
                            center=np.array(w["center_lonlat"]), bright=np.array(bright))
        return {**w, "status":"ok", "scene_ids":{d:items[d].id for d in DATES}, "bright_fraction":bright,
                "sha256": hashlib.sha256(out.read_bytes()).hexdigest(), "seconds": round(time.time()-t0,1)}
    with ThreadPoolExecutor(6) as ex:
        for r in ex.map(work, wins):
            manifest.append(r); print(r["id"], r["status"], r.get("bright_fraction"), r.get("seconds"), flush=True)
    (OUT/"windows_manifest.json").write_text(json.dumps({"design":"S2-only 3v1 corridor candidates; not the sealed S1+S2 contract",
        "dates":DATES, "band_order":MODEL_BANDS, "windows":manifest}, indent=1))
    print("DONE", sum(1 for m in manifest if m["status"] in ("ok","cached")), "/", len(wins))

if __name__ == "__main__":
    main()
