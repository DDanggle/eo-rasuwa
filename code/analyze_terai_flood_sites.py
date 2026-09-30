#!/usr/bin/env python3
"""M100 판별: 뉴스 홍수 지점 5곳의 레이더 임베딩 순위(t19/t12)를 고전 물 지수·광학 SCL 물 변화에 대고 읽는다.

읽는 순서(사전 고정):
  1. 지역 공통 이동 — 창 전체 d_event 중앙값이 평시 중앙값보다 얼마나 밀렸나(M99 교훈).
  2. 임베딩 깃발(문턱 초과 토큰 비율) 상위 vs 고전 새-물 비율(water_new_frac_event) — Spearman·상위 겹침.
     고전 지수의 귀무(평시 쌍 water_new_frac_placebo p99)를 넘는 창 = '물이 새로 덮였다'로 판별.
  3. 삽타리는 9/28 광학 SCL 물 변화와도 교차(레이더 09-28 과 같은 날).
판별 등급(창 단위): A 임베딩 깃발 ∧ 고전 물 초과  /  B 임베딩만  /  C 고전 물만  /  – 둘 다 아님.
주장 경계: 등급은 '먼저 볼 곳'의 근거이며 피해·수심·인과가 아니다. 현장 정답 0.
"""
from __future__ import annotations
import json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "research-private/artifacts"


def rank(v):
    v = np.asarray(v, float); r = np.empty(len(v)); r[np.argsort(v)] = np.arange(len(v)); return r


def spear(x, y):
    return float(np.corrcoef(rank(x), rank(y))[0, 1]) if len(x) > 2 else float("nan")


def analyse(tag: str, optical: dict | None = None) -> dict:
    rep = json.loads((ART / f"terai_radar_scan_{tag}/report.json").read_text())
    W = [w for w in rep["windows"] if w["status"] == "ranked"]
    thr = rep["threshold_placebo_p99"]; wnull = rep["water_new_frac_placebo_p99"]
    dev = np.array([w["d_event_mean"] for w in W]); dpl = np.array([w["d_placebo_mean"] for w in W])
    cand = np.array([w["candidate_token_frac"] for w in W]); wat = np.array([w["water_new_frac_event"] or 0 for w in W])
    watp = np.array([w["water_new_frac_placebo"] or 0 for w in W])
    print(f"\n==== {tag} · {rep['measurement_id']} · orbit {rep['orbit']} · target {rep['event_pair']['target']} · 채점 {len(W)}/{len(rep['windows'])}")
    print(f"  문턱(평시 p99) {thr:.4f} · 사건 거리 중앙값 {np.median(dev):.3f} vs 평시 {np.median(dpl):.3f} (지역 이동 {np.median(dev)-np.median(dpl):+.3f})")
    print(f"  깃발 비율 평균 {cand.mean():.3f} · 깃발 0 창 {int((cand==0).sum())} · 새-물 비율: 사건 중앙값 {np.median(wat):.4f} / 평시 중앙값 {np.median(watp):.4f} / 평시 p99 {wnull:.4f}")
    print(f"  Spearman(임베딩 깃발, 고전 새-물) = {spear(cand, wat):.3f}")
    grade = {}
    for w, c, x in zip(W, cand, wat):
        e = c > 0.05                       # 임베딩: 토큰 5% 이상 문턱 초과 (1% 귀무의 5배)
        f = wnull is not None and x > wnull
        grade[w["id"]] = "A" if e and f else "B" if e else "C" if f else "-"
    out = {"tag": tag, "measurement_id": rep["measurement_id"], "orbit": rep["orbit"], "target": rep["event_pair"]["target"],
           "threshold": thr, "regional_shift": float(np.median(dev) - np.median(dpl)), "flag_mean": float(cand.mean()),
           "water_null_p99": wnull, "spearman_flag_vs_water": spear(cand, wat), "aois": {}}
    for aoi in rep["aois"]:
        idx = [i for i, w in enumerate(W) if w["aoi"] == aoi]
        if not idx: continue
        g = [grade[W[i]["id"]] for i in idx]
        top = sorted(idx, key=lambda i: -cand[i])[:3]
        print(f"  -- {aoi:<10} 창 {len(idx):>2} · 깃발 평균 {cand[idx].mean():.3f} · 새-물 평균 {wat[idx].mean():.4f} · 등급 A {g.count('A')} B {g.count('B')} C {g.count('C')}")
        for i in top:
            w = W[i]; extra = ""
            if optical and w["id"] in optical: o = optical[w["id"]]; extra = f" · 광학 SCL 물 {o[0]:.2f}→{o[1]:.2f} ({o[1]-o[0]:+.2f})"
            print(f"       {w['id']:<12} 깃발 {cand[i]:.3f} 초과 {w.get('excess_over_median', 0):+.3f} 새-물 {wat[i]:.4f} ΔVV {w['dvv_event_db'] or 0:+.2f} dB 등급 {grade[w['id']]}{extra}")
        out["aois"][aoi] = {"n": len(idx), "flag_mean": float(cand[idx].mean()), "water_mean": float(wat[idx].mean()),
                            "grades": {k: g.count(k) for k in "ABC-"},
                            "top3": [{"id": W[i]["id"], "flag": float(cand[i]), "water": float(wat[i]), "dvv_db": W[i]["dvv_event_db"], "grade": grade[W[i]["id"]],
                                      "center_lonlat": W[i]["center_lonlat"]} for i in top]}
    if optical:
        ids = [w["id"] for w in W if w["id"] in optical]
        if len(ids) > 3:
            dw = [optical[i][1] - optical[i][0] for i in ids]; ri = {w["id"]: k for k, w in enumerate(W)}
            print(f"  광학 Δ물 vs 레이더 새-물: Spearman {spear([wat[ri[i]] for i in ids], dw):.3f} · vs 임베딩 깃발: {spear([cand[ri[i]] for i in ids], dw):.3f}")
            out["optical_cross"] = {"spearman_water_vs_scl": spear([wat[ri[i]] for i in ids], dw), "spearman_flag_vs_scl": spear([cand[ri[i]] for i in ids], dw)}
    return out


def main():
    opt = None
    p = ROOT / "artifacts/m100_flood_sites/optical_frames/saptari_optical_water.json"
    if p.exists():
        j = json.loads(p.read_text()); opt = {r[0]: (r[3], r[4]) for r in j["rows"]}
    res = {}
    for tag, o in (("t19", None), ("t12", opt)):
        if (ART / f"terai_radar_scan_{tag}/report.json").exists():
            res[tag] = analyse(tag, o)
    outp = ROOT / "artifacts/m100_flood_sites/summary.json"
    outp.parent.mkdir(parents=True, exist_ok=True); outp.write_text(json.dumps(res, indent=1, ensure_ascii=False))
    print("\nwrote", outp)


if __name__ == "__main__":
    main()
