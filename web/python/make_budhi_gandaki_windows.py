#!/usr/bin/env python3
"""M110 부디 간다키 회랑 창 — OSM 센터라인(Chumchet~베니갓 트리슐리 합류)을 끝점 연결로 이어 2.56 km 창으로 자른다.
출력: research-private/artifacts/terai_rivers/centerlines.geojson 에 river 'xriver_budhi_gandaki' 추가, code/terai_flood_windows.json 에 aoi 'xriver_budhi_gandaki' 창 추가.
서버(shapely·pyproj 있는 venv)에서 실행. 노트북엔 shapely 없음.
"""
from __future__ import annotations
import json, urllib.request, sys
from pathlib import Path
from shapely.geometry import LineString, Point, shape
from shapely.ops import linemerge, unary_union
from pyproj import Transformer

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2]
SPAN, EPSG, RIVER = 2560, 32645, "xriver_budhi_gandaki"
TOP, BOTTOM = (84.9644, 28.4755), (84.783, 27.814)   # Chumchet(Shyar Khola) ~ 베니갓 트리슐리 합류
# OSM 조각은 노트북에서 OSM API 로 받아 둔 파일(Overpass 가 10-13 에 504). Shyar Khola(Chumchet 이 놓인 지류) + 합류점 아래 본류만.
els = json.loads((ROOT / "research-private/artifacts/terai_rivers/osm_budhi_gandaki.json").read_text())["elements"]
els = [e for e in els if "Shyar" in e["tags"].get("name", "") or (e["tags"].get("name") == "Budhi Gandaki" and e["geometry"][0]["lat"] <= 28.4425)]
fw = Transformer.from_crs(4326, EPSG, always_xy=True); bw = Transformer.from_crs(EPSG, 4326, always_xy=True)
lines = [LineString([fw.transform(p["lon"], p["lat"]) for p in e["geometry"]]) for e in els if e.get("geometry") and len(e["geometry"]) > 1]
print("osm ways", len(lines))
merged = linemerge(unary_union(lines))
parts = list(merged.geoms) if merged.geom_type == "MultiLineString" else [merged]
# 끝점 연결: 위에서 아래로 가장 가까운 조각을 이어 붙인다
top = Point(fw.transform(*TOP)); bot = Point(fw.transform(*BOTTOM))
parts = [p for p in parts if p.length > 500]
cur = min(parts, key=lambda p: p.distance(top))
if Point(cur.coords[-1]).distance(bot) > Point(cur.coords[0]).distance(bot): cur = LineString(cur.coords[::-1])
parts.remove(cur); coords = list(cur.coords)
while parts:
    end = Point(coords[-1])
    nxt = min(parts, key=lambda p: min(Point(p.coords[0]).distance(end), Point(p.coords[-1]).distance(end)))
    d0, d1 = Point(nxt.coords[0]).distance(end), Point(nxt.coords[-1]).distance(end)
    if min(d0, d1) > 1500: break
    parts.remove(nxt); coords += list(nxt.coords if d0 <= d1 else nxt.coords[::-1])
line = LineString(coords)
# 합류점 아래는 자른다
cut = line.project(bot); line = LineString([line.interpolate(s) for s in range(0, int(cut), 100)] + [line.interpolate(cut)])
# 위쪽도 Chumchet 위 2 km 에서 시작
start = max(0, line.project(top) - 3000)
line = LineString([line.interpolate(s) for s in range(int(start), int(line.length), 100)] + [line.interpolate(line.length)])
print(f"centerline {line.length/1000:.1f} km")
cl = ROOT / "research-private/artifacts/terai_rivers/centerlines.geojson"; c = json.loads(cl.read_text())
c["features"] = [f for f in c["features"] if f["properties"]["river"] != RIVER]
c["features"].append({"type": "Feature", "properties": {"river": RIVER, "epsg": EPSG, "name": "Budhi Gandaki", "name_ko": "부디 간다키강"},
                      "geometry": {"type": "LineString", "coordinates": [list(bw.transform(x, y)) for x, y in line.coords]}})
cl.write_text(json.dumps(c))
wj = ROOT / "code/terai_flood_windows.json"; wins = [w for w in json.loads(wj.read_text()) if w["aoi"] != RIVER]
n = int(line.length // SPAN); half = SPAN / 2
for k in range(n):
    m = line.interpolate((k + 0.5) * SPAN); cx, cy = round(m.x / 40) * 40, round(m.y / 40) * 40
    wins.append({"id": f"budhig_{k:02d}", "aoi": RIVER, "epsg": EPSG, "bounds_utm": [cx - half, cy - half, cx + half, cy + half],
                 "center_lonlat": list(bw.transform(cx, cy)), "note": "Budhi Gandaki from Chumchet down to the Trishuli confluence at Benighat (11 Oct 2026 landslide-dam flood)",
                 "km_along": round((k + 0.5) * SPAN / 1000, 1)})
wj.write_text(json.dumps(wins, ensure_ascii=False, indent=0).replace("\n", "\n") )
print("windows", n, "total", len(wins))
