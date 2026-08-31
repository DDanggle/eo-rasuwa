#!/usr/bin/env python3
"""M86: precision@k of the six review leads against frozen external extents.

Contract (pre-registered in web copy since 2026-08-29): freeze the external
flood/damage extents exactly as published, change no ranking and no threshold,
and score how many of the top-k leads intersect the frozen extents.  The 47
observable windows give the recall ceiling; the 41 non-lead windows give the
base rate a random reviewer would achieve.

Labels frozen 2026-08-31 (Sentinel Asia activation page, SHA256SUMS sealed):
- IWM  VAP02  PlanetScope flood extent, imagery to 2026-08-28 (vector)
- TASA Affected_0816_0828 FORMOSAT-5 flood extent (vector, EPSG:32645)
- JAXA ALOS-2 flood proxy extent 2026-08-28 06:20 (vector geojson)
- EOS-RS Sentinel-1 damage proxy 2026-08-28: archive sealed, but the KMZ only
  carries NetworkLink TMS tiles on a remote S3 host plus a coverage outline —
  no embedded raster — so it is EXCLUDED from v1 scoring (recorded below)

A window "hits" when its polygon intersects the union of the three vector
extents.  This is intersection at 2.56 km window scale — NOT damage area,
NOT per-building accuracy.  All labels are proxies published within days of
the event and may themselves contain errors; we freeze them as-is.
"""
from __future__ import annotations

import json
import hashlib
from datetime import UTC, datetime
from pathlib import Path

import fiona
from shapely.geometry import shape
from shapely.ops import transform as shp_transform, unary_union
from pyproj import Transformer

TO_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32645", always_xy=True).transform

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT

LABEL_ROOT = ARTIFACT_ROOT / "external_data/nepal_olmo_live_v1/external_labels_20260831"
LEADS = REPO_ROOT / "web/public/data/review-leads.geojson"
CANDIDATES = REPO_ROOT / "web/public/data/candidates.geojson"
OUT_DIR = REPO_ROOT / "artifacts/external_label_score"

VECTOR_LABELS = {
    "iwm_planetscope_vap02": LABEL_ROOT / "IWM_2026_08_26_Nepal_Flood_VAP02/IWM_2026_08_26_Nepal_Flood_VAP02.shp",
    "tasa_formosat5_0816_0828": LABEL_ROOT / "Affected_Flood_in_Rasuwa_District_Nepal/Affected_0816_0828.shp",
    "jaxa_alos2_fldext_20260828": LABEL_ROOT / "JAXA_20250828_FPM_ALOS2_Nepal_FLDEXT/JAXA_20250828_FPM_ALOS2_Nepal_FLDEXT/2026-00033-WLD_202608280620_FLDEXT.geojson",
}


def load_vector(path: Path):
    geoms = []
    with fiona.open(path) as collection:
        crs = collection.crs.to_string() if collection.crs else "EPSG:4326"
        for feature in collection:
            geoms.append(shape(feature["geometry"]))
    merged = unary_union(geoms)
    if crs not in ("EPSG:4326", "OGC:CRS84"):
        fwd = Transformer.from_crs(crs, "EPSG:4326", always_xy=True).transform
        merged = shp_transform(fwd, merged)
    return merged


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    labels = {name: load_vector(path) for name, path in VECTOR_LABELS.items()}
    union = unary_union(list(labels.values()))

    candidates = json.loads(CANDIDATES.read_text())["features"]
    leads = json.loads(LEADS.read_text())["features"]
    lead_ids = {f["properties"]["id"] for f in leads}

    rows = []
    for feature in candidates:
        props, geom = feature["properties"], shape(feature["geometry"])
        per = {name: bool(geom.intersects(g)) for name, g in labels.items()}
        geom_utm = shp_transform(TO_UTM, geom)
        union_utm = shp_transform(TO_UTM, union.intersection(geom.buffer(0.001).envelope))
        overlap_frac = geom_utm.intersection(union_utm).area / geom_utm.area if geom_utm.area else 0.0
        rows.append({
            "id": props["id"],
            "review_rank": props.get("review_rank"),
            "is_lead": props["id"] in lead_ids,
            "rank_pooled3": props.get("rank_pooled3"),
            "hits": per,
            "hit_vector_union": bool(geom.intersects(union)),
            "union_overlap_frac": round(overlap_frac, 5),
        })

    ranked_leads = sorted((r for r in rows if r["is_lead"]), key=lambda r: r["review_rank"])
    precision_at = {}
    for k in range(1, len(ranked_leads) + 1):
        top = ranked_leads[:k]
        precision_at[str(k)] = sum(r["hit_vector_union"] for r in top) / k
    non_leads = [r for r in rows if not r["is_lead"]]
    base_rate = sum(r["hit_vector_union"] for r in non_leads) / len(non_leads) if non_leads else None
    positives = [r for r in rows if r["hit_vector_union"]]
    lead_rows = [r for r in rows if r["is_lead"]]
    mean = lambda xs: sum(xs) / len(xs) if xs else None
    overlap_summary = {
        "lead_mean_overlap_frac": mean([r["union_overlap_frac"] for r in lead_rows]),
        "non_lead_mean_overlap_frac": mean([r["union_overlap_frac"] for r in non_leads]),
        "lead_overlaps": {r["id"]: r["union_overlap_frac"] for r in sorted(lead_rows, key=lambda x: x["review_rank"])},
    }

    report = {
        "schema": "external-label-score-v1",
        "measurement_id": "M86",
        "generated_at_utc": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "claim_boundary": (
            "window-level intersection with frozen third-party flood/damage proxies at 2.56 km scale; "
            "not damage confirmation, not area, not per-structure accuracy; labels are proxies frozen as published"
        ),
        "labels_frozen_at": "2026-08-31",
        "label_files_sha256": {
            "sealed_archives": (LABEL_ROOT / "SHA256SUMS").read_text().strip().splitlines(),
        },
        "ranking_unchanged": True,
        "excluded_labels": {
            "eosrs_s1_dpm_20260828": "KMZ is a NetworkLink TMS pyramid (remote tiles) with only a coverage outline; no embedded raster to score offline. Archive still sealed in SHA256SUMS."
        },
        "observable_windows": len(rows),
        "label_positive_windows": len(positives),
        "precision_at_k_vector_union": precision_at,
        "non_lead_base_rate_vector_union": base_rate,
        "union_overlap_area_fraction": overlap_summary,
        "leads": [
            {"id": r["id"], "review_rank": r["review_rank"], "hits": r["hits"],
             "hit_vector_union": r["hit_vector_union"]}
            for r in ranked_leads
        ],
        "windows": rows,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "report.json"
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: report[k] for k in
                      ("precision_at_k_vector_union", "non_lead_base_rate_vector_union",
                       "union_overlap_area_fraction", "label_positive_windows", "observable_windows")}, indent=1))
    print("leads:", [(r["id"], r["review_rank"], r["hit_vector_union"]) for r in ranked_leads])
    print("wrote", out)


if __name__ == "__main__":
    main()
