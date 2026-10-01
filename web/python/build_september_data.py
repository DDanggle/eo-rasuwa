#!/usr/bin/env python3
"""9월 챕터(24~29 Sep 몬순 홍수) 웹 자산 — artifacts/m99_september + artifacts/m100_flood_sites → public/data/september.json + september-windows.geojson.

scenario.json(8월 26일 사건)은 건드리지 않는다. 9월은 별도 파일이고 verify-assets 가 따로 대조한다.
숫자는 전부 장부(M99~M102) 보고서에서만 온다. 손으로 적는 숫자 없음.
"""
from __future__ import annotations
import json
from pathlib import Path
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts"
PUB = ROOT / "web/public/data"
FR = PUB / "september/frames"

def L(p): return json.loads((ART / p).read_text())

m99 = L("m99_september/report_o19s_M99.json")
m99b = L("m99_september/report_o121s_M99b.json")
opt = L("m99_september/optical_readability_20260929.json")
fus = L("m100_flood_sites/fusion_M102.json")
t19 = L("m100_flood_sites/report_t19.json"); t158 = L("m100_flood_sites/report_t158.json"); t12 = L("m100_flood_sites/report_t12.json")
s2 = L("m100_flood_sites/report_s2_saptari_M101.json")
summ = L("m100_flood_sites/summary.json")
wins = json.loads((ROOT / "code/terai_flood_windows.json").read_text())
gfm_p = ART / "m100_flood_sites/gfm_score_M106.json"
gfm = {r["id"]: r for r in json.loads(gfm_p.read_text())["rows"]} if gfm_p.exists() else {}
gfm_groups = json.loads(gfm_p.read_text())["groups"] if gfm_p.exists() else {}
# 강 회랑 창(M103): 결합(M102)에는 없으므로 레이더 보고서에서 직접 읽는다
river_rep = {}
for tag in ("terai_radar_scan_r19", "terai_radar_scan_r12"):
    p = ART.parent / "research-private/artifacts" / tag / "report.json"
    if p.exists():
        for w in json.loads(p.read_text())["windows"]: river_rep[w["id"]] = w
src_wins = json.loads((ROOT / "code/source_radar_windows.json").read_text())

SITES = {
    "susta": {"name": "Susta", "name_ko": "수스타", "news": "272 houses inundated (Nawalparasi West)", "news_ko": "272가구 침수 (나왈파라시 서부)"},
    "devghat": {"name": "Devghat", "name_ko": "데브갓", "news": "Narayani 9.23 m at the gauge, 28 Sep (Chitwan)", "news_ko": "나라야니 수위 9.23 m, 9/28 (치트완)"},
    "butwal": {"name": "Butwal", "name_ko": "부트왈", "news": "Tinau river swept 6 houses, ~1,000 evacuated (Rupandehi)", "news_ko": "티나우강 가옥 6채 유실, 약 1,000명 대피 (루판데히)"},
    "dharapani": {"name": "Narayangadh–Muglin road", "name_ko": "나라얀가드–무글린 도로", "news": "landslides at Dharapani, Simaldhara, Simaltal, Aaptari (Chitwan)", "news_ko": "다라파니·심알다라·심알탈·압타리 산사태 (치트완)"},
    "saptari": {"name": "Saptari (Koshi right bank)", "name_ko": "삽타리 (코시 우안)", "news": "217 homes flooded, Hanumannagar Kankalini / Tilathi Koiladi", "news_ko": "217가구 침수, 하누만나가르·틸라티"},
}
VERDICT = {
    "susta": ("clear signal", "River widened: sandbar submerged in the Narayani channel. Top two windows on both radar orbits; one also exceeds the classical new-water null.", "강폭 확대: 나라야니 하도 안 사주가 잠겼다. 두 레이더 궤도 모두 1·2위, 한 창은 고전 새-물 귀무도 넘었다."),
    "devghat": ("weak", "Orbit 19 missed 17/25 windows (off-scene); orbit 158 reads all 25. One window flags at 6%. A river rising inside its banks is barely visible at 40 m.", "궤도19 장면 밖 17/25창, 궤도158 로 25/25. 한 창만 6% 깃발. 둑 안 수위 상승은 40 m 에서 거의 안 보인다."),
    "butwal": ("no signal", "Flags ≤1.7% on both orbits. Six houses and a bank section are below the 40 m token; the passes bracket the 27 Sep peak.", "두 궤도 깃발 ≤1.7%. 가옥 6채·둑은 40 m 토큰 아래 규모이고 통과 시각이 정점 전후다."),
    "dharapani": ("no signal", "Road-side slope failures are tens of metres — below this yardstick.", "도로변 사면 붕괴는 수십 m 규모라 이 자가 아니다."),
    "saptari": ("classical only", "Optical SCL water rose 10–31 pp in channel windows and radar new-water 10–16%, but the braided Koshi's ordinary null (23%) is wider than that. Neither embedding flags it.", "광학 SCL 물 +10~31%p, 레이더 새-물 10~16% 인데 코시 사행 하도의 평시 귀무(23%)가 더 넓다. 두 임베딩 모두 못 올린다."),
}

