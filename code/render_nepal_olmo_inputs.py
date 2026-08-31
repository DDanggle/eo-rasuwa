#!/usr/bin/env python3
"""Render an audit montage of the real pre-event OLMo S1/S2 input periods."""
# ruff: noqa: D103
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageDraw, ImageFont

S2_FOLDER = "B01_B02_B03_B04_B05_B06_B07_B08_B8A_B09_B11_B12"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--anchor", default="source_provisional")
    parser.add_argument("--out", type=Path, required=True)
    return parser.parse_args()


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def layer_name(base: str, index: int) -> str:
    return base if index == 0 else f"{base}.{index}"


def stretch(values: np.ndarray, low: float, high: float) -> np.ndarray:
    scaled = (values.astype(np.float32) - low) / (high - low)
    return np.clip(scaled * 255, 0, 255).astype(np.uint8)


def s2_rgb(path: Path) -> Image.Image:
    with rasterio.open(path) as source:
        # Stored order is B01,B02,B03,B04,...; display uses fixed 0-3000 reflectance stretch.
        rgb = source.read([4, 3, 2])
    rgb = np.moveaxis(stretch(rgb, 0, 3000), 0, -1)
    return Image.fromarray(rgb)


def s1_pseudocolor(path: Path) -> Image.Image:
    with rasterio.open(path) as source:
        vv, vh = source.read([1, 2]).astype(np.float32)
    eps = 1e-6
    vv_db = 10 * np.log10(np.maximum(vv, eps))
    vh_db = 10 * np.log10(np.maximum(vh, eps))
    rgb = np.stack(
        [stretch(vv_db, -25, 0), stretch(vh_db, -30, -5), stretch(vv_db - vh_db, 0, 15)],
        axis=-1,
    )
    return Image.fromarray(rgb)


def main() -> None:
    args = parse_args()
    anchor_root = args.dataset / "windows" / "nepal" / args.anchor
    items = json.loads((anchor_root / "items.json").read_text(encoding="utf-8"))
    by_layer = {row["layer_name"]: row["serialized_item_groups"] for row in items}
    periods = []
    for index in range(4):
        s1_item = by_layer["sentinel1"][index][0]
        s2_item = by_layer["sentinel2_l2a"][index][0]
        periods.append({
            "index": index,
            "s1_date": s1_item["geometry"]["time_range"][0][:10],
            "s2_date": s2_item["geometry"]["time_range"][0][:10],
        })
    periods.reverse()  # chronological left-to-right

    tile = 256
    gap = 12
    left = 104
    header = 72
    footer = 42
    width = left + 4 * tile + 3 * gap
    height = header + 2 * tile + gap + footer
    canvas = Image.new("RGB", (width, height), (18, 20, 24))
    draw = ImageDraw.Draw(canvas)
    title_font = font(19)
    label_font = font(15)
    small_font = font(13)
    draw.text((16, 12), "OLMoEarth pre-event input audit · source_provisional", fill=(244, 246, 250), font=title_font)
    draw.text((16, 38), "fixed display stretches; model normalization is separate", fill=(164, 171, 184), font=small_font)
    draw.text((16, header + tile // 2 - 8), "S2 RGB", fill=(244, 246, 250), font=label_font)
    draw.text((16, header + tile + gap + tile // 2 - 8), "S1 RTC", fill=(244, 246, 250), font=label_font)

    for column, period in enumerate(periods):
        index = period["index"]
        x = left + column * (tile + gap)
        s2_path = anchor_root / "layers" / layer_name("sentinel2_l2a", index) / S2_FOLDER / "geotiff.tif"
        s1_path = anchor_root / "layers" / layer_name("sentinel1", index) / "vv_vh" / "geotiff.tif"
        canvas.paste(s2_rgb(s2_path), (x, header))
        canvas.paste(s1_pseudocolor(s1_path), (x, header + tile + gap))
        draw.text((x, header - 21), f"S2 {period['s2_date'][5:]}", fill=(244, 246, 250), font=small_font)
        draw.text((x, height - footer + 8), f"S1 {period['s1_date'][5:]}", fill=(164, 171, 184), font=small_font)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.out, optimize=True)
    print(json.dumps({"out": str(args.out), "size": list(canvas.size)}, sort_keys=True))


if __name__ == "__main__":
    main()
