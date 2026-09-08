#!/usr/bin/env python3
"""M95. 광학과 레이더를 **하나의 순위**로 결합한다 — 공유 임베딩 공간의 실제 값어치.

지금까지 이 프로젝트는 두 센서를 따로 돌려 별개 목록 두 개를 냈다. 광학 회랑 스캔
(100창 중 47창 판독)과 레이더 발원지 스캔(56창 전부 판독). 사이트에도 "separate
lists, not interchangeable" 이라고 적어 두었다.

그런데 레이더 56창은 회랑 100창과 **같은 창 id** 다. 그리고 광학이 못 읽은 53창 중
50창을 레이더가 읽는다. 두 센서는 중복이 아니라 상보다 — 레이더는 광학이 눈먼
바로 그곳을 읽는다.

같은 목록에 올릴 수 있는 근거: 두 점수 모두 "그 센서 자신의 평시 p99 를 넘은
유효 셀의 비율" 이다. 귀무 상태에서 둘 다 정의상 1% 가 되므로 공통 척도가 된다.
Δz 원값은 센서마다 분포가 달라 절대 섞을 수 없지만, 자기 평시로 정규화한 초과율은
섞을 수 있다. 이 가정을 코드에서 실제로 검증한다(placebo 초과율 ≈ 1%).

비대칭 공개: 광학 문턱은 평시쌍 3개를 pooled 한 p99(0.3170), 레이더 문턱은 자기
계약의 평시쌍 1개의 p99(0.2499)다. 구성 방식이 같지 않으므로 보고서에 명시한다.

주장 경계: 커버리지 확장이지 정확도 향상이 아니다. 두 센서가 함께 읽히는 창은 6개뿐
이라 센서 간 일치도는 n=6 이고 약한 확인에 불과하다.
"""
from __future__ import annotations
import json
from pathlib import Path

import numpy as np
from scipy.stats import spearmanr

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT

OUT = REPO_ROOT / "artifacts/modality_fusion"
MIN_VALID = 0.2
RADAR_CONTRACT = "source_radar_scan_o19"   # base 가 사건 이틀 전인 계약


def optical_windows() -> dict[str, dict]:
    sc = json.loads((REPO_ROOT / "web/public/data/scenario.json").read_text())
    out = {}
    for f in sc["candidates"]["geojson"]["features"]:
        p = f["properties"]
        out[p["id"]] = {
            "valid": p.get("valid_event_frac"),
            "frac": p.get("candidate_token_frac_pooled3"),
            "center": p.get("center_lonlat"),
            "place": p.get("place"),
            "kind": p.get("kind"),
        }
    return out


def radar_windows() -> tuple[dict[str, dict], float]:
    rep = json.loads((REPO_ROOT / f"artifacts/source_radar_scan/report_o19.json").read_text())
    out = {w["id"]: {"valid": w["valid_event_frac"], "frac": w.get("candidate_token_frac"),
                     "status": w["status"]} for w in rep["windows"]}
    return out, float(rep["threshold_placebo_p99"])


def placebo_exceedance() -> dict[str, float]:
    """귀무 검증: 각 센서의 평시쌍 초과율. 공통 척도 가정이 성립하는지 본다."""
    res = {}
    opt_thr = 0.3169780373573303
    fr = []
    for f in sorted((ARTIFACT_ROOT / "corridor_s2_candidates/embed_scan_v2/deltas").glob("v*_delta.npz")):
        d = np.load(f)
        v = d["valid_placebo"]
        if v.sum() == 0:
            continue
        fr.append(float((d["d_placebo"][v] > opt_thr).mean()))
    res["optical"] = float(np.mean(fr)) if fr else float("nan")

    fr = []
    rad_thr = None
    rep = json.loads((REPO_ROOT / "artifacts/source_radar_scan/report_o19.json").read_text())
    rad_thr = float(rep["threshold_placebo_p99"])
    for f in sorted((ARTIFACT_ROOT / RADAR_CONTRACT / "embed").glob("v*_delta.npz")):
        d = np.load(f)
        v = d["valid_placebo"]
        if v.sum() == 0:
            continue
        fr.append(float((d["d_placebo"][v] > rad_thr).mean()))
    res["radar"] = float(np.mean(fr)) if fr else float("nan")
    return res


