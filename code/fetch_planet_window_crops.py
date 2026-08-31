#!/usr/bin/env python3
"""Crop per-window PlanetScope visual frames from Planet Disaster Data (source.coop).

For every scan window in the public contract (100 windows), pick the best
post-event PlanetScope item — prefer 2026-08-28, fall back to 2026-08-26 —
whose footprint fully contains the window, and crop the `visual` COG over
HTTP range reads. Output: web/public/data/planet/<id>_ps.webp plus a
provenance manifest. License: CC-BY-NC-4.0, © Planet Labs PBC — attribution
is rendered wherever these frames are shown.
"""
from __future__ import annotations

import json
import re
import subprocess
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.windows import from_bounds
from shapely.geometry import shape

from nepal_paths import REPO_ROOT

LIST = "https://data.source.coop/planet/disasterdata/"
ROOT = "https://data.source.coop/planet/"
COLLECTIONS = ["planetscope-2026-08-28", "planetscope-2026-08-26"]  # preference order
OUT_DIR = REPO_ROOT / "web/public/data/planet"
SCENARIO = REPO_ROOT / "web/public/data/scenario.json"
MAX_PX = 672  # 2.56 km at 3.8 m GSD


def curl(url: str) -> bytes:
    return subprocess.run(["curl", "-s", url], capture_output=True, check=True).stdout


def stac_items(collection: str) -> list[dict]:
    xml = curl(f"{LIST}?list-type=2&prefix=nepal-flash-flood-2026-08-26/post-event/{collection}/items/&max-keys=1000").decode()
    keys = [k for k in re.findall(r"<Key>([^<]+)</Key>", xml) if k.endswith(".json")]
    items = []
    for key in keys:
        j = json.loads(curl(ROOT + key))
        visual = j.get("assets", {}).get("visual", {}).get("href")
        if not visual:
            continue
        items.append({
            "collection": collection,
            "item_id": j["id"],
            "geom": shape(j["geometry"]),
            "datetime": j["properties"].get("datetime"),
            "clear_percent": j["properties"].get("pl:clear_percent"),
            "visual_url": ROOT + key.rsplit("/", 1)[0] + "/" + visual.lstrip("./"),
        })
    return items


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    scenario = json.loads(SCENARIO.read_text())
    windows = scenario["candidates"]["geojson"]["features"]
    catalog = [item for coll in COLLECTIONS for item in stac_items(coll)]

    manifest: dict[str, dict] = {}
    opened: dict[str, rasterio.DatasetReader] = {}
    env = rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif")
    with env:
        for feature in windows:
            wid = feature["properties"]["id"]
            wgeom = shape(feature["geometry"])
            pick = None
            for coll in COLLECTIONS:  # 08-28 first; within a collection prefer clearer sky
                cands = [i for i in catalog if i["collection"] == coll and i["geom"].contains(wgeom)]
                if cands:
                    pick = max(cands, key=lambda i: i["clear_percent"] or 0)
                    break
            if pick is None:
                continue
            src = opened.get(pick["visual_url"])
            if src is None:
                src = rasterio.open(pick["visual_url"])
                opened[pick["visual_url"]] = src
            # 창 폴리곤 bounds → 소스 CRS(EPSG:32645, 창과 동일)로 창 픽셀 읽기
            minx, miny, maxx, maxy = wgeom.bounds
            from rasterio.warp import transform_bounds
            bx = transform_bounds("EPSG:4326", src.crs, minx, miny, maxx, maxy)
            win = from_bounds(*bx, transform=src.transform)
            data = src.read([1, 2, 3], window=win, out_shape=(3, MAX_PX, MAX_PX), boundless=True, fill_value=0)
            img = np.transpose(data, (1, 2, 0)).astype(np.uint8)
            out = OUT_DIR / f"{wid}_ps.webp"
            Image.fromarray(img).save(out, "WEBP", quality=82, method=6)
            manifest[wid] = {
                "file": f"/data/planet/{out.name}",
                "collection": pick["collection"],
                "item_id": pick["item_id"],
                "datetime": pick["datetime"],
                "clear_percent": pick["clear_percent"],
            }
            print(wid, pick["collection"], pick["item_id"], f"clear={pick['clear_percent']}")
    for src in opened.values():
        src.close()

    (OUT_DIR / "windows_manifest.json").write_text(json.dumps({
        "schema": "planet-window-crops-v1",
        "generated_at_utc": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "https://source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26",
        "license": "CC-BY-NC-4.0 © Planet Labs PBC",
        "note": "visual RGB crops per 2.56 km scan window; 2026-08-28 preferred, 2026-08-26 fallback; not analytic data, display only",
        "windows": manifest,
    }, indent=2) + "\n")
    print(json.dumps({"crops": len(manifest), "out": str(OUT_DIR)}, indent=1))


if __name__ == "__main__":
    main()
