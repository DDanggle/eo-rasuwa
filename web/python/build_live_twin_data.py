#!/usr/bin/env python3
"""Compile research artifacts into browser-safe GIS assets.

Python owns geospatial I/O and provenance. The deployed UI consumes only the
generated PNG/GeoJSON/JSON files, so the Cloudflare runtime never needs Python.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
from PIL import Image
from rasterio.warp import transform_bounds


APP_ROOT = Path(__file__).resolve().parents[1]
WORK_ROOT = APP_ROOT.parents[1]
MATERIALIZED_ROOT = WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/materialized"
# 씬으로 렌더할 모드. placebo_*는 baseline의 shifted 사본이라 씬 목록에 넣지 않음
# (같은 관측이 중복 표기됨). 나중 모드가 같은 (센서, 촬영시각) 씬을 이기며 state가 live가 됨.
SCENE_MODES = ["baseline", "s2_live", "s1_live"]
DISPLAY_ANCHOR = "rasuwagadhi"
SOURCE_ROOT = MATERIALIZED_ROOT / "baseline/dataset/windows/nepal" / DISPLAY_ANCHOR
PUBLIC_DATA = APP_ROOT / "public/data"
CATALOG_ROOT = WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/catalog"
COVERAGE_ROOT = WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/coverage"
PREFLIGHTS = {
    "s2_live": MATERIALIZED_ROOT / "s2_live/selection_preflight.json",
    "s1_live": MATERIALIZED_ROOT / "s1_live/selection_preflight.json",
}
MANIFESTS = {
    mode: MATERIALIZED_ROOT / mode / "materialization_manifest.json"
    for mode in PREFLIGHTS
}
DELTA_ROOT = WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/delta"
CORRIDOR_ROOT = WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/materialized_corridor"
CORRECTED_CORRIDOR_REPORT = (
    WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/corridor_sealed_s1db/report.json"
)
S1_DB_AUDIT = WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/contract_audit_s1_db.json"
# 2026-08-29 연장: 뉴스 실측(72km 구간, Trishuli Bazar 60채·Devighat 피해)에 따라
# Bidur/Devighat 하류까지 OSM way 체인을 이어붙임 (endpoint 연속성 Overpass로 확인함).
ROUTE_WAY_IDS = [201928141, 809865767, 24624604, 928822514, 119684552,
                 84953861, 321548891, 343007937, 343007938, 27033466, 915399520,
                 # 2026-08-29 2차 연장: Devighat 합류부 → Galchhi 방향 (보도상 홍수 도달 구간)
                 915399518, 915399519, 1553053155, 185752518,
                 # 3차: Galchhi(홍수 도달 보도 지점, 27.78N 84.99E) 까지
                 185752519]

POINTS = [
    {
        "id": "E",
        "display_label": "SOURCE ESTIMATE",
        "map_label": "E · SOURCE",
        "stage": 1,
        "marker_color": "#ff4d6d",
        "in_event_chain": True,
        "name": "Langtang Lirung collapse source",
        # USGS/위성 기반 근사점. 붕괴는 네팔 영내 Langtang Lirung 북사면에서 발생했으며
        # 좌표는 검증된 붕괴 폴리곤이 아니라 source-search anchor임.
        "coordinates": [85.5194, 28.2765],
        "role": "source_provisional",
        "place": "North flank of Langtang Lirung, Rasuwa, Nepal (satellite/seismic estimate)",
        "source": "USGS + China Geological Survey + satellite interpretation",
        "source_url": "https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood",
        "evidence_level": "source_estimate_not_release_polygon",
        "story": "The rock–ice collapse began on the Nepal side of Langtang Lirung. This red marker is the best public source-search estimate—not a surveyed release polygon. It is the event origin; A and B are downstream impact/checkpoint windows.",
        "story_ko": "암반–빙하 붕괴는 네팔 영내 Langtang Lirung에서 시작했다. 이 빨간 점은 공개자료상 최선의 발원 수색점이며 현장 측량 방출 폴리곤은 아니다. 사건 원점은 여기이고 A·B는 하류 충격/검문소 창이다.",
    },
    {
        "id": "D",
        "display_label": "SECONDARY HAZARD",
        "map_label": "D · LAKE SEARCH",
        "stage": 2,
        "marker_color": "#9b7bff",
        "in_event_chain": True,
        "name": "Barrier lake (reported)",
        # NDRRMA 위성분석(Planet/Landsat, 8/27 11:44): Rasuwagadhi 상류 ~18km, 0.11km².
        # 정확 좌표 미공개 — Lhende 계곡 회랑을 따라 잠정 배치함 (source 앵커와 국경 사이).
        "coordinates": [85.4800, 28.2850],
        "role": "upstream_hazard_provisional",
        "place": "Lhende Khola upstream corridor, Gyirong County, Tibet (provisional)",
        "source": "NDRRMA report + AP and Chinese government updates; exact coordinates unpublished",
        "source_url": "https://apnews.com/article/nepal-lake-china-flood-tibet-climate-5086eb25e29b23019632f7817739f807",
        "evidence_level": "reported_hazard_position_illustrative",
        "story": "A reported debris-dammed lake formed during the aftermath. Its public footprint is unresolved, so this purple marker is an approximate search zone—not a second collapse origin or a simulated lake boundary. A model-free search of the ±5 km zone found the 27 Aug optical scene 85% cloud, so new water cannot be confirmed; same-orbit Sentinel-1 (23 Jul·4 Aug·16 Aug median vs 28 Aug) shows ≥3 dB backscatter drops clustered in the Lhende valley south-west of the source (largest 0.38 km² at 85.507E 28.251N). Radar alone cannot tell standing water from wet debris, so these are search targets, not a lake outline.",
        "story_ko": "여파 과정에서 토석에 막힌 호수가 생겼다고 보고됐다. 공개 footprint가 없어 보라색 점은 근사 수색구역일 뿐이며, 두 번째 붕괴 원점이나 시뮬레이션 호수 경계가 아니다.",
    },
    {
        "id": "A",
        "display_label": "IMPACT WINDOW",
        "map_label": "A · IMPACT",
        "stage": 3,
        "marker_color": "#ff8a3d",
        "in_event_chain": True,
        "name": "Rasuwagadhi impact AOI",
        "coordinates": [85.3780644, 28.2786794],
        "role": "impact_focus",
        "place": "Pasang Lhamu Highway, Rasuwagadhi, Rasuwa, Nepal",
        "source": "user coordinate + OSM Nominatim reverse lookup; USGS event assessment",
        "source_url": "https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood",
        "evidence_level": "verified_aoi_reported_impact_corridor",
        "story": "The principal before/after inspection window at the Nepal–China crossing. A is not the collapse origin: it is where the upstream cascade reached infrastructure and where the current satellite time series is centered.",
        "story_ko": "네팔–중국 국경의 핵심 전후 비교창이다. A는 붕괴 원점이 아니라 상류 연쇄가 기반시설에 도달한 곳이며 현재 위성 시계열의 중심이다.",
    },
    {
        "id": "B",
        "display_label": "BORDER CHECKPOINT",
        "map_label": "B · BORDER",
        "stage": 4,
        "marker_color": "#ffd166",
        "in_event_chain": True,
        "name": "Gyirong border checkpoint",
        "coordinates": [85.3763336, 28.2828546],
        "role": "border_checkpoint",
        "place": "G216, Gyirong Town, Tibet, China",
        "source": "user coordinate + OSM Nominatim reverse lookup; USGS event assessment",
        "source_url": "https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood",
        "evidence_level": "verified_coordinate_reported_impact_corridor",
        "story": "The cross-border checkpoint beside the impact AOI. It anchors human-exposure review without treating every bright or dark satellite pixel as confirmed infrastructure damage.",
        "story_ko": "충격 관찰창 옆의 국경 검문소다. 모든 밝고 어두운 픽셀을 피해로 단정하지 않으면서 사람·기반시설 노출을 검토하는 기준점이다.",
    },
    {
        "id": "F",
        "display_label": "DOWNSTREAM OBSERVATION",
        "map_label": "F · BIDUR",
        "stage": 5,
        "marker_color": "#4da3ff",
        "in_event_chain": True,
        "name": "Trishuli Bazar / Bidur reach",
        # 좌표는 OSM Trishuli Ganga way 27033466 하류 단부(강 위) — 시가지 중심이 아님.
        "coordinates": [85.1357, 27.9162],
        "role": "downstream_impact",
        "place": "Trishuli Bazar reach, Bidur, Nuwakot, Nepal",
        "source": "USGS public event map; OSM river reach",
        "source_url": "https://www.usgs.gov/media/images/2026-nepal-debris-avalanche-and-flash-flood-map",
        "evidence_level": "downstream_inspection_anchor",
        "story": "A real downstream Sentinel-2 before/after window on MGRS tile 45RUL. The pair closes the visual chain from source to river response; it is observation evidence, not a damage label. Bidur is now included in the separate contract-correct 27-window OLMo screen.",
        "story_ko": "MGRS 45RUL에서 회수한 실제 하류 Sentinel-2 전후 창이다. 발원에서 하천 반응까지 시각 사슬을 닫지만 피해 라벨은 아니다. Bidur는 별도의 계약교정 OLMo 27창 스크린에는 포함됐다.",
    },
    {
        "id": "G",
        "display_label": "CURRENT TRACE END",
        "map_label": "G · GALCHHI",
        "stage": 6,
        "marker_color": "#d9363e",
        "in_event_chain": True,
        "name": "Galchhi reach-search endpoint",
        # OSM way chain의 현재 하류 끝. USGS의 '약 100 km 이동'은 잠정 총 이동거리이며
        # 이 점을 최종 퇴적/침수 종점으로 확정한 폴리곤은 아직 공개되지 않았다.
        "coordinates": [84.9883085, 27.8054960],
        "role": "reported_reach_search_endpoint",
        "place": "Trishuli corridor near Galchhi, Dhading, Nepal",
        "source": "USGS preliminary ~100 km travel assessment + OSM river trace",
        "source_url": "https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood",
        "evidence_level": "current_trace_endpoint_not_confirmed_event_terminus",
        "story": "The mapped inspection corridor currently ends here, 73.7 river-km below Rasuwagadhi. USGS reports nearly 100 km of total travel from the source, but has not published a final terminal deposit polygon. G is the end of this trace—not proof that the flood or debris stopped here. In the AI screen the signal fades toward G: 6.7% of 40 m cells flagged in the Galchhi window against 25% at Dalphedi, and 3–4% two windows upstream — close to the 3.6% of the no-event control. But the 27 Aug image here is hazy, so 'little change' is a weak reading, not evidence that nothing happened.",
        "story_ko": "현재 지도 추적선은 Rasuwagadhi에서 하천을 따라 73.7 km 내려온 이 지점에서 끝난다. USGS는 발원지부터 총 약 100 km 이동을 잠정 보고했지만 최종 퇴적 종점 폴리곤은 아직 공개하지 않았다. G는 이 화면의 추적 종점이지 홍수·토석류가 정확히 여기서 끝났다는 증거가 아니다.",
    },
    {
        "id": "C",
        "name": "Control window · no event (Tadi Khola)",
        "display_label": "NEGATIVE CONTROL",
        "map_label": "C · CONTROL",
        "stage": 99,
        "marker_color": "#9aa3a0",
        "in_event_chain": False,
        # 2026-08-30 교체: Rishing 은 08-27 구름 100%라 대조군 역할을 못 함. Tadi Khola 는 08-27 관측 84%,
        # 사건 Δ 0.129 ≈ 평소 Δ 0.125, 후보 토큰 3.6%(스캔 임계) → "변화 없음"을 실제로 보여주는 대조군.
        "coordinates": [85.290, 27.930],
        "role": "distant_reference",
        "place": "Tadi Khola valley, Nuwakot (east of the corridor), Nepal",
        "source": "control window chosen by 27 Aug observability among 4 candidates (Melamchi, Tadi, Ankhu, Rishing)",
        "control_window": "x001",
        "control_stats": {"observable_0827": 0.84, "delta_event_mean": 0.1287, "delta_placebo_mean": 0.1245, "candidate_token_frac_scan_threshold": 0.036},
        "story": "A deliberately quiet valley ~20 km east of the flood corridor with no reported event. On 27 Aug it is 84% cloud-free, and the AI change score equals its ordinary fortnight (0.129 vs 0.125; 3.6% candidate tokens under the corridor scan threshold vs 25% at the top corridor window). This is what 'no change' looks like under the same recipe.",
        },
]

INCIDENT_UPDATES = [
    {
        "occurred_at_utc": "2026-08-26T02:52:10Z",
        "status": "primary_event",
        "relation": "same_event_sequence",
        "title": "Langtang Lirung rock–ice collapse",
        "summary": "USGS reclassified the initial earthquake-like signal as an M5.2-equivalent landslide/glacial-collapse signal at zero depth; the source is on the Nepal side of Langtang Lirung.",
        "source": "USGS Landslide Hazards Program",
        "source_url": "https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood",
    },
    {
        "occurred_at_utc": "2026-08-26T05:52:00Z",
        "status": "secondary_signal",
        "relation": "same_day_signal_not_new_27_aug_event",
        "title": "Second seismic landslide signal",
        "summary": "A second M4.2-equivalent signal followed roughly three hours later on 26 Aug. It is not evidence of a separate 27 Aug Tibet landslide.",
        "source": "USGS Landslide Hazards Program",
        "source_url": "https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood",
    },
    {
        "occurred_at_utc": "2026-08-27T05:59:00Z",
        "status": "secondary_hazard_reported",
        "relation": "aftermath_of_26_aug_event",
        "title": "Debris-dammed lake reported",
        "summary": "Authorities reported a new upstream barrier lake created in the aftermath of the collapse; its exact public coordinates remained unresolved.",
        "source": "NDRRMA / AP",
        "source_url": "https://apnews.com/article/nepal-lake-china-flood-tibet-climate-5086eb25e29b23019632f7817739f807",
    },
    {
        "occurred_at_utc": "2026-08-28T12:00:00Z",
        "status": "monitoring_continues",
        "relation": "aftermath_of_26_aug_event",
        "title": "Barrier lake draining",
        "summary": "Chinese authorities reported the lake was draining and its level had fallen, while monitoring for secondary hazards continued.",
        "source": "State Council of the People's Republic of China",
        "source_url": "https://english.www.gov.cn/news/202608/28/content_WS6a91259dc6d00ca5f9a0cd54.html",
    },
]

import re as _re

_PRODUCT_TS = _re.compile(r"(\d{8})T(\d{6})")


def discover_layers(window_root: Path) -> dict[str, list[tuple[str, str]]]:
    """items.json에서 (레이어 디렉터리, ISO 촬영시각) 목록을 유도함.

    실측 규칙: serialized_item_groups[i] ↔ 레이어 디렉터리 `name`(i==0) / `name.i`(i>0).
    촬영시각은 그룹 첫 제품 이름의 YYYYMMDDTHHMMSS에서 옴 (예: S1D_..._20260824T001844_...).
    이전에는 이 대응이 하드코딩돼 있어 live 모드 장면을 넣을 수 없었음.
    """
    items = json.loads((window_root / "items.json").read_text())
    out: dict[str, list[tuple[str, str]]] = {}
    for entry in items:
        base = entry.get("layer_name")
        rows: list[tuple[str, str]] = []
        for i, group in enumerate(entry.get("serialized_item_groups") or []):
            if not group:
                continue
            m = _PRODUCT_TS.search(group[0].get("name", ""))
            if not m:
                continue
            d, t = m.group(1), m.group(2)
            iso = f"{d[:4]}-{d[4:6]}-{d[6:8]}T{t[:2]}:{t[2:4]}:{t[4:6]}Z"
            layer_dir = base if i == 0 else f"{base}.{i}"
            rows.append((layer_dir, iso))
        rows.sort(key=lambda r: r[1])
        out[base] = rows
    return out


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def haversine_km(first: list[float], second: list[float]) -> float:
    lon1, lat1 = map(math.radians, first)
    lon2, lat2 = map(math.radians, second)
    dlon, dlat = lon2 - lon1, lat2 - lat1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(value))


def image_coordinates(dataset: rasterio.io.DatasetReader) -> list[list[float]]:
    left, bottom, right, top = transform_bounds(dataset.crs, "EPSG:4326", *dataset.bounds)
    return [[left, top], [right, top], [right, bottom], [left, bottom]]


def stretch(channel: np.ndarray, low: float = 2, high: float = 98) -> np.ndarray:
    finite = channel[np.isfinite(channel) & (channel > 0)]
    if finite.size == 0:
        return np.zeros(channel.shape, dtype=np.uint8)
    lo, hi = np.percentile(finite, [low, high])
    if hi <= lo:
        hi = lo + 1
    scaled = np.clip((channel - lo) / (hi - lo), 0, 1)
    return np.round(np.power(scaled, 0.86) * 255).astype(np.uint8)


def render_s2(source: Path, destination: Path) -> dict[str, Any]:
    with rasterio.open(source) as dataset:
        data = dataset.read([4, 3, 2]).astype(np.float32)
        rgb = np.stack([stretch(data[index]) for index in range(3)], axis=-1)
        alpha = np.where(np.any(data > 0, axis=0), 238, 0).astype(np.uint8)
        image = np.dstack([rgb, alpha])
        coordinates = image_coordinates(dataset)
        stats = {"shape": [dataset.count, dataset.height, dataset.width], "crs": str(dataset.crs)}
    Image.fromarray(image).save(destination, optimize=True)
    return {"coordinates": coordinates, "stats": stats}


def render_s1(source: Path, destination: Path) -> dict[str, Any]:
    with rasterio.open(source) as dataset:
        vv, vh = dataset.read([1, 2]).astype(np.float32)
        vv_rgb, vh_rgb = stretch(vv, 1, 99), stretch(vh, 1, 99)
        ratio_rgb = stretch(vv - vh, 2, 98)
        image = np.dstack([vv_rgb, vh_rgb, ratio_rgb, np.full(vv.shape, 225, dtype=np.uint8)])
        coordinates = image_coordinates(dataset)
        stats = {"shape": [dataset.count, dataset.height, dataset.width], "crs": str(dataset.crs)}
    Image.fromarray(image).save(destination, optimize=True)
    return {"coordinates": coordinates, "stats": stats}


def render_delta(delta: np.ndarray, threshold: float, destination: Path) -> None:
    """Render relative embedding change and mark only threshold exceedances as bright.

    Orange below the threshold is within-window relative intensity. Yellow-white
    pixels are the only tokens above the matched-location ordinary-transition p99.
    This is intentionally not rendered as a damage mask.
    """
    finite = delta[np.isfinite(delta)]
    if finite.size == 0:
        rgba = np.zeros((*delta.shape, 4), dtype=np.uint8)
    else:
        lo, hi = np.quantile(finite, [0.50, 0.995])
        hi = max(float(hi), float(lo) + 1e-8)
        scaled = np.clip((delta - lo) / (hi - lo), 0, 1)
        rgba = np.zeros((*delta.shape, 4), dtype=np.uint8)
        rgba[..., 0] = np.round(122 + 133 * scaled).astype(np.uint8)
        rgba[..., 1] = np.round(38 + 105 * scaled).astype(np.uint8)
        rgba[..., 2] = np.round(10 + 25 * scaled).astype(np.uint8)
        rgba[..., 3] = np.round(25 + 205 * scaled).astype(np.uint8)
        exceed = delta > threshold
        rgba[exceed] = np.array([255, 240, 170, 255], dtype=np.uint8)
    Image.fromarray(rgba).resize((256, 256), Image.Resampling.NEAREST).save(destination, optimize=True)


def fetch_hydrography(destination: Path) -> dict[str, Any]:
    query = f'[out:json][timeout:25];way(id:{",".join(map(str, ROUTE_WAY_IDS))});out tags geom;'
    url = "https://overpass-api.de/api/interpreter?" + urllib.parse.urlencode({"data": query})
    request = urllib.request.Request(url, headers={"User-Agent": "olmoearth-live-twin/0.1"})
    with urllib.request.urlopen(request, timeout=45) as response:
        payload = json.load(response)

    by_id = {item["id"]: item for item in payload["elements"]}
    features = []
    route: list[list[float]] = []
    for way_id in ROUTE_WAY_IDS:
        element = by_id[way_id]
        coordinates = [[point["lon"], point["lat"]] for point in element["geometry"]]
        if route and route[-1] == coordinates[0]:
            route.extend(coordinates[1:])
        else:
            route.extend(coordinates)
        features.append(
            {
                "type": "Feature",
                "properties": {"osm_way_id": way_id, **element.get("tags", {})},
                "geometry": {"type": "LineString", "coordinates": coordinates},
            }
        )

    step = max(1, math.ceil(len(route) / 80))
    wasm_route = route[::step]
    if wasm_route[-1] != route[-1]:
        wasm_route.append(route[-1])
    geojson = {
        "type": "FeatureCollection",
        "name": "Bhote Koshi to Trishuli verified river centerline",
        "license": "OpenStreetMap ODbL",
        "fetched_at": datetime.now(UTC).isoformat(),
        "features": features,
        "simulation_route": wasm_route,
    }
    destination.write_text(json.dumps(geojson, indent=2, ensure_ascii=False) + "\n")
    return geojson


def load_latest_coverage_audit() -> tuple[dict[str, Any] | None, dict[str, str]]:
    """Read the immutable regional-footprint audit, if one has been sealed."""
    latest_path = COVERAGE_ROOT / "LATEST"
    if not latest_path.exists():
        return None, {}
    snapshot_id = latest_path.read_text().strip()
    snapshot = COVERAGE_ROOT / snapshot_id
    audit_path = snapshot / "coverage_audit.json"
    seal_path = snapshot / "SHA256SUMS"
    if not audit_path.exists() or not seal_path.exists():
        return None, {"coverage_snapshot": snapshot_id, "coverage_error": "snapshot_incomplete"}
    audit = json.loads(audit_path.read_text())
    return audit, {
        "coverage_snapshot": snapshot_id,
        "coverage_audit_sha256": sha256(audit_path),
        "coverage_seal_sha256": sha256(seal_path),
    }


def load_live_observation() -> tuple[dict[str, Any] | None, list[dict[str, Any]], dict[str, Any]]:
    """Join the immutable Copernicus snapshot to local rslearn readiness.

    The official catalogue and the provider used by rslearn are different
    systems.  Publication therefore never implies that OLMo input pixels have
    been selected or materialized.
    """
    latest_path = CATALOG_ROOT / "LATEST"
    if not latest_path.exists():
        return None, [], {}
    snapshot_id = latest_path.read_text().strip()
    snapshot = CATALOG_ROOT / snapshot_id
    catalog_path = snapshot / "catalog.json"
    status_path = snapshot / "acquisition_status.json"
    if not catalog_path.exists() or not status_path.exists():
        return None, [], {"catalog_snapshot": snapshot_id, "catalog_error": "snapshot_incomplete"}

    catalog = json.loads(catalog_path.read_text())
    status = json.loads(status_path.read_text())
    passes = status.get("passes", [])
    coverage_audit, coverage_provenance = load_latest_coverage_audit()

    def find_product(expected_substring: str):
        return next((scene for scene in catalog.get("scenes", [])
                     if expected_substring and expected_substring in scene.get("name", "")), None)

    def readiness_for(sensor_name: str):
        """센서 live 모드의 selection과 완성된 OLMo 입력 seal을 함께 읽는다."""
        mode = "s1_live" if "1" in sensor_name.split()[0].replace("Sentinel-", "S") else "s2_live"
        if sensor_name.startswith("Sentinel-1"):
            mode = "s1_live"
        elif sensor_name.startswith("Sentinel-2"):
            mode = "s2_live"
        preflight_path = PREFLIGHTS.get(mode)
        manifest_path = MANIFESTS.get(mode)
        preflight = (json.loads(preflight_path.read_text())
                     if preflight_path and preflight_path.exists() else None)
        manifest = (json.loads(manifest_path.read_text())
                    if manifest_path and manifest_path.exists() else None)
        return mode, preflight, manifest

    # published인 pass들 중 가장 최근을 대표 live 관측으로 삼음. 이전에는 s2b_20260827이
    # 하드코딩돼 있어 S1D 등 이후 관측을 표시할 수 없었음.
    published = [row for row in passes if row.get("status") == "published"]
    published.sort(key=lambda r: r.get("start_utc", ""), reverse=True)
    live_observation = None
    if published:
        row = published[0]
        product = find_product(row.get("expected_product_substring", ""))
        mode, preflight, materialization = readiness_for(row.get("sensor", ""))
        selection_ready = bool(preflight and preflight.get("valid"))
        seal_ready = bool(materialization and materialization.get("valid"))
        if selection_ready and seal_ready:
            materialization_status = "sealed_olmo_input"
        elif selection_ready and materialization:
            materialization_status = "partial_cube_contract_failed"
        elif selection_ready:
            materialization_status = "selected_not_materialized"
        elif preflight:
            materialization_status = "blocked_provider_selection"
        else:
            materialization_status = "not_preflighted"
        period_readiness: dict[str, int] = {}
        period_audit = (materialization or {}).get("period_audit") or {}
        for layer_name in ("sentinel1", "sentinel2_l2a"):
            counts = [len((audit.get("completed_layers") or {}).get(layer_name, []))
                      for audit in period_audit.values()]
            if counts:
                period_readiness[layer_name] = min(counts)
        live_observation = {
            "sensor": row["sensor"],
            "acquired_at": (product or {}).get("sensing_start_utc", row["start_utc"]),
            "catalog_status": row["status"],
            "product_name": (product or {}).get("name"),
            "product_id": (product or {}).get("id"),
            "publication_utc": (product or {}).get("publication_utc"),
            "cloud_cover_tile_pct": (product or {}).get("cloud_cover"),
            "online": (product or {}).get("online"),
            "relative_orbit": (product or {}).get("relative_orbit"),
            "coverage_status": ((coverage_audit or {}).get("status")
                if (coverage_audit or {}).get("pass_id") == row.get("id") else None),
            "operational_anchor_count": ((coverage_audit or {}).get("operational_anchor_count")
                if (coverage_audit or {}).get("pass_id") == row.get("id") else None),
            "operational_anchor_covering_product_count":
                ((coverage_audit or {}).get("operational_anchor_covering_product_count")
                 if (coverage_audit or {}).get("pass_id") == row.get("id") else None),
            "catalog_provider": "Copernicus Data Space OData",
            "materialization_provider": "Microsoft Planetary Computer STAC via rslearn",
            "materialization_mode": mode,
            "materialization_status": materialization_status,
            "selection_preflight_valid": selection_ready,
            "materialization_seal_valid": seal_ready,
            "period_readiness": period_readiness,
            "olmo_ready": selection_ready and seal_ready,
            "claim_boundary": "Tile cloud and B02-bright fractions are not AOI cloud-free coverage; no post-event embedding is claimed.",
        }

    scheduled = []
    for row in passes:
        state = row["status"]
        if state == "published":
            continue  # published는 live_observation/씬 쪽에서 다룸
        detail = None
        evidence_uri = None
        # 점(point) 질의에서 제품이 없다는 사실은 publication delay와 missed swath를
        # 구분하지 못한다. 넓은 지역 질의 뒤 product footprint containment를 검사한
        # sealed coverage audit만이 missed_coverage로 상태를 승격할 수 있다.
        if coverage_audit and coverage_audit.get("pass_id") == row.get("id"):
            state = coverage_audit.get("status", state)
            detail = coverage_audit.get("reason")
            evidence_uri = f"artifacts/external_data/nepal_olmo_live_v1/coverage/{coverage_provenance.get('coverage_snapshot')}/coverage_audit.json"
        scheduled.append({
            "id": row.get("id"),
            "sensor": row["sensor"],
            "acquired_at": row["start_utc"],
            "state": state,
            "detail": detail,
            "evidence_uri": evidence_uri,
        })
    scheduled = scheduled[:3]

    provenance = {
        "catalog_snapshot": snapshot_id,
        "catalog_generated_at_utc": catalog.get("generated_at_utc"),
        "catalog_sha256": sha256(catalog_path),
        "acquisition_status_sha256": sha256(status_path),
        "catalog_seal_sha256": sha256(snapshot / "SHA256SUMS"),
        **coverage_provenance,
    }
    for mode, path in PREFLIGHTS.items():
        if path.exists():
            provenance[f"{mode}_selection_preflight_sha256"] = sha256(path)
    for mode, path in MANIFESTS.items():
        if path.exists():
            provenance[f"{mode}_materialization_manifest_sha256"] = sha256(path)
    return live_observation, scheduled, provenance


AOI_OBS = WORK_ROOT / "artifacts/aoi_observability_20260827.json"



def s1db_superseded() -> bool:
    """M75 감사 파일이 있고 five_anchor_rerun 이 아직 recomputed 가 아니면 True (선형 S1 결과는 무효)."""
    if not S1_DB_AUDIT.exists():
        return False
    try:
        a = json.loads(S1_DB_AUDIT.read_text())
    except Exception:
        return True
    return (a.get("five_anchor_rerun") or {}).get("status") != "recomputed"

def build_ops_log() -> list[dict[str, Any]]:
    """EarthRanger식 이벤트 레코드 피드 — 전부 실제 산출물의 타임스탬프에서 옴.

    이벤트 = {time_utc, source, type, priority(green|orange|blue), summary}.
    파이프라인이 한 일(그리고 거부한 일)을 감사 가능한 로그로 노출함.
    """
    events: list[dict[str, Any]] = []

    def add(t, source, etype, priority, summary, evidence_uri=None, time_basis="artifact_recorded_at"):
        if t:
            identity = hashlib.sha256(
                f"{t}|{source}|{etype}|{summary}|{evidence_uri or ''}".encode()
            ).hexdigest()[:16]
            events.append({"event_id": identity, "time_utc": t, "recorded_at_utc": t,
                           "time_basis": time_basis, "source": source, "type": etype,
                           "priority": priority, "summary": summary,
                           "evidence_uri": evidence_uri})

    # 카탈로그 스냅샷들
    if CATALOG_ROOT.exists():
        for snap in sorted(CATALOG_ROOT.iterdir()):
            st = snap / "acquisition_status.json"
            if not st.exists():
                continue
            d = json.loads(st.read_text())
            add(d.get("evaluated_at_utc"), "Copernicus OData", "CATALOG_SNAPSHOT", "blue",
                f"snapshot {snap.name}: " + ", ".join(
                    f"{r['id']}={r['status']}" for r in d.get("passes", [])[:3]),
                str(st.relative_to(WORK_ROOT)))
            for r in d.get("passes", []):
                if r.get("status") == "published" and r.get("catalog_matches"):
                    add(d.get("evaluated_at_utc"), "Copernicus OData", "SCENE_PUBLISHED",
                        "green", f"{r['sensor']} {r['id']} published "
                        f"(latency {r.get('publication_latency_minutes','?')} min)",
                        str(st.relative_to(WORK_ROOT)))

    # 예정 궤도와 실제 AOI footprint를 분리하는 별도 감사. 이 레코드가 있으면
    # acquired_pending_catalog를 publication wait로 오독하지 않는다.
    coverage_audit, coverage_provenance = load_latest_coverage_audit()
    if coverage_audit:
        snapshot_id = coverage_provenance.get("coverage_snapshot")
        evidence_uri = (f"artifacts/external_data/nepal_olmo_live_v1/coverage/"
                        f"{snapshot_id}/coverage_audit.json")
        status = coverage_audit.get("status")
        passed = status == "operational_anchors_covered"
        add(coverage_audit.get("evaluated_at_utc"), "Copernicus footprint audit",
            "COVERAGE_PASS" if passed else "COVERAGE_MISS" if status == "missed_coverage" else "COVERAGE_PARTIAL",
            "green" if passed else "orange",
            (f"{coverage_audit.get('sensor')}: "
             f"{coverage_audit.get('regional_product_count', 0)} nearby products, "
             f"{coverage_audit.get('operational_anchor_covering_product_count', 0)} cover all "
             f"{coverage_audit.get('operational_anchor_count', '?')} anchors — "
             f"{status}"), evidence_uri)

    # preflight / manifest / 임베딩
    for mode_dir in sorted(MATERIALIZED_ROOT.iterdir()) if MATERIALIZED_ROOT.exists() else []:
        if not mode_dir.is_dir():
            continue
        name = mode_dir.name
        pf = mode_dir / "selection_preflight.json"
        if pf.exists():
            d = json.loads(pf.read_text())
            ok = bool(d.get("valid"))
            found = d.get("anchor_count", len(d.get("anchors") or []))
            expected = d.get("expected_anchor_count", "?")
            event_time = d.get("checked_at_utc") or d.get("evaluated_at_utc")
            add(event_time or datetime.fromtimestamp(
                    pf.stat().st_mtime, UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
                "rslearn preflight", "PREFLIGHT_PASS" if ok else "PREFLIGHT_BLOCK",
                "green" if ok else "orange",
                f"{name}: {found}/{expected} anchors " + ("selected required scene" if ok
                 else "missing required scene — download refused"),
                str(pf.relative_to(WORK_ROOT)),
                "artifact_field" if event_time else "filesystem_mtime")
        mf = mode_dir / "materialization_manifest.json"
        if mf.exists():
            d = json.loads(mf.read_text())
            ok = bool(d.get("valid"))
            period_audit = d.get("period_audit") or {}
            layer_counts = {}
            for layer_name in ("sentinel1", "sentinel2_l2a"):
                counts = [len((audit.get("completed_layers") or {}).get(layer_name, []))
                          for audit in period_audit.values()]
                if counts:
                    layer_counts[layer_name] = min(counts)
            period_summary = (f"S1 {layer_counts.get('sentinel1', '?')}/4, "
                              f"S2 {layer_counts.get('sentinel2_l2a', '?')}/4")
            add(d.get("created_at_utc"), "rslearn materialize",
                "SEALED" if ok else "SEAL_INVALID", "green" if ok else "orange",
                f"{name}: {d.get('file_count','?')} files, "
                f"{d.get('total_bytes',0):,} B — " + ("sealed" if ok else
                 f"contract failed ({period_summary})"),
                str(mf.relative_to(WORK_ROOT)))
        emb = list(mode_dir.glob("dataset/windows/nepal/*/layers/embeddings/**/*.tif"))
        if len(emb) >= 5:
            t = datetime.fromtimestamp(max(e.stat().st_mtime for e in emb), UTC)
            add(t.isoformat(timespec="seconds").replace("+00:00", "Z"),
                "OLMoEarth v1", "EMBED_SUPERSEDED" if s1db_superseded() else "EMBEDDED",
                "orange" if s1db_superseded() else "green",
                f"{name}: 5 anchors × 768-d cube" + (" — excluded; missing S1 dB transform" if s1db_superseded() else ""),
                str(mode_dir.relative_to(WORK_ROOT)), "filesystem_mtime")

    # AOI 관측성 (밝기 휴리스틱 — SCL 없음을 명시)
    if AOI_OBS.exists():
        d = json.loads(AOI_OBS.read_text())
        ras = (d.get("anchors") or {}).get("rasuwagadhi")
        if ras:
            add(d.get("created_at_utc") or datetime.fromtimestamp(AOI_OBS.stat().st_mtime, UTC)
                    .isoformat(timespec="seconds").replace("+00:00", "Z"),
                "AOI heuristic", "OBSERVABILITY", "blue",
                f"8/27 S2: Rasuwagadhi AOI bright {ras['bright_frac_of_valid']*100:.1f}% "
                f"(tile cloud 78.5% ≠ AOI; not a cloud-free estimate)",
                str(AOI_OBS.relative_to(WORK_ROOT)),
                "artifact_field" if d.get("created_at_utc") else "filesystem_mtime")

    # Δz 리포트
    if DELTA_ROOT.exists():
        for rp in sorted(DELTA_ROOT.glob("*/nepal_delta_report.json")):
            d = json.loads(rp.read_text())
            add(d.get("created_at_utc"), "OLMoEarth Δz", "DELTA_SUPERSEDED" if s1db_superseded() else "DELTA_REPORT",
                "orange" if s1db_superseded() else "green",
                f"live={d.get('live_mode')} placebo n={len(d.get('placebo_modes_available', []))}" + (" — excluded; missing S1 dB transform" if s1db_superseded() else ""),
                str(rp.relative_to(WORK_ROOT)))
    if CORRECTED_CORRIDOR_REPORT.exists():
        corrected = json.loads(CORRECTED_CORRIDOR_REPORT.read_text())
        top = corrected.get("windows", [{}])[0]
        add(datetime.fromtimestamp(CORRECTED_CORRIDOR_REPORT.stat().st_mtime, UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "OLMoEarth v1", "S1DB_SCREENING", "green",
            f"27/27 dB-corrected windows; max local-p99 exceedance {100*top.get('frac_above_local_placebo_p99', 0):.2f}% ({top.get('id', '—')})",
            str(CORRECTED_CORRIDOR_REPORT.relative_to(WORK_ROOT)), "filesystem_mtime")

    for update in INCIDENT_UPDATES:
        add(update["occurred_at_utc"], update["source"], update["status"].upper(),
            "orange" if update["status"] in {"primary_event", "secondary_hazard_reported"} else "blue",
            update["summary"], update["source_url"], "source_event_time")
    events.sort(key=lambda e: e["time_utc"], reverse=True)
    return events[:30]


def build_decision(live_observation: dict[str, Any] | None,
                   scheduled_scenes: list[dict[str, Any]],
                   olmoearth: dict[str, Any]) -> dict[str, str]:
    """현재 허용되는 다음 action을 UI가 한 문장으로 답하게 한다."""
    ped = olmoearth.get("post_event_delta")
    if isinstance(ped, dict) and ped.get("status") == "superseded_missing_sentinel1_db_transform":
        return {
            "status": "hold",
            "action": "RERUN FIVE-ANCHOR CONTRACT",
            "reason": "The five-anchor pixels are sealed, but their previous embeddings omitted the required Sentinel-1 linear-intensity to dB transform. Those claims are excluded.",
            "next_gate": "Rerun baseline, live and all matched five-anchor placebo periods with model_s1db.yaml.",
            "allowed_claim": "The corrected 27-window corridor screening is active; the legacy five-anchor delta is not evidence.",
        }
    # placebo 전용 리포트(live_mode=None)를 "post-event delta 있음"으로 승격하면 안 됨 —
    # 2026-08-28 실측: 그 오독으로 카드가 REVIEW CANDIDATE EVIDENCE 를 잘못 표시했음.
    matched_tok = []
    _m = sorted((WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/delta_matched").glob("*/nepal_delta_matched_report.json"))
    if _m:
        _mj = json.loads(_m[-1].read_text())
        matched_tok = [(a, v["token"]) for a, v in _mj.get("anchors", {}).items() if "candidate" in ((v.get("token") or {}).get("label") or "")]
    if isinstance(ped, dict) and ped.get("live_mode") and matched_tok:
        names = ", ".join(a for a, _ in matched_tok)
        a0, t0 = matched_tok[0]
        return {
            "status": "candidate_ready",
            "action": "REVIEW CANDIDATE EVIDENCE",
            "reason": f"Token-level matched test: {names} — {100*t0['event_frac_above']:.1f}% of 40 m tokens exceed the matched placebo p99 vs at most {100*max(t0['placebo_fracs_above']):.1f}% in any ordinary fortnight (n={len(t0['placebo_fracs_above'])}). Anchor-mean Δz alone does not separate.",
            "next_gate": "Independent corroboration (field, high-res optical, physics runout) for the flagged tokens.",
            "allowed_claim": "Candidate representation change at token scale; not damage probability or hazard extent.",
        }
    if isinstance(ped, dict) and ped.get("live_mode") and ped.get("rasuwagadhi_live_mean") is not None and (ped.get("label") or "").startswith("not detected"):
        return {
            "status": "not_detected",
            "action": "NOT DETECTED ABOVE VARIABILITY",
            "reason": f"Sealed post-event cube and delta computed; anchor-mean Δz does not exceed the pre-event placebo set (n={ped.get('placebo_samples')}). Matched 1-period pairs (n=9): only rasuwagadhi ranks 1/10, by 0.0002.",
            "next_gate": "Anchor-mean Δz is too blunt; use token-level evidence (corridor scan) and the next S1/S2 pass.",
            "allowed_claim": "No candidate change claimed at anchor scale; observation chain intact.",
        }
    if isinstance(ped, dict) and ped.get("live_mode") and ped.get("rasuwagadhi_live_mean") is not None:
        return {
            "status": "candidate_ready",
            "action": "REVIEW CANDIDATE EVIDENCE",
            "reason": "A sealed post-event cube and OLMoEarth delta report are available.",
            "next_gate": "Seek independent sensor, physical, or human corroboration.",
            "allowed_claim": "Candidate representation change; not damage probability or hazard extent.",
        }
    if live_observation and live_observation.get("olmo_ready"):
        return {
            "status": "embed_ready",
            "action": "QUEUE SEALED EMBEDDING",
            "reason": "Scene selection and the full 5-anchor input seal both passed.",
            "next_gate": "Run one immutable OLMoEarth recipe, then compare against placebo windows.",
            "allowed_claim": "Input contract ready; no representation change result yet.",
        }
    if live_observation:
        if live_observation.get("materialization_status") == "blocked_provider_selection":
            covered = live_observation.get("operational_anchor_count") or "?"
            return {
                "status": "hold",
                "action": "WAIT FOR PROVIDER SYNC",
                "reason": (f"Copernicus published a Sentinel-1 product covering {covered}/{covered} anchors, "
                           "but rslearn's Planetary Computer provider still selects the 2026-08-24 scene."),
                "next_gate": "Refresh selection preflight; materialize only when the 2026-08-28 scene is selected for 5/5 anchors.",
                "allowed_claim": "Official coverage exists; OLMo input pixels and Nepal event embedding do not yet exist.",
            }
        periods = live_observation.get("period_readiness") or {}
        reason = (f"Post-event scene selected, but cube seal failed: "
                  f"S1 {periods.get('sentinel1', '?')}/4; "
                  f"S2 {periods.get('sentinel2_l2a', '?')}/4 per anchor.")
        # 놓친 swath는 기다릴 대상이 아니다. 다음 실제 acquisition gate로 건너뛴다.
        missing_sensor = None
        if periods.get("sentinel1", 0) < 4:
            missing_sensor = "Sentinel-1"
        elif periods.get("sentinel2_l2a", 0) < 4:
            missing_sensor = "Sentinel-2"
        next_scene = next((scene for scene in scheduled_scenes
                           if scene.get("state") != "missed_coverage"
                           and (missing_sensor is None or scene.get("sensor", "").startswith(missing_sensor))), None)
        next_gate = (f"Wait for {next_scene['sensor']} at {next_scene['acquired_at']}, materialize, then reseal 5/5 anchors."
                     if next_scene else "Acquire the missing modality period and reseal 5/5 anchors.")
        return {
            "status": "hold",
            "action": "DO NOT EMBED",
            "reason": reason,
            "next_gate": next_gate,
            "allowed_claim": "Post-event pixels exist; OLMoEarth evidence does not.",
        }
    return {
        "status": "wait_observation",
        "action": "WAIT FOR OBSERVATION",
        "reason": "No published post-event scene is joined to this snapshot.",
        "next_gate": "Refresh the immutable catalog snapshot after the next acquisition.",
        "allowed_claim": "Pre-event baseline only.",
    }


def olmoearth_block() -> dict[str, Any]:
    """임베딩·Δz 산출물이 실재하면 실측값으로, 없으면 정직한 대기 문구로 채움."""
    contract_audit = json.loads(S1_DB_AUDIT.read_text()) if S1_DB_AUDIT.exists() else None
    embedded_modes = []
    for mode_dir in sorted(MATERIALIZED_ROOT.iterdir()) if MATERIALIZED_ROOT.exists() else []:
        if not mode_dir.is_dir() or mode_dir.name.startswith("baseline_failed"):
            continue
        emb = list(mode_dir.glob("dataset/windows/nepal/*/layers/embeddings/**/*.tif"))
        if len(emb) >= 5:
            embedded_modes.append(mode_dir.name)
    latest_delta = None
    if DELTA_ROOT.exists():
        reports = sorted(DELTA_ROOT.glob("*/nepal_delta_report.json"))
        if reports:
            latest_delta = json.loads(reports[-1].read_text())
    live_delta_executed = bool(latest_delta and latest_delta.get("live_mode"))
    block: dict[str, Any] = {
        "model": "OLMoEarth Base v1 (768-d)",
        "input_contract": "S1 RTC VV/VH linear intensity→dB + S2 L2A 12-band, 10 m, 4 periods, 2.56 km windows",
        "anchors": 5,
        "rasuwagadhi_baseline": "materialized_and_sealed",
        "embedding_status": (
            f"embedded: {', '.join(embedded_modes)}" if embedded_modes
            else "executed_offline_with_delta_provenance" if live_delta_executed
            else "not_run_in_this_web_snapshot"
        ),
        "anchor_geojson": "/data/olmo-input-anchors.geojson",
    }
    if contract_audit and (contract_audit.get("five_anchor_rerun") or {}).get("status") != "recomputed":
        block["post_event_delta"] = {
            "status": "superseded_missing_sentinel1_db_transform",
            "claim_boundary": contract_audit["claim_boundary"],
            "official_contract": contract_audit["official_contract"],
            "official_source": contract_audit["official_source"],
        }
        block["contract_audit"] = contract_audit
    elif latest_delta:
        ras = latest_delta.get("anchors", {}).get(DISPLAY_ANCHOR, {})
        verdict = ras.get("verdict", {})
        block["post_event_delta"] = {
            "created_at_utc": latest_delta.get("created_at_utc"),
            "live_mode": latest_delta.get("live_mode"),
            "placebo_samples": len(latest_delta.get("placebo_modes_available", [])),
            "rasuwagadhi_live_mean": ras.get("live_delta", {}).get("mean"),
            "label": verdict.get("label"),
            "claim_boundary": "candidate change only; not damage probability",
        }
    else:
        block["post_event_delta"] = "blocked_until_olmo_ready_post_cube"
    return block


def research_block() -> dict[str, Any]:
    """Expose measured transfer evidence and the proposed physics boundary.

    These fields deliberately separate a related historical-event pilot from
    the current Nepal live cube. They may inform the method, but cannot be used
    as if Nepal had already produced a post-event embedding verdict.
    """
    event_delta_path = WORK_ROOT / "artifacts/sen12_event_delta_pilot/report.json"
    susceptibility_path = WORK_ROOT / "artifacts/sen12_susceptibility_probe/report.json"
    confirmatory_path = WORK_ROOT / "artifacts/confirmatory_8region_summary.json"
    embedding_manifests = {
        mode: WORK_ROOT / f"artifacts/external_data/nepal_olmo_live_v1/materialized/{mode}/embedding_manifest.json"
        for mode in ("baseline", "placebo_a", "placebo_b")
    }
    event_delta = json.loads(event_delta_path.read_text()) if event_delta_path.exists() else None
    susceptibility = (json.loads(susceptibility_path.read_text())
                      if susceptibility_path.exists() else None)
    confirmatory = json.loads(confirmatory_path.read_text()) if confirmatory_path.exists() else None
    transfer_headline = (confirmatory or {}).get("headline") or {}
    transfer_means = transfer_headline.get("region_macro_primary_mean") or {}
    transfer_rows = []
    if event_delta:
        for region, result in (event_delta.get("regions") or {}).items():
            transfer_rows.append({
                "region": region,
                "auroc": result.get("pooled_auroc"),
                "placebo_auroc": result.get("placebo_pooled_auroc"),
                "patches": result.get("patches_used"),
            })
    susceptibility_rows = []
    if susceptibility:
        for region, result in (susceptibility.get("loco") or {}).items():
            susceptibility_rows.append({
                "region": region,
                "olmo_auroc": (result.get("olmoearth") or {}).get("auroc"),
                "raw_auroc": (result.get("raw") or {}).get("auroc"),
                "verdict": result.get("verdict"),
            })
    sealed_embedding_rasters = 0
    embedding_shape = None
    embedding_manifest_hashes = {}
    for mode, manifest_path in embedding_manifests.items():
        if not manifest_path.exists():
            continue
        manifest = json.loads(manifest_path.read_text())
        valid_anchors = [anchor for anchor in manifest.get("anchors", []) if anchor.get("valid")]
        sealed_embedding_rasters += len(valid_anchors)
        embedding_manifest_hashes[mode] = sha256(manifest_path)
        if valid_anchors and embedding_shape is None:
            first = valid_anchors[0]
            embedding_shape = [first.get("bands"), first.get("height"), first.get("width")]
    post_event_ledger = _post_event_delta_ledger()
    post_event_executed = post_event_ledger["state"] == "EXECUTED"
    contract_superseded = s1db_superseded()
    latest_delta_paths = sorted(DELTA_ROOT.glob("*/nepal_delta_report.json"))
    latest_delta = json.loads(latest_delta_paths[-1].read_text()) if latest_delta_paths else {}
    latest_placebo_count = len(latest_delta.get("placebo_modes_available", []))
    matched_paths = sorted((WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/delta_matched")
                           .glob("*/nepal_delta_matched_report.json"))
    matched = json.loads(matched_paths[-1].read_text()) if matched_paths else {}
    matched_token_candidates = [
        anchor for anchor, value in (matched.get("anchors") or {}).items()
        if "candidate" in (((value.get("token") or {}).get("label")) or "")
    ]
    return {
        "integration_disclaimer": (
            "Research integration of OlmoEarth representations with EarthRanger-style incident provenance "
            "and Skylight-style observation awareness; not an official Ai2 disaster product."
        ),
        "nepal_embedding": {
            "status": ("five_anchor_superseded_missing_s1_db_transform" if contract_superseded
                       else "post_event_delta_executed" if post_event_executed
                       else "blocked_until_full_post_event_s1_plus_s2_cube_is_sealed"),
            "baseline": "5 anchors × S1+S2 × 4 periods materialized and sealed",
            "placebo_count": latest_placebo_count or 2,
            "claim": (
                "The previous five-anchor S1+S2 delta is superseded: Sentinel-1 linear intensity was not converted to dB. "
                "Use the corrected 27-window screening result; rerun all five-anchor placebo periods before restoring that claim."
                if contract_superseded else
                "Sealed Nepal Δz executed: anchor-mean change was not detected above pre-event variability; "
                f"matched token test flags {', '.join(matched_token_candidates) or 'no anchor'}. "
                "This is a review candidate, not damage extent or probability."
                if post_event_executed else
                "No Nepal Δz anomaly threshold or damage prediction is available yet."
            ),
        },
        "ai_run_ledger": [
            {
                "id": "nepal_pre_event_representation",
                "state": "SUPERSEDED" if contract_superseded else "EXECUTED",
                "model": "OlmoEarth v1 Base (frozen)",
                "input": "5 Nepal anchors × S1+S2 × 4 periods, across baseline and two pre-event placebo cubes",
                "output": (f"{sealed_embedding_rasters} preserved legacy rasters; excluded because Sentinel-1 dB conversion was missing"
                           if contract_superseded else
                           f"{sealed_embedding_rasters} sealed embedding rasters; shape {embedding_shape or ['—', '—', '—']}"),
                "allows": ("input-contract audit only" if contract_superseded else
                           "pre-event reference, retrieval query and a future post-event delta"),
                "forbids": ("all representation-change claims until rerun" if contract_superseded else
                            "damage, flood depth, runout or anomaly claims"),
                "artifact_sha256": embedding_manifest_hashes,
            },
            {
                "id": "sen12_frozen_transfer",
                "state": "MEASURED",
                "model": "OlmoEarth v1 frozen encoder + trained small segmentation decoder",
                "input": "Sen12Landslides; 8 held-out regions; 3 seeds; matched region-macro protocol",
                "output": "reuse 0.272 vs raw UNet3D 0.197; reuse wins 6/8 regions",
                "allows": "frozen EO representation transfer beats this raw baseline on aggregate",
                "forbids": "universal or Olmo-specific superiority before the matched Presto control",
                "artifact_sha256": sha256(confirmatory_path) if confirmatory_path.exists() else None,
            },
            {
                "id": "historical_temporal_delta",
                "state": "MEASURED_PILOT",
                "model": "OlmoEarth temporal embedding delta",
                "input": "S2-only pre4/post4 windows from Hokkaido, Hiroshima and Dominica",
                "output": "AUROC 0.853 / 0.952 / 0.605; placebo 0.564 / 0.602 / 0.433",
                "allows": "candidate-localisation feasibility in related historical events",
                "forbids": "Nepal validation or a universal landslide detector",
                "artifact_sha256": sha256(event_delta_path) if event_delta_path.exists() else None,
            },
            {
                "id": "pre_event_forecast",
                "state": "NEGATIVE_RESULT",
                "model": "OlmoEarth leave-one-region-out probe",
                "input": "pre-event embeddings from three historical regions",
                "output": "pre-event susceptibility signal not detected",
                "allows": "a falsified forecasting claim",
                "forbids": "prospective landslide prediction",
                "artifact_sha256": sha256(susceptibility_path) if susceptibility_path.exists() else None,
            },
            post_event_ledger,
            {
                "id": "matched_second_geofm",
                "state": "NOT_RUN",
                "model": "Presto matched control",
                "input": "same Sen12 cube and matched decoder protocol",
                "output": "none",
                "allows": "nothing yet",
                "forbids": "calling the measured transfer gain uniquely OlmoEarth-specific",
                "artifact_sha256": None,
            },
        ],
        "confirmatory_transfer": {
            "status": (confirmatory or {}).get("status"),
            "regions": transfer_headline.get("n_regions"),
            "wins_reuse_vs_raw_strong": transfer_headline.get("per_region_wins_reuse_vs_raw_strong"),
            "strong_wins": transfer_headline.get("strong_wins_reuse_vs_raw_strong"),
            "reuse_region_macro": transfer_means.get("reuse"),
            "raw_strong_region_macro": transfer_means.get("raw_strong"),
            "absolute_gap": transfer_means.get("reuse_minus_raw_strong"),
            "relative_gain_pct": (
                100 * transfer_means["reuse_minus_raw_strong"] / transfer_means["raw_strong"]
                if transfer_means.get("raw_strong") and transfer_means.get("reuse_minus_raw_strong") is not None
                else None
            ),
            "non_win_regions": transfer_headline.get("non_win_regions") or [],
            "claim_boundary": (confirmatory or {}).get("claim_boundary"),
            "artifact_sha256": sha256(confirmatory_path) if confirmatory_path.exists() else None,
        },
        "historical_event_delta_pilot": {
            "rows": transfer_rows,
            "contract": "related S2-only pre4/post4 temporal-delta pilot",
            "claim_boundary": (
                "Strong in Hokkaido and Hiroshima; weak/borderline in Dominica with only 12 placebo patches. "
                "This supports feasibility, not Nepal validation or a universal landslide detector."
            ),
            "artifact_sha256": sha256(event_delta_path) if event_delta_path.exists() else None,
        },
        "pre_event_susceptibility_probe": {
            "rows": susceptibility_rows,
            "overall": (susceptibility or {}).get("overall"),
            "claim_boundary": (
                "Leave-one-region-out pre-event susceptibility was not detected. "
                "OlmoEarth is not being presented as a prospective landslide forecast model."
            ),
            "artifact_sha256": sha256(susceptibility_path) if susceptibility_path.exists() else None,
        },
        "physics": {
            "current": "Rust/WASM particles animate a verified mapped drainage corridor only.",
            "proposed_primary": "r.avaflow v4 ensemble for rock–ice–debris–water cascade runout",
            "independent_check": "D-Claw 1.0",
            "downstream_hydraulics": "LISFLOOD-FP or BASEMENT after a cross-section hydrograph is defined",
            "coupling_rule": (
                "OLMoEarth proposes source/change/material-zone evidence; a physics solver owns runout, "
                "depth and arrival-time estimates. Embedding values never become friction or velocity directly."
            ),
        },
        "evaluation_arms": [
            {"id": "A0", "label": "raw EO only"},
            {"id": "A1", "label": "classical pre/post change"},
            {"id": "A2", "label": "OLMoEarth temporal delta"},
            {"id": "A3", "label": "gate-aware OLMoEarth with abstention"},
            {"id": "A4", "label": "A3 + independent sensor / physics corroboration"},
            {"id": "A5", "label": "A4 + human/official review"},
        ],
        "evaluation_metrics": {
            "observation": "coverage correctness, publication latency, invalid-action rate",
            "change": "event-wise AUROC/AUPRC, source localization error, false changed area",
            "runout": "runout IoU, false-inundated area, maximum-runout error, interval coverage",
            "operations": "analyst minutes and invalid actions at matched recall",
        },
    }


def candidates_block() -> dict[str, Any] | None:
    """회랑 S2-only 후보 지도(artifacts/corridor_s2_candidates/embed/report.json) → 앱 GeoJSON.

    봉인된 S1+S2 계약이 아니라 M66/M68과 같은 광학 전용 프로토콜의 산출물임. 라벨은
    candidate까지만이며 피해·확률 표현은 만들지 않음.
    """
    # 우선순위: scan v2(100창: 연속 강변 + Lhende + 발원 주변 산사면 격자) → v1 27창
    rp = WORK_ROOT / "artifacts/corridor_s2_candidates/embed_scan_v2/report.json"
    wm = WORK_ROOT / "artifacts/corridor_s2_candidates/prepare_v2/windows_manifest.json"
    if not rp.exists():
        rp = WORK_ROOT / "artifacts/corridor_s2_candidates/embed_v2/report.json"
        wm = WORK_ROOT / "artifacts/corridor_s2_candidates/prepare/windows_manifest.json"
    if not rp.exists():
        return None
    kinds = {w["id"]: w.get("kind", "corridor") for w in json.loads(wm.read_text())["windows"]} if wm.exists() else {}
    from rasterio.warp import transform as _tf
    rep = json.loads(rp.read_text())
    feats = []
    for w in rep["windows"]:
        x0, y0, x1, y1 = w["bounds_utm"]
        xs, ys = _tf("EPSG:32645", "EPSG:4326", [x0, x1, x1, x0, x0], [y0, y0, y1, y1, y0])
        ring = [[round(x, 6), round(y, 6)] for x, y in zip(xs, ys)]
        feats.append({"type": "Feature",
                      "properties": {**{k: w.get(k) for k in ("id", "rank", "status", "candidate_token_frac", "candidate_token_count",
                                                          "d_event_mean", "d_placebo_mean", "valid_event_frac")},
                                     "kind": kinds.get(w["id"], "corridor"), "center_lonlat": w["center_lonlat"]},
                      "geometry": {"type": "Polygon", "coordinates": [ring]}})
    places_path = rp.parent / "places.json"
    places = json.loads(places_path.read_text()) if places_path.exists() else {}
    a_lon, a_lat = next(pt for pt in POINTS if pt["id"] == "A")["coordinates"]
    top10 = []
    for w in rep.get("top10", []):
        lon, lat = w["center_lonlat"]
        top10.append({**w, "kind": kinds.get(w["id"], "corridor"), "place": places.get(w["id"], ""), "distance_from_a_km": round(haversine_km([a_lon, a_lat], [lon, lat]), 1)})
    # 강변 밖(산사면 격자) 상위 — 별도 목록
    ranked_all = [w for w in rep["windows"] if w.get("status") == "ranked"]
    hill = sorted([w for w in ranked_all if kinds.get(w["id"]) == "hillslope"], key=lambda w: -(w["candidate_token_frac"] or 0))[:5]
    hillslope_top = [{**w, "kind": "hillslope", "place": places.get(w["id"], ""), "distance_from_a_km": round(haversine_km([a_lon, a_lat], w["center_lonlat"]), 1)} for w in hill]
    from collections import Counter as _C
    unobs = _C(kinds.get(w["id"], "corridor") for w in rep["windows"] if w.get("status") != "ranked")
    judged = _C(kinds.get(w["id"], "corridor") for w in ranked_all)
    # 변화-벡터 검색(같은 종류의 변화) — 있으면 붙임
    retrieval = None
    rr = WORK_ROOT / "artifacts/corridor_s2_candidates/retrieval_v2/report.json"
    if not rr.exists():
        rr = WORK_ROOT / "artifacts/corridor_s2_candidates/retrieval/report.json"
    if rr.exists() and {o["id"] for o in json.loads(rr.read_text()).get("top10", [])} <= {w["id"] for w in rep["windows"]}:
        rj = json.loads(rr.read_text())
        centers = {w["id"]: w["center_lonlat"] for w in rep["windows"]}
        drank = {w["id"]: w.get("rank") for w in rep["windows"]}
        retrieval = {"query_windows": rj["query_windows"], "threshold": rj["threshold_sim_placebo_p99"],
                     "top10": [{**o, "place": places.get(o["id"], ""), "center_lonlat": centers.get(o["id"]), "delta_rank": drank.get(o["id"])} for o in rj["top10"]]}
    return {"schema": rep.get("schema"), "claim": rep.get("claim"), "threshold_placebo_p99": rep.get("threshold_placebo_p99"),
            "placebo_tokens": rep.get("placebo_tokens"), "windows": len(rep["windows"]), "top10": top10, "retrieval": retrieval,
            "hillslope_top": hillslope_top, "judged_by_kind": dict(judged), "unobservable_by_kind": dict(unobs),
            "report_sha256": sha256(rp), "geojson": {"type": "FeatureCollection", "features": feats}}


def corrected_corridor_block() -> dict[str, Any] | None:
    """Expose only the Sentinel-1 dB-corrected, same-location-placebo result.

    The earlier five-anchor and corridor S1+S2 reports are deliberately not
    folded into this block: they were produced without Sentinel1ToDecibels.
    """
    if not CORRECTED_CORRIDOR_REPORT.exists():
        return None
    report = json.loads(CORRECTED_CORRIDOR_REPORT.read_text())
    if report.get("schema") != "corridor-sealed-delta-s1db-v1":
        return None

    assets_dir = PUBLIC_DATA / "canonical"
    assets_dir.mkdir(parents=True, exist_ok=True)
    band_path = "B01_B02_B03_B04_B05_B06_B07_B08_B8A_B09_B11_B12/geotiff.tif"
    rows = report.get("windows", [])
    features: list[dict[str, Any]] = []

    from rasterio.warp import transform as _transform
    for row in rows:
        x0, y0, x1, y1 = row["bounds_utm"]
        xs, ys = _transform("EPSG:32645", "EPSG:4326",
                            [x0, x1, x1, x0, x0], [y0, y0, y1, y1, y0])
        ring = [[round(x, 6), round(y, 6)] for x, y in zip(xs, ys)]
        features.append({
            "type": "Feature",
            "properties": {
                "id": row["id"], "rank": row["rank"], "name": row["name"],
                "kind": row.get("kind", "corridor"),
                "center_lonlat": row["center_lonlat"],
                "event_mean": row["event_mean"], "placebo_mean": row["placebo_mean"],
                "placebo_p99": row["placebo_p99"],
                "exceedance": row["frac_above_local_placebo_p99"],
            },
            "geometry": {"type": "Polygon", "coordinates": [ring]},
        })

    # Six ranked windows are enough for visual inspection without pretending
    # that a tiny score difference creates six confirmed hazard sites.
    top = []
    for row in rows[:6]:
        window_id = row["id"]
        pre_root = CORRIDOR_ROOT / "baseline/dataset/windows/nepal" / window_id / "layers/sentinel2_l2a.3" / band_path
        post_root = CORRIDOR_ROOT / "s1_live/dataset/windows/nepal" / window_id / "layers/sentinel2_l2a.3" / band_path
        delta_path = CORRECTED_CORRIDOR_REPORT.parent / "deltas" / f"{window_id}_sealed_delta.npy"
        if not pre_root.exists() or not post_root.exists() or not delta_path.exists():
            continue
        pre_name, post_name, delta_name = f"{window_id}_pre.png", f"{window_id}_post.png", f"{window_id}_delta.png"
        rendered = render_s2(pre_root, assets_dir / pre_name)
        render_s2(post_root, assets_dir / post_name)
        render_delta(np.load(delta_path), float(row["placebo_p99"]), assets_dir / delta_name)
        top.append({
            **{key: row.get(key) for key in (
                "id", "rank", "name", "kind", "center_lonlat", "event_mean",
                "placebo_mean", "placebo_p99", "frac_above_local_placebo_p99",
                "mean_ratio_event_to_placebo", "s2_only_rank",
            )},
            "coordinates": rendered["coordinates"],
            "pre_image": f"/data/canonical/{pre_name}",
            "post_image": f"/data/canonical/{post_name}",
            "delta_image": f"/data/canonical/{delta_name}",
        })

    return {
        "schema": report["schema"],
        "model": report["model"],
        "status": "SCREENING_COMPLETE_NO_CALIBRATED_DETECTION",
        "windows": report["n_windows"],
        "top": top,
        "max_exceedance": max((row["frac_above_local_placebo_p99"] for row in rows), default=0),
        "windows_with_any_exceedance": sum(row["frac_above_local_placebo_p99"] > 0 for row in rows),
        "comparison": report["comparison"],
        "input_contract": report["input_contract"],
        "claim": report["claim"],
        "limitations": report["limitations"],
        "report_sha256": sha256(CORRECTED_CORRIDOR_REPORT),
        "geojson": {"type": "FeatureCollection", "features": features},
        "visual_legend": "orange=relative OLMo delta intensity; yellow-white=event tokens above the same location's single ordinary-transition p99",
    }


def corridor_contract_block() -> dict[str, Any]:
    """27창 S1+S2 봉인 실험의 단계별 진척을 파일 실물에서 계산한다.

    M71의 100창 S2-only 후보 스캔과 혼동하지 않도록 별도 블록으로 노출한다.
    한 창의 canonical 입력은 S1 4기간 + S2 4기간 = completed marker 8개다.
    """
    root = CORRIDOR_ROOT
    expected_windows = 27
    expected_layers = 8

    def mode_status(mode: str) -> dict[str, Any]:
        mode_root = root / mode
        windows_root = mode_root / "dataset/windows/nepal"
        layer_counts: dict[str, int] = {}
        for index in range(expected_windows):
            window_id = f"w{index:02d}"
            layer_counts[window_id] = len(list((windows_root / window_id / "layers").glob("*/completed")))
        complete = [window for window, count in layer_counts.items() if count >= expected_layers]
        partial = [window for window, count in layer_counts.items() if 0 < count < expected_layers]
        missing = [window for window, count in layer_counts.items() if count == 0]
        manifest_path = mode_root / "materialization_manifest.json"
        manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
        embedding_path = mode_root / "embedding_manifest.json"
        embedding = json.loads(embedding_path.read_text()) if embedding_path.exists() else {}
        embedded = len([anchor for anchor in embedding.get("anchors", []) if anchor.get("valid")])
        marker_paths = list(windows_root.glob("w*/layers/*/completed"))
        timestamps = [path.stat().st_mtime for path in marker_paths]
        for path in (manifest_path, embedding_path):
            if path.exists():
                timestamps.append(path.stat().st_mtime)
        return {
            "mode": mode,
            "complete_windows": len(complete),
            "partial_windows": partial,
            "missing_windows": missing,
            "completed_layers": sum(min(count, expected_layers) for count in layer_counts.values()),
            "total_layers": expected_windows * expected_layers,
            "materialization_sealed": bool(manifest.get("valid")),
            "embedded_windows": embedded,
            "embedding_sealed": bool(embedding.get("valid")) if embedding else False,
            "updated_at_utc": (datetime.fromtimestamp(max(timestamps), UTC).isoformat()
                               if timestamps else None),
        }

    baseline = mode_status("baseline")
    live = mode_status("s1_live")
    placebo = mode_status("placebo_b")
    corrected = corrected_corridor_block()
    if corrected:
        stage = "screening_complete"
        next_step = "Acquire at least 20 matched ordinary transitions or an independent event polygon before calibrated detection claims."
    elif (live["embedding_sealed"] and live["embedded_windows"] >= expected_windows
          and placebo["embedding_sealed"] and placebo["embedded_windows"] >= expected_windows):
        stage = "ready_for_matched_screening"
        next_step = "Compare baseline/live against the same-location placebo_b transition."
    elif live["materialization_sealed"]:
        stage = "live_embedding"
        next_step = "Run the immutable OLMoEarth v1 embedding recipe for all 27 live windows."
    elif live["complete_windows"] or live["partial_windows"]:
        stage = "live_materialization"
        next_step = "Finish and seal the 27-window s1_live cube."
    elif baseline["materialization_sealed"]:
        stage = "baseline_embedding_or_live_queue"
        next_step = "Seal baseline embeddings, then materialize the same 27 windows for s1_live."
    else:
        stage = "baseline_materialization"
        next_step = "Finish and seal all 27 baseline windows before live materialization."
    return {
        "schema": "nepal-corridor-contract-progress/v1",
        "expected_windows": expected_windows,
        "expected_layers_per_window": expected_layers,
        "contract": "S1 RTC VV/VH + S2 L2A 12-band × 4 periods; same 2.56 km windows in baseline and s1_live",
        "stage": stage,
        "next_step": next_step,
        "baseline": baseline,
        "s1_live": live,
        "placebo_b": placebo,
        "claim_boundary": "Screening only. No corridor damage, reach, calibrated anomaly, or probability claim exists without more ordinary transitions and independent labels.",
    }


def _post_event_delta_ledger() -> dict[str, Any]:
    """live_mode가 있는 최신 delta report가 있으면 EXECUTED, 없으면 WAITING_INPUT (실물 기준)."""
    if s1db_superseded():
        audit = json.loads(S1_DB_AUDIT.read_text())
        return {"id": "nepal_post_event_delta", "state": "SUPERSEDED", "model": "OlmoEarth v1 Base (frozen)",
                "input": "five-anchor S1+S2 report produced without Sentinel1ToDecibels",
                "output": "preserved for provenance; excluded from active evidence",
                "allows": "input-contract audit and reproducibility diagnosis only",
                "forbids": "candidate, anomaly, damage, cause, or extent claims",
                "artifact_sha256": sha256(S1_DB_AUDIT), "official_source": audit["official_source"]}
    latest = sorted(DELTA_ROOT.glob("*/nepal_delta_report.json"))
    rep = json.loads(latest[-1].read_text()) if latest else {}
    if not rep.get("live_mode"):
        return {"id": "nepal_post_event_delta", "state": "WAITING_INPUT", "model": "OlmoEarth v1 Base (frozen)",
                "input": "sealed post-event S1+S2 cube, not yet materialized", "output": "none",
                "allows": "nothing beyond the verified observation ledger",
                "forbids": "live change heatmap, anomaly score or damage label", "artifact_sha256": None}
    anchors = rep.get("anchors", {})
    labels = {a: (v.get("verdict") or {}).get("label", "") for a, v in anchors.items() if isinstance(v, dict)}
    cand = [a for a, s in labels.items() if "candidate" in s]; nd = [a for a in labels if a not in cand]
    n_pl = len(rep.get("placebo_modes_available", []))
    return {"id": "nepal_post_event_delta", "state": "EXECUTED", "model": "OlmoEarth v1 Base (frozen)",
            "input": f"sealed {rep['live_mode']} cube · 5 anchors · S1 4 periods (incl. 2026-08-28 RTC) + S2 4 periods (incl. 2026-08-27) vs sealed baseline",
            "output": f"5 delta rasters 64×64 (cosine Δz per 40 m token) · {len(cand)}/{len(labels)} candidate change ({', '.join(cand)}) · {len(nd)}/{len(labels)} not detected ({', '.join(nd)})",
            "allows": f"descriptive 'candidate change' per anchor where live Δ exceeds all {n_pl} placebo windows; rank vs placebo",
            "forbids": "anomaly percentile/probability until ≥20 placebo windows; damage, cause, extent",
            "artifact_sha256": sha256(latest[-1])}


def ai_vs_classical_block() -> dict[str, Any] | None:
    """M73: 같은 조건에서 AI Δz vs 고전 변화탐지 AUROC (Sen12 9지역) + 네팔 100창 비교."""
    rp = WORK_ROOT / "artifacts/sen12_classical_baseline/report.json"
    if not rp.exists():
        return None
    rj = json.loads(rp.read_text())
    rows = []
    for region, v in rj.get("regions", {}).items():
        if not v.get("patches"):
            continue
        best = max(x for x in (v.get("classical_band_auroc"), v.get("classical_index_auroc")) if x is not None)
        rows.append({"region": region, "patches": v["patches"], "classical_best": round(best, 3), "ai": round(v["ai_auroc"], 3) if v.get("ai_auroc") is not None else None,
                     "gain": round(v["ai_auroc"] - best, 3) if v.get("ai_auroc") is not None else None})
    rows.sort(key=lambda r: -(r["gain"] or 0))
    wins = sum(1 for r in rows if (r["gain"] or 0) >= 0.05); ahead = sum(1 for r in rows if (r["gain"] or 0) > 0)
    cp = WORK_ROOT / "artifacts/corridor_s2_candidates/embed_scan_v2/classical_vs_ai.json"
    corridor = json.loads(cp.read_text()) if cp.exists() else None
    return {"rows": rows, "regions": len(rows), "ahead": ahead, "wins_at_005": wins, "pre_registered_margin": 0.05,
            "corridor": {"spearman": corridor["spearman_ai_vs_classical"], "top10_overlap": corridor["top10_overlap"],
                         "reported_hits": corridor["reported_place_hits_top10"]} if corridor else None,
            "report_sha256": sha256(rp)}


def placebo_extended_block() -> dict[str, Any] | None:
    """M82: 평시 쌍 3개(pooled p99)로 임계를 다시 잡았을 때의 후보 비율·순위 안정성."""
    rp = WORK_ROOT / "artifacts/corridor_s2_candidates/embed_placebo_ext/report.json"
    if not rp.exists():
        return None
    rj = json.loads(rp.read_text())
    top = [{"id": r["id"], "rank": r["rank_pooled3"], "frac_pooled3": r["candidate_frac_pooled3"], "frac_p1": r["candidate_frac_P1only"], "frac_local3": r.get("candidate_frac_local3"), "observable": r["event_valid_frac"], "center_lonlat": r["center_lonlat"]} for r in rj["top10"][:6]]
    return {"threshold_pooled3": rj["threshold_pooled3_p99"], "threshold_each": rj["threshold_each_p99"], "pairs": rj["pairs"], "spearman_vs_single_pair": rj["spearman_vs_scan_v2"], "ranked_windows": rj["ranked_windows"], "top": top, "report_sha256": sha256(rp)}


def lake_search_block() -> dict[str, Any] | None:
    """M83: 언색호 D 수색 — NDWI 신규 수체 ∩ 같은 궤도 S1 급감 (모델 없음)."""
    rp = WORK_ROOT / "artifacts/lake_search_d/report.json"
    if not rp.exists():
        return None
    rj = json.loads(rp.read_text())
    return {"aoi_center": rj["aoi_center"], "half_km": rj["half_km"], "s2_clear_frac": rj["s2_clear_frac"], "new_water_km2": rj["new_water_km2"],
            "s1_pre_same_orbit": rj.get("s1_pre_same_orbit"), "s1_post": rj.get("s1_post"), "s1_drop_px": rj.get("s1_drop_px"), "candidate_basis": rj.get("candidate_basis"),
            "components_top5": rj.get("components_top5", []), "images": {"ndwi_pre": "/data/story/lake_ndwi_pre0812.png", "ndwi_post": "/data/story/lake_ndwi_post0827.png", "candidates": "/data/story/lake_candidates.png"}, "report_sha256": sha256(rp)}


def presto_control_block() -> dict[str, Any] | None:
    """M79: Presto(픽셀 시계열 FM) 대조군 — 같은 패치·시점·라벨에서 Δz AUROC, OlmoEarth 와의 차."""
    rp = WORK_ROOT / "artifacts/sen12_presto_control/report.json"
    if not rp.exists():
        return None
    rj = json.loads(rp.read_text())
    rows = []
    for region, v in rj.get("regions", {}).items():
        if not v.get("patches") or v.get("presto_s2_only") is None:
            continue
        rows.append({"region": region, "patches": v["patches"], "presto_s2": round(v["presto_s2_only"], 3), "presto_s1s2": round(v["presto_s1s2"], 3),
                     "olmo_s2": round(v["olmo_s2_only"], 3) if v.get("olmo_s2_only") is not None else None, "gap_s2": round(v["gap_s2"], 3) if v.get("gap_s2") is not None else None})
    rows.sort(key=lambda r: -(r["gap_s2"] or 0))
    return {"schema": rj.get("schema"), "rows": rows, "regions": len(rows), "olmo_ahead_by_003": sum(1 for r in rows if (r["gap_s2"] or 0) >= 0.03),
            "presto_above_chance_060": sum(1 for r in rows if r["presto_s2"] >= 0.60), "report_sha256": sha256(rp)}


def downstream_profile_block() -> list[dict[str, Any]]:
    """G(갈치) 쪽으로 갈수록 AI 변화 토큰 비율이 어떻게 줄어드는지 — 스캔 v2 강 창 중 G 에서 가까운 순 6개."""
    rp = WORK_ROOT / "artifacts/corridor_s2_candidates/embed_scan_v2/report.json"
    wm = WORK_ROOT / "artifacts/corridor_s2_candidates/prepare_v2/windows_manifest.json"
    if not (rp.exists() and wm.exists()):
        return []
    rj = json.loads(rp.read_text()); rows = {r["id"]: r for r in rj.get("windows", rj.get("ranked", []))}
    man = json.loads(wm.read_text()); wins = man.get("windows", man)
    G = (84.9883085, 27.8054960)
    out = []
    for w in wins:
        wid = w.get("id") or w.get("window_id"); c = w.get("center_lonlat") or w.get("center")
        if not (wid and c and wid in rows and str(wid).startswith("v")):
            continue
        r = rows[wid]
        km = math.hypot((c[0] - G[0]) * math.cos(math.radians(27.9)) * 111.0, (c[1] - G[1]) * 111.0)
        out.append({"id": wid, "km_to_G": round(km, 1), "candidate_token_frac": r.get("candidate_token_frac"), "observable": r.get("valid_event_frac"), "rank": r.get("rank")})
    out.sort(key=lambda x: x["km_to_G"])
    return out[:6]


def radar_value_block() -> dict[str, Any] | None:
    """M78: 레이더 단독(S1 asc dB) OLMo Δz vs 고전 log-ratio, 그리고 S2 에 S1 을 보탠 이득 (Sen12 7지역)."""
    rp = WORK_ROOT / "artifacts/sen12_radar_value/report.json"
    if not rp.exists():
        return None
    rj = json.loads(rp.read_text())
    rows = []
    for region, v in rj.get("regions", {}).items():
        if not v.get("patches"):
            continue
        rows.append({"region": region, "patches": v["patches"], "s2_only": round(v["auroc_s2_only"], 3), "s1s2": round(v["auroc_s1s2"], 3),
                     "fusion_gain": round(v["gain"], 3), "s1_only_ai": round(v["auroc_s1_only_olmo"], 3), "s1_classical": round(v["auroc_s1_classical_logratio"], 3)})
    rows.sort(key=lambda r: -r["s1_only_ai"])
    return {"rows": rows, "regions": len(rows), "s1_only_usable": sum(1 for r in rows if r["s1_only_ai"] >= 0.70),
            "s1_ai_beats_classical": sum(1 for r in rows if r["s1_only_ai"] > r["s1_classical"]),
            "fusion_wins_at_003": sum(1 for r in rows if r["fusion_gain"] >= 0.03), "fusion_positive": sum(1 for r in rows if r["fusion_gain"] > 0),
            "report_sha256": sha256(rp)}


def nearest_windows_for_points(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """포인트마다 3 km 이내 가장 가까운 스캔 창 id를 붙임 (팝업 위성 썸네일용)."""
    wm = WORK_ROOT / "artifacts/corridor_s2_candidates/prepare_v2/windows_manifest.json"
    if not wm.exists():
        return points
    wins = json.loads(wm.read_text())["windows"]
    out = []
    for pt in points:
        best, bd = None, 9e9
        for w in wins:
            d = haversine_km(pt["coordinates"], w["center_lonlat"])
            if d < bd:
                best, bd = w["id"], d
        out.append({**pt, "nearest_window": best if bd <= 3.0 else None, "nearest_window_km": round(bd, 1)})
    return out


def headline_block() -> dict[str, Any]:
    """한눈에 읽히는 요약: 봉인 판정 앵커 수 + 회랑 후보 상위 지명. 값이 없으면 정직하게 None."""
    out: dict[str, Any] = {"sealed_candidates": None, "sealed_total": None, "sealed_not_detected": [], "corridor_ranked": None, "corridor_top": []}
    latest = [] if s1db_superseded() else sorted(DELTA_ROOT.glob("*/nepal_delta_report.json"))
    if latest:
        rep = json.loads(latest[-1].read_text())
        if rep.get("live_mode"):
            anchors = rep.get("anchors", {})
            def verdict(v: dict[str, Any]) -> str:
                vd = v.get("verdict")
                if isinstance(vd, dict) and isinstance(vd.get("label"), str):
                    return vd["label"]
                for k in ("label", "verdict", "decision"):
                    if isinstance(v.get(k), str):
                        return v[k]
                return ""

            labels = {a: verdict(v) for a, v in anchors.items() if isinstance(v, dict)}
            out["sealed_total"] = len(labels)
            out["sealed_candidates"] = sum(1 for s in labels.values() if "candidate" in s)
            out["sealed_not_detected"] = [a for a, s in labels.items() if "candidate" not in s]
            out["live_mode"] = rep.get("live_mode"); out["placebo_n"] = len(rep.get("placebo_modes_available", []))
    _audit = json.loads(S1_DB_AUDIT.read_text()) if s1db_superseded() else {}
    _rerun_ok = (_audit.get("five_anchor_rerun") or {}).get("status") == "recomputed"
    matched = [] if (s1db_superseded() and not _rerun_ok) else sorted((WORK_ROOT / "artifacts/external_data/nepal_olmo_live_v1/delta_matched").glob("*/nepal_delta_matched_report.json"))
    if matched:
        mj = json.loads(matched[-1].read_text())
        ma = mj.get("anchors", {})
        out["matched"] = {"n_pairs": len(mj.get("placebo_pairs", [])),
                          "candidates": [a for a, v in ma.items() if "candidate" in v.get("label", "")],
                          "ranks": {a: f"{v['rank_of_event']}/{v['n_placebo'] + 1}" for a, v in ma.items()},
                          "token": {a: {"event_frac": (v.get("token") or {}).get("event_frac_above"),
                                        "placebo_max": max((v.get("token") or {}).get("placebo_fracs_above") or [0]),
                                        "rank": (v.get("token") or {}).get("rank_of_event"),
                                        "candidate": "candidate" in ((v.get("token") or {}).get("label") or "")} for a, v in ma.items()},
                          "token_candidates": [a for a, v in ma.items() if "candidate" in ((v.get("token") or {}).get("label") or "")],
                          "report_sha256": sha256(matched[-1])}
    cand = candidates_block()
    if cand:
        out["corridor_ranked"] = sum(1 for f in cand["geojson"]["features"] if f["properties"].get("status") == "ranked")
        out["corridor_windows"] = cand["windows"]
        out["corridor_top"] = [c.get("place") or c["id"] for c in cand["top10"][:3]]
    return out


def build(refresh_osm: bool) -> None:
    if not SOURCE_ROOT.exists():
        raise FileNotFoundError(f"Missing materialized source: {SOURCE_ROOT}")
    scenes_dir = PUBLIC_DATA / "scenes"
    scenes_dir.mkdir(parents=True, exist_ok=True)

    scene_records: list[dict[str, Any]] = []
    band_path = "B01_B02_B03_B04_B05_B06_B07_B08_B8A_B09_B11_B12/geotiff.tif"
    seen_scene_ids: set[str] = set()
    for mode in SCENE_MODES:
        window_root = MATERIALIZED_ROOT / mode / "dataset/windows/nepal" / DISPLAY_ANCHOR
        manifest_path = MATERIALIZED_ROOT / mode / "materialization_manifest.json"
        if not window_root.exists() or not manifest_path.exists():
            continue
        manifest = json.loads(manifest_path.read_text())
        if mode == "baseline":
            if not manifest.get("valid"):
                continue
            state = "baseline_ready"
        else:
            # live 모드는 부분 완성도 보여줌 — 예: 8/27 S2는 물질화됐지만 S1 4기간이
            # 아직 안 차서 seal invalid인 상태. 장면 자체는 실측이므로 표시하되
            # state로 정직하게 구분함 (live_partial = 임베딩 게이트 미통과).
            state = "live_ready" if manifest.get("valid") else "live_partial"
        layers = discover_layers(window_root)
        for layer, timestamp in layers.get("sentinel2_l2a", []):
            scene_id = f"s2-{timestamp[:10]}"
            source = window_root / "layers" / layer / band_path
            if not source.exists():
                continue
            if scene_id in seen_scene_ids:
                # live 모드가 같은 관측을 다시 담으면 state만 승격함
                for rec in scene_records:
                    if rec["id"] == scene_id and state.startswith("live"):
                        rec["state"] = state
                continue
            seen_scene_ids.add(scene_id)
            destination = scenes_dir / f"{scene_id}.png"
            rendered = render_s2(source, destination)
            scene_records.append({
                "id": scene_id, "sensor": "Sentinel-2 L2A", "acquired_at": timestamp,
                "state": state, "image": f"/data/scenes/{destination.name}",
                "coordinates": rendered["coordinates"], "source_sha256": sha256(source),
                **rendered["stats"],
            })
        for layer, timestamp in layers.get("sentinel1", []):
            scene_id = f"s1-{timestamp[:10]}"
            source = window_root / "layers" / layer / "vv_vh/geotiff.tif"
            if not source.exists():
                continue
            if scene_id in seen_scene_ids:
                for rec in scene_records:
                    if rec["id"] == scene_id and state.startswith("live"):
                        rec["state"] = state
                continue
            seen_scene_ids.add(scene_id)
            destination = scenes_dir / f"{scene_id}.png"
            rendered = render_s1(source, destination)
            scene_records.append({
                "id": scene_id, "sensor": "Sentinel-1 RTC VV/VH", "acquired_at": timestamp,
                "state": state, "image": f"/data/scenes/{destination.name}",
                "coordinates": rendered["coordinates"], "source_sha256": sha256(source),
                **rendered["stats"],
            })

    hydrography_path = PUBLIC_DATA / "hydrography.geojson"
    if refresh_osm or not hydrography_path.exists():
        hydrography = fetch_hydrography(hydrography_path)
    else:
        hydrography = json.loads(hydrography_path.read_text())

    montage_source = WORK_ROOT / "artifacts/nepal_olmo_live_v1/pre_event_input_montage.png"
    if montage_source.exists():
        shutil.copy2(montage_source, PUBLIC_DATA / "pre-event-input-montage.png")

    anchor_features = []
    nepal_root = SOURCE_ROOT.parent
    for anchor_root in sorted(path for path in nepal_root.iterdir() if path.is_dir()):
        raster = anchor_root / "layers/sentinel2_l2a" / band_path
        if not raster.exists():
            continue
        with rasterio.open(raster) as dataset:
            left, bottom, right, top = transform_bounds(dataset.crs, "EPSG:4326", *dataset.bounds)
        anchor_features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": anchor_root.name,
                    "status": "input_materialized",
                    "interpretation": "provisional" if anchor_root.name == "source_provisional" else "operational_anchor",
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[left, top], [right, top], [right, bottom], [left, bottom], [left, top]]],
                },
            }
        )
    anchors_geojson = {"type": "FeatureCollection", "features": anchor_features}
    anchors_path = PUBLIC_DATA / "olmo-input-anchors.geojson"
    anchors_path.write_text(json.dumps(anchors_geojson, indent=2, ensure_ascii=False) + "\n")

    point_a = next(point["coordinates"] for point in POINTS if point["id"] == "A")
    for point in POINTS:
        point["distance_from_a_km"] = round(haversine_km(point_a, point["coordinates"]), 2)

    live_observation, scheduled_scenes, live_provenance = load_live_observation()
    olmoearth = olmoearth_block()
    corrected_corridor = corrected_corridor_block()
    post_event_delta = olmoearth.get("post_event_delta")
    if corrected_corridor:
        evidence_status = (
            "The contract-correct 27-window OLMoEarth screening is complete. Event change is below the "
            "single matched-location ordinary transition in almost every token; the result prioritizes review "
            "but does not establish damage or a calibrated anomaly."
        )
    elif isinstance(post_event_delta, dict) and post_event_delta.get("live_mode"):
        evidence_status = (
            "A legacy post-event S1+S2 delta exists but is excluded when the Sentinel-1 contract audit is active."
        )
    elif live_observation and live_observation["catalog_status"] == "published":
        evidence_status = (
            "Post-event pixels and the full OLMoEarth input seal are ready; embedding has not run."
            if live_observation.get("olmo_ready")
            else "Post-event pixels exist, but the full OLMoEarth input contract is not sealed."
        )
    else:
        evidence_status = "Post-event open satellite scene pending in this snapshot."

    manifest = {
        "schema": "olmoearth-nepal-live-twin/v2",
        "generated_at": datetime.now(UTC).isoformat(),
        "event": {
            "name": "2026 Rasuwa–Bhote Koshi flash flood",
            "occurred_at": "2026-08-26T02:52:10Z",
            "cause_status": (
                "A rock–ice/glacial collapse on the Nepal side of Langtang Lirung is the leading "
                "assessment. It generated a cross-border debris-flow/flood; causal and field details remain under review."
            ),
            "evidence_status": evidence_status,
        },
        "incident_updates": INCIDENT_UPDATES,
        "points": nearest_windows_for_points(POINTS),
        "scene_records": sorted(scene_records, key=lambda item: item["acquired_at"]),
        "scheduled_scenes": scheduled_scenes,
        "live_observation": live_observation,
        "olmoearth": olmoearth,
        "decision": build_decision(live_observation, scheduled_scenes, olmoearth),
        "ops_log": build_ops_log(),
        "research": research_block(),
        "candidates": candidates_block(),
        "corridor_sealed": corrected_corridor,
        "input_contract_audit": (json.loads(S1_DB_AUDIT.read_text()) if S1_DB_AUDIT.exists() else None),
        "corridor_contract": corridor_contract_block(),
        "headline": headline_block(),
        "ai_vs_classical": ai_vs_classical_block(),
        "radar_value": radar_value_block(),
        "downstream_profile": downstream_profile_block(),
        "presto_control": presto_control_block(),
        "lake_search": lake_search_block(),
        "placebo_extended": placebo_extended_block(),
        "downstream_visual": (
            json.loads((PUBLIC_DATA / "bidur-visual-audit.json").read_text())
            if (PUBLIC_DATA / "bidur-visual-audit.json").exists() else {
                "purpose": "visual_only_downstream_context_not_part_of_five_anchor_olmo_contract",
                "records": [],
            }
        ),
        "simulation": {
            "engine": "Rust/WASM deterministic particle preview",
            "route_source": "verified OSM river-way chain from Bhote Koshi through Trishuli to the current Galchhi inspection endpoint",
            "route_points": len(hydrography["simulation_route"]),
            "mapped_route_km_from_border": round(sum(
                haversine_km(first, second)
                for first, second in zip(hydrography["simulation_route"], hydrography["simulation_route"][1:])
            ), 1),
            "reported_total_travel_km": 100,
            "reported_reach_source": "USGS preliminary findings as of 2026-08-27",
            "trace_endpoint": {"name": "Galchhi reach-search endpoint", "coordinates": hydrography["simulation_route"][-1]},
            "trace_endpoint_boundary": "Current mapped inspection endpoint; not a confirmed terminal deposit or inundation boundary.",
            "claim": "illustrative_kinematic_preview_not_hazard_forecast",
            "scientific_upgrade": "precomputed r.avaflow v4 ensemble, independently checked with D-Claw",
        },
        "provenance": {
            "source_root": str(SOURCE_ROOT),
            "metadata_sha256": sha256(SOURCE_ROOT / "metadata.json"),
            "items_sha256": sha256(SOURCE_ROOT / "items.json"),
            "hydrography_sha256": sha256(hydrography_path),
            **live_provenance,
        },
    }
    (PUBLIC_DATA / "scenario.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"scenes": len(scene_records), "route_points": len(hydrography["simulation_route"]), "output": str(PUBLIC_DATA)}, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh-osm", action="store_true", help="Refresh the three verified river ways from Overpass")
    args = parser.parse_args()
    build(refresh_osm=args.refresh_osm)


if __name__ == "__main__":
    main()
