#!/usr/bin/env python3
"""회랑 27창 자체 매칭 placebo — Δ(placebo_a END 08-12 ↔ baseline END 08-26) = 사건 쌍과 같은 1기간(14일) 차이.
임계 = 27창 placebo 토큰 풀 p99(자체). 사건 = Δ(baseline ↔ s1_live). 창별 초과 비율·placebo 자체 초과 비율·rank.
차용 임계(M74) 결과와 나란히 봉인함. 라벨은 candidate까지. EMB_LAYER 로 embeddings_s1 도 가능.
"""
import json, os, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from analyze_nepal_delta import load_cube, cosine_delta  # noqa
from nepal_paths import ARTIFACT_ROOT
CROOT = ARTIFACT_ROOT / "external_data/nepal_olmo_live_v1/materialized_corridor"
EMB = os.environ.get("EMB_LAYER", "embeddings"); OUT = os.environ.get("OUT_NAME", "corridor_matched")
def emb(mode, wid):
    base = CROOT / mode / "dataset/windows/nepal" / wid / ("layers/" + EMB); tifs = sorted(base.rglob("*.tif")) if base.exists() else []
    return load_cube(tifs[0]) if len(tifs) == 1 else None
def main():
    wm = json.loads((ARTIFACT_ROOT / "corridor_s2_candidates/prepare/windows_manifest.json").read_text())
    ids = [w["id"] for w in wm["windows"]]; centers = {w["id"]: w["center_lonlat"] for w in wm["windows"]}
    ev, pl = {}, {}
    for wid in ids:
        zb, zl, za = emb("baseline", wid), emb("s1_live", wid), emb("placebo_a", wid)
        if zb is None or zl is None or za is None: continue
        ev[wid] = cosine_delta(zb, zl); pl[wid] = cosine_delta(za, zb)
    # 관측성: 광학 스캔(embed_v2)의 유효 마스크로 구름·눈 창을 풀에서 제외 (봉인 계약엔 마스크가 없어 구름 Δ가 임계를 폭주시킴)
    vdir = ARTIFACT_ROOT / "corridor_s2_candidates/embed_v2"
    def valid(wid):
        if os.environ.get("NO_OPTICAL_MASK"): return None   # 레이더 단독 분석: 광학 구름 마스크를 적용하지 않음
        f = vdir / f"{wid}_delta.npz"
        if not f.exists(): return None
        d = np.load(f); return d["valid_event"], d["valid_placebo"]
    pool = []; obs = {}
    for wid in pl:
        v = valid(wid); obs[wid] = v
        if v is None: continue
        ve, vp = v
        if vp.mean() >= 0.2: pool.append(pl[wid][vp])
    thr = float(np.quantile(np.concatenate(pool), 0.99)) if pool else float(np.quantile(np.concatenate([v.ravel() for v in pl.values()]), 0.99))
    rows = []
    for wid in ev:
        v = obs.get(wid); ve, vp = (v if v is not None else (np.ones_like(ev[wid], bool), np.ones_like(ev[wid], bool)))
        thr_w = float(np.quantile(pl[wid][vp], 0.99)) if vp.any() else None   # 창 자체 placebo p99 (창내 매칭)
        rows.append({"id": wid, "center_lonlat": centers[wid], "observable_event": float(ve.mean()), "observable_placebo": float(vp.mean()),
                     "event_frac": float((ev[wid][ve] > thr).mean()) if ve.any() else None, "placebo_frac": float((pl[wid][vp] > thr).mean()) if vp.any() else None,
                     "event_frac_own_window": float((ev[wid][ve] > thr_w).mean()) if (thr_w is not None and ve.any()) else None,
                     "event_mean": float(ev[wid].mean()), "placebo_mean": float(pl[wid].mean()), "status": "ranked" if ve.mean() >= 0.2 else "unobservable"})
    rows_all = rows; rows = [r for r in rows_all if r["status"] == "ranked" and r["event_frac"] is not None]
    pl_fracs = sorted(r["placebo_frac"] for r in rows if r["placebo_frac"] is not None)
    for r in rows:
        r["rank_vs_placebo_windows"] = 1 + sum(1 for f in pl_fracs if f >= r["event_frac"])
        r["label"] = "candidate change (own matched threshold)" if r["event_frac"] > max(pl_fracs) and r["event_frac"] > 0.01 else "not detected"
    rows.sort(key=lambda r: -r["event_frac"])
    for i, r in enumerate(rows): r["rank"] = i + 1
    out = {"schema": "corridor-matched-own-v1", "embedding_layer": EMB, "threshold_own_p99": thr, "placebo_pair": ["placebo_a", "baseline"],
           "n_windows": len(rows), "n_unobservable": len(rows_all) - len(rows), "placebo_frac_max": max(pl_fracs), "windows": rows, "unobservable": [r["id"] for r in rows_all if r["status"] != "ranked"],
           "claim": "candidate change (own 1-period placebo, 27-window pool); not damage"}
    od = ARTIFACT_ROOT / "external_data/nepal_olmo_live_v1" / OUT; od.mkdir(parents=True, exist_ok=True)
    (od / "report.json").write_text(json.dumps(out, indent=1))
    print("own thr %.4f · placebo max frac %.3f · candidates: %s" % (thr, max(pl_fracs), [r["id"] for r in rows if r["label"].startswith("candidate")]))
    for r in rows[:10]: print(r["rank"], r["id"], "event %.3f (own-win %.3f) placebo %.3f obs %.2f → %s" % (r["event_frac"], r["event_frac_own_window"] or 0, r["placebo_frac"] or 0, r["observable_event"], r["label"]))
    print("unobservable:", [r["id"] for r in rows_all if r["status"] != "ranked"])
    print("DONE")
if __name__ == "__main__": main()
