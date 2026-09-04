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
# (frac, ext) — ext=True 는 2026-09-02 이웃 하천 확장 스캔(자체 단일 평시쌍 p99, 봉인 퍼널과 별개)
pts = [(w["center_lonlat"][0], w["center_lonlat"][1],
        (w.get("candidate_token_frac") if w.get("status") == "ranked" else None), False, w["id"]) for w in wins]
nb_report = REPO / "research-private/artifacts/neighbor_scan/pooled3/report.json"
if nb_report.exists():
    nb = json.loads(nb_report.read_text())
    for w in nb["windows"]:
        pts.append((w["center_lonlat"][0], w["center_lonlat"][1],
                    (w.get("candidate_frac_pooled3") if w.get("status") == "ranked" else None), True, w["id"]))
    print("neighbor windows:", len(nb["windows"]))

def assign(lon, lat):
    best, bd = None, 1e9
    for x, y, frac, ext, wid in pts:
        d = math.hypot((x - lon) * 98.0, (y - lat) * 111.0)
        if d < bd: bd, best = d, (frac, ext, wid)
    return best if bd <= 1.6 else "outside"

hydro = json.loads((PUB / "hydrography.geojson").read_text())
rivers = json.loads((PUB / "rivers-region.geojson").read_text())
features = []
# 회랑(hydrography) + 지역 하천(rivers-region) 전부 — 겹치는 회랑 구간은 같은 창이 배정돼 색이 같다.
# rivers-region 에는 회랑(hydrography)과 같은 OSM way 가 다시 들어 있다 — 그대로 합치면
# 회랑이 두 번 그려지고 길이도 이중 계산된다. 회랑 정점과 사실상 겹치는 선은 뺀다.
_hpts = set()
for _f in hydro["features"]:
    if _f["geometry"]["type"] == "LineString":
        for _x, _y in _f["geometry"]["coordinates"]:
            _hpts.add((round(_x, 4), round(_y, 4)))
def _is_dup(feat):
    c = feat["geometry"]["coordinates"]
    hits = sum(1 for x, y in c if (round(x, 4), round(y, 4)) in _hpts)
    return hits >= max(2, len(c) * 0.5)
_rivers = [f for f in rivers["features"] if not _is_dup(f)]
print("rivers-region:", len(rivers["features"]), "->", len(_rivers), "after removing corridor duplicates")

for f in hydro["features"] + _rivers:
    coords = f["geometry"]["coordinates"]
    if f["geometry"]["type"] != "LineString" or len(coords) < 2:
        continue
    seg, cur = [coords[0]], None
    def flush(seg, val):
        if len(seg) < 2:
            return
        if val == "outside":          # 어떤 창도 안 덮는 구간 — 배경 하천선만 남긴다
            return
        frac, ext, wid = (val if isinstance(val, tuple) else (None, False, None))
        features.append({"type": "Feature",
            "properties": {"frac": (None if frac is None else round(float(frac), 4)),
                            "observed": frac is not None, "ext": bool(ext), "wid": wid},
            "geometry": {"type": "LineString", "coordinates": [list(c) for c in seg]}})
    cur = assign(*coords[0][:2])
    for c in coords[1:]:
        v = assign(*c[:2])
        seg.append(list(c))
        if v != cur:
            flush(seg, cur); seg = [list(c)]; cur = v
    flush(seg, cur)

import math as _m
def _len(c):
    return sum(_m.hypot((c[i+1][0]-c[i][0]) * 98, (c[i+1][1]-c[i][1]) * 111) for i in range(len(c)-1))
_obs_km = sum(_len(f["geometry"]["coordinates"]) for f in features if f["properties"]["observed"])
_all_km = sum(_len(f["geometry"]["coordinates"]) for f in features)

out = {"type": "FeatureCollection",
       "observed_river_km": round(_obs_km, 1), "total_river_km": round(_all_km, 1),
       "claim": "river centrelines coloured by the observed per-window change fraction; ext=true segments come from the 2026-09-02 neighbor-river extension scan (single-placebo p99, separate from the sealed 6-lead funnel); grey dash = unobservable; not risk, not a forecast",
       "features": features}
(PUB / "change-ribbon.geojson").write_text(json.dumps(out) + "\n")
obs = [f for f in features if f["properties"]["observed"]]
fr = [f["properties"]["frac"] for f in obs]
print(f"segments {len(features)} (observed {len(obs)}) frac range {min(fr):.3f}–{max(fr):.3f}")
