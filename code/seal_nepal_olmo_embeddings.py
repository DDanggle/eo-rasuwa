#!/usr/bin/env python3
"""Seal OLMoEarth 768-band COG outputs for a materialized Nepal window set."""
# ruff: noqa: D103
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import rasterio


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--mode", required=True)
    parser.add_argument("--code-snapshot", type=Path, required=True)
    parser.add_argument("--seal-code-snapshot", type=Path)
    parser.add_argument("--embedding-layer", default="embeddings")
    parser.add_argument("--manifest-name", default="embedding_manifest.json")
    parser.add_argument("--seal-name", default="EMBEDDING_SHA256SUMS")
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    args = parse_args()
    run_root = args.dataset.parent
    materialization_path = run_root / "materialization_manifest.json"
    if not materialization_path.exists():
        raise SystemExit(f"missing materialization manifest: {materialization_path}")
    materialization = json.loads(materialization_path.read_text(encoding="utf-8"))
    if not materialization.get("valid"):
        raise SystemExit("materialization manifest is not valid")
    if materialization.get("mode") != args.mode:
        raise SystemExit(f"materialization mode {materialization.get('mode')} != requested {args.mode}")

    windows_root = args.dataset / "windows" / "nepal"
    expected = sorted(path.name for path in windows_root.iterdir() if path.is_dir())
    expected_count = int(materialization.get("expected_anchor_count", len(expected)))
    found_count = int(materialization.get("found_anchor_count", len(expected)))
    if len(expected) != expected_count or found_count != expected_count:
        raise SystemExit(
            f"window contract mismatch: directories={len(expected)} "
            f"found={found_count} expected={expected_count}"
        )
    rows = []
    for anchor in expected:
        layer = args.dataset / "windows" / "nepal" / anchor / "layers" / args.embedding_layer
        candidates = sorted(layer.rglob("*.tif")) if layer.exists() else []
        if len(candidates) != 1:
            rows.append({"anchor": anchor, "valid": False, "reason": f"expected_one_tif_found_{len(candidates)}"})
            continue
        path = candidates[0]
        with rasterio.open(path) as source:
            metadata = {
                "bands": source.count,
                "width": source.width,
                "height": source.height,
                "crs": str(source.crs),
                "transform": list(source.transform)[:6],
                "dtype": source.dtypes[0],
            }
        valid_shape = metadata["bands"] == 768 and metadata["width"] == 64 and metadata["height"] == 64
        rows.append({
            "anchor": anchor,
            "valid": valid_shape,
            "path": str(path.relative_to(args.dataset)),
            "bytes": path.stat().st_size,
            "sha256": sha256_file(path),
            **metadata,
        })
    manifest = {
        "schema": "nepal-olmo-embeddings-v1",
        "created_at_utc": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "mode": args.mode,
        "model_id": "OLMOEARTH_V1_BASE",
        "embedding_dim": 768,
        "embedding_layer": args.embedding_layer,
        "expected_anchor_count": expected_count,
        "found_anchor_count": len(rows),
        "materialization_manifest_sha256": sha256_file(materialization_path),
        # code_snapshot is the immutable model-forward recipe. A recovery re-seal may use a
        # later validator snapshot, which is recorded separately instead of rewriting provenance.
        "code_snapshot": str(args.code_snapshot),
        "inference_code_snapshot": str(args.code_snapshot),
        "seal_code_snapshot": str(args.seal_code_snapshot or args.code_snapshot),
        "anchors": rows,
        "valid": len(rows) == expected_count and all(row["valid"] for row in rows),
    }
    out = args.dataset.parent / args.manifest_name
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    seal = args.dataset.parent / args.seal_name
    seal.write_text(f"{sha256_file(out)}  {out.name}\n", encoding="utf-8")
    print(json.dumps({"manifest": str(out), "valid": manifest["valid"], "seal_sha256": sha256_file(seal)}, sort_keys=True))
    if not manifest["valid"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
