#!/usr/bin/env python3
"""Contract-correct 27-window OLMoEarth change screening.

The event transition (baseline -> s1_live) is compared with one matched-location
ordinary transition (placebo_b -> baseline). The per-window p99 of the ordinary
transition is fixed before scoring the event transition. With only one ordinary
transition this is screening/ranking, not anomaly probability or a damage map.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from analyze_nepal_delta import cosine_delta, load_cube  # noqa: E402


REPO = Path(__file__).resolve().parents[1]
CROOT = REPO / "artifacts/external_data/nepal_olmo_live_v1/materialized_corridor"
EMB_LAYER = os.environ.get("EMB_LAYER", "embeddings")
OUT_NAME = os.environ.get("OUT_NAME", "corridor_sealed_s1db")
WINDOWS_MANIFEST = REPO / "artifacts/corridor_s2_candidates/prepare/windows_manifest.json"
S2_REPORT = REPO / "artifacts/corridor_s2_candidates/embed_v2/report.json"

WINDOW_NAMES = {
    "w00": "Rasuwagadhi impact corridor",
    "w21": "Bidur / Trishuli reach",
    "w22": "Bidur / Trishuli reach",
    "w23": "Devighat reach",
    "w24": "Lower Lhende upstream",
    "w25": "Middle Lhende upstream",
    "w26": "Langtang Lirung source estimate",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def embedding(mode: str, window_id: str) -> tuple[np.ndarray | None, Path | None]:
    root = CROOT / mode / "dataset/windows/nepal" / window_id / "layers" / EMB_LAYER
    files = sorted(root.rglob("*.tif")) if root.exists() else []
    if len(files) != 1:
        return None, None
    return load_cube(files[0]), files[0]


def main() -> None:
    windows_doc = json.loads(WINDOWS_MANIFEST.read_text())
    windows = {row["id"]: row for row in windows_doc["windows"]}
    s2_rank: dict[str, int | None] = {}
    if S2_REPORT.exists():
        s2_rank = {row["id"]: row.get("rank") for row in json.loads(S2_REPORT.read_text())["windows"]}

    manifests: dict[str, dict] = {}
    manifest_hashes: dict[str, str] = {}
    for mode in ("placebo_b", "baseline", "s1_live"):
        path = CROOT / mode / "embedding_manifest.json"
        if not path.exists():
            raise FileNotFoundError(f"missing embedding manifest: {path}")
        manifests[mode] = json.loads(path.read_text())
        manifest_hashes[mode] = sha256(path)
        if not manifests[mode].get("valid"):
            raise ValueError(f"invalid embedding manifest: {mode}")
        if manifests[mode].get("embedding_layer") not in (None, EMB_LAYER):
            raise ValueError(f"embedding layer mismatch: {mode}")
        found_count = manifests[mode].get("found_anchor_count", manifests[mode].get("found_count"))
        expected_count = manifests[mode].get("expected_anchor_count", manifests[mode].get("expected_count"))
        if found_count != len(windows) or expected_count != len(windows):
            raise ValueError(f"unexpected embedding count: {mode}")

    output_root = REPO / "artifacts/external_data/nepal_olmo_live_v1" / OUT_NAME
    delta_root = output_root / "deltas"
    delta_root.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []

    for window_id, meta in sorted(windows.items()):
        z_placebo, p_placebo = embedding("placebo_b", window_id)
        z_baseline, p_baseline = embedding("baseline", window_id)
        z_live, p_live = embedding("s1_live", window_id)
        if z_placebo is None or z_baseline is None or z_live is None:
            rows.append({"id": window_id, "status": "missing"})
            continue

        ordinary = cosine_delta(z_placebo, z_baseline)
        event = cosine_delta(z_baseline, z_live)
        threshold = float(np.quantile(ordinary, 0.99))
        np.save(delta_root / f"{window_id}_sealed_delta.npy", event.astype("float32"))
        np.save(delta_root / f"{window_id}_placebo_delta.npy", ordinary.astype("float32"))
        rows.append({
            "id": window_id,
            "name": WINDOW_NAMES.get(window_id, f"Corridor window {window_id}"),
            "kind": meta.get("kind", "corridor"),
            "center_lonlat": meta["center_lonlat"],
            "bounds_utm": meta["bounds_utm"],
            "status": "screened",
            "event_mean": float(event.mean()),
            "event_p95": float(np.quantile(event, 0.95)),
            "placebo_mean": float(ordinary.mean()),
            "placebo_p99": threshold,
            "frac_above_local_placebo_p99": float((event > threshold).mean()),
            "mean_ratio_event_to_placebo": float(event.mean() / max(ordinary.mean(), 1e-12)),
            "s2_only_rank": s2_rank.get(window_id),
            "embedding_sha256": {
                "placebo_b": sha256(p_placebo),
                "baseline": sha256(p_baseline),
                "s1_live": sha256(p_live),
            },
        })

    screened = [row for row in rows if row["status"] == "screened"]
    screened.sort(key=lambda row: (-row["frac_above_local_placebo_p99"], -row["event_mean"], row["id"]))
    for rank, row in enumerate(screened, start=1):
        row["rank"] = rank

    report = {
        "schema": "corridor-sealed-delta-s1db-v1",
        "model": "OLMoEarth v1 Base (frozen)",
        "embedding_layer": EMB_LAYER,
        "input_contract": {
            "sentinel1": "RTC VV/VH linear intensity -> Sentinel1ToDecibels -> OlmoEarthNormalize",
            "sentinel2": "L2A 12-band -> OlmoEarthNormalize",
            "temporal": "4 periods; baseline/live share the first three periods",
            "spatial": "2.56 km windows; 64x64 spatial tokens; 768-d per token",
        },
        "comparison": {
            "event": "baseline -> s1_live",
            "ordinary": "placebo_b -> baseline",
            "threshold": "per-window ordinary-transition token p99",
            "ordinary_transition_count": 1,
        },
        "n_windows": len(screened),
        "embedding_manifest_sha256": manifest_hashes,
        "windows_manifest_sha256": sha256(WINDOWS_MANIFEST),
        "windows": screened,
        "claim": "contract-correct, matched-location candidate-change screening; not damage, cause, extent, probability, or calibrated anomaly",
        "limitations": [
            "Only one matched-location ordinary transition is available per window.",
            "The local p99 is therefore a screening reference, not a population percentile.",
            "No Nepal event polygon or field label was used to validate the ranking.",
            "OLMoEarth embeddings fuse S1 and S2; this report does not attribute a score to one sensor.",
        ],
        "supersedes": "corridor_sealed/report.json (missing Sentinel1ToDecibels and borrowed invalid threshold)",
    }
    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"output": str(output_root / "report.json"), "n_windows": len(screened), "top": [r["id"] for r in screened[:6]]}))
    for row in screened[:10]:
        print(row["rank"], row["id"], row["name"],
              f"event>{row['frac_above_local_placebo_p99']:.3f}",
              f"event_mean={row['event_mean']:.5f}",
              f"ordinary_p99={row['placebo_p99']:.5f}")


if __name__ == "__main__":
    main()
