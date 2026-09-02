#!/usr/bin/env python3
"""Corridor-wide observed-change field: 100개 스캔 창의 Δz를 한 장으로 모자이크.

위험도·예측이 아니라 **관측된 임베딩 변화**의 연속 표시다. 겹치는 창은 유효 셀만
평균하고, 어떤 창에서도 관측되지 않은 곳은 투명이다. 밴드 경계는 절대 Δz 값이며
밝은 선은 공개 수치와 같은 pooled three-pair p99다.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage
from pyproj import Transformer

REPO = Path(__file__).resolve().parents[2]
SCAN = REPO / "research-private/artifacts/corridor_s2_candidates/embed_scan_v2"
PUB = REPO / "web/public/data"
RES = 40.0  # m/px — 토큰 원 해상도 그대로

scenario = json.loads((PUB / "scenario.json").read_text())
P99 = float(scenario["placebo_extended"]["threshold_pooled3"])

wins = []
for f in sorted(SCAN.glob("deltas/v*_delta.npz")):
    z = np.load(f)
    wins.append((f.name.split("_")[0], z["d_event"].astype(float), z["valid_event"], z["bounds_utm"]))
print("windows:", len(wins))

xs = [b for _, _, _, b in wins]
minx = min(b[0] for b in xs); miny = min(b[1] for b in xs)
maxx = max(b[2] for b in xs); maxy = max(b[3] for b in xs)
W = int(round((maxx - minx) / RES)); H = int(round((maxy - miny) / RES))
print("mosaic grid:", W, "x", H)

acc = np.zeros((H, W), np.float64); n = np.zeros((H, W), np.int32)
for wid, d, valid, b in wins:
    x0 = int(round((b[0] - minx) / RES)); y0 = int(round((maxy - b[3]) / RES))
    h, w = d.shape
    dv = np.where(valid, d, 0.0)
    acc[y0:y0 + h, x0:x0 + w] += dv
    n[y0:y0 + h, x0:x0 + w] += valid.astype(np.int32)
field = np.where(n > 0, acc / np.maximum(n, 1), np.nan)
valid = n > 0
print("observed px:", int(valid.sum()), f"({100*valid.mean():.1f}%)")

# 표시: 절대 Δz 밴드. p99가 3번째 경계(코럴 시작) — 창별 그림과 같은 팔레트.
SS = 2  # 표시 확대배율 (부드러운 등고선용)
filled = np.nan_to_num(field)
if (~valid).any():
    idx = ndimage.distance_transform_edt(~valid, return_distances=False, return_indices=True)
    filled = np.where(valid, filled, filled[tuple(idx)])
smooth = ndimage.gaussian_filter(filled, sigma=1.0)
big = ndimage.zoom(smooth, SS, order=3)
validB = ndimage.zoom(valid.astype(float), SS, order=0) > 0.5
LEVELS = [0.14, 0.22, P99, 0.42]
PAL = np.array([
    [0, 0, 0, 0],
    [70, 22, 105, 96],
    [150, 44, 128, 140],
    [226, 78, 60, 185],
    [250, 156, 42, 220],
], np.uint8)
band = np.digitize(big, LEVELS)
rgba = PAL[band].copy()
edge = np.zeros(band.shape, bool)
edge[1:, :] |= np.diff(band, axis=0) != 0
edge[:, 1:] |= np.diff(band, axis=1) != 0
rgba[edge & (band > 0)] = [255, 246, 232, 90]
over = (big > P99).astype(np.int8)
line = np.zeros(over.shape, bool)
line[1:, :] |= np.diff(over, axis=0) != 0
line[:, 1:] |= np.diff(over, axis=1) != 0
rgba[ndimage.binary_dilation(line, iterations=1)] = [255, 250, 225, 255]
rgba[~validB] = 0
Image.fromarray(rgba).save(PUB / "change-field.png", optimize=True)

to_ll = Transformer.from_crs("EPSG:32645", "EPSG:4326", always_xy=True)
tl = to_ll.transform(minx, maxy); tr = to_ll.transform(maxx, maxy)
br = to_ll.transform(maxx, miny); bl = to_ll.transform(minx, miny)
meta = {
    "schema": "corridor-change-field-v1",
    "image": "/data/change-field.png",
    "coordinates": [list(tl), list(tr), list(br), list(bl)],
    "claim": "observed embedding-change field mosaicked from the 100 scan windows; display smoothing only; NOT risk, NOT damage, NOT a forecast",
    "threshold_pooled3": P99,
    "levels": LEVELS,
    "windows": len(wins),
    "resolution_m": RES,
}
(PUB / "change-field.json").write_text(json.dumps(meta, indent=2) + "\n")
kb = (PUB / "change-field.png").stat().st_size // 1024
print("saved change-field.png", f"{kb} KB", "corners:", [f"{c[0]:.3f},{c[1]:.3f}" for c in meta["coordinates"]])
