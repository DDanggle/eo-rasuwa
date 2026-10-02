#!/usr/bin/env python3
"""M107 — GFM 품질평가와 같은 지표(CSI·precision·recall)로 창 단위 재집계.
GFM 양성 = 창 안 GFM 홍수 픽셀 비율 ≥ τ_g. 우리 양성 = (a) 결합/임베딩 깃발 ≥ τ_e, (b) 고전 새-물 ≥ τ_w, (c) 둘 중 하나, (d) 둘 다.
τ 를 쓸어 가며 CSI 곡선을 적는다(GFM 보고서는 픽셀 단위 CSI 70% 목표 — 우리는 2.56 km 창 단위라 직접 비교는 아니고 같은 지표를 쓸 뿐)."""
import json, numpy as np
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
rows = json.loads((ROOT / "artifacts/m100_flood_sites/gfm_score_M106.json").read_text())["rows"]
G = np.array([r["gfm"] for r in rows]); E = np.array([r["fused"] for r in rows]); W = np.array([r["nw"] for r in rows]); S = np.array([r["site"] for r in rows])
def csi(pred, truth):
    tp = int((pred & truth).sum()); fp = int((pred & ~truth).sum()); fn = int((~pred & truth).sum())
    return {"tp": tp, "fp": fp, "fn": fn, "csi": tp / (tp + fp + fn) if tp + fp + fn else None, "precision": tp / (tp + fp) if tp + fp else None, "recall": tp / (tp + fn) if tp + fn else None}
out = {"schema": "gfm-csi-v1", "measurement_id": "M107", "n_windows": len(rows), "truth": "GFM ensemble flood fraction in window ≥ τ_g", "sweeps": [], "per_site_at_default": {}}
best = None
for tg in (0.01, 0.02, 0.05):
    truth = G >= tg
    for te in (0.02, 0.03, 0.05, 0.08, 0.10):
        for tw in (0.02, 0.05, 0.10):
            rec = {"tau_gfm": tg, "tau_embed": te, "tau_water": tw, "gfm_positives": int(truth.sum()),
                   "embed": csi(E >= te, truth), "water": csi(W >= tw, truth), "either": csi((E >= te) | (W >= tw), truth), "both": csi((E >= te) & (W >= tw), truth)}
            out["sweeps"].append(rec)
            for k in ("embed", "water", "either", "both"):
                c = rec[k]["csi"]
                if c is not None and (best is None or c > best[0]): best = (c, tg, te, tw, k)
out["best"] = {"csi": best[0], "tau_gfm": best[1], "tau_embed": best[2], "tau_water": best[3], "rule": best[4]}
# 기본 설정(τ_g 2%, τ_e 5%, τ_w 5%)에서 지점별
tg, te, tw = 0.02, 0.05, 0.05; truth = G >= tg
for site in sorted(set(S)):
    m = S == site
    out["per_site_at_default"][site] = {"n": int(m.sum()), "gfm_positives": int(truth[m].sum()), "embed": csi((E >= te)[m], truth[m]), "water": csi((W >= tw)[m], truth[m]), "either": csi(((E >= te) | (W >= tw))[m], truth[m])}
(ROOT / "artifacts/m100_flood_sites/gfm_csi_M107.json").write_text(json.dumps(out, indent=1))
print(f"창 {len(rows)} · 기본 τ(GFM≥2%, 임베딩≥5%, 새-물≥5%) · GFM 양성 {int(truth.sum())}")
for k in ("embed", "water", "either", "both"):
    c = csi({"embed": E >= te, "water": W >= tw, "either": (E >= te) | (W >= tw), "both": (E >= te) & (W >= tw)}[k], truth)
    print(f"  {k:<7} CSI {c['csi']:.2f}  P {c['precision']:.2f}  R {c['recall']:.2f}  (tp {c['tp']} fp {c['fp']} fn {c['fn']})")
print(f"스윕 최적: CSI {best[0]:.2f} @ GFM≥{best[1]} 임베딩≥{best[2]} 새-물≥{best[3]} 규칙={best[4]}")
print("지점별(either):"); 
for s, v in out["per_site_at_default"].items():
    e = v["either"]; print(f"  {s:<22} n={v['n']:<3} GFM+ {v['gfm_positives']:<3} CSI {e['csi'] if e['csi'] is None else round(e['csi'],2)}  P {e['precision'] if e['precision'] is None else round(e['precision'],2)}  R {e['recall'] if e['recall'] is None else round(e['recall'],2)}")
