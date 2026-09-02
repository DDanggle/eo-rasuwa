"""Contour-band rendering for OlmoEarth Δz windows (2026-09-02 restyle).

40 m 토큰의 이산 블록 대신, 유효 셀만으로 정규화한 연속 장을 표시용으로만
스무딩해 등고선 밴드로 그린다. 규칙:
  - 구름/마스크 셀 위로는 절대 보간하지 않는다 (투명으로 남김)
  - 밝은 외곽선 하나가 평시(placebo) p99 경계 — 공개 수치와 같은 문턱
  - 밴드 색은 반투명이라 아래 위성영상/베이스맵이 비쳐 보인다
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

# inferno 계열, 위성영상 위에서 잘 읽히도록 알파를 계단식으로.
_PALETTE = np.array([
    [0, 0, 0, 0],          # < L0 : 평시 수준 — 완전 투명
    [255, 214, 102, 92],   # 옅은 앰버
    [255, 152, 61, 150],   # 오렌지
    [236, 82, 56, 196],    # 코럴
    [186, 24, 92, 232],    # 크림슨-마젠타
], dtype=np.uint8)
_LEVELS = [0.24, 0.44, 0.62, 0.80]
_THRESHOLD_LINE = np.array([255, 255, 255, 255], dtype=np.uint8)
_BAND_EDGE = np.array([255, 255, 255, 70], dtype=np.uint8)

VISUAL_LEGEND = (
    "colour bands = relative embedding change, smoothed for display only "
    "(native 40 m tokens; never interpolated across cloud); bright line = "
    "the pooled ordinary-transition p99 threshold; transparent = ordinary or unobserved"
)


def render_delta_contour(d_event: np.ndarray, valid: np.ndarray, threshold: float,
                         destination: Path, size: int = 512) -> None:
    d = np.where(valid, d_event.astype(float), np.nan)
    finite = d[np.isfinite(d)]
    if finite.size == 0:
        Image.fromarray(np.zeros((size, size, 4), np.uint8)).save(destination, optimize=True)
        return
    lo, hi = np.quantile(finite, [0.05, 0.99])
    hi = max(float(hi), float(lo) + 1e-8)
    scaled = np.clip((d - lo) / (hi - lo), 0, 1)

    # 스무딩 전에 무효 셀을 최근접 유효값으로 채우고, 스무딩 후 다시 가린다 —
    # 구름 가장자리에서 값이 0으로 새며 생기는 가짜 저변화 띠를 막기 위함.
    filled = np.nan_to_num(scaled)
    if (~valid).any() and valid.any():
        idx = ndimage.distance_transform_edt(~valid, return_distances=False, return_indices=True)
        filled = np.where(valid, filled, filled[tuple(idx)])
    smooth = ndimage.gaussian_filter(filled, sigma=0.9)
    big = np.clip(ndimage.zoom(smooth, size / d.shape[0], order=3), 0, 1)
    valid_big = ndimage.zoom(valid.astype(float), size / d.shape[0], order=0) > 0.5

    band = np.digitize(big, _LEVELS)
    rgba = _PALETTE[band].copy()

    edge = np.zeros(band.shape, bool)
    edge[1:, :] |= np.diff(band, axis=0) != 0
    edge[:, 1:] |= np.diff(band, axis=1) != 0
    rgba[edge & (band > 0)] = _BAND_EDGE

    threshold_scaled = (threshold - lo) / (hi - lo)
    if threshold_scaled < 1.0:
        over = (big > max(threshold_scaled, 0.0)).astype(np.int8)
        line = np.zeros(over.shape, bool)
        line[1:, :] |= np.diff(over, axis=0) != 0
        line[:, 1:] |= np.diff(over, axis=1) != 0
        rgba[ndimage.binary_dilation(line, iterations=1)] = _THRESHOLD_LINE

    rgba[~valid_big] = 0
    Image.fromarray(rgba).save(destination, optimize=True)
