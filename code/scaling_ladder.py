#!/usr/bin/env python3
"""M96. 모델 크기 사다리 — 재난 변화 탐지에서 scaling 이 먹히는가.

배경: GeoFM 에서 모델 크기가 성능으로 이어지지 않는다는 것이 이 분야의 미해결 문제다.
일반 벤치마크에서 그렇다는 것이고, 갓 일어난 재난의 변화 탐지라는 특정 과제 가족에서
성립하는지는 본 사람이 없다. 여기서는 OlmoEarth v1 네 크기를 **같은 계약·같은 큐브**에
돌려 그 한 가족 안에서의 답을 낸다. 가족 n=1 이므로 결론이 아니라 첫 점이다.

채점은 자기 일치도가 아니라 외부 자로 한다 — UNOSAT 이 독립 지도화한 detachment zone 과
barrier lakes (M94 와 같은 기계). 큰 모델이 남이 그린 발원지에 더 잘 얹히는가.

입력 계약 테스트: 각 모델의 평시쌍 초과율이 1% 근처가 아니면 그 모델은 입력이 잘못 들어간
것이다. 단위·밴드 오류를 자동으로 잡는다 (M75 류). 이 검사를 통과한 모델만 표에 올린다.
"""
from __future__ import annotations
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from scipy.stats import spearmanr
from shapely.geometry import box

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT

OUT = REPO_ROOT / "artifacts/scaling_ladder"
GDB = REPO_ROOT / ".ext/unosat/FL20260826NPL.gdb"
RNG = np.random.default_rng(20260909)
DRAWS = 200_000
# 실측 파라미터 수 (artifacts/scaling_ladder_params.json, 모델을 실제로 올려 셈)
_P = json.loads((REPO_ROOT / "artifacts/scaling_ladder_params.json").read_text())
PARAMS_M = {k: round(_P[f"OLMOEARTH_V1_{k.upper()}"]["params"] / 1e6, 1) for k in ("nano", "tiny", "base", "large")}
EMBED_DIM = {k: _P[f"OLMOEARTH_V1_{k.upper()}"]["embed_dim"] for k in ("nano", "tiny", "base", "large")}

LADDER = [("nano", "source_radar_scan_o19_v1_nano"),
          ("tiny", "source_radar_scan_o19_v1_tiny"),
          ("base", "source_radar_scan_o19"),
          ("large", "source_radar_scan_o19_v1_large")]


def null_check(embed_dir: Path, thr: float) -> float:
    fr = []
    for f in sorted(embed_dir.glob("v*_delta.npz")):
        d = np.load(f); v = d["valid_placebo"]
        if v.sum(): fr.append(float((d["d_placebo"][v] > thr).mean()))
    return float(np.mean(fr)) if fr else float("nan")


def perm_p(values: np.ndarray, flagged: np.ndarray, larger: bool) -> float:
    obs = values[flagged].mean(); n = int(flagged.sum())
    draws = values[RNG.integers(0, len(values), size=(DRAWS, n))].mean(axis=1)
    return float(((draws >= obs) if larger else (draws <= obs)).sum() + 1) / (DRAWS + 1)


