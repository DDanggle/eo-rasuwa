#!/usr/bin/env python3
"""이웃 하천 확장 — pooled3 승격용 초기 날짜(05-19·06-03·06-18) 큐브 다운로드.

본선 M82(corridor_placebo_extended)와 같은 세 평시쌍 계약을 이웃 269창에 적용하기
위한 재료. 창 목록은 1단계 manifest를 그대로 쓴다.
"""
from __future__ import annotations
import hashlib, json, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import planetary_computer as pc
import pystac_client
import rasterio
from rasterio.windows import from_bounds

from nepal_paths import ARTIFACT_ROOT

NB = ARTIFACT_ROOT / "neighbor_scan"
OUT = NB / "prepare_early"
OUT.mkdir(parents=True, exist_ok=True)
MODEL_BANDS = ["B02","B03","B04","B08","B05","B06","B07","B8A","B11","B12","B01","B09"]
DATES = ["2026-05-19", "2026-06-03", "2026-06-18"]
SIZE = 256

def find_items(catalog, lon, lat):
    items = {}
    for d in DATES:
        for attempt in range(5):
            try:
                s = catalog.search(collections=["sentinel-2-l2a"], intersects={"type": "Point", "coordinates": [lon, lat]},
                                   datetime=f"{d}T00:00:00Z/{d}T23:59:59Z")
                its = list(s.items())
                break
            except Exception:
                if attempt == 4: return None
                time.sleep(8 * (attempt + 1))
        if not its: return None
        items[d] = pc.sign(its[0])
    return items

def read_cube(items, bounds):
    cube = np.zeros((12, len(DATES), SIZE, SIZE), dtype="uint16")
    for ti, d in enumerate(DATES):
        it = items[d]
        for bi, b in enumerate(MODEL_BANDS):
            with rasterio.open(it.assets[b].href) as ds:
                win = from_bounds(*bounds, transform=ds.transform)
                arr = ds.read(1, window=win, out_shape=(SIZE, SIZE), boundless=True, fill_value=0)
                cube[bi, ti] = np.clip(arr, 0, 65535)
    return cube

def main():
    manifest = json.loads((NB / "prepare/windows_manifest.json").read_text())
    wins = [w for w in manifest["windows"] if w["status"] in ("ok", "cached")]
    catalog = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
    print("windows:", len(wins), flush=True)
    results = []
    def work(w):
        out = OUT / f"{w['id']}.npz"
        if out.exists(): return (w["id"], "cached")
        items = find_items(catalog, *w["center_lonlat"])
        if items is None: return (w["id"], "missing_scene")
        try:
            cube = read_cube(items, w["bounds_utm"])
        except Exception as err:
            return (w["id"], f"api_error:{str(err)[:60]}")
        np.savez_compressed(out, cube=cube, dates=np.array(DATES), bounds_utm=np.array(w["bounds_utm"]),
                            center=np.array(w["center_lonlat"]))
        return (w["id"], "ok")
    with ThreadPoolExecutor(6) as ex:
        for wid, st in ex.map(work, wins):
            results.append((wid, st)); print(wid, st, flush=True)
    ok = sum(1 for _, s in results if s in ("ok", "cached"))
    (OUT / "manifest.json").write_text(json.dumps({"dates": DATES, "results": dict(results)}, indent=1))
    print("DONE", ok, "/", len(wins))

if __name__ == "__main__":
    main()
