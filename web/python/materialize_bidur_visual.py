#!/usr/bin/env python3
"""Materialize a visual-only Sentinel-2 before/after pair for Bidur.

This anchor is deliberately outside the sealed five-anchor OLMoEarth contract.
It closes a downstream storytelling gap without silently changing the model
input contract.  The output manifest preserves STAC item IDs, footprints and
source URLs so the UI can distinguish "not materialized" from "no coverage".
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import planetary_computer
import pystac_client
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.warp import transform
from rasterio.windows import from_bounds


APP_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = APP_ROOT / "public/data/story/anchors"
MANIFEST_PATH = APP_ROOT / "public/data/bidur-visual-audit.json"
CATALOG_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
COLLECTION = "sentinel-2-l2a"
POINT = (85.1357, 27.9162)
WINDOW_METRES = 2_560
TARGETS = {
    "pre": "2026-08-12T00:00:00Z/2026-08-12T23:59:59Z",
    "post": "2026-08-27T00:00:00Z/2026-08-27T23:59:59Z",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def materialize_item(item, destination: Path) -> dict:
    signed = planetary_computer.sign(item)
    asset = signed.assets["visual"]
    with rasterio.open(asset.href) as dataset:
        xs, ys = transform("EPSG:4326", dataset.crs, [POINT[0]], [POINT[1]])
        half = WINDOW_METRES / 2
        window = from_bounds(xs[0] - half, ys[0] - half, xs[0] + half, ys[0] + half,
                             transform=dataset.transform)
        rgb = dataset.read(
            [1, 2, 3], window=window, out_shape=(3, 256, 256), boundless=True,
            fill_value=0, resampling=Resampling.bilinear,
        )
        alpha = np.where(np.any(rgb > 0, axis=0), 255, 0).astype(np.uint8)
        rgba = np.dstack([np.moveaxis(rgb.astype(np.uint8), 0, -1), alpha])
        Image.fromarray(rgba).save(destination, optimize=True)
        return {
            "crs": str(dataset.crs),
            "source_shape": [dataset.count, dataset.height, dataset.width],
            "window_m": WINDOW_METRES,
            "output_shape": [256, 256, 4],
            "valid_pixel_fraction": float(np.mean(alpha > 0)),
        }


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    catalog = pystac_client.Client.open(CATALOG_URL, modifier=planetary_computer.sign_inplace)
    rows = []
    for label, date_range in TARGETS.items():
        items = list(catalog.search(
            collections=[COLLECTION], intersects={"type": "Point", "coordinates": POINT},
            datetime=date_range,
        ).items())
        if not items:
            raise RuntimeError(f"No Sentinel-2 item covers Bidur for {label}: {date_range}")
        # A point on a MGRS seam can return adjacent tiles. Prefer the item with
        # the lowest tile-wide cloud metadata, then retain every candidate ID.
        items.sort(key=lambda item: float(item.properties.get("eo:cloud_cover", 101)))
        chosen = items[0]
        destination = OUTPUT_ROOT / f"bidur_{label}.png"
        render = materialize_item(chosen, destination)
        rows.append({
            "label": label,
            "acquired_at": chosen.datetime.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            "item_id": chosen.id,
            "candidate_item_ids": [item.id for item in items],
            "mgrs_tile": chosen.properties.get("s2:mgrs_tile"),
            "tile_cloud_pct": chosen.properties.get("eo:cloud_cover"),
            "bbox": chosen.bbox,
            "image": f"/data/story/anchors/bidur_{label}.png",
            "image_sha256": sha256(destination),
            "render": render,
        })

    manifest = {
        "schema": "olmoearth-bidur-visual-audit/v1",
        "created_at_utc": datetime.now(UTC).isoformat(),
        "point": {"name": "Trishuli Bazar / Bidur reach", "coordinates": list(POINT)},
        "purpose": "visual_only_downstream_context_not_part_of_five_anchor_olmo_contract",
        "catalog": CATALOG_URL,
        "collection": COLLECTION,
        "records": rows,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
