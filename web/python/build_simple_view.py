#!/usr/bin/env python3
"""2장 '쉬운 화면' 자산 — 숫자를 사람 말로.
- september-simple.geojson: 강 구간마다 lv26/lv24 ∈ {big, some, normal, unseen}, GFM 일치 여부, 강 이름.
  big = 평시 범위를 넘은 토큰 ≥5% (귀무 1%의 5배), some = 2~5%, normal = <2%, unseen = 레이더가 못 읽음/해당 해 자료 없음.
- september-places.json: 지명 → 가장 가까운 강 구간과 한 문장 답.
숫자는 장부(M103~M108) 산출물에서만 읽는다."""
import json, math
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; PUB = ROOT / "web/public/data"; ART = ROOT / "research-private/artifacts"
rib = json.loads((PUB / "september-river-ribbon.geojson").read_text())
cmp = {f["properties"]["window"]: f["properties"] for f in json.loads((PUB / "september-compare-ribbon.geojson").read_text())["features"]}
g26 = {k: v["gfm_flood_frac"] for k, v in json.loads((ART / "gfm/gfm_window_fracs.json").read_text()).items()}
RN = {"river_narayani": ("Narayani", "나라야니강"), "xriver_narayani": ("Gandak (Narayani)", "간다크강(나라야니 하류)"), "xriver_narayani_upper": ("Narayani", "나라야니강"),
      "river_tinau": ("Tinau", "티나우강"), "xriver_tinau": ("Tinau", "티나우강"), "river_koshi": ("Koshi", "코시강"), "xriver_koshi": ("Koshi", "코시강"),
      "xriver_rapti": ("East Rapti", "동라프티강"), "xriver_bagmati": ("Bagmati", "바그마티강")}
def lv(f): return "unseen" if f is None else "big" if f >= 0.05 else "some" if f >= 0.02 else "normal"
feats = []
for f in rib["features"]:
    p = f["properties"]; w = p.get("window"); c = cmp.get(w)
    q = {"river": p["river"], "name": RN[p["river"]][0], "name_ko": RN[p["river"]][1], "window": w, "km": p["km"],
         "lv26": lv(p["frac"]) if p["observed"] else "unseen", "lv24": lv(c["f24"]) if c else "unseen",
         "f26": p["frac"], "f24": c["f24"] if c else None, "nw26": p.get("nw"), "gfm26": g26.get(w), "has24": bool(c)}
    q["agree"] = q["lv26"] == "big" and (q["gfm26"] or 0) > 0.01
    feats.append({"type": "Feature", "geometry": f["geometry"], "properties": q})
(PUB / "september-simple.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))

# 지명: 강 가까운 도시·마을(뉴스에 나온 곳 + 주요 도시). 좌표는 공개 지명 중심점.
PLACES = [("Devghat", "데브갓", 84.425, 27.720), ("Narayangadh / Bharatpur", "나라얀가드·바라트푸르", 84.43, 27.69), ("Gaindakot", "가인다코트", 84.38, 27.70),
          ("Susta", "수스타", 83.90, 27.46), ("Tribeni", "트리베니", 84.03, 27.45), ("Valmikinagar (India)", "발미키나가르(인도)", 84.13, 27.43),
          ("Bagaha (India)", "바가하(인도)", 84.09, 27.10), ("Butwal", "부트왈", 83.455, 27.705), ("Bhairahawa", "바이라하와", 83.45, 27.51),
          ("Sauraha / Chitwan NP", "사우라하·치트완 국립공원", 84.49, 27.58), ("Hetauda", "헤타우다", 85.03, 27.43), ("Kathmandu", "카트만두", 85.32, 27.71),
          ("Sindhuli (Bagmati)", "신둘리(바그마티)", 85.63, 27.20), ("Karmaiya (Bagmati barrage)", "카르마이야(바그마티 보)", 85.46, 27.10),
          ("Gaur", "가우르", 85.27, 26.77), ("Birgunj", "비르간지", 84.88, 27.01), ("Chatara", "차타라", 87.16, 26.82),
          ("Koshi Barrage", "코시 보", 87.0, 26.52), ("Hanumannagar (Saptari)", "하누만나가르(삽타리)", 86.93, 26.54), ("Rajbiraj", "라지비라즈", 86.75, 26.54)]
def dist(a, b): return math.hypot((a[0] - b[0]) * 99, (a[1] - b[1]) * 111)
RANK = {"big": 3, "some": 2, "normal": 1, "unseen": 0}
places = []
for en, ko, lon, lat in PLACES:
    near = []
    for f in feats:
        d = min(dist((lon, lat), c) for c in f["geometry"]["coordinates"])
        if d <= 8: near.append((d, f["properties"], f["geometry"]["coordinates"]))
    bigs = [(min(dist((lon, lat), c) for c in f["geometry"]["coordinates"]), f) for f in feats if f["properties"]["lv26"] == "big"]
    nb = min(bigs, key=lambda x: x[0]) if bigs else None
    nearest_big = {"km": round(nb[0], 1), "lonlat": nb[1]["geometry"]["coordinates"][len(nb[1]["geometry"]["coordinates"]) // 2], "river_ko": nb[1]["properties"]["name_ko"], "river": nb[1]["properties"]["name"], "window": nb[1]["properties"]["window"]} if nb else None
    if not near:
        places.append({"name": en, "name_ko": ko, "lonlat": [lon, lat], "lv26": "far", "lv24": "far", "nearest_big": nearest_big, "reaches_within_8km": 0}); continue
    def summ(key):
        obs = [x for x in near if x[1][key] != "unseen"]
        if not obs: return {"level": "unseen", "n_big": 0, "n_obs": 0}
        top = max(obs, key=lambda x: (RANK[x[1][key]], -x[0]))
        return {"level": top[1][key], "n_big": sum(1 for x in obs if x[1][key] == "big"), "n_obs": len(obs)}
    s26, s24 = summ("lv26"), summ("lv24")
    obs26 = [x for x in near if x[1]["lv26"] != "unseen"]
    focus = max(obs26, key=lambda x: (RANK[x[1]["lv26"]], x[1]["f26"] or 0, -x[0])) if obs26 else min(near, key=lambda x: x[0])
    fp = focus[1]; mid = focus[2][len(focus[2]) // 2]
    rivers = sorted({x[1]["name_ko"] for x in near}); rivers_en = sorted({x[1]["name"] for x in near})
    gfm_agree = sum(1 for x in near if x[1]["agree"])
    places.append({"name": en, "name_ko": ko, "lonlat": [lon, lat], "focus_lonlat": mid, "focus_window": fp["window"], "focus_river": fp["river"],
                   "rivers_ko": rivers, "rivers": rivers_en, "reaches_within_8km": len(near),
                   "lv26": s26["level"], "big26": s26["n_big"], "obs26": s26["n_obs"], "lv24": s24["level"], "big24": s24["n_big"], "obs24": s24["n_obs"],
                   "gfm_agree": gfm_agree, "f26": fp["f26"], "gfm26": fp["gfm26"], "nearest_big": nearest_big})
(PUB / "september-places.json").write_text(json.dumps(places, ensure_ascii=False, indent=1))
from collections import Counter
print("simple reaches", len(feats), Counter(f["properties"]["lv26"] for f in feats), "| 2024", Counter(f["properties"]["lv24"] for f in feats))
for p in places: print(f"  {p['name_ko']:<18} {p['lv26']:<7} 2024 {p['lv24']:<7} 가장 가까운 큰 변화 {p['nearest_big']['km'] if p['nearest_big'] else '-'} km")
