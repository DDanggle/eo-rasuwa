#!/usr/bin/env python3
"""Seal the official 60-day Sentinel catalog for the Nepal OLMo live track.

This script downloads metadata, not full SAFE archives.  It preserves the raw
Copernicus OData responses, writes a compact normalized catalog, evaluates the
pre-registered acquisition schedule, and hashes every artifact.  Re-running it
creates a new timestamped snapshot rather than overwriting prior evidence.
"""
# ruff: noqa: D103
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import time
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT

COLLECTIONS = {
    "sentinel2_l2a": {
        "collection": "SENTINEL-2",
        "name_filter": "contains(Name,'MSIL2A')",
    },
    "sentinel1_grd": {
        "collection": "SENTINEL-1",
        "name_filter": "contains(Name,'IW_GRDH')",
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config",
        type=Path,
        default=REPO_ROOT / "config/nepal_olmo_live_20260826.json",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=ARTIFACT_ROOT / "external_data/nepal_olmo_live_v1/catalog",
    )
    parser.add_argument(
        "--now",
        help="UTC ISO timestamp for reproducible tests; default is current time",
    )
    parser.add_argument("--timeout", type=float, default=60.0)
    parser.add_argument("--retries", type=int, default=4)
    return parser.parse_args()


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def iso_z(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def get_json(url: str, timeout: float, retries: int) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "olmoearth-nepal-live-catalog/1.0"},
    )
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.load(response)
        except Exception as error:  # noqa: BLE001
            last_error = error
            if attempt + 1 < retries:
                time.sleep(2**attempt)
    raise RuntimeError(f"catalog request failed after {retries} attempts: {last_error}")


def build_url(config: dict[str, Any], spec: dict[str, str], now: datetime) -> str:
    catalog = config["catalog"]
    lon, lat = catalog["query_point_lon_lat"]
    configured_end = parse_time(catalog["end_utc"])
    query_end = min(configured_end, now)
    point = f"OData.CSC.Intersects(area=geography'SRID=4326;POINT({lon} {lat})')"
    expression = " and ".join(
        [
            f"Collection/Name eq '{spec['collection']}'",
            point,
            f"ContentDate/Start ge {catalog['start_utc'].replace('Z', '.000Z')}",
            f"ContentDate/Start le {iso_z(query_end).replace('Z', '.000Z')}",
            spec["name_filter"],
        ]
    )
    params = {
        "$filter": expression,
        "$orderby": "ContentDate/Start asc",
        "$top": "1000",
        "$expand": "Attributes",
    }
    return f"{catalog['endpoint']}?{urllib.parse.urlencode(params)}"


def attribute_map(product: dict[str, Any]) -> dict[str, Any]:
    return {item["Name"]: item.get("Value") for item in product.get("Attributes", [])}


def normalized_scene(collection_key: str, product: dict[str, Any]) -> dict[str, Any]:
    attributes = attribute_map(product)
    checksums = {
        item.get("Algorithm", "unknown"): item.get("Value")
        for item in product.get("Checksum", [])
    }
    content_date = product.get("ContentDate") or {}
    return {
        "collection": collection_key,
        "id": product["Id"],
        "name": product["Name"],
        "sensing_start_utc": content_date.get("Start"),
        "sensing_end_utc": content_date.get("End"),
        "publication_utc": product.get("PublicationDate"),
        "origin_utc": product.get("OriginDate"),
        "content_bytes": product.get("ContentLength"),
        "online": product.get("Online"),
        "platform": attributes.get("platformSerialIdentifier"),
        "tile_id": attributes.get("tileId"),
        "cloud_cover": attributes.get("cloudCover"),
        "relative_orbit": attributes.get("relativeOrbitNumber"),
        "orbit": attributes.get("orbitNumber"),
        "orbit_direction": attributes.get("orbitDirection"),
        "polarisation": attributes.get("polarisationChannels"),
        "processor_version": attributes.get("processorVersion"),
        "product_type": attributes.get("productType"),
        "s3_path": product.get("S3Path"),
        "checksums": checksums,
        "representation": "cog_replica" if product["Name"].endswith("_COG.SAFE") else "canonical_safe",
    }


