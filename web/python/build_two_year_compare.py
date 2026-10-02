#!/usr/bin/env python3
"""M108 두 해 비교 웹 자산 — 같은 2v1 계약(36·12일, 궤도19)의 2024(y19)·2026(z19)을 한 리본에 두 속성으로.
출력: public/data/september-compare-ribbon.geojson (구간마다 f24, f26, nw24, nw26, d = f26 − f24), public/data/september-compare.json (강별 요약·덤벨용).
리본 기하는 build_river_ribbon 과 같은 센터라인·같은 2.56 km 구간. 코시(궤도12)는 2024 대응 통과가 없어 빠진다."""
from __future__ import annotations
import json
from pathlib import Path
from shapely.geometry import LineString, shape, box
from pyproj import Transformer
ROOT = Path(__file__).resolve().parents[2]; ART = ROOT / "research-private/artifacts"; PUB = ROOT / "web/public/data"; SPAN = 2560
wins = {w["id"]: w for w in json.loads((ROOT / "code/terai_flood_windows.json").read_text()) if "river_" in w["aoi"]}
def load(tag):
    r = json.loads((ART / tag / "report.json").read_text()); return {w["id"]: w for w in r["windows"] if w["status"] == "ranked"}, r["threshold_placebo_p99"]
y, thr24 = load("terai_radar_scan_y19"); z, thr26 = load("terai_radar_scan_z19")
g24p = ART / "gfm2024/gfm2024_window_fracs.json"; g24 = json.loads(g24p.read_text()) if g24p.exists() else {}
g26p = ART / "gfm/gfm_window_fracs.json"; g26 = {k: v["gfm_flood_frac"] for k, v in json.loads(g26p.read_text()).items()} if g26p.exists() else {}
NAMES = {"river_narayani": ("Narayani · Susta", "나라야니 · 수스타"), "xriver_narayani_upper": ("Narayani · upper", "나라야니 · 상류"),
         "xriver_narayani": ("Gandak · Bihar", "간다크 · 비하르"), "xriver_bagmati": ("Bagmati", "바그마티"), "xriver_rapti": ("East Rapti", "동라프티"),
         "river_tinau": ("Tinau · Butwal", "티나우 · 부트왈"), "xriver_tinau": ("Tinau · border", "티나우 · 국경")}
center = json.loads((ART / "terai_rivers/centerlines.geojson").read_text())
feats = []; per = {}
for cf in center["features"]:
    river = cf["properties"]["river"]
    if river not in NAMES: continue
    epsg = cf["properties"]["epsg"]; fw = Transformer.from_crs(4326, epsg, always_xy=True); bw = Transformer.from_crs(epsg, 4326, always_xy=True)
    line = LineString([fw.transform(a, b) for a, b in shape(cf["geometry"]).coords]); n = int(line.length // SPAN)
    rw = [w for w in wins.values() if w["aoi"] == river]
    for k in range(n):
        mid = line.interpolate((k + 0.5) * SPAN); w = next((w for w in rw if box(*w["bounds_utm"]).contains(mid)), None)
        if not w or w["id"] not in y or w["id"] not in z: continue
        seg = LineString([line.interpolate(k * SPAN + s) for s in range(0, SPAN + 1, 160)])
        a, b = y[w["id"]], z[w["id"]]
        p = {"river": river, "km": round((k + 0.5) * SPAN / 1000, 1), "window": w["id"], "f24": round(a["candidate_token_frac"], 4), "f26": round(b["candidate_token_frac"], 4),
             "nw24": round(a["water_new_frac_event"] or 0, 4), "nw26": round(b["water_new_frac_event"] or 0, 4), "d": round(b["candidate_token_frac"] - a["candidate_token_frac"], 4),
             "g24": g24.get(w["id"]), "g26": g26.get(w["id"])}
        feats.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": [[round(c, 5) for c in bw.transform(x, yy)] for x, yy in seg.coords]}, "properties": p})
        per.setdefault(river, []).append(p)
(PUB / "september-compare-ribbon.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
mean = lambda xs: sum(xs) / len(xs) if xs else None
rows = []
for r, ps in per.items():
    rows.append({"river": r, "name": NAMES[r][0], "name_ko": NAMES[r][1], "reaches": len(ps),
                 "f24": mean([p["f24"] for p in ps]), "f26": mean([p["f26"] for p in ps]), "hot24": sum(p["f24"] >= 0.05 for p in ps), "hot26": sum(p["f26"] >= 0.05 for p in ps),
                 "nw24": mean([p["nw24"] for p in ps]), "nw26": mean([p["nw26"] for p in ps]),
                 "gfm24_pos": sum(1 for p in ps if (p["g24"] or 0) > 0.01), "gfm26_pos": sum(1 for p in ps if (p["g26"] or 0) > 0.01)})
rows.sort(key=lambda r: -max(r["hot24"], r["hot26"]))
two = json.loads((ROOT / "artifacts/m100_flood_sites/two_year_M108.json").read_text())
out = {"schema": "nepal-two-year-compare/v1", "measurement_id": "M108", "contract": "same 2-vs-1 contract (base 36 and 12 days before), Sentinel-1 orbit 19 descending, same 2.56 km river windows",
       "dates": {"2024": {"base": ["2024-08-27", "2024-09-20"], "post": "2024-10-02", "event": "27–28 Sep 2024", "threshold": thr24}, "2026": {"base": ["2026-08-24", "2026-09-17"], "post": "2026-09-29", "event": "24–29 Sep 2026", "threshold": thr26}},
       "rivers": rows, "reaches": len(feats),
       "headline": "Same windows, same contract, two monsoons. In 2024 the Bagmati lit up (33 of 52 windows) and the upper Narayani stayed quiet; in 2026 the reverse — the Bagmati went dark and the Narayani from Devghat down to Bihar widened. Both years agree with the reports and with Copernicus GFM.",
       "headline_ko": "같은 창, 같은 계약, 두 번의 몬순. 2024년엔 바그마티가 켜지고(52창 중 33) 상류 나라야니는 조용했다. 2026년엔 반대로 바그마티가 꺼지고 데브갓에서 비하르까지 나라야니가 넓어졌다. 두 해 모두 보도·Copernicus GFM 과 방향이 같다.",
       "caveat": "2024 used a 2-pass memory because Sentinel-1B was gone; 2026 is remeasured with the same 2-pass memory for this comparison only (the main 2026 map uses 3 passes). The 2024 post pass is 4–5 days after the peak, so part of the 2024 signal is receding water and wet deposits (precision vs GFM 0.57).",
       "caveat_ko": "2024년은 Sentinel-1B 부재로 기억 2장(2v1)만 가능했고, 이 비교에서만 2026년도 같은 2v1로 다시 쟀다(2026 기본 지도는 3장). 2024 사후 통과는 정점 4~5일 뒤라 신호 일부는 빠지는 물과 젖은 퇴적이다(GFM 대비 precision 0.57).",
       "gfm2024_windows": two.get("gfm2024_windows"), "gfm2024_pos": two.get("gfm2024_pos")}
(PUB / "september-compare.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
print("compare reaches", len(feats)); [print(f"  {r['name']:<28} {r['reaches']:>3}  2024 hot {r['hot24']:>2} ({r['f24']*100:4.1f}%)  2026 hot {r['hot26']:>2} ({r['f26']*100:4.1f}%)  GFM+ {r['gfm24_pos']}/{r['gfm26_pos']}") for r in rows]