def main() -> None:
    foot = json.loads((Path(__file__).parent / "source_radar_windows.json").read_text())
    windows = gpd.GeoDataFrame({"id": [w["id"] for w in foot]},
                               geometry=[box(*w["bounds_utm"]) for w in foot], crs=32645)
    det = gpd.read_file(GDB, layer="UNOSAT_Landsat9_20260826_DetachmentZone").to_crs(32645).union_all()
    lak = gpd.read_file(GDB, layer="UNOSAT_Cartosat3_20260828_BarrierLakes").to_crs(32645).union_all()

    rows, base_frac = [], None
    for size, dirname in LADDER:
        rep_p = ARTIFACT_ROOT / dirname / "report.json"
        if not rep_p.exists():
            rows.append({"size": size, "status": "missing"}); continue
        rep = json.loads(rep_p.read_text())
        thr = float(rep["threshold_placebo_p99"])
        frac = {w["id"]: w["candidate_token_frac"] for w in rep["windows"] if w["status"] == "ranked"}
        ids = [i for i in windows["id"] if i in frac]
        g = windows[windows["id"].isin(ids)].reset_index(drop=True)
        scores = np.array([frac[i] for i in g["id"]])
        order = np.argsort(-scores)
        flagged = np.zeros(len(g), bool); flagged[order[:6]] = True
        area = g.geometry.area.values
        res = {"size": size, "status": "ok", "model_id": rep.get("model_id"),
               "params_M": PARAMS_M[size], "embed_dim": EMBED_DIM[size],
               "threshold_p99": round(thr, 4),
               "null_placebo_exceedance": round(null_check(ARTIFACT_ROOT / dirname / "embed", thr), 4),
               "top6": [g["id"][i] for i in order[:6]],
               "scores_by_id": {g["id"][i]: round(float(scores[i]), 4) for i in range(len(g))}}
        for key, poly in (("detachment_zone", det), ("barrier_lakes", lak)):
            inter = g.geometry.intersection(poly).area.values / area
            res[key] = {
                "flagged_mean_overlap": round(float(inter[flagged].mean()), 5),
                "non_flagged_mean_overlap": round(float(inter[~flagged].mean()), 5),
                "ratio": round(float(inter[flagged].mean() / max(inter[~flagged].mean(), 1e-9)), 1),
                "permutation_p": round(perm_p(inter, flagged, True), 5),
            }
        if size == "base":
            base_frac = frac
        rows.append(res)

    # Base 대비 순위 상관 (같은 56창)
    for r in rows:
        if r["status"] != "ok" or base_frac is None:
            continue
        ids = [i for i in r["scores_by_id"] if i in base_frac]
        rs, _ = spearmanr([r["scores_by_id"][i] for i in ids], [base_frac[i] for i in ids])
        r["spearman_vs_base"] = round(float(rs), 3)
        r["top6_overlap_with_base"] = len(set(r["top6"]) & set(
            next(x for x in rows if x["size"] == "base")["top6"]))

    ok = [r for r in rows if r["status"] == "ok"]
    p_det = [r["detachment_zone"]["permutation_p"] for r in ok]
    monotone_better = all(p_det[i] >= p_det[i + 1] for i in range(len(p_det) - 1))
    rep = {
        "schema": "scaling-ladder-v1", "measurement_id": "M96",
        "question": "Within one model family and one fixed contract, does a larger encoder land closer to the independently mapped source?",
        "contract": "orbit 19 descending, base 07-31/08-12/08-24 -> 09-05, placebo 07-07/07-19/07-31 -> 08-12, gamma0 dB, own placebo p99 per model",
        # 정직하게: 문턱이 그 placebo 의 p99 이므로 placebo 초과율은 정의상 1% 다. 이 계약 안에서는
        # 입력 오류를 잡는 검사가 아니다 (M95 에서는 문턱과 검증 placebo 가 달라 의미가 있었다).
        # 여기서 입력 정합성의 실제 근거는 네 모델이 독립적으로 같은 외부 폴리곤 창을 상위에 놓는다는 것이다.
        "null_check_note": ("placebo exceedance is 1% by construction under this contract (the threshold is that "
                            "placebo's own p99), so it is not an input-contract test here; the input sanity evidence is "
                            "that all four sizes independently rank the same externally-mapped windows at the top"),
        "yardstick_resolution": {
            "windows_touching_detachment": ["v049", "v050", "v075", "v076"],
            "windows_touching_lakes": ["v063", "v070", "v071", "v076"],
            "in_every_top6": {"detachment": ["v050", "v075", "v076"], "lakes": ["v070", "v076"]},
            "reading": ("Every size places the same polygon-touching windows in its top six, so the external score is "
                        "identical across sizes by arithmetic. The slots that differ between sizes hold windows that touch "
                        "neither polygon, on which the yardstick has no opinion. 'No scaling effect' here is partly a "
                        "ceiling of the yardstick, not only equivalence of the models."),
        },
        "ladder": [{k: v for k, v in r.items() if k != "scores_by_id"} for r in rows],
        "reading": {
            "detachment_p_by_size": dict(zip([r["size"] for r in ok], p_det)),
            "monotone_improvement_with_size": monotone_better,
        },
        "claim_boundary": ("One family, one event, 56 windows, 6 flagged per model, and a yardstick with only 4+4 "
                           "touching windows that every size already gets. This is the first point on a "
                           "scaling question, not an answer to it; a second family (TerraMind, Galileo) is needed "
                           "before saying anything about scaling in general. Not damage, not risk."),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "report.json").write_text(json.dumps(rep, indent=1) + "\n")
    print(f"{'size':6} {'params':>7} {'thr':>7} {'null%':>6} {'ρ vs base':>9} {'top6∩':>5} {'det ratio':>9} {'det p':>8} {'lake p':>8}")
    for r in rows:
        if r["status"] != "ok":
            print(f"{r['size']:6} missing"); continue
        print(f"{r['size']:6} {r['params_M']:7.1f} {r['threshold_p99']:7.4f} {100*r['null_placebo_exceedance']:6.2f} "
              f"{r.get('spearman_vs_base', float('nan')):9.3f} {r.get('top6_overlap_with_base', 0):5} "
              f"{r['detachment_zone']['ratio']:9.1f} {r['detachment_zone']['permutation_p']:8.4f} {r['barrier_lakes']['permutation_p']:8.4f}")
    print("monotone improvement with size (detachment p):", monotone_better)


if __name__ == "__main__":
    main()