def main() -> None:
    opt = optical_windows()
    rad, rad_thr = radar_windows()

    opt_ok = {i for i, w in opt.items() if (w["valid"] or 0) >= MIN_VALID and w["frac"] is not None}
    rad_ok = {i for i, w in rad.items() if w["status"] == "ranked" and w["frac"] is not None}
    both = opt_ok & rad_ok

    fused = []
    for wid, w in opt.items():
        o_ok, r_ok = wid in opt_ok, wid in rad_ok
        if o_ok and r_ok:
            # 둘 다 읽힌 창은 더 큰 쪽을 쓴다 — 검토 순서를 만드는 것이므로 놓치지 않는 편을 택한다
            src = "both"
            frac = max(opt[wid]["frac"], rad[wid]["frac"])
        elif o_ok:
            src, frac = "optical", opt[wid]["frac"]
        elif r_ok:
            src, frac = "radar", rad[wid]["frac"]
        else:
            src, frac = "unreadable", None
        fused.append({"id": wid, "source": src, "frac": frac,
                      "optical_frac": opt[wid]["frac"] if o_ok else None,
                      "radar_frac": rad[wid]["frac"] if r_ok else None,
                      "center_lonlat": w["center"], "place": w["place"], "kind": w["kind"]})

    ranked = sorted([f for f in fused if f["frac"] is not None], key=lambda f: -f["frac"])
    for i, f in enumerate(ranked):
        f["rank"] = i + 1

    agree = None
    if len(both) >= 3:
        x = [opt[i]["frac"] for i in sorted(both)]
        y = [rad[i]["frac"] for i in sorted(both)]
        rs, ps = spearmanr(x, y)
        agree = {"n": len(both), "spearman": round(float(rs), 3), "p": float(ps),
                 "windows": sorted(both),
                 "note": "n is too small to carry weight; reported so the number is not hidden"}

    rep = {
        "schema": "modality-fusion-v1", "measurement_id": "M95",
        "question": "What does one shared embedding space actually buy on a cloudy disaster?",
        "answer_headline": {
            "windows_total": len(opt),
            "optical_readable": len(opt_ok),
            "radar_readable_in_swath": len(rad_ok),
            "radar_rescues": len(rad_ok - opt_ok),
            "fused_readable": len(opt_ok | rad_ok),
            "still_unreadable": len(opt) - len(opt_ok | rad_ok),
        },
        "why_comparable": (
            "Both scores are the share of that window's valid cells exceeding the 99th percentile of "
            "the same sensor's own ordinary change. Under the null both are 1% by construction, so the "
            "two are on a common footing even though raw Δz distributions differ between sensors. Raw Δz "
            "must never be mixed; a placebo-normalised exceedance rate can be."
        ),
        "null_check": placebo_exceedance(),
        "threshold_asymmetry": {
            "optical_p99": 0.3169780373573303,
            "optical_construction": "pooled over three placebo pairs (M82)",
            "radar_p99": rad_thr,
            "radar_construction": "one placebo pair of its own orbit-19 contract, time-matched",
            "disclosure": "the two thresholds are built from a different number of placebo pairs; this is an asymmetry in the fusion, not a controlled variable",
            "bias_direction": (
                "The null check quantifies which way the asymmetry leans: optical placebo cells exceed "
                "their threshold 0.62% of the time against radar's 1.00%. The optical threshold is "
                "therefore slightly stricter, so optical windows are mildly disadvantaged in the fused "
                "ranking and radar windows mildly favoured. This matters because radar takes 1st, 2nd "
                "and 6th place: some of that lead is contract, not signal. Equalising the two nulls is "
                "an open correction."
            ),
        },
        "sensor_overlap": {
            "readable_in_both": len(both),
            "radar_only": len(rad_ok - opt_ok),
            "optical_only": len(opt_ok - rad_ok),
            "neither": len(opt) - len(opt_ok | rad_ok),
            "reading": "the sensors are complementary, not redundant: radar reads where optical is blind",
        },
        "cross_sensor_agreement": agree,
        "top15": [{k: f[k] for k in ("rank", "id", "source", "frac", "place", "center_lonlat")} for f in ranked[:15]],
        "windows": fused,
        "claim_boundary": (
            "This extends coverage, it does not improve accuracy. Nothing here is a damage map. Because "
            "only 6 windows are readable by both sensors, cross-sensor agreement is n=6 and is a weak "
            "check, not a validation. The fused list is a reading order over observed change."
        ),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "report.json").write_text(json.dumps(rep, indent=1) + "\n")

    h = rep["answer_headline"]
    print(f"optical readable {h['optical_readable']}/{h['windows_total']}"
          f"  -> fused {h['fused_readable']}/{h['windows_total']}"
          f"  (radar rescues {h['radar_rescues']}, still blind {h['still_unreadable']})")
    print("null check (placebo exceedance, should be near 1%):",
          {k: f"{100*v:.2f}%" for k, v in rep["null_check"].items()})
    print("cross-sensor:", agree)
    print("\nfused top 10:")
    for f in ranked[:10]:
        print(f"  {f['rank']:2}  {f['id']}  {f['source']:8} {100*f['frac']:5.1f}%  {f['place'] or ''}")


if __name__ == "__main__":
    main()
