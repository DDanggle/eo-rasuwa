#!/usr/bin/env python3
"""Recompute the documented M77/M78 summary from sealed local artifacts.

This is a read-only audit of existing experiment outputs. It does not run a
model and deliberately keeps the corridor-shared and control-local thresholds
separate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from nepal_paths import ARTIFACT_ROOT, REPO_ROOT


CONTROL_REPORT = ARTIFACT_ROOT / "corridor_s2_candidates/embed_ctrl/report.json"
CONTROL_DELTA = ARTIFACT_ROOT / "corridor_s2_candidates/embed_ctrl/deltas/x001_delta.npz"
CORRIDOR_REPORT = ARTIFACT_ROOT / "corridor_s2_candidates/embed_scan_v2/report.json"
RADAR_REPORT = ARTIFACT_ROOT / "sen12_radar_value/report.json"
RADAR_CODE = REPO_ROOT / "code/sen12_radar_value.py"
OUT = REPO_ROOT / "artifacts/nepal_m77_m78_audit.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    control = json.loads(CONTROL_REPORT.read_text())
    corridor = json.loads(CORRIDOR_REPORT.read_text())
    radar = json.loads(RADAR_REPORT.read_text())

    if control.get("schema") != "corridor-s2-candidates-v2":
        raise ValueError("unexpected M77 report schema")
    if radar.get("schema") != "sen12-radar-value-v2":
        raise ValueError("unexpected M78 report schema")

    tadi_row = next(row for row in control["windows"] if row["id"] == "x001")
    delta = np.load(CONTROL_DELTA)
    event = delta["d_event"]
    valid = delta["valid_event"].astype(bool)
    common_threshold = float(corridor["threshold_placebo_p99"])
    local_threshold = float(control["threshold_placebo_p99"])
    common_count = int((event[valid] > common_threshold).sum())
    local_count = int((event[valid] > local_threshold).sum())
    valid_count = int(valid.sum())
    common_fraction = common_count / valid_count
    local_fraction = local_count / valid_count
    corridor_top = corridor["top10"][0]

    measured = [row for row in radar["regions"].values() if row.get("patches", 0) > 0]
    excluded = [name for name, row in radar["regions"].items() if row.get("patches", 0) == 0]
    s1_gate_regions = [
        name for name, row in radar["regions"].items()
        if row.get("patches", 0) > 0 and row["auroc_s1_only_olmo"] >= 0.70
    ]
    olmo_over_classical = [
        name for name, row in radar["regions"].items()
        if row.get("patches", 0) > 0
        and row["auroc_s1_only_olmo"] > row["auroc_s1_classical_logratio"]
    ]

    report = {
        "schema": "nepal-m77-m78-audit-v1",
        "m77": {
            "control": "Tadi Khola (x001)",
            "valid_event_tokens": valid_count,
            "observability_fraction": float(tadi_row["valid_event_frac"]),
            "delta_event_mean": float(tadi_row["d_event_mean"]),
            "delta_placebo_mean": float(tadi_row["d_placebo_mean"]),
            "corridor_shared_threshold": common_threshold,
            "candidate_under_corridor_threshold": {
                "count": common_count,
                "fraction": common_fraction,
            },
            "control_local_threshold": local_threshold,
            "candidate_under_control_local_threshold": {
                "count": local_count,
                "fraction": local_fraction,
            },
            "corridor_top": {
                "id": corridor_top["id"],
                "fraction": float(corridor_top["candidate_token_frac"]),
            },
            "common_threshold_ratio_to_corridor_top": (
                common_fraction / float(corridor_top["candidate_token_frac"])
            ),
            "claim": (
                "Putative no-event control with event mean close to its ordinary mean. "
                "The 3.6% figure is the fair corridor-shared-threshold comparison; "
                "the sealed control-local report records 0.55%. It is not a field-verified no-change label."
            ),
        },
        "m78": {
            "evaluated_regions": len(measured),
            "evaluated_patches": int(sum(row["patches"] for row in measured)),
            "excluded_regions": excluded,
            "fusion_gain_positive_regions": int(sum(row["gain"] > 0 for row in measured)),
            "fusion_gain_gate": 0.03,
            "fusion_gate_pass_regions": int(sum(row["gain"] >= 0.03 for row in measured)),
            "maximum_fusion_gain": float(max(row["gain"] for row in measured)),
            "s1_only_gate": 0.70,
            "s1_only_gate_regions": s1_gate_regions,
            "olmo_over_classical_regions": olmo_over_classical,
            "claim": (
                "S1-only OLMoEarth clears AUROC 0.70 in 2/7 regions, while S1+S2 clears "
                "the pre-registered +0.03 gain gate in 0/7. This establishes conditional "
                "S1 representation value, not a general through-cloud benefit."
            ),
            "limitations": [
                "Patch and timestamp selection is driven by the four clearest S2 observations on each side; no cloudy S2 stratum is evaluated.",
                "AUROC pools spatial tokens within each region; no spatial-block confidence interval is present.",
                "There is one frozen model recipe and no seed or matched second-GeoFM control.",
                "Indonesia and Thrissur are excluded because four distinct S1 observations per side were unavailable.",
            ],
        },
        "sha256": {
            "corridor_s2_candidates/embed_ctrl/report.json": sha256(CONTROL_REPORT),
            "corridor_s2_candidates/embed_ctrl/deltas/x001_delta.npz": sha256(CONTROL_DELTA),
            "corridor_s2_candidates/embed_scan_v2/report.json": sha256(CORRIDOR_REPORT),
            "sen12_radar_value/report.json": sha256(RADAR_REPORT),
            "code/sen12_radar_value.py": sha256(RADAR_CODE),
        },
    }

    assert report["m77"]["candidate_under_corridor_threshold"]["count"] == 124
    assert report["m77"]["candidate_under_control_local_threshold"]["count"] == 19
    assert report["m78"]["evaluated_regions"] == 7
    assert report["m78"]["evaluated_patches"] == 690
    assert report["m78"]["fusion_gate_pass_regions"] == 0
    assert report["m78"]["s1_only_gate_regions"] == ["hokkaido", "hiroshima"]

    OUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "output": str(OUT),
        "m77_common_fraction": common_fraction,
        "m77_local_fraction": local_fraction,
        "m78_regions": len(measured),
        "m78_patches": sum(row["patches"] for row in measured),
        "m78_fusion_gate_pass": report["m78"]["fusion_gate_pass_regions"],
        "m78_s1_gate_regions": s1_gate_regions,
    }))


if __name__ == "__main__":
    main()
