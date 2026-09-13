#!/usr/bin/env python3
"""M98 채점 — OlmoEarth 와 Galileo 를 같은 자로 비교한다.

두 가족의 임베딩 벡터는 비교할 수 없다(차원도 공간도 다르다). 비교 가능한 것은
**같은 계약에서 나온 창 순위**, 그리고 그 순위가 **제3자가 그린 폴리곤**에 얼마나 얹히는가다.

묻는 것 셋:
  1) Galileo 도 UNOSAT 발원지를 가리키는가 (우연 대비)
  2) 두 가족의 순위가 서로 일치하는가 (같은 것을 보고 있는가)
  3) Galileo 안에서도 크기가 무관한가 (M96 이 한 가족의 성질이었는지)
"""
from __future__ import annotations
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from scipy.stats import spearmanr
from shapely.geometry import box

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT

OUT = REPO_ROOT / "artifacts/cross_family"
GDB = REPO_ROOT / ".ext/unosat/FL20260826NPL.gdb"
RNG = np.random.default_rng(20260913)
DRAWS = 200_000

ARMS = [
    ("olmoearth", "nano", "source_radar_scan_o19_v1_nano", 1.4),
    ("olmoearth", "tiny", "source_radar_scan_o19_v1_tiny", 6.2),
    ("olmoearth", "base", "source_radar_scan_o19", 89.0),
    ("olmoearth", "large", "source_radar_scan_o19_v1_large", 307.8),
    ("galileo", "nano", "galileo_scan_o19_nano", None),
    ("galileo", "tiny", "galileo_scan_o19_tiny", None),
    ("galileo", "base", "galileo_scan_o19_base", None),
    # 단위 판정 대조군: Galileo 도 S1 단위를 문서화하지 않으므로 linear 도 돌려
    # 어느 쪽이 계약에 맞는지 데이터가 판정하게 한다 (M97 과 같은 방법).
    ("galileo", "base-linear", "galileo_scan_o19_base/linear", None),
]
REFERENCE = ("olmoearth", "base")


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

    rows, fracs = [], {}
    for family, size, dirname, params in ARMS:
        rep_p = ARTIFACT_ROOT / dirname / "report.json"
        if not rep_p.exists():
            rows.append({"family": family, "size": size, "status": "missing"}); continue
        rep = json.loads(rep_p.read_text())
        frac = {w["id"]: w["candidate_token_frac"] for w in rep["windows"] if w["status"] == "ranked"}
        fracs[(family, size)] = frac
        g = windows[windows["id"].isin(frac)].reset_index(drop=True)
        scores = np.array([frac[i] for i in g["id"]]); order = np.argsort(-scores)
        flagged = np.zeros(len(g), bool); flagged[order[:6]] = True
        area = g.geometry.area.values
        row = {"family": family, "size": size, "status": "ok",
               "params_M": params, "embedding_dim": rep.get("embedding_dim"),
               "threshold_p99": round(float(rep["threshold_placebo_p99"]), 4),
               "windows_ranked": int(len(g)), "top6": [g["id"][i] for i in order[:6]]}
        for key, poly in (("detachment_zone", det), ("barrier_lakes", lak)):
            inter = g.geometry.intersection(poly).area.values / area
            row[key] = {"flagged_mean_overlap": round(float(inter[flagged].mean()), 5),
                        "non_flagged_mean_overlap": round(float(inter[~flagged].mean()), 5),
                        "ratio": round(float(inter[flagged].mean() / max(inter[~flagged].mean(), 1e-9)), 1),
                        "permutation_p": round(perm_p(inter, flagged), 5)}
        rows.append(row)

    ref = fracs.get(REFERENCE)
    ref_top6 = next((r["top6"] for r in rows if r.get("status") == "ok"
                     and (r["family"], r["size"]) == REFERENCE), [])
    for r in rows:
        if r.get("status") != "ok" or ref is None:
            continue
        f = fracs[(r["family"], r["size"])]
        ids = sorted(set(f) & set(ref))
        rs, _ = spearmanr([f[i] for i in ids], [ref[i] for i in ids])
        r["spearman_vs_olmo_base"] = round(float(rs), 3)
        r["top6_overlap_with_olmo_base"] = len(set(r["top6"]) & set(ref_top6))

    ok = [r for r in rows if r.get("status") == "ok"]
    gal = [r for r in ok if r["family"] == "galileo"]
    rep = {
        "schema": "cross-family-v1", "measurement_id": "M98",
        "question": "Does a second multimodal GeoFM family, on the identical contract, point at the same externally mapped source?",
        "contract": "orbit 19 descending, identical cubes, identical 3v1 structure and placebo p99 per model",
        "reference": "olmoearth base",
        "arms": rows,
        "reading": {
            "galileo_arms_clearing_external_test": sum(
                1 for r in gal if r["detachment_zone"]["permutation_p"] < 0.05),
            "galileo_arms_total": len(gal),
            "note": ("Embeddings are not comparable across families; only the window ranking and its "
                     "agreement with a third-party polygon are."),
        },
        "claim_boundary": ("Two families, one event, 56 windows, 6 flagged per arm, and a yardstick with only "
                           "4+4 touching windows. Radar-only — the optical-plus-radar fusion of M95 is not "
                           "tested here. Not damage, not risk."),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "report.json").write_text(json.dumps(rep, indent=1) + "\n")

    print(f"{'family':10} {'size':6} {'dim':>5} {'thr':>8} {'rho vs OE-base':>15} {'top6∩':>6} {'det ratio':>10} {'det p':>8} {'lake p':>8}")
    for r in rows:
        if r.get("status") != "ok":
            print(f"{r['family']:10} {r['size']:6}  missing"); continue
        print(f"{r['family']:10} {r['size']:6} {str(r['embedding_dim'] or '-'):>5} {r['threshold_p99']:8.4f} "
              f"{r.get('spearman_vs_olmo_base', float('nan')):15.3f} {r.get('top6_overlap_with_olmo_base', 0):6} "
              f"{r['detachment_zone']['ratio']:10.1f} {r['detachment_zone']['permutation_p']:8.4f} "
              f"{r['barrier_lakes']['permutation_p']:8.4f}")
    print(f"\nGalileo arms clearing the external test: "
          f"{rep['reading']['galileo_arms_clearing_external_test']}/{rep['reading']['galileo_arms_total']}")


if __name__ == "__main__":
    main()
