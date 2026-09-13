#!/usr/bin/env python3
"""M97. 입력 단위를 틀렸을 때 실패가 얼마나 조용한가 — M75 의 재현과 정량화.

배경: 2026-08-30 에 Sentinel-1 결과를 발표했다가 철회했다(M75). 원인은 Planetary Computer 의
RTC 자산이 **linear power** 인데 모델 정규화기가 **dB** 를 전제한다는 것이었고, 어디에도
그 단위가 적혀 있지 않았다. 예외도 경고도 없이 통과했기 때문에 발표 전까지 몰랐다.

이 실험은 같은 계약(궤도 19)·같은 큐브·같은 모델에 **단위만 바꿔** 넣어 두 가지를 잰다:
  1) 틀린 단위가 얼마나 "정상처럼" 보이는가 (실패의 조용함)
  2) 그 결과가 실제로 얼마나 틀리는가 (외부 폴리곤 대비 점수 붕괴)

Galileo(nasaharvest) 의 src/data/dataset.py 에도 S1 단위 표기가 없고 같은 Normalizer 패턴을
쓴다 — 이 함정은 한 모델의 문제가 아닐 수 있다. 그래서 수치가 필요하다.
"""
from __future__ import annotations
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from scipy.stats import spearmanr
from shapely.geometry import box

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT

OUT = REPO_ROOT / "artifacts/unit_contract_probe"
GDB = REPO_ROOT / ".ext/unosat/FL20260826NPL.gdb"
RNG = np.random.default_rng(20260913)
DRAWS = 200_000
ARMS = [("db", "source_radar_scan_o19"), ("linear", "source_radar_scan_o19_linear")]


def perm_p(values: np.ndarray, flagged: np.ndarray) -> float:
    obs = values[flagged].mean(); n = int(flagged.sum())
    draws = values[RNG.integers(0, len(values), size=(DRAWS, n))].mean(axis=1)
    return float((draws >= obs).sum() + 1) / (DRAWS + 1)


def main() -> None:
    foot = json.loads((Path(__file__).parent / "source_radar_windows.json").read_text())
    windows = gpd.GeoDataFrame({"id": [w["id"] for w in foot]},
                               geometry=[box(*w["bounds_utm"]) for w in foot], crs=32645)
    det = gpd.read_file(GDB, layer="UNOSAT_Landsat9_20260826_DetachmentZone").to_crs(32645).union_all()
    lak = gpd.read_file(GDB, layer="UNOSAT_Cartosat3_20260828_BarrierLakes").to_crs(32645).union_all()

    arms, fracs = {}, {}
    for unit, dirname in ARMS:
        rep = json.loads((ARTIFACT_ROOT / dirname / "report.json").read_text())
        frac = {w["id"]: w["candidate_token_frac"] for w in rep["windows"] if w["status"] == "ranked"}
        fracs[unit] = frac
        g = windows[windows["id"].isin(frac)].reset_index(drop=True)
        scores = np.array([frac[i] for i in g["id"]]); order = np.argsort(-scores)
        flagged = np.zeros(len(g), bool); flagged[order[:6]] = True
        area = g.geometry.area.values
        row = {
            "unit": unit, "input_unit_recorded": rep["input_unit"],
            "windows_ranked": int(len(g)),
            "threshold_p99": round(float(rep["threshold_placebo_p99"]), 4),
            "mean_d_event": round(float(np.mean([w["d_event_mean"] for w in rep["windows"]
                                                 if w["d_event_mean"] is not None])), 4),
            "top6": [g["id"][i] for i in order[:6]],
            # "정상처럼 보이는가" 의 대리 지표들 — 전부 평범해 보이면 조용한 실패다
            "looks_normal": {
                "no_exception": True,
                "all_windows_ranked": int(len(g)) == 56,
                "scores_in_plausible_range": bool(0.0 < scores.max() < 0.5),
                "threshold_in_plausible_range": bool(0.0 < rep["threshold_placebo_p99"] < 0.5),
            },
        }
        for key, poly in (("detachment_zone", det), ("barrier_lakes", lak)):
            inter = g.geometry.intersection(poly).area.values / area
            row[key] = {
                "flagged_mean_overlap": round(float(inter[flagged].mean()), 5),
                "non_flagged_mean_overlap": round(float(inter[~flagged].mean()), 5),
                "ratio": round(float(inter[flagged].mean() / max(inter[~flagged].mean(), 1e-9)), 1),
                "permutation_p": round(perm_p(inter, flagged), 5),
            }
        arms[unit] = row

    ids = sorted(set(fracs["db"]) & set(fracs["linear"]))
    rs, ps = spearmanr([fracs["db"][i] for i in ids], [fracs["linear"][i] for i in ids])
    overlap = len(set(arms["db"]["top6"]) & set(arms["linear"]["top6"]))

    rep = {
        "schema": "unit-contract-probe-v1", "measurement_id": "M97",
        "question": "When the input unit is wrong, how loudly does it fail — and how wrong is the answer?",
        "contract": "orbit 19 descending, identical cubes, identical model (OlmoEarth v1 Base), only the unit changes",
        "arms": arms,
        "agreement_between_units": {
            "spearman": round(float(rs), 3), "p": float(ps),
            "top6_overlap": overlap,
            "reading": f"the two unit choices agree on {overlap} of 6 top windows",
        },
        "how_silent": ("The wrong unit raises no exception, ranks all 56 windows, and produces scores and a "
                       "threshold inside the same plausible range as the correct unit. Nothing in the output "
                       "signals the error. This is what made M75 publishable before it was caught."),
        "claim_boundary": ("One contract, one model, one event. This measures the silence of the failure and the "
                           "size of the resulting error here; it does not establish how large the error would be "
                           "on other tasks. Not damage, not risk."),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "report.json").write_text(json.dumps(rep, indent=1) + "\n")

    print(f"{'unit':7} {'thr':>7} {'meanD':>7} {'det ratio':>9} {'det p':>8} {'lake p':>8}  top6")
    for u in ("db", "linear"):
        a = arms[u]
        print(f"{u:7} {a['threshold_p99']:7.4f} {a['mean_d_event']:7.4f} "
              f"{a['detachment_zone']['ratio']:9.1f} {a['detachment_zone']['permutation_p']:8.4f} "
              f"{a['barrier_lakes']['permutation_p']:8.4f}  {','.join(a['top6'])}")
    print(f"\nrank agreement between units: Spearman {rs:.3f} (p={ps:.3g}), top6 overlap {overlap}/6")
    print("silent?", json.dumps(arms["linear"]["looks_normal"]))


if __name__ == "__main__":
    main()
