#!/usr/bin/env python3
"""강줄기 변화 리본: 하천 중심선을 창별 관측 변화율로 칠하는 GeoJSON.

각 하천 정점에 가장 가까운 스캔 창(±1.6 km)의 candidate_token_frac을 배정하고,
값이 바뀌는 지점에서 선을 잘라 세그먼트마다 frac을 붙인다. 관측 불가 창이나
창 밖 구간은 frac=null (회색 점선). 위험도·예측이 아니라 관측된 변화의 요약이다.
"""
from pathlib import Path
import json, math

REPO = Path(__file__).resolve().parents[2]
PUB = REPO / "web/public/data"

sc = json.loads((PUB / "scenario.json").read_text())
wins = [f["properties"] for f in sc["candidates"]["geojson"]["features"]]
pts = [(w["center_lonlat"][0], w["center_lonlat"][1],
        (w.get("candidate_token_frac") if w.get("status") == "ranked" else None)) for w in wins]

def assign(lon, lat):
    best, bd = None, 1e9
    for x, y, frac in pts:
        d = math.hypot((x - lon) * 98.0, (y - lat) * 111.0)
        if d < bd: bd, best = d, frac
    return best if bd <= 1.6 else "outside"

hydro = json.loads((PUB / "hydrography.geojson").read_text())
features = []
for f in hydro["features"]:
    coords = f["geometry"]["coordinates"]
    if f["geometry"]["type"] != "LineString" or len(coords) < 2:
        continue
    seg, cur = [coords[0]], None
    def flush(seg, val):
        if len(seg) >= 2:
            features.append({"type": "Feature",
                "properties": {"frac": (None if val in (None, "outside") else round(float(val), 4)),
                                "observed": val not in (None, "outside")},
                "geometry": {"type": "LineString", "coordinates": [list(c) for c in seg]}})
    cur = assign(*coords[0][:2])
    for c in coords[1:]:
        v = assign(*c[:2])
        seg.append(list(c))
        if v != cur:
            flush(seg, cur); seg = [list(c)]; cur = v
    flush(seg, cur)

out = {"type": "FeatureCollection",
       "claim": "river centreline coloured by the observed per-window change fraction (pooled three-pair threshold); grey dash = unobservable or outside scanned windows; not risk, not a forecast",
       "features": features}
(PUB / "change-ribbon.geojson").write_text(json.dumps(out) + "\n")
obs = [f for f in features if f["properties"]["observed"]]
fr = [f["properties"]["frac"] for f in obs]
print(f"segments {len(features)} (observed {len(obs)}) frac range {min(fr):.3f}–{max(fr):.3f}")
