#!/usr/bin/env python3
"""사전 등록 대조 창 10곳 — 관측성·결과를 보기 전에 규칙과 난수 시드로 위치를 고정하고, 고정 목록을 먼저 파일로 쓴 뒤 받음.
규칙: 네팔 중부 bbox(84.2–86.3E, 27.5–28.3N), 강 회랑(시뮬레이션 경로)·발원 E 에서 ≥ 30 km, 창끼리 ≥ 10 km, seed 20260830.
같은 5날짜·12밴드·256px 계약(corridor_s2_candidates_prepare). 관측성은 받은 뒤에만 기록(선택에 쓰지 않음)."""
import json, math, random, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from corridor_s2_candidates_prepare import find_items, read_cube, DATES, HALF_M, UTM, MODEL_BANDS
from rasterio.warp import transform
import pystac_client, planetary_computer as pc
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts/corridor_s2_candidates/prepare_ctrl_prereg"; OUT.mkdir(parents=True, exist_ok=True)
IMG = ROOT / "apps/nepal-olmo-gis/public/data/candidates"
h = json.loads((ROOT/"apps/nepal-olmo-gis/public/data/hydrography.geojson").read_text()); route = h["simulation_route"] + [[85.5194, 28.2765]]
def km(a, b): return math.hypot((a[0]-b[0])*math.cos(math.radians(27.9))*111.0, (a[1]-b[1])*111.0)
rng = random.Random(20260830); sites = []
while len(sites) < 10:
    lon, lat = rng.uniform(84.2, 86.3), rng.uniform(27.5, 28.3)
    if min(km((lon,lat), r) for r in route) < 30: continue
    if any(km((lon,lat), s) < 10 for s in sites): continue
    sites.append((round(lon,4), round(lat,4)))
prereg = {"rule": "bbox 84.2-86.3E 27.5-28.3N; >=30 km from corridor route and source E; >=10 km apart; seed 20260830; selection blind to observability", "sites": [{"id": f"p{i:03d}", "center_lonlat": list(s)} for i, s in enumerate(sites)]}
(OUT / "preregistered_sites.json").write_text(json.dumps(prereg, indent=1)); print("preregistered", sites)
catalog = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1"); rows = []
for s in prereg["sites"]:
    wid = s["id"]; lon, lat = s["center_lonlat"]; items = find_items(catalog, lon, lat)
    if items is None: rows.append({"id": wid, "center_lonlat": [lon, lat], "status": "missing_scene"}); print(wid, "missing scene"); continue
    x, y = transform("EPSG:4326", UTM, [lon], [lat]); b = [x[0]-HALF_M, y[0]-HALF_M, x[0]+HALF_M, y[0]+HALF_M]
    cube, bright = read_cube(items, b)
    np.savez_compressed(OUT / f"{wid}.npz", cube=cube, dates=np.array(DATES), bounds_utm=np.array(b), center=np.array([lon, lat]), bright=np.array(bright))
    def rgb(ti): a = np.stack([cube[2, ti], cube[1, ti], cube[0, ti]], -1).astype("float32"); return (np.clip((a/3000.0)**0.9, 0, 1)*255).astype("uint8")
    Image.fromarray(rgb(3)).resize((512,512)).save(IMG / f"{wid}_pre.png"); Image.fromarray(rgb(4)).resize((512,512)).save(IMG / f"{wid}_post.png")
    rows.append({"id": wid, "center_lonlat": [lon, lat], "bounds_utm": b, "kind": "control_prereg", "status": "ok", "bright_fraction": bright, "scene_ids": {d: items[d].id for d in DATES}})
    print(wid, lon, lat, "bright", [round(v,2) for v in bright], flush=True)
(OUT / "windows_manifest.json").write_text(json.dumps({"design": "pre-registered control windows · same S2 5-date contract", "prereg": prereg, "dates": DATES, "band_order": MODEL_BANDS, "windows": rows}, indent=1))
