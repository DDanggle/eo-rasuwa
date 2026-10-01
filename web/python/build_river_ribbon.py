#!/usr/bin/env python3
"""M103 강 리본 — 1장의 change-ribbon 과 같은 문법으로, 강 센터라인을 2.56 km 구간으로 잘라 그 구간을 담은 창의 변화로 색칠한다.

구간 값 = 그 창에서 **강 인접 토큰**(사전 물 또는 그 이웃) 중 Δz 가 평시 p99 를 넘은 토큰 비율(frac), 그리고 새-물 토큰 비율(nw).
창이 없거나 관측 불가인 구간은 observed=false 로 남긴다(지우지 않는다 — 1장 규율).
입력: research-private/artifacts/terai_radar_scan_{r19,r12}/report.json, public/data/september-change-tokens.geojson(강 창 토큰 포함),
      research-private/artifacts/terai_rivers/centerlines.geojson, code/terai_flood_windows.json
출력: public/data/september-river-ribbon.geojson
"""
from __future__ import annotations
import json
from pathlib import Path
from shapely.geometry import LineString, Point, shape, box
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "research-private/artifacts"
PUB = ROOT / "web/public/data"
SPAN = 2560

wins = {w["id"]: w for w in json.loads((ROOT / "code/terai_flood_windows.json").read_text()) if "river_" in w["aoi"]}
reports = {}
for tag in ("terai_radar_scan_r19", "terai_radar_scan_r12", "terai_radar_scan_x19", "terai_radar_scan_x12", "terai_radar_scan_u19"):
    p = ART / tag / "report.json"
    if p.exists():
        r = json.loads(p.read_text())
        for w in r["windows"]: reports[w["id"]] = {**w, "thr": r["threshold_placebo_p99"]}
tokens = json.loads((PUB / "september-change-tokens.geojson").read_text())["features"]
by_win: dict[str, list] = {}
for t in tokens:
    by_win.setdefault(t["properties"]["w"], []).append(t["properties"])
center = json.loads((ART / "terai_rivers/centerlines.geojson").read_text())

feats = []
for cf in center["features"]:
    river = cf["properties"]["river"]; epsg = cf["properties"]["epsg"]
    fw = Transformer.from_crs(4326, epsg, always_xy=True); bw = Transformer.from_crs(epsg, 4326, always_xy=True)
    line = LineString([fw.transform(x, y) for x, y in shape(cf["geometry"]).coords])
    n = int(line.length // SPAN)
    rw = [w for w in wins.values() if w["aoi"] == river]
    for k in range(n):
        seg = LineString([line.interpolate(k * SPAN + s) for s in range(0, SPAN + 1, 160)])
        mid = line.interpolate((k + 0.5) * SPAN)
        # 이 구간을 담은 창 = 중점이 창 안에 있는 창
        w = next((w for w in rw if box(*w["bounds_utm"]).contains(mid)), None)
        rep = reports.get(w["id"]) if w else None
        observed = bool(rep and rep["status"] == "ranked")
        toks = by_win.get(w["id"], []) if w else []
        river_toks = [t for t in toks if t.get("river")]
        n_flag = sum(1 for t in river_toks if t["flag"]); n_nw = sum(1 for t in toks if t["nw"] >= 0.5)
        # 토큰 레이어는 깃발/새-물 토큰만 담으므로 분모는 창 전체 토큰 4096 이 아니라 '강 인접' 추정치로 둔다 → 창 보고서의 candidate_token_frac 를 주 값으로 쓰고 토큰 수는 보조로.
        frac = rep["candidate_token_frac"] if observed and rep.get("candidate_token_frac") is not None else None
        nw = rep["water_new_frac_event"] if observed and rep.get("water_new_frac_event") is not None else None
        feats.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": [list(bw.transform(x, y)) for x, y in seg.coords]},
                      "properties": {"river": river, "km": round((k + 0.5) * SPAN / 1000, 1), "window": w["id"] if w else None, "observed": observed,
                                     "frac": None if frac is None else round(frac, 4), "nw": None if nw is None else round(nw, 4),
                                     "flag_tokens_near_river": n_flag, "new_water_tokens": n_nw, "dvv_db": rep.get("dvv_event_db") if observed else None}})
(PUB / "september-river-ribbon.geojson").write_text(json.dumps({"type": "FeatureCollection", "name": "september_river_ribbon", "features": feats}))
obs = [f for f in feats if f["properties"]["observed"]]
print(f"ribbon segments {len(feats)} · observed {len(obs)} · max frac {max((f['properties']['frac'] or 0) for f in feats):.3f} · max nw {max((f['properties']['nw'] or 0) for f in feats):.3f}")
for r in ("river_narayani", "river_tinau", "river_koshi"):
    rs = [f["properties"] for f in obs if f["properties"]["river"] == r]
    if rs: print(f"  {r}: {len(rs)} seg · frac mean {sum(x['frac'] for x in rs)/len(rs):.3f} · nw mean {sum(x['nw'] or 0 for x in rs)/len(rs):.3f} · top {sorted(rs, key=lambda x: -(x['frac'] or 0))[0]['window']}")
