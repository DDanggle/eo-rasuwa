#!/usr/bin/env python3
"""M106 — Copernicus GFM(같은 Sentinel-1 통과의 운영 홍수 지도)을 외부 자로 전체 창(홍수 상자·강 회랑·확장 회랑)을 채점한다."""
import json, numpy as np
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
gfm = json.loads((ROOT / "research-private/artifacts/gfm/gfm_window_fracs.json").read_text())
fus = {f["id"]: f for f in json.loads((ROOT / "artifacts/m100_flood_sites/fusion_M102.json").read_text())["windows"]}
reps = {}
for tag in ("t19", "t158", "t12", "r19", "r12", "x19", "x12", "u19"):
    p = ROOT / f"research-private/artifacts/terai_radar_scan_{tag}/report.json"
    if not p.exists(): continue
    for w in json.loads(p.read_text())["windows"]:
        if w["status"] == "ranked": reps.setdefault(w["id"], []).append(w)
rows = []
for wid, g in gfm.items():
    if g["gfm_flood_frac"] is None or wid not in reps: continue
    ws = reps[wid]; flag = float(np.mean([w["candidate_token_frac"] for w in ws])); nw = float(np.mean([w["water_new_frac_event"] or 0 for w in ws]))
    rows.append({"id": wid, "site": g["site"], "gfm": g["gfm_flood_frac"], "gfm_water": g["gfm_water_frac"], "gfm_ref": g["gfm_ref_water_frac"], "flag": flag, "nw": nw, "fused": fus[wid]["frac"] if wid in fus else flag})
def rank(v): v = np.asarray(v, float); r = np.empty(len(v)); r[np.argsort(v)] = np.arange(len(v)); return r
def spear(x, y): return float(np.corrcoef(rank(x), rank(y))[0, 1])
rng = np.random.default_rng(20260908)
def perm_p(vals, flagged, draws=200000):
    vals = np.asarray(vals); obs = vals[flagged].mean(); n = int(flagged.sum()); idx = rng.integers(0, len(vals), size=(draws, n)); return float(((vals[idx].mean(1) >= obs).sum() + 1) / (draws + 1))
G = np.array([r["gfm"] for r in rows]); F = np.array([r["fused"] for r in rows]); N = np.array([r["nw"] for r in rows])
out = {"schema": "gfm-external-score-v1", "measurement_id": "M106", "yardstick": "Copernicus GFM ensemble flood extent, same Sentinel-1 passes (29 Sep orbit 19 / 28 Sep orbit 12), 20 m, stac.eodc.eu, no auth", "n_windows": len(rows), "groups": {}}
for name, score in (("fused_flag", F), ("new_water", N)):
    top = np.zeros(len(rows), bool); top[np.argsort(-score)[:20]] = True
    out["groups"][f"all_{name}_top20"] = {"gfm_mean_top20": float(G[top].mean()), "gfm_mean_rest": float(G[~top].mean()), "permutation_p": perm_p(G, top), "spearman": spear(score, G)}
for site in sorted({r["site"] for r in rows}):
    rs = [r for r in rows if r["site"] == site]; g = np.array([r["gfm"] for r in rs]); f = np.array([r["fused"] for r in rs]); n = np.array([r["nw"] for r in rs])
    out["groups"][site] = {"n": len(rs), "gfm_mean": float(g.mean()), "gfm_max": float(g.max()), "windows_gfm_gt1pct": int((g > 0.01).sum()), "spearman_fused": spear(f, g) if len(rs) > 3 else None, "spearman_new_water": spear(n, g) if len(rs) > 3 else None,
                           "top3_by_gfm": [{"id": r["id"], "gfm": round(r["gfm"], 4), "fused": round(r["fused"], 4), "nw": round(r["nw"], 4)} for r in sorted(rs, key=lambda r: -r["gfm"])[:3]]}
a = out["groups"]["all_fused_flag_top20"]; b = out["groups"]["all_new_water_top20"]; nar = out["groups"].get("river_narayani", {}); sap = out["groups"].get("saptari", {}); xn = out["groups"].get("xriver_narayani", {})
out["headline"] = (f"Across {len(rows)} windows, the 20 highest fused-flag windows hold {a['gfm_mean_top20']*100:.1f}% GFM flood pixels vs {a['gfm_mean_rest']*100:.1f}% elsewhere (p = {a['permutation_p']:.4f}); the 20 highest new-water windows hold {b['gfm_mean_top20']*100:.1f}% (p = {b['permutation_p']:.4f}). "
                   f"Along the Narayani below Susta the reach ranking matches GFM at ρ = {nar.get('spearman_fused', float('nan')):.2f}; GFM maps the lower Gandak into Bihar at up to {xn.get('gfm_max', 0)*100:.0f}% flood. At Saptari GFM finds {sap.get('gfm_max', 0)*100:.0f}% flood in channel windows the embedding missed and the classical new-water caught (ρ {sap.get('spearman_new_water', float('nan')):+.2f}).")
out["headline_ko"] = (f"창 {len(rows)}개 중 결합 깃발 상위 20창의 GFM 홍수 픽셀 {a['gfm_mean_top20']*100:.1f}% vs 나머지 {a['gfm_mean_rest']*100:.1f}%(p {a['permutation_p']:.4f}), 고전 새-물 상위 20창은 {b['gfm_mean_top20']*100:.1f}%(p {b['permutation_p']:.4f}). "
                      f"수스타 아래 나라야니 구간 순위는 GFM 과 ρ {nar.get('spearman_fused', float('nan')):.2f}; 비하르 쪽 간다크 하류는 GFM 홍수 최대 {xn.get('gfm_max', 0)*100:.0f}%. 삽타리는 GFM 이 하도 창에 {sap.get('gfm_max', 0)*100:.0f}% 홍수를 잡았고 임베딩은 놓치고 고전 새-물이 맞췄다(ρ {sap.get('spearman_new_water', float('nan')):+.2f}).")
out["rows"] = rows
(ROOT / "artifacts/m100_flood_sites/gfm_score_M106.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
print(out["headline"]); print()
for k, v in out["groups"].items():
    if k.startswith("all_"): continue
    print(f"  {k:<22} n={v['n']:<3} GFM>1% {v['windows_gfm_gt1pct']:<3} mean {v['gfm_mean']*100:5.2f}% ρ(fused) {v['spearman_fused'] if v['spearman_fused'] is None else round(v['spearman_fused'],2)} ρ(nw) {v['spearman_new_water'] if v['spearman_new_water'] is None else round(v['spearman_new_water'],2)}")
