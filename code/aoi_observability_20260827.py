#!/usr/bin/env python3
"""8/27 S2B의 AOI 단위 관측성 — 타일 구름률(78.47%)을 앵커별 실측으로 대체함.

주의(정직성): 우리 큐브에는 SCL이 없음(12 반사도 밴드만). 따라서 이것은 공식
구름 마스크가 아니라 **밝기 휴리스틱**임 — B02(청색) > BRIGHT_DN 픽셀 비율을
"밝음(구름 또는 눈)"으로 셈. 히말라야 고지대라 눈/구름이 섞이며, 그 한계를 그대로 표기함.
zero = nodata(스와스 밖)도 따로 셈.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
import numpy as np
import rasterio

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT

DEFAULT_ROOT = ARTIFACT_ROOT / "external_data/nepal_olmo_live_v1/materialized/s2_live/dataset/windows/nepal"
BAND_DIR = "B01_B02_B03_B04_B05_B06_B07_B08_B8A_B09_B11_B12"
BRIGHT_DN = 2600   # 진단용 threshold. cloud classifier나 사전등록 지표가 아님.
DEFAULT_OUT = REPO_ROOT / "artifacts/aoi_observability_20260827.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def latest_layer(anchor: Path) -> Path | None:
    # 8/27이 든 레이어 = items.json 그룹 0 (최신). 레이어 디렉터리는 무접미사.
    p = anchor / "layers/sentinel2_l2a" / BAND_DIR / "geotiff.tif"
    return p if p.exists() else None

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.root.is_dir():
        raise SystemExit(
            f"missing materialized S2 root: {args.root}\n"
            "Set NEPAL_ARTIFACT_ROOT or pass --root explicitly."
        )
    res = {"schema": "aoi-observability-20260827-v2",
           "created_at_utc": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
           "scene_id": "S2B_MSIL2A_20260827T045659_R119_T45RUM_20260827T084453",
           "metric": "b02_bright_pixel_fraction",
           "threshold_dn": BRIGHT_DN,
           "method": f"B02 > {BRIGHT_DN} DN → bright(cloud OR snow); zero-all-bands → nodata. SCL 없음 — 휴리스틱임",
           "claim_boundary": "bright fraction is not cloud fraction; not-bright pixels are not necessarily cloud-free",
           "anchors": {}}
    for anchor in sorted(args.root.iterdir()):
        if not anchor.is_dir():
            continue
        tif = latest_layer(anchor)
        if tif is None:
            res["anchors"][anchor.name] = None
            continue
        with rasterio.open(tif) as src:
            arr = src.read().astype(np.float32)
        b02 = arr[1] if arr.shape[0] >= 12 else arr[0]
        nodata = arr.sum(axis=0) == 0
        valid = ~nodata
        bright = (b02 > BRIGHT_DN) & valid
        bright_fraction = float(bright.sum() / max(1, valid.sum()))
        res["anchors"][anchor.name] = {
            "pixels": int(valid.size),
            "nodata_frac": round(float(nodata.mean()), 4),
            "bright_frac_of_valid": round(bright_fraction, 4),
            "not_bright_frac_of_valid": round(1 - bright_fraction, 4),
            "source_raster_sha256": sha256(tif),
        }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(res, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
