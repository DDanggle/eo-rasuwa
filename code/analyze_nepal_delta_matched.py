#!/usr/bin/env python3
"""매칭 쌍 placebo 판정 — 창 겹침 구조를 사건 쌍과 동일하게 맞춘 대조 (2026-08-29).

M70의 결함: placebo Δ를 전부 "placebo_k vs baseline"으로 쟀는데, END가 멀수록 겹치는 14일
기간이 줄어 Δ가 구조적으로 커짐(6~7월 창은 겹침 0). 사건 쌍(baseline END 08-26 vs s1_live
END 09-08)은 4기간 중 3기간을 공유하므로, 공정한 placebo는 **정확히 1기간(14일) 차이의
연속 창 쌍**이어야 함.

사전 등록:
  - 사건 Δ_event = cos-dist(baseline, s1_live)  [1기간 차이]
  - placebo 쌍 = END가 14일 차이나는 모든 (earlier, later) 쌍: (0617,0701),(0624,0708),(0701,0715),
    (0708,0722),(0715,0729),(0722,0805),(0729,0812=a),(0805,0819=b),(0812=a,0826=baseline) → 최대 9쌍
  - 앵커별 판정: 사건 Δ 평균이 placebo 쌍 Δ 평균들의 rank에서 1위(모두 초과)면 candidate change,
    아니면 rank/n을 보고하고 "not detected above matched variability". n<20이므로 percentile 주장 금지.
"""
from __future__ import annotations
import json, sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from analyze_nepal_delta import ROOT, find_embedding, load_cube, cosine_delta, sha256_file  # noqa: E402

ANCHORS = ["source_provisional", "rasuwagadhi", "timure", "syabrubesi", "dhunche"]
END_OF = {"baseline": date(2026, 8, 26), "s1_live": date(2026, 9, 8), "placebo_a": date(2026, 8, 12), "placebo_b": date(2026, 8, 19)}

def mode_end(m: str) -> date | None:
    if m in END_OF: return END_OF[m]
    if m.startswith("placebo_2026"):
        d = m.split("_")[1]; return date(int(d[:4]), int(d[4:6]), int(d[6:8]))
    return None

def main():
    modes = [p.name for p in ROOT.iterdir() if (p / "embedding_manifest.json").exists()]
    ends = {m: mode_end(m) for m in modes if mode_end(m)}
    pairs = []
    for a, ea in ends.items():
        for b, eb in ends.items():
            if a in ("s1_live",) or b in ("s1_live",): continue
            if eb - ea == timedelta(days=14): pairs.append((a, b))
    pairs.sort(key=lambda p: ends[p[0]])
    out = {"schema": "nepal-delta-matched-pairs-v1", "event_pair": ["baseline", "s1_live"], "placebo_pairs": pairs, "anchors": {}, "inputs": {}}
    for anchor in ANCHORS:
        cubes = {}
        def get(m):
            if m not in cubes:
                p = find_embedding(m, anchor); cubes[m] = load_cube(p) if p else None
                if p: out["inputs"][f"{m}/{anchor}"] = sha256_file(p)
            return cubes[m]
        baseline = get("baseline")
        live = get("s1_live")
        if baseline is None or live is None:
            out["anchors"][anchor] = {
                "status": "missing event-pair embedding",
                "baseline_present": baseline is not None,
                "s1_live_present": live is not None,
            }
            print(f"  {anchor:20s} missing baseline/s1_live embedding", flush=True)
            continue
        ev = cosine_delta(baseline, live)
        pl = []
        for a, b in pairs:
            ca, cb = get(a), get(b)
            if ca is None or cb is None: continue
            pl.append({"pair": [a, b], "mean": float(cosine_delta(ca, cb).mean())})
        # 토큰 수준(사전 등록): 매칭 placebo 쌍의 모든 토큰 Δ 풀 → p99 임계 → 사건 토큰 중 초과 비율.
        # placebo 쌍 각각에 같은 임계를 적용한 초과 비율 분포와 rank 로 판정 (평균 Δ보다 국소 변화에 민감).
        pl_tok = []
        for a, b in pairs:
            ca, cb = get(a), get(b)
            if ca is None or cb is None: continue
            pl_tok.append(cosine_delta(ca, cb))
        thr99 = float(np.quantile(np.concatenate([x.ravel() for x in pl_tok]), 0.99)) if pl_tok else None
        ev_frac = float((ev > thr99).mean()) if thr99 is not None else None
        pl_fracs = [float((x > thr99).mean()) for x in pl_tok] if thr99 is not None else []
        tok_rank = 1 + sum(1 for f in pl_fracs if f >= ev_frac) if ev_frac is not None else None
        ev_mean = float(ev.mean()); pl_means = [x["mean"] for x in pl]
        rank = 1 + sum(1 for m in pl_means if m >= ev_mean)
        label = "candidate change (matched)" if pl_means and rank == 1 else "not detected above matched variability"
        tok_label = ("candidate change (token-level, matched)" if tok_rank == 1 and ev_frac and ev_frac > 0.01
                     else "not detected (token-level)")
        out["anchors"][anchor] = {"event_mean": ev_mean, "event_p95": float(np.quantile(ev, 0.95)), "placebo_pairs": pl,
                                  "rank_of_event": rank, "n_placebo": len(pl), "label": label,
                                  "token": {"threshold_p99": thr99, "event_frac_above": ev_frac, "placebo_fracs_above": pl_fracs,
                                            "rank_of_event": tok_rank, "label": tok_label}}
        print(f"  {anchor:20s} mean-rank {rank}/{len(pl)+1} → {label} | token: event {100*(ev_frac or 0):.1f}% vs placebo {[round(100*f,1) for f in pl_fracs]} rank {tok_rank} → {tok_label}", flush=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    od = ROOT.parent / "delta_matched" / stamp; od.mkdir(parents=True, exist_ok=True)
    (od / "nepal_delta_matched_report.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print("report →", od / "nepal_delta_matched_report.json"); print("DONE")

if __name__ == "__main__":
    main()
