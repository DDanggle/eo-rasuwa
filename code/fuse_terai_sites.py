#!/usr/bin/env python3
"""M102. 홍수 지점 광학+레이더 결합 순위 — M95 규칙을 그대로 옮긴다.

공통 척도 = "그 센서 자신의 평시 p99 를 넘은 유효 토큰 비율"(귀무에서 정의상 ≈1%). Δz 원값은 섞지 않는다.
  - 레이더: 같은 창을 두 궤도(t19 09-29, t158 09-26)가 읽으면 **평균**(복제), 하나만 읽으면 그 값. 삽타리는 t12.
  - 광학: terai_s2_scan(M101, 미봉인 후보) 이 있는 창만.
  - 결합: M95 와 같이 **max(광학, 레이더)**. 출처(optical/radar/both)를 창마다 적는다.
판별 자(임베딩 밖): 레이더 새-물 비율(M100), SCL 물 변화(M101). 둘 다 그대로 옆에 둔다.
주장 경계: 커버리지 결합이지 정확도 향상이 아니다. 광학 평시 쌍이 사건 쌍과 간격이 달라 광학 초과율은 '후보' 등급이다.
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "research-private/artifacts"
OUT = ROOT / "artifacts/m100_flood_sites"


def load(tag):
    p = ART / f"{tag}/report.json"
    return json.loads(p.read_text()) if p.exists() else None


def main():
    radar = {}
    for tag in ("terai_radar_scan_t19", "terai_radar_scan_t158", "terai_radar_scan_t12"):
        r = load(tag)
        if not r: continue
        for w in r["windows"]:
            if w["status"] != "ranked": continue
            e = radar.setdefault(w["id"], {"aoi": w["aoi"], "center_lonlat": w["center_lonlat"], "fracs": [], "water": [], "orbits": []})
            e["fracs"].append(w["candidate_token_frac"]); e["water"].append(w["water_new_frac_event"] or 0.0); e["orbits"].append(r["orbit"])
    optical = {}
    for tag in ("terai_s2_scan_saptari", "terai_s2_scan_susta", "terai_s2_scan_devghat", "terai_s2_scan_butwal", "terai_s2_scan_dharapani"):
        r = load(tag)
        if not r: continue
        for w in r["windows"]:
            if w["status"] == "ranked":
                optical[w["id"]] = {"frac": w["candidate_token_frac"], "dwater": w["scl_water_delta"], "aoi": w["aoi"], "center_lonlat": w["center_lonlat"]}
    ids = sorted(set(radar) | set(optical))
    fused = []
    for i in ids:
        rf = float(np.mean(radar[i]["fracs"])) if i in radar else None
        of = optical[i]["frac"] if i in optical else None
        frac = max(x for x in (rf, of) if x is not None)
        src = "both" if (rf is not None and of is not None) else ("radar" if rf is not None else "optical")
        meta = radar.get(i) or optical.get(i)
        fused.append({"id": i, "aoi": meta["aoi"], "center_lonlat": meta["center_lonlat"], "frac": frac, "source": src,
                      "radar_frac": rf, "radar_orbits": radar[i]["orbits"] if i in radar else [], "optical_frac": of,
                      "radar_new_water": float(np.mean(radar[i]["water"])) if i in radar else None,
                      "scl_water_delta": optical[i]["dwater"] if i in optical else None})
    fused.sort(key=lambda f: -f["frac"])
    for k, f in enumerate(fused): f["rank"] = k + 1
    # 두 센서가 함께 읽힌 창에서의 일치
    both = [f for f in fused if f["source"] == "both"]
    agree = None
    if len(both) > 3:
        def rank(v): v = np.asarray(v); r = np.empty(len(v)); r[np.argsort(v)] = np.arange(len(v)); return r
        agree = {"n": len(both), "spearman_radar_vs_optical": float(np.corrcoef(rank([f["radar_frac"] for f in both]), rank([f["optical_frac"] for f in both]))[0, 1]),
                 "top5_overlap": len(set(sorted(both, key=lambda f: -f["radar_frac"])[:5][j]["id"] for j in range(5)) & set(sorted(both, key=lambda f: -f["optical_frac"])[:5][j]["id"] for j in range(5)))}
    rep = {"schema": "terai-fusion-v1", "measurement_id": "M102", "rule": "frac = max(optical, mean(radar orbits)); common scale = own-placebo p99 exceedance fraction",
           "coverage": {"radar_only": sum(f["source"] == "radar" for f in fused), "optical_only": sum(f["source"] == "optical" for f in fused), "both": len(both)},
           "cross_sensor_agreement": agree, "windows": fused,
           "per_aoi_top3": {a: [{k: f[k] for k in ("rank", "id", "frac", "source", "radar_frac", "optical_frac", "radar_new_water", "scl_water_delta")}
                                for f in [x for x in fused if x["aoi"] == a][:3]] for a in sorted({f["aoi"] for f in fused})}}
    OUT.mkdir(parents=True, exist_ok=True); (OUT / "fusion_M102.json").write_text(json.dumps(rep, indent=1, ensure_ascii=False))
    print("coverage", rep["coverage"], "| agreement", agree)
    for a, top in rep["per_aoi_top3"].items():
        print(f"-- {a}")
        for f in top:
            print(f"   #{f['rank']:<3} {f['id']:<13} {f['source']:<7} fused {f['frac']:.3f}  radar {f['radar_frac'] if f['radar_frac'] is None else round(f['radar_frac'],3)}  optical {f['optical_frac'] if f['optical_frac'] is None else round(f['optical_frac'],3)}  새-물 {f['radar_new_water'] if f['radar_new_water'] is None else round(f['radar_new_water'],3)}  ΔSCL물 {f['scl_water_delta'] if f['scl_water_delta'] is None else round(f['scl_water_delta'],3)}")


if __name__ == "__main__":
    main()
