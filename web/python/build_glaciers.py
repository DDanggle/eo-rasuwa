#!/usr/bin/env python3
"""지역 빙하 윤곽(OSM natural=glacier) → 정적 GeoJSON + 면적 통계.

윤곽은 OSM(상당수 GLIMS 인벤토리 유래)이며 촬영 연도는 과거·혼재 —
'현재 빙하 상태'가 아니라 '빙하 지대의 규모'를 보여주는 배경 레이어다.
"""
import json, math, urllib.request
from pathlib import Path

PUB = Path(__file__).resolve().parents[1] / "public/data"
# 2026-09-04: 이전 bbox는 북쪽·동쪽 경계에서 빙하가 잘렸다. 회랑 상류의 히말라야
# 주능선(랑탕·시샤팡마·주갈)을 다 담도록 넓힘. 아래 지도 뷰보다 여유 있게.
BBOX = "27.60,84.60,28.90,86.30"
E = (85.5194, 28.2765)  # source estimate

q = f'[out:json][timeout:90];(way["natural"="glacier"]({BBOX});relation["natural"="glacier"]({BBOX}););out geom;'
req = urllib.request.Request("https://overpass-api.de/api/interpreter", data=q.encode(),
                             headers={"User-Agent": "eo-rasuwa/1.0"})
d = json.loads(urllib.request.urlopen(req, timeout=120).read())

def ring_area_km2(ring):
    R = 6371.0088; a = 0.0
    for i in range(len(ring) - 1):
        lon1, lat1 = ring[i]; lon2, lat2 = ring[i + 1]
        a += math.radians(lon2 - lon1) * (2 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2)))
    return a * R * R / 2  # signed

def simplify(ring, min_deg=0.00018):  # ≈20 m — 화면 축척에서 형태 손실 없음
    out = [ring[0]]
    for pt in ring[1:-1]:
        if abs(pt[0] - out[-1][0]) > min_deg or abs(pt[1] - out[-1][1]) > min_deg:
            out.append(pt)
    out.append(ring[-1])
    return out if len(out) >= 4 else ring


def close(ring):
    if ring[0] != ring[-1]: ring.append(ring[0])
    return ring

features = []
for el in d.get("elements", []):
    rings = []
    if el["type"] == "way" and el.get("geometry"):
        rings = [close([[p["lon"], p["lat"]] for p in el["geometry"]])]
    elif el["type"] == "relation":
        # outer 멤버 way들을 끝점으로 이어붙여 링 복원
        segs = [[[p["lon"], p["lat"]] for p in m["geometry"]]
                for m in el.get("members", []) if m.get("role") == "outer" and m.get("geometry")]
        while segs:
            ring = segs.pop(0)
            grew = True
            while grew and ring[0] != ring[-1]:
                grew = False
                for i, s in enumerate(segs):
                    if s[0] == ring[-1]: ring += s[1:]; segs.pop(i); grew = True; break
                    if s[-1] == ring[-1]: ring += s[::-1][1:]; segs.pop(i); grew = True; break
            if len(ring) >= 4: rings.append(close(ring))
    for ring in rings:
        km2 = abs(ring_area_km2(ring))
        if km2 < 0.05: continue  # 0.05 km² 미만 설전은 지도 축척에서 점으로만 보여 용량만 먹는다
        cx = sum(p[0] for p in ring) / len(ring); cy = sum(p[1] for p in ring) / len(ring)
        features.append({"type": "Feature",
            "properties": {"km2": round(km2, 3), "name": (el.get("tags") or {}).get("name:en") or (el.get("tags") or {}).get("name"),
                            "near_source_5km": math.hypot((cx - E[0]) * 98, (cy - E[1]) * 111) <= 5.0},
            "geometry": {"type": "Polygon", "coordinates": [[[round(x, 4), round(y, 4)] for x, y in simplify(ring)]]}})

total = sum(f["properties"]["km2"] for f in features)
near = [f for f in features if f["properties"]["near_source_5km"]]
near_total = sum(f["properties"]["km2"] for f in near)
out = {"type": "FeatureCollection",
       "attribution": "© OpenStreetMap contributors (outlines largely GLIMS-derived), ODbL — outline vintage varies; background context, not current glacier state",
       "stats": {"glaciers": len(features), "total_km2": round(total, 1),
                  "within_5km_of_source": len(near), "within_5km_km2": round(near_total, 1)},
       "features": features}
(PUB / "glaciers.geojson").write_text(json.dumps(out) + "\n")
print(json.dumps(out["stats"]), f"{(PUB/'glaciers.geojson').stat().st_size//1024} KB")