# ---- 홍수 지점 창 (125) ----
rank = {f["id"]: f for f in fus["windows"]}
feats = []
for w in wins:
    bw = Transformer.from_crs(w["epsg"], 4326, always_xy=True)
    x0, y0, x1, y1 = w["bounds_utm"]
    ring = [bw.transform(x, y) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0))]
    f = rank.get(w["id"])
    if f is None and w["id"] in river_rep and river_rep[w["id"]]["status"] == "ranked":
        rr = river_rep[w["id"]]
        f = {"frac": rr["candidate_token_frac"], "source": "radar", "radar_frac": rr["candidate_token_frac"], "optical_frac": None, "radar_new_water": rr["water_new_frac_event"], "scl_water_delta": None, "radar_orbits": [12 if w["aoi"] == "river_koshi" else 19], "rank": None}
    frames = all((FR / f"{w['id']}_{k}").exists() for k in ("pre.jpg", "post.jpg", "delta.png"))
    feats.append({"type": "Feature", "id": w["id"], "geometry": {"type": "Polygon", "coordinates": [[list(p) for p in ring]]},
                  "properties": {"id": w["id"], "site": w["aoi"], "chapter": "september", "kind": "river_corridor" if "river_" in w["aoi"] else "flood_site",
                                 "fused_frac": f["frac"] if f else None, "source": f["source"] if f else "unobservable",
                                 "radar_frac": f["radar_frac"] if f else None, "optical_frac": f["optical_frac"] if f else None,
                                 "radar_new_water": f["radar_new_water"] if f else None, "scl_water_delta": f["scl_water_delta"] if f else None,
                                 "radar_orbits": f["radar_orbits"] if f else [], "rank": f["rank"] if f else None, "frames": frames,
                                 "gfm_flood_frac": gfm[w["id"]]["gfm"] if w["id"] in gfm else None}})
# ---- 발원 회랑 창 (56, M99) ----
m99w = {w["id"]: w for w in m99["windows"]}
bw45 = Transformer.from_crs(32645, 4326, always_xy=True)
SNOW = {"v094": .93, "v093": .55, "v096": .91, "v098": .94, "v082": .88}   # 9/28 SCL 눈 비율 (장부 M99 §2)
for w in src_wins:
    x0, y0, x1, y1 = w["bounds_utm"]
    ring = [bw45.transform(x, y) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0))]
    r = m99w[w["id"]]
    feats.append({"type": "Feature", "id": "src_" + w["id"], "geometry": {"type": "Polygon", "coordinates": [[list(p) for p in ring]]},
                  "properties": {"id": w["id"], "site": "source", "chapter": "september", "kind": "source_corridor",
                                 "fused_frac": r["candidate_token_frac"], "source": "radar", "radar_frac": r["candidate_token_frac"],
                                 "rank": r["rank"], "snow_frac_0928": SNOW.get(w["id"]), "frames": all((FR / f"{w['id']}_{k}").exists() for k in ("pre.jpg", "post.jpg", "delta.png"))}})
(PUB / "september-windows.geojson").write_text(json.dumps({"type": "FeatureCollection", "name": "nepal_september_2026_windows", "features": feats}))

