#!/usr/bin/env python3
"""지도 범위의 전체 하천망(OSM waterway=river)을 정적 GeoJSON으로 저장.

회랑 하천(hydrography.geojson)과 별개로, '색이 없는 다른 강'을 배경에 깔아
관측된 강(리본)과의 대비를 만든다. 좌표는 5자리(≈1 m)로 반올림해 용량 절약.
"""
import json, urllib.request
from pathlib import Path

PUB = Path(__file__).resolve().parents[1] / "public/data"
BBOX = "27.70,84.90,28.45,85.70"  # S,W,N,E — 지도 fitBounds보다 약간 넓게
query = f"""
[out:json][timeout:60];
way["waterway"~"^(river)$"]({BBOX});
out geom;
"""
req = urllib.request.Request("https://overpass-api.de/api/interpreter",
                             data=query.encode(), headers={"User-Agent": "eo-rasuwa/1.0"})
data = json.loads(urllib.request.urlopen(req, timeout=90).read())
features = []
for el in data.get("elements", []):
    if el.get("type") != "way" or not el.get("geometry"):
        continue
    coords = [[round(p["lon"], 5), round(p["lat"], 5)] for p in el["geometry"]]
    if len(coords) < 2:
        continue
    features.append({"type": "Feature",
                     "properties": {"name": el.get("tags", {}).get("name:en") or el.get("tags", {}).get("name")},
                     "geometry": {"type": "LineString", "coordinates": coords}})
out = {"type": "FeatureCollection",
       "attribution": "© OpenStreetMap contributors, ODbL",
       "features": features}
path = PUB / "rivers-region.geojson"
path.write_text(json.dumps(out, ensure_ascii=False) + "\n")
print("rivers:", len(features), f"{path.stat().st_size//1024} KB")
