#!/usr/bin/env python3
"""Audit and seal a materialized Nepal rslearn input cube."""
# ruff: noqa: D103
from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path

from nepal_paths import ARTIFACT_ROOT


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--mode", required=True)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    args = parse_args()
    windows_root = args.dataset / "windows" / "nepal"
    expected = {"source_provisional", "rasuwagadhi", "timure", "syabrubesi", "dhunche"}
    # ANCHOR_SET=corridor (2026-08-29): M69 회랑 27창을 같은 봉인 계약으로 검사함
    if os.environ.get("ANCHOR_SET") == "corridor":
        wm = ARTIFACT_ROOT / "corridor_s2_candidates/prepare/windows_manifest.json"
        expected = {w["id"] for w in json.loads(wm.read_text())["windows"]}
    found = {path.name for path in windows_root.iterdir() if path.is_dir()}
    missing = sorted(expected - found)
    file_rows = []
    for path in sorted(args.dataset.rglob("*")):
        if not path.is_file() or path.name in {"materialization_manifest.json", "SHA256SUMS"}:
            continue
        file_rows.append({
            "path": str(path.relative_to(args.dataset)),
            "bytes": path.stat().st_size,
            "sha256": sha256_file(path),
        })
    layers = {
        layer: sum(f"/{layer}/" in f"/{row['path']}/" for row in file_rows)
        for layer in ("sentinel1", "sentinel2_l2a")
    }
    period_audit = {}
    expected_layer_dirs = {
        layer: {layer, f"{layer}.1", f"{layer}.2", f"{layer}.3"}
        for layer in ("sentinel1", "sentinel2_l2a")
    }
    for anchor in sorted(expected & found):
        items = json.loads((windows_root / anchor / "items.json").read_text(encoding="utf-8"))
        prepared = {
            row["layer_name"]: len(row.get("serialized_item_groups", []))
            for row in items
        }
        selected_dates = {
            row["layer_name"]: sorted(
                item["geometry"]["time_range"][0][:10]
                for group in row.get("serialized_item_groups", [])
                for item in group
            )
            for row in items
        }
        layer_root = windows_root / anchor / "layers"
        completed = {
            layer: sorted(
                path.name for path in layer_root.iterdir()
                if path.is_dir() and path.name in layer_dirs and (path / "completed").exists()
            ) if layer_root.exists() else []
            for layer, layer_dirs in expected_layer_dirs.items()
        }
        period_audit[anchor] = {
            "prepared_groups": prepared,
            "completed_layers": completed,
            "selected_dates": selected_dates,
        }
    exact_four_periods = all(
        audit["prepared_groups"].get(layer) == 4
        and set(audit["completed_layers"].get(layer, [])) == expected_layer_dirs[layer]
        for audit in period_audit.values()
        for layer in expected_layer_dirs
    ) and len(period_audit) == len(expected)
    if args.mode == "baseline":
        required_scene_present = all(
            all(date < "2026-08-26" for dates in audit["selected_dates"].values() for date in dates)
            for audit in period_audit.values()
        )
        required_scene_rule = "all selected observations predate 2026-08-26"
    elif args.mode == "s2_live":
        required_scene_present = all(
            "2026-08-27" in audit["selected_dates"].get("sentinel2_l2a", [])
            for audit in period_audit.values()
        )
        required_scene_rule = "every anchor includes Sentinel-2 2026-08-27"
    elif args.mode == "s1_live":
        required_scene_present = all(
            "2026-08-28" in audit["selected_dates"].get("sentinel1", [])
            for audit in period_audit.values()
        )
        required_scene_rule = "every anchor includes Sentinel-1 2026-08-28"
    elif args.mode in ("placebo_a", "placebo_b") or args.mode.startswith("placebo_2026"):
        # placebo는 사건 전 구간만 담아야 한다. END는 각각 08-12 / 08-19 —
        # 어느 쪽이든 이벤트(08-26)와 그 이후 관측이 섞이면 placebo가 아니다.
        cutoff = {"placebo_a": "2026-08-12", "placebo_b": "2026-08-19"}.get(args.mode)
        if cutoff is None:  # placebo_YYYYMMDD (2026-08-29 주 단위 확장): END 날짜가 곧 cutoff
            d = args.mode.split("_")[1]
            cutoff = f"{d[:4]}-{d[4:6]}-{d[6:8]}"
        required_scene_present = all(
            all(date < cutoff for dates in audit["selected_dates"].values() for date in dates)
            for audit in period_audit.values()
        )
        required_scene_rule = f"all selected observations predate {cutoff} (pre-event placebo)"
    else:
        required_scene_present = False
        required_scene_rule = f"unknown mode: {args.mode}"
    manifest = {
        "schema": "nepal-olmo-materialization-v1",
        "created_at_utc": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "mode": args.mode,
        "time_range": [args.start, args.end],
        "expected_anchor_count": len(expected),
        "found_anchor_count": len(found & expected),
        "missing_anchors": missing,
        "period_contract": "4 x 14-day rolling periods",
        "olmo_inputs": {
            "sentinel1": ["vv", "vh"],
            "sentinel2_l2a": ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B09", "B11", "B12"],
        },
        "layer_file_counts": layers,
        "period_audit": period_audit,
        "exact_four_periods_per_modality": exact_four_periods,
        "required_scene_rule": required_scene_rule,
        "required_scene_present": required_scene_present,
        "file_count": len(file_rows),
        "total_bytes": sum(row["bytes"] for row in file_rows),
        "files": file_rows,
        "valid": not missing and exact_four_periods and required_scene_present,
    }
    manifest_path = args.dataset.parent / "materialization_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    sums_path = args.dataset.parent / "SHA256SUMS"
    sums_path.write_text(
        f"{sha256_file(manifest_path)}  {manifest_path.name}\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "manifest": str(manifest_path),
        "valid": manifest["valid"],
        "layer_file_counts": layers,
        "total_bytes": manifest["total_bytes"],
        "seal_sha256": sha256_file(sums_path),
    }, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
