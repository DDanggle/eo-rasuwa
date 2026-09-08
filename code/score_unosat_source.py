#!/usr/bin/env python3
"""M94. 레이더 순위를 UNOSAT 이 지도화한 발원 폴리곤에 대고 채점한다.

배경: M92/M93 의 국소 군집 주장은 우리가 정한 '발원지 추정 지점' 한 점(85.5194, 28.2765)
까지의 거리로 만들어졌다. 그 점은 우리 것이므로 순환 논증의 위험이 있다.

2026-09-04~05 에 UNOSAT 이 이 사건의 **detachment zone**(Landsat-9, 1.96 km²)과
**barrier lakes**(Cartosat-3 08-28, 0.31 km²)를 발표했다. 제3자가 독립적으로 지도화한
폴리곤이므로, 우리 순위를 여기에 대면 외부 대조가 된다.

계약 (실행 전 고정):
  - UNOSAT 레이어를 발표본 그대로 동결한다. 순위·문턱은 손대지 않는다.
  - 창 = 2.56 km 실제 footprint(중심점이 아니라 면). 폴리곤과의 면적 교차로 판정.
  - 통계 = permutation: 같은 개수의 창을 무작위로 뽑아 교차 면적/거리가 이만큼
    극단적일 확률.
주장 경계: 교차는 '이 창이 검토 대상인 이유가 있다'까지다. 피해량도, 인과도 아니다.
UNOSAT 레이어 자체도 현장 검증 전(FieldValidation = 0)이다.
"""
from __future__ import annotations
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely.geometry import box

from nepal_paths import REPO_ROOT

RNG = np.random.default_rng(20260908)
DRAWS = 200_000
OUT = REPO_ROOT / "artifacts/external_source_score"
LAYERS = {
    "detachment_zone": "UNOSAT_Landsat9_20260826_DetachmentZone",
    "barrier_lakes": "UNOSAT_Cartosat3_20260828_BarrierLakes",
}


def permutation_p(values: np.ndarray, flagged: np.ndarray, larger_is_extreme: bool) -> float:
    """무작위로 같은 개수를 뽑았을 때 관측 평균만큼 극단적일 확률."""
    obs = values[flagged].mean()
    n = int(flagged.sum())
    idx = RNG.integers(0, len(values), size=(DRAWS, n))
    draws = values[idx].mean(axis=1)
    hits = (draws >= obs) if larger_is_extreme else (draws <= obs)
    return float((hits.sum() + 1) / (DRAWS + 1))


def main() -> None:
    gdb = Path(__file__).parent.parent / ".ext/unosat/FL20260826NPL.gdb"
    if not gdb.exists():
        raise SystemExit(f"UNOSAT geodatabase not found at {gdb}; see docs for the HDX download")

    foot = json.loads((Path(__file__).parent / "source_radar_windows.json").read_text())
    windows = gpd.GeoDataFrame(
        {"id": [w["id"] for w in foot]},
        geometry=[box(*w["bounds_utm"]) for w in foot], crs=32645)
    win_area = windows.geometry.area.values

    report = json.loads((REPO_ROOT / "artifacts/source_radar_scan/report_o19.json").read_text())
    frac = {w["id"]: w["candidate_token_frac"] for w in report["windows"] if w["status"] == "ranked"}
    ranked = windows[windows["id"].isin(frac)].reset_index(drop=True)
    ranked_area = ranked.geometry.area.values
    scores = np.array([frac[i] for i in ranked["id"]])
    # 깃발 = M92 기준과 같다: 자기 평시쌍을 넘은 창 (여기서는 상위 6개 = 같은 개수)
    order = np.argsort(-scores)
    flagged = np.zeros(len(ranked), dtype=bool)
    flagged[order[:6]] = True

    result = {
        "schema": "external-source-score-v1", "measurement_id": "M94",
        "question": "Do the radar-flagged windows intersect the polygons a third party mapped as the source, more than chance?",
        "labels_frozen": {
            "provider": "UNOSAT / UNITAR",
            "event_code": "FL20260826NPL",
            "licence": "CC-BY-SA-4.0",
            "hdx_updated": "2026-09-04",
            "field_validation": "FieldValidation = 0 in the source attributes — UNOSAT has not ground-verified these either",
        },
        "ranking_unchanged": True, "windows_ranked": int(len(ranked)), "windows_flagged": 6,
        "layers": {},
    }

    for key, layer in LAYERS.items():
        poly = gpd.read_file(gdb, layer=layer).to_crs(32645).union_all()
        inter = ranked.geometry.intersection(poly).area.values / ranked_area
        dist = ranked.geometry.distance(poly).values / 1000.0
        touching = inter > 0
        result["layers"][key] = {
            "unosat_layer": layer,
            "area_km2": round(poly.area / 1e6, 3),
            "windows_touching": int(touching.sum()),
            "flagged_touching": int((touching & flagged).sum()),
            "non_flagged_touching": int((touching & ~flagged).sum()),
            "flagged_mean_overlap_frac": round(float(inter[flagged].mean()), 5),
            "non_flagged_mean_overlap_frac": round(float(inter[~flagged].mean()), 5),
            "flagged_mean_km": round(float(dist[flagged].mean()), 2),
            "non_flagged_mean_km": round(float(dist[~flagged].mean()), 2),
            "all_windows_mean_km": round(float(dist.mean()), 2),
            "permutation_p_overlap": round(permutation_p(inter, flagged, True), 5),
            "permutation_p_distance": round(permutation_p(dist, flagged, False), 5),
            "per_window": [
                {"id": ranked["id"][i], "rank": int(np.where(order == i)[0][0]) + 1,
                 "candidate_token_frac": round(float(scores[i]), 4),
                 "overlap_frac": round(float(inter[i]), 4), "km": round(float(dist[i]), 2)}
                for i in order[:10]
            ],
        }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "report.json").write_text(json.dumps(result, indent=1) + "\n")
    for k, v in result["layers"].items():
        print(f"== {k}  ({v['area_km2']} km2)")
        print(f"   flagged touching {v['flagged_touching']}/6 · non-flagged {v['non_flagged_touching']}/{len(ranked)-6}")
        print(f"   mean overlap  flagged {v['flagged_mean_overlap_frac']}  vs non-flagged {v['non_flagged_mean_overlap_frac']}")
        print(f"   mean distance flagged {v['flagged_mean_km']} km  vs non-flagged {v['non_flagged_mean_km']} km")
        print(f"   permutation p  overlap {v['permutation_p_overlap']}   distance {v['permutation_p_distance']}")


if __name__ == "__main__":
    main()