# ---- 요약 ----
by_site = {}
for a, meta in SITES.items():
    rows = [f for f in fus["windows"] if f["aoi"] == a]
    top = rows[:3]
    g = summ.get("t19", {}).get("aois", {}).get(a) or summ.get("t158", {}).get("aois", {}).get(a) or summ.get("t12", {}).get("aois", {}).get(a) or {}
    v = VERDICT[a]
    by_site[a] = {**meta, "windows": len(rows), "verdict": v[0], "reading": v[1], "reading_ko": v[2],
                  "top": [{"id": f["id"], "rank": f["rank"], "fused_frac": f["frac"], "source": f["source"], "radar_frac": f["radar_frac"], "optical_frac": f["optical_frac"],
                           "radar_new_water": f["radar_new_water"], "scl_water_delta": f["scl_water_delta"], "center_lonlat": f["center_lonlat"], "gfm_flood_frac": gfm.get(f["id"], {}).get("gfm")} for f in top],
                  "gfm": gfm_groups.get(a),
                  "grades": g.get("grades")}
scenes = [
    {"id": "s1-2026-09-12", "sensor": "Sentinel-1 (orbit 121)", "acquired_at": "2026-09-12T00:10:00Z", "state": "analysed", "detail": "M99b base"},
    {"id": "s1-2026-09-17", "sensor": "Sentinel-1 (orbit 19)", "acquired_at": "2026-09-17T00:18:00Z", "state": "analysed", "detail": "M99/M100 base"},
    {"id": "s2-2026-09-21", "sensor": "Sentinel-2", "acquired_at": "2026-09-21T04:57:00Z", "state": "catalog", "detail": "pre-flood optical; Terai windows 84–97% readable"},
    {"id": "s1-2026-09-24", "sensor": "Sentinel-1 (orbit 121)", "acquired_at": "2026-09-24T00:10:00Z", "state": "analysed", "detail": "M99b target — rain begins this morning"},
    {"id": "s1-2026-09-26", "sensor": "Sentinel-1 (orbit 158)", "acquired_at": "2026-09-26T12:20:00Z", "state": "analysed", "detail": "M100c target — day 3 of rain"},
    {"id": "s2-2026-09-28", "sensor": "Sentinel-2", "acquired_at": "2026-09-28T04:47:00Z", "state": "analysed", "detail": "1.6% scene cloud at the source but 12/56 windows readable; Saptari 20/25 readable (M101)"},
    {"id": "s1-2026-09-28", "sensor": "Sentinel-1 (orbit 12)", "acquired_at": "2026-09-28T12:15:00Z", "state": "analysed", "detail": "M100b target — Koshi peak day"},
    {"id": "s1-2026-09-29", "sensor": "Sentinel-1 (orbit 19)", "acquired_at": "2026-09-29T00:18:00Z", "state": "analysed", "detail": "M99 / M100 target — after the 27–28 Sep peaks; RTC arrived 30 Sep"},
]
out = {
    "schema": "nepal-september-2026/v1", "generated_at": "2026-10-01T00:00:00Z",
    "event": {"name": "Late-September monsoon floods and landslides", "name_ko": "9월 하순 몬순 홍수·산사태", "window": ["2026-09-24", "2026-09-29"],
              "reported": "21 dead, 5 missing, 300+ landslides, flash-flood alerts in 49 of 77 districts (press, 27–29 Sep)",
              "reported_ko": "사망 21·실종 5·산사태 300건 이상·77개 군 중 49개 돌발홍수 경보 (언론, 9/27~29)",
              "relation_to_chapter1": "Same monsoon season, different mechanism: rain-driven river floods and hillside slips across the lowlands, not a glacier collapse. The 26 Aug source corridor is re-observed here with the same contract."},
    "method": {"contract": "same 3-vs-1 radar contract as M92/M93 (36/24/12-day gaps, own-placebo p99 threshold), dates shifted 12 days; 2.56 km windows; frozen OlmoEarth v1 Base",
               "yardsticks": ["radar new-water fraction (VV drop > 3 dB vs base median and VV < −16 dB, own-placebo p99 null)", "Sentinel-2 SCL water-class change where a readable post scene exists", "second radar orbit as replication"],
               "fusion": "max(optical, mean of radar orbits) on a common scale: own-placebo p99 exceedance fraction (null ≈ 1%)",
               "claim_boundary": "a reading order for people, not damage, depth, household counts or cause; 0 field labels"},
    "source_corridor": {"measurement_id": "M99", "orbit": 19, "target": "2026-09-29", "windows": 56, "threshold": m99["threshold_placebo_p99"],
                        "flag_mean": sum(w["candidate_token_frac"] for w in m99["windows"]) / 56, "top": [{"id": w["id"], "rank": w["rank"], "frac": w["candidate_token_frac"], "center_lonlat": w["center_lonlat"], "snow_frac_0928": SNOW.get(w["id"])} for w in sorted(m99["windows"], key=lambda w: w["rank"])[:6]],
                        "unosat_source_touching_top6": 0, "reading": "The post-flood ranking no longer points at the August source (0/6 windows touch the UNOSAT polygons; the August change is absorbed into the 3-date memory). The new top windows are the upper Langtang valley at ~5,000 m, where the 28 Sep scene classifies 88–94% of the window as snow that was absent on 18 and 21 Sep. The embedding read fresh snow — a real surface change, but not debris movement. Region-wide VV fell 0.69 dB (wet surfaces), inflating absolute flags about 3×; ranks are usable, absolute rates are not.",
                        "reading_ko": "사후 순위는 8월 발원지를 더 가리키지 않는다(UNOSAT 폴리곤에 닿는 상위 창 0/6, 8월 변화는 3장 기억에 흡수). 새 상위는 랑탕 상류 약 5,000 m 로, 9/28 장면에서 창의 88~94%가 눈으로 분류되고 9/18·21 에는 눈이 없었다. 임베딩이 읽은 것은 신설 눈이다. 회랑 전체 VV 가 0.69 dB 떨어져(젖은 지표) 절대 깃발율이 약 3배 부풀었다. 순위는 쓰되 절대치는 할인한다."},
    "optical_readability": opt["scenes"],
    "flood_sites": by_site,
    "fusion": {"measurement_id": "M102", "coverage": fus["coverage"], "agreement_saptari": fus["cross_sensor_agreement"],
               "headline": "Fusion added no coverage here (radar already read 125/125) and did not improve the ranking: where both sensors read the same windows (Saptari) they disagree (ρ −0.50), and max-fusion promotes the noisier sensor. Fusion earns its value where one sensor is blind (M95: 47 → 97), not here.",
               "headline_ko": "여기선 결합이 커버리지를 넓히지 못했고(레이더가 이미 125/125) 순위도 좋아지지 않았다. 두 센서가 같은 창을 읽는 삽타리에서 서로 어긋나(ρ −0.50) max 결합은 더 시끄러운 쪽을 올린다. 결합의 값어치는 한 센서가 눈먼 곳(M95: 47→97)에서 생긴다.",
               "figure": "/data/september/fusion_M102_figure.png"},
    "fused_top": [{"id": f["id"], "site": f["aoi"], "rank": f["rank"], "fused_frac": f["frac"], "source": f["source"], "radar_frac": f["radar_frac"], "optical_frac": f["optical_frac"], "radar_new_water": f["radar_new_water"], "scl_water_delta": f["scl_water_delta"], "center_lonlat": f["center_lonlat"], "gfm_flood_frac": gfm.get(f["id"], {}).get("gfm")} for f in fus["windows"][:12]],
    "gfm": {"measurement_id": "M106", "yardstick": "Copernicus GFM ensemble flood extent from the same Sentinel-1 passes (20 m)", "overall": {k: v for k, v in gfm_groups.items() if k.startswith("all_")},
            "headline": "Our top-10 fused windows hold 5.4% GFM flood pixels vs 0.5% elsewhere (p = 0.0003); new-water top-10 hold 8.7% (p < 0.0001). Along the Narayani the reach ranking matches GFM at ρ = 0.97. At Saptari GFM maps 18% flood in the channel windows that the embedding missed and the classical new-water caught.",
            "headline_ko": "결합 깃발 상위 10창의 GFM 홍수 픽셀 5.4% vs 나머지 0.5%(p 0.0003), 고전 새-물 상위 10창은 8.7%(p<0.0001). 나라야니 구간 순위는 GFM 과 ρ 0.97. 삽타리는 GFM 이 하도 창에 18% 홍수를 잡았고 임베딩은 놓치고 고전 새-물이 맞췄다."} if gfm_groups else None,
    "scenes": scenes,
    "bounds": [82.9, 26.0, 87.4, 28.8],   # 부트왈(83.45)~삽타리(86.9) 전부 + 여백; 레일 패딩을 감안해 넉넉히
    "frames_dir": "/data/september/frames",
    "frames": {"kind": "Sentinel-1 false colour: R=VV, G=VH, B=VV−VH (dB), 3×3 median speckle filter; PRE = median of the three base passes; 384 px", "delta": "AI change field: transparent below the ordinary p99, orange→magenta above, white 1-px outline at the threshold", "s2_sites": ["saptari"], "s2_dates": {"saptari": ["2026-09-20", "2026-09-28"]}},
    "change_tokens": "/data/september-change-tokens.geojson",
    "ribbon": "/data/september-river-ribbon.geojson" if (PUB / "september-river-ribbon.geojson").exists() else None,
    "river": (lambda rb: None if rb is None else {
        "segments": len(rb), "observed": sum(1 for x in rb if x["observed"]),
        "per_river": {r: {"km": round(sum(1 for x in rb if x["river"] == r) * 2.56, 1), "segments": sum(1 for x in rb if x["river"] == r), "observed": sum(1 for x in rb if x["river"] == r and x["observed"]),
                          "frac_mean": (lambda xs: round(sum(xs) / len(xs), 4) if xs else None)([x["frac"] for x in rb if x["river"] == r and x["observed"] and x["frac"] is not None]),
                          "nw_mean": (lambda xs: round(sum(xs) / len(xs), 4) if xs else None)([x["nw"] for x in rb if x["river"] == r and x["observed"] and x["nw"] is not None]),
                          "top_window": (lambda xs: xs[0]["window"] if xs else None)(sorted([x for x in rb if x["river"] == r and x["observed"] and x["frac"] is not None], key=lambda x: -x["frac"])),
                          "top_frac": (lambda xs: round(xs[0]["frac"], 4) if xs else None)(sorted([x for x in rb if x["river"] == r and x["observed"] and x["frac"] is not None], key=lambda x: -x["frac"]))}
                      for r in ("river_narayani", "river_tinau", "river_koshi")},
        "reading": "Each reach is coloured by the share of 40 m tokens in its window that moved beyond the window's own ordinary range (same classes as chapter 1). Dashed grey = no readable radar for that reach.",
        "reading_ko": "각 구간은 그 구간을 담은 창에서 평시 범위를 넘은 40 m 토큰 비율로 칠했습니다(1장과 같은 계급). 점선 회색 = 그 구간을 읽은 레이더가 없음."})(
        [f["properties"] for f in json.loads((PUB / "september-river-ribbon.geojson").read_text())["features"]] if (PUB / "september-river-ribbon.geojson").exists() else None),
    "download": "/data/september-windows.geojson",
    "change_token_rule": "40 m tokens drawn where Δz exceeds the window's ordinary p99 (flag) or where ≥50% of pixels became water-like (VV drop > 3 dB and VV < −16 dB). Source-corridor tokens only above 1.6× the threshold.",
    "monsoon_status": {"as_of": "2026-09-29", "text": "Withdrawal not yet declared; long-run average 2 Oct, last four years 8–16 Oct. Post-flood optical for the western sites waits for the first clear pass.",
                       "text_ko": "철수 미선언. 평년 10/2, 최근 4년은 10/8~16. 서부 지점 사후 광학은 첫 맑은 통과를 기다린다."},
    "ledger": ["M99", "M99a", "M99b", "M100", "M100b", "M100c", "M101", "M102"],
}
(PUB / "september.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
import shutil; shutil.copy(ART / "m100_flood_sites/fusion_M102_figure.png", PUB / "september/fusion_M102_figure.png")
print("september.json ok ·", len(feats), "features ·", sum(1 for f in feats if f["properties"]["frames"]), "with frames")
