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
        (w.get("candidate_token_frac") if w.get("status") == "ranked" else None), False) for w in wins]
nb_report = REPO / "research-private/artifacts/neighbor_scan/embed/report.json"
if nb_report.exists():
    nb = json.loads(nb_report.read_text())
    for w in nb["windows"]:
        pts.append((w["center_lonlat"][0], w["center_lonlat"][1],
                    (w.get("candidate_token_frac") if w.get("status") == "ranked" else None), True))
    print("neighbor windows:", len(nb["windows"]))

def assign(lon, lat):
    best, bd = None, 1e9
    for x, y, frac, ext in pts:
        d = math.hypot((x - lon) * 98.0, (y - lat) * 111.0)
        if d < bd: bd, best = d, (frac, ext)
    return best if bd <= 1.6 else "outside"

hydro = json.loads((PUB / "hydrography.geojson").read_text())
rivers = json.loads((PUB / "rivers-region.geojson").read_text())
features = []
# 회랑(hydrography) + 지역 하천(rivers-region) 전부 — 겹치는 회랑 구간은 같은 창이 배정돼 색이 같다.
for f in hydro["features"] + rivers["features"]:
    coords = f["geometry"]["coordinates"]
    if f["geometry"]["type"] != "LineString" or len(coords) < 2:
        continue
    seg, cur = [coords[0]], None
    def flush(seg, val):
        if len(seg) < 2:
            return
        if val == "outside":          # 어떤 창도 안 덮는 구간 — 배경 하천선만 남긴다
            return
        frac, ext = (val if isinstance(val, tuple) else (None, False))
        features.append({"type": "Feature",
            "properties": {"frac": (None if frac is None else round(float(frac), 4)),
                            "observed": frac is not None, "ext": bool(ext)},
            "geometry": {"type": "LineString", "coordinates": [list(c) for c in seg]}})
    cur = assign(*coords[0][:2])
    for c in coords[1:]:
        v = assign(*c[:2])
        seg.append(list(c))
        if v != cur:
            flush(seg, cur); seg = [list(c)]; cur = v
    flush(seg, cur)

out = {"type": "FeatureCollection",
       "claim": "river centrelines coloured by the observed per-window change fraction; ext=true segments come from the 2026-09-02 neighbor-river extension scan (single-placebo p99, separate from the sealed 6-lead funnel); grey dash = unobservable; not risk, not a forecast",
       "features": features}
(PUB / "change-ribbon.geojson").write_text(json.dumps(out) + "\n")
obs = [f for f in features if f["properties"]["observed"]]
fr = [f["properties"]["frac"] for f in obs]
print(f"segments {len(features)} (observed {len(obs)}) frac range {min(fr):.3f}–{max(fr):.3f}")