def canonicalize_scenes(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse CDSE SAFE/COG replicas into physical acquisitions.

    Sentinel-1 is currently exposed twice for many acquisitions.  Counting both
    as observations would inflate temporal coverage.  The acquisition identity
    is sensor, exact sensing interval, orbit, direction, and platform.
    """
    grouped: dict[tuple[Any, ...], list[dict[str, Any]]] = {}
    for row in rows:
        key = (
            row["collection"], row["sensing_start_utc"], row["sensing_end_utc"],
            row["relative_orbit"], row["orbit_direction"], row["platform"],
        )
        grouped.setdefault(key, []).append(row)
    scenes: list[dict[str, Any]] = []
    for alternatives in grouped.values():
        alternatives.sort(key=lambda row: (row["representation"] != "canonical_safe", row["name"]))
        selected = dict(alternatives[0])
        selected["alternate_representations"] = [row["name"] for row in alternatives[1:]]
        scenes.append(selected)
    return sorted(scenes, key=lambda scene: (scene["sensing_start_utc"], scene["name"]))


def pass_status(item: dict[str, Any], scenes: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
    start = parse_time(item["start_utc"])
    end = parse_time(item["end_utc"])
    matches = [scene for scene in scenes if item["expected_product_substring"] in scene["name"]]
    if matches:
        published = min(parse_time(scene["publication_utc"]) for scene in matches)
        latency_minutes = round((published - start).total_seconds() / 60, 1)
        status = "published"
    elif now < start:
        latency_minutes = None
        status = "planned"
    elif now <= end:
        latency_minutes = None
        status = "acquisition_window"
    elif (now - end).total_seconds() < 6 * 3600:
        latency_minutes = None
        status = "acquired_pending_catalog"
    else:
        latency_minutes = None
        status = "not_seen_requires_investigation"
    return {
        **item,
        "status": status,
        "catalog_matches": [scene["name"] for scene in matches],
        "publication_latency_minutes": latency_minutes,
    }


def select_pre_event_memory(config: dict[str, Any], scenes: list[dict[str, Any]]) -> dict[str, Any]:
    event_start = parse_time(config["event"]["time_utc_window"][0])
    before = [scene for scene in scenes if parse_time(scene["sensing_start_utc"]) < event_start]
    selected: dict[str, Any] = {}
    for collection in COLLECTIONS:
        candidates = [scene for scene in before if scene["collection"] == collection]
        selected[collection] = candidates[-1] if candidates else None
    return selected


def write_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    args = parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    now = parse_time(args.now) if args.now else datetime.now(UTC)
    snapshot_id = now.strftime("%Y%m%dT%H%M%SZ")
    snapshot = args.out / snapshot_id
    if snapshot.exists():
        raise SystemExit(f"refusing to overwrite existing snapshot: {snapshot}")
    snapshot.mkdir(parents=True)

    raw_files: list[Path] = []
    raw_scene_rows: list[dict[str, Any]] = []
    query_urls: dict[str, str] = {}
    for key, spec in COLLECTIONS.items():
        url = build_url(config, spec, now)
        query_urls[key] = url
        response = get_json(url, args.timeout, args.retries)
        raw_path = snapshot / f"raw_{key}.json"
        write_json(raw_path, response)
        raw_files.append(raw_path)
        raw_scene_rows.extend(normalized_scene(key, product) for product in response.get("value", []))

    scenes = canonicalize_scenes(raw_scene_rows)
    schedule = [pass_status(item, scenes, now) for item in config["planned_acquisitions"]]
    catalog_payload = {
        "schema": "nepal-olmo-live-catalog-v1",
        "generated_at_utc": iso_z(now),
        "config_sha256": sha256_file(args.config),
        "query_urls": query_urls,
        "event": config["event"],
        "raw_product_count": len(raw_scene_rows),
        "scene_count": len(scenes),
        "counts": {
            key: sum(scene["collection"] == key for scene in scenes)
            for key in COLLECTIONS
        },
        "pre_event_latest": select_pre_event_memory(config, scenes),
        "scenes": scenes,
    }
    catalog_path = snapshot / "catalog.json"
    schedule_path = snapshot / "acquisition_status.json"
    write_json(catalog_path, catalog_payload)
    write_json(
        schedule_path,
        {
            "schema": "nepal-olmo-live-acquisition-status-v1",
            "evaluated_at_utc": iso_z(now),
            "passes": schedule,
            "warning": "planned swath intersection is not a guarantee of a usable cloud-free or damage-observing product",
        },
    )

    csv_path = snapshot / "catalog.csv"
    fields = [
        "collection", "name", "sensing_start_utc", "publication_utc", "content_bytes",
        "platform", "tile_id", "cloud_cover", "relative_orbit", "orbit_direction", "product_type",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(scenes)

    files = [*raw_files, catalog_path, schedule_path, csv_path]
    sums_path = snapshot / "SHA256SUMS"
    sums_path.write_text(
        "".join(f"{sha256_file(path)}  {path.name}\n" for path in sorted(files)),
        encoding="utf-8",
    )
    latest_path = args.out / "LATEST"
    latest_path.write_text(snapshot_id + "\n", encoding="utf-8")
    print(json.dumps({
        "snapshot": str(snapshot),
        "generated_at_utc": iso_z(now),
        "counts": catalog_payload["counts"],
        "schedule": {item["id"]: item["status"] for item in schedule},
        "seal_sha256": sha256_file(sums_path),
    }, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
