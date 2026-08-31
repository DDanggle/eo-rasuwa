#!/usr/bin/env python3
"""Audit whether a planned Sentinel acquisition actually covered the Nepal AOI.

The point catalogue correctly returns no product when the AOI falls between
adjacent GRD footprints, but that alone cannot distinguish publication delay
from a real swath/product gap.  This script queries a wider regional envelope,
preserves the raw official response, tests the AOI against every published
footprint, and seals the result without overwriting earlier audits.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config", type=Path, default=REPO_ROOT / "config/nepal_olmo_live_20260826.json"
    )
    parser.add_argument("--pass-id", default="s1d_20260828")
    parser.add_argument(
        "--out",
        type=Path,
        default=ARTIFACT_ROOT / "external_data/nepal_olmo_live_v1/coverage",
    )
    parser.add_argument("--half-span-deg", type=float, default=1.2)
    parser.add_argument("--timeout", type=float, default=60.0)
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def iter_points(value: Any) -> Iterable[tuple[float, float]]:
    if (
        isinstance(value, list)
        and len(value) >= 2
        and isinstance(value[0], (int, float))
        and isinstance(value[1], (int, float))
    ):
        yield float(value[0]), float(value[1])
        return
    if isinstance(value, list):
        for child in value:
            yield from iter_points(child)


def point_in_ring(lon: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i, point in enumerate(ring):
        xi, yi = float(point[0]), float(point[1])
        xj, yj = float(ring[j][0]), float(ring[j][1])
        crosses = (yi > lat) != (yj > lat)
        if crosses:
            x_cross = (xj - xi) * (lat - yi) / ((yj - yi) or 1e-15) + xi
            if lon < x_cross:
                inside = not inside
        j = i
    return inside


def geometry_contains(geometry: dict[str, Any], lon: float, lat: float) -> bool:
    coordinates = geometry.get("coordinates") or []
    if geometry.get("type") == "Polygon":
        return bool(coordinates and point_in_ring(lon, lat, coordinates[0]))
    if geometry.get("type") == "MultiPolygon":
        return any(polygon and point_in_ring(lon, lat, polygon[0]) for polygon in coordinates)
    return False


def main() -> None:
    args = parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    planned = next(
        (row for row in config["planned_acquisitions"] if row["id"] == args.pass_id), None
    )
    if planned is None:
        raise SystemExit(f"unknown pass id: {args.pass_id}")

    lon, lat = config["catalog"]["query_point_lon_lat"]
    operational_anchors = config.get("operational_anchors") or [
        {"id": "catalog_aoi", "name": "catalog AOI", "lon": lon, "lat": lat}
    ]
    d = args.half_span_deg
    polygon = (
        f"POLYGON(({lon-d} {lat-d},{lon+d} {lat-d},{lon+d} {lat+d},"
        f"{lon-d} {lat+d},{lon-d} {lat-d}))"
    )
    collection = "SENTINEL-1" if planned["sensor"].startswith("Sentinel-1") else "SENTINEL-2"
    expression = " and ".join(
        [
            f"Collection/Name eq '{collection}'",
            f"contains(Name,'{planned['expected_product_substring']}')",
            f"OData.CSC.Intersects(area=geography'SRID=4326;{polygon}')",
        ]
    )
    url = config["catalog"]["endpoint"] + "?" + urllib.parse.urlencode(
        {"$filter": expression, "$orderby": "ContentDate/Start asc", "$top": "100"}
    )
    request = urllib.request.Request(
        url, headers={"User-Agent": "olmoearth-nepal-coverage-audit/1.0"}
    )
    with urllib.request.urlopen(request, timeout=args.timeout) as response:
        raw = json.load(response)

    timestamp = datetime.now(UTC)
    snapshot_id = timestamp.strftime("%Y%m%dT%H%M%SZ")
    destination = args.out / snapshot_id
    if destination.exists():
        raise SystemExit(f"refusing to overwrite existing coverage audit: {destination}")
    destination.mkdir(parents=True)
    raw_path = destination / "raw_regional_products.json"
    raw_path.write_text(json.dumps(raw, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    products = []
    covered = []
    full_contract_covered = []
    for product in raw.get("value", []):
        geometry = product.get("GeoFootprint") or {}
        coordinates = list(iter_points(geometry.get("coordinates")))
        bounds = None
        if coordinates:
            xs = [point[0] for point in coordinates]
            ys = [point[1] for point in coordinates]
            bounds = [min(xs), min(ys), max(xs), max(ys)]
        contains = geometry_contains(geometry, lon, lat)
        covered_anchor_ids = [
            anchor["id"] for anchor in operational_anchors
            if geometry_contains(geometry, float(anchor["lon"]), float(anchor["lat"]))
        ]
        covers_all_operational_anchors = len(covered_anchor_ids) == len(operational_anchors)
        row = {
            "id": product.get("Id"),
            "name": product.get("Name"),
            "sensing_start_utc": (product.get("ContentDate") or {}).get("Start"),
            "sensing_end_utc": (product.get("ContentDate") or {}).get("End"),
            "publication_utc": product.get("PublicationDate"),
            "bounds_lon_lat": bounds,
            "contains_aoi_point": contains,
            "covered_operational_anchor_ids": covered_anchor_ids,
            "covers_all_operational_anchors": covers_all_operational_anchors,
            "direct_url": (
                f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({product.get('Id')})"
            ),
        }
        products.append(row)
        if contains:
            covered.append(row)
        if covers_all_operational_anchors:
            full_contract_covered.append(row)

    anchor_coverage = {
        anchor["id"]: sum(
            anchor["id"] in product["covered_operational_anchor_ids"] for product in products
        )
        for anchor in operational_anchors
    }
    if full_contract_covered:
        status = "operational_anchors_covered"
        reason = "one_or_more_published_product_footprints_cover_all_operational_anchors"
    elif covered:
        status = "partial_anchor_coverage"
        reason = "catalog_aoi_is_covered_but_no_single_product_covers_all_operational_anchors"
    elif products:
        status = "missed_coverage"
        reason = "regional_products_published_but_aoi_falls_outside_all_footprints"
    else:
        status = "no_regional_product_seen"
        reason = "no_matching_regional_product_was_published_at_audit_time"

    audit = {
        "schema": "nepal-sentinel-coverage-audit-v1",
        "evaluated_at_utc": timestamp.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "pass_id": args.pass_id,
        "sensor": planned["sensor"],
        "planned_window_utc": [planned["start_utc"], planned["end_utc"]],
        "expected_product_substring": planned["expected_product_substring"],
        "aoi_point_lon_lat": [lon, lat],
        "regional_query_bounds_lon_lat": [lon - d, lat - d, lon + d, lat + d],
        "status": status,
        "reason": reason,
        "regional_product_count": len(products),
        "aoi_covering_product_count": len(covered),
        "operational_anchor_count": len(operational_anchors),
        "operational_anchor_ids": [anchor["id"] for anchor in operational_anchors],
        "operational_anchor_covering_product_count": len(full_contract_covered),
        "anchor_coverage_product_counts": anchor_coverage,
        "products": products,
        "query_url": url,
        "claim_boundary": (
            "Nearby acquisitions and one covered point do not prove the five-anchor contract; "
            "only per-anchor footprint containment does."
        ),
    }
    audit_path = destination / "coverage_audit.json"
    audit_path.write_text(json.dumps(audit, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    sums = destination / "SHA256SUMS"
    sums.write_text(
        f"{sha256_file(raw_path)}  {raw_path.name}\n{sha256_file(audit_path)}  {audit_path.name}\n",
        encoding="utf-8",
    )
    (args.out / "LATEST").write_text(snapshot_id + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "snapshot": str(destination),
                "pass_id": args.pass_id,
                "status": status,
                "regional_products": len(products),
                "aoi_covering_products": len(covered),
                "operational_anchor_covering_products": len(full_contract_covered),
                "operational_anchor_count": len(operational_anchors),
                "seal_sha256": sha256_file(sums),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
