from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin


def test_sealer_uses_materialized_window_contract(tmp_path: Path) -> None:
    run_root = tmp_path / "baseline"
    dataset = run_root / "dataset"
    window_ids = ["w00", "w01"]
    for window_id in window_ids:
        layer = dataset / "windows" / "nepal" / window_id / "layers" / "embeddings"
        layer.mkdir(parents=True)
        with rasterio.open(
            layer / "geotiff.tif",
            "w",
            driver="GTiff",
            width=64,
            height=64,
            count=768,
            dtype="float32",
            crs="EPSG:32645",
            transform=from_origin(0, 640, 10, 10),
        ) as dst:
            dst.write(np.zeros((768, 64, 64), dtype="float32"))

    (run_root / "materialization_manifest.json").write_text(
        json.dumps(
            {
                "mode": "baseline",
                "valid": True,
                "expected_anchor_count": 2,
                "found_anchor_count": 2,
            }
        ),
        encoding="utf-8",
    )
    snapshot = run_root / "code_snapshot" / "test"
    snapshot.mkdir(parents=True)

    script = Path(__file__).resolve().parents[1] / "code" / "seal_nepal_olmo_embeddings.py"
    subprocess.run(
        [sys.executable, str(script), "--dataset", str(dataset), "--mode", "baseline", "--code-snapshot", str(snapshot)],
        check=True,
    )

    manifest = json.loads((run_root / "embedding_manifest.json").read_text(encoding="utf-8"))
    assert manifest["valid"] is True
    assert manifest["expected_anchor_count"] == 2
    assert manifest["embedding_layer"] == "embeddings"
    assert manifest["inference_code_snapshot"] == str(snapshot)
    assert manifest["seal_code_snapshot"] == str(snapshot)
    assert [row["anchor"] for row in manifest["anchors"]] == window_ids
    assert all(row["bands"] == 768 and row["width"] == 64 and row["height"] == 64 for row in manifest["anchors"])
