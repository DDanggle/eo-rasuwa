#!/usr/bin/env python3
"""UNOSAT 발표 레이어를 공개 UI용 GeoJSON 으로 변환한다 (CC-BY-SA-4.0).

우리 변화 램프가 구분할 수 없는 것을 이 레이어들이 채운다:
  detachment zone — 어디서 떨어져 나왔나 (우리는 '어디가 달라졌나'만 안다)
  barrier lakes   — 잔존 위험 저수지. 새로 생긴 물과 평범한 물을 우리는 구분 못 한다.
  flood extent    — 제3자가 지도화한 범위 (M86 에서 창 규모로는 무판별이었던 그 종류)
  affected assets — 건물·도로·문화유산. 노출이지 우리 점수의 결과가 아니다.

원본은 `.ext/unosat/FL20260826NPL.gdb` (git 제외, HDX 재다운로드 가능).
출처 표기 의무가 있고 share-alike 다 — 지도 범례와 attribution 에 반드시 남긴다.
"""
from __future__ import annotations
import json
from pathlib import Path

import geopandas as gpd

REPO = Path(__file__).resolve().parents[2]
GDB = REPO / ".ext/unosat/FL20260826NPL.gdb"
PUB = REPO / "web/public/data"

ATTRIBUTION = "UNOSAT / UNITAR, event FL20260826NPL, CC-BY-SA-4.0, via HDX (retrieved 2026-09-08)"

POLYGONS = {
    "detachment_zone": ("UNOSAT_Landsat9_20260826_DetachmentZone", 0.00008,
                        "Where the mass detached, mapped by UNOSAT on Landsat-9. Not our measurement."),
    "barrier_lakes": ("UNOSAT_Cartosat3_20260828_BarrierLakes", 0.00004,
                      "Lakes impounded behind the debris, mapped by UNOSAT on Cartosat-3, 28 Aug. Residual hazard — our change score cannot tell new impoundments from ordinary water."),
    "flood_extent": ("UNOSAT_Multisensor_20260826_20260828_FloodExtent", 0.00025,
                     "Third-party flood extent, 26-28 Aug. At 2.56 km window scale this does not discriminate our ranking (M86)."),
}
LINES = {"affected_roads": ("UNOSAT_Multisensor_20260826_20260828_AffectedRoads", 0.00015,
                            "Roads UNOSAT recorded as affected.")}
POINTS = {
    "affected_buildings": ("UNOSAT_Multisensor_20260826_20260828_AffectedBuildings",
                           "Buildings UNOSAT recorded as affected. Exposure, not a result of our score."),
    "cultural_heritage": ("UNOSAT_Multisensor_20260827_20260828_CulturalHeritage_Damage",
                          "Cultural heritage sites UNOSAT recorded as damaged."),
}


def dump(name: str, gdf: gpd.GeoDataFrame, note: str, extra: dict | None = None) -> None:
    gdf = gdf.to_crs(4326)
    metric = gdf.to_crs(32645)
    fc = json.loads(gdf[["geometry"]].to_json())
    fc["attribution"] = ATTRIBUTION
    fc["claim"] = note
    fc["features_count"] = len(gdf)
    if gdf.geometry.geom_type.iloc[0].endswith("Polygon"):
        fc["area_km2"] = round(metric.geometry.area.sum() / 1e6, 3)
    if gdf.geometry.geom_type.iloc[0].endswith("LineString"):
        fc["length_km"] = round(metric.geometry.length.sum() / 1e3, 1)
    fc.update(extra or {})
    out = PUB / f"unosat-{name.replace('_', '-')}.geojson"
    out.write_text(json.dumps(fc) + "\n")
    size = out.stat().st_size
    print(f"{out.name:38} n={len(gdf):5} {size/1024:8.1f} KB "
          f"{fc.get('area_km2', fc.get('length_km', ''))}")


def main() -> None:
    if not GDB.exists():
        raise SystemExit(f"missing {GDB} — download FL20260826NPL.gdb.zip from HDX first")
    for name, (layer, tol, note) in {**POLYGONS, **LINES}.items():
        g = gpd.read_file(GDB, layer=layer)
        g["geometry"] = g.geometry.simplify(tol, preserve_topology=True)
        dump(name, g, note)
    for name, (layer, note) in POINTS.items():
        dump(name, gpd.read_file(GDB, layer=layer), note)


if __name__ == "__main__":
    main()
