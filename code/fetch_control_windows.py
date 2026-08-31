#!/usr/bin/env python3
"""대조군(사건 없는) 창 후보를 스캔과 같은 5날짜·12밴드 계약으로 받아 npz 로 저장 — 8/27 관측성(밝은 픽셀)이 낮은 것을 고름."""
import sys, json, numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from corridor_s2_candidates_prepare import find_items, read_cube, DATES, HALF_M, UTM, MODEL_BANDS
import pystac_client
from rasterio.warp import transform
from PIL import Image
from nepal_paths import ARTIFACT_ROOT, WEB_DATA_ROOT
OUT = ARTIFACT_ROOT / "corridor_s2_candidates/prepare_ctrl"; OUT.mkdir(parents=True, exist_ok=True)
IMG = WEB_DATA_ROOT / "candidates"; IMG.mkdir(parents=True, exist_ok=True)
# 후보: 같은 히말라야 전면 산지, 강 회랑과 무관, 사건 전후 보도 없음
CANDS = {"x000": ("Melamchi valley (Helambu)", 85.560, 27.960), "x001": ("Tadi Khola, Nuwakot east", 85.290, 27.930),
         "x002": ("Ankhu Khola, Dhading north", 84.990, 28.070), "x003": ("Rishing (legacy C)", 84.3103107, 27.8790412)}
catalog = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
rows = []
for wid, (name, lon, lat) in CANDS.items():
    items = find_items(catalog, lon, lat)
    if items is None: print(wid, name, "missing scene"); continue
    x, y = transform("EPSG:4326", UTM, [lon], [lat]); b = [x[0]-HALF_M, y[0]-HALF_M, x[0]+HALF_M, y[0]+HALF_M]
    cube, bright = read_cube(items, b)
    np.savez_compressed(OUT / f"{wid}.npz", cube=cube, dates=np.array(DATES), bounds_utm=np.array(b), center=np.array([lon, lat]), bright=np.array(bright))
    def rgb(ti): a = np.stack([cube[2, ti], cube[1, ti], cube[0, ti]], -1).astype("float32"); return (np.clip((a/3000.0)**0.9, 0, 1)*255).astype("uint8")
    Image.fromarray(rgb(3)).resize((512, 512), Image.LANCZOS).save(IMG / f"{wid}_pre.png"); Image.fromarray(rgb(4)).resize((512, 512), Image.LANCZOS).save(IMG / f"{wid}_post.png")
    rows.append({"id": wid, "name": name, "center_lonlat": [lon, lat], "bounds_utm": b, "bright_fraction": [float(v) for v in bright], "kind": "control"})
    print(wid, name, "bright", [round(v, 2) for v in bright])
(OUT / "windows_manifest.json").write_text(json.dumps({"design": "control windows (no reported event) · same S2 5-date contract", "dates": DATES, "band_order": MODEL_BANDS, "windows": rows}, indent=1))
print("DONE", len(rows))
