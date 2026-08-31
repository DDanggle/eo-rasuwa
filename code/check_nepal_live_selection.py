#!/usr/bin/env python3
"""Fail fast when rslearn selected a stale scene for a Nepal live cube.

`dataset prepare` only writes item selections and is cheap.  Materialization is
network-heavy, so live modes must prove that every anchor selected the required
post-event acquisition before downloading any pixels.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


REQUIREMENTS = {
    "s2_live": ("sentinel2_l2a", "20260827"),
    "s1_live": ("sentinel1", "20260828"),
    "s1_live_0831": ("sentinel1", "20260831"),
}


def item_names(layer: dict[str, Any]) -> list[str]:
    names: list[str] = []
    for group in layer.get("serialized_item_groups", []):
        for item in group:
            name = item.get("name")
            if isinstance(name, str):
                names.append(name)
    return names


def audit(dataset: Path, mode: str) -> dict[str, Any]:
    layer_name, required_token = REQUIREMENTS[mode]
    windows_root = dataset / "windows" / "nepal"
    anchors = []
    for items_path in sorted(windows_root.glob("*/items.json")):
        payload = json.loads(items_path.read_text())
        layer = next((entry for entry in payload if entry.get("layer_name") == layer_name), None)
        names = item_names(layer) if layer else []
        matches = sorted(name for name in names if required_token in name)
        anchors.append(
            {
                "anchor": items_path.parent.name,
                "layer": layer_name,
                "required_token": required_token,
                "selected_names": names,
                "required_matches": matches,
                "valid": bool(matches),
            }
        )

    expected_anchor_count = int(os.environ.get("EXPECTED_ANCHORS", "5"))
    valid = len(anchors) == expected_anchor_count and all(row["valid"] for row in anchors)
    return {
        "schema": "nepal-olmo-live-selection-preflight-v1",
        "evaluated_at_utc": datetime.now(UTC).isoformat(),
        "dataset": str(dataset),
        "mode": mode,
        "required_layer": layer_name,
        "required_token": required_token,
        "expected_anchor_count": expected_anchor_count,
        "anchor_count": len(anchors),
        "valid": valid,
        "reason": "required_scene_selected_for_every_anchor" if valid else "required_scene_missing_from_one_or_more_anchors",
        "anchors": anchors,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--mode", choices=sorted(REQUIREMENTS), required=True)
    args = parser.parse_args()

    result = audit(args.dataset, args.mode)
    output = args.dataset.parent / "selection_preflight.json"
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"output": str(output), "mode": args.mode, "valid": result["valid"], "reason": result["reason"]}))
    if not result["valid"]:
        raise SystemExit(4)


if __name__ == "__main__":
    main()
