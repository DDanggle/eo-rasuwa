#!/usr/bin/env python3
"""M88 — 동결 외부 라벨과 40 m 토큰 규모 대조 (M86의 '다음 관문').

M86은 창(2.56 km) 규모에서 무판별이었다(비리드 기저율 87.8%). 여기서는 같은 동결 벡터 라벨
(IWM·TASA·JAXA 합집합, 2026-08-31 봉인본 그대로)을 각 판독 가능 창의 64×64 토큰(40 m) 격자에
래스터화해, OlmoEarth Δ_event 가 라벨 토큰을 비라벨 토큰보다 높게 매기는지 AUROC 로 잰다.

사전 등록 판정(결과 보기 전):
  - pooled token AUROC(유효 토큰 전체) ≥ 0.60 → "토큰 규모에서 라벨과 정합" (검토 순위 지지)
  - ≤ 0.50 → 토큰 규모에서도 무판별/불합 → 네팔 축 음성으로 기록
  - 부차: 창별 AUROC 분포, 라벨 토큰 기저율, 고전 |Δ밴드| 없음(이 스크립트는 Δz 단독).
한계: 라벨은 홍수 '대리'(피해 확정 아님)이고 발표 수일 내 제작물이라 자체 오류 가능. 40 m 토큰 vs
벡터 경계의 정합 오차(기하 보정·일반화) 존재. 이것은 피해 판정이 아니라 순위-라벨 정합 측정이다.
"""
from __future__ import annotations
import json, hashlib
from datetime import UTC, datetime
from pathlib import Path
import numpy as np
import fiona
from shapely.geometry import shape, box
from shapely.ops import transform as shp_transform, unary_union
from shapely.prepared import prep
from pyproj import Transformer
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from nepal_paths import ARTIFACT_ROOT, REPO_ROOT
TO_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32645", always_xy=True).transform
LABEL_ROOT = ARTIFACT_ROOT / "external_data/nepal_olmo_live_v1/external_labels_20260831"
DELTAS = ARTIFACT_ROOT / "corridor_s2_candidates/embed_scan_v2/deltas"
SCAN = ARTIFACT_ROOT / "corridor_s2_candidates/embed_scan_v2/report.json"
OUT = REPO_ROOT / "artifacts/external_label_score"
VECTOR_LABELS = {
    "iwm_planetscope_vap02": LABEL_ROOT / "IWM_2026_08_26_Nepal_Flood_VAP02/IWM_2026_08_26_Nepal_Flood_VAP02.shp",
    "tasa_formosat5_0816_0828": LABEL_ROOT / "Affected_Flood_in_Rasuwa_District_Nepal/Affected_0816_0828.shp",
    "jaxa_alos2_fldext_20260828": LABEL_ROOT / "JAXA_20250828_FPM_ALOS2_Nepal_FLDEXT/JAXA_20250828_FPM_ALOS2_Nepal_FLDEXT/2026-00033-WLD_202608280620_FLDEXT.geojson",
}
def load_vector(path: Path):
    geoms = []
    with fiona.open(path) as src:
        crs = (src.crs.get("init") or str(src.crs)).lower() if src.crs else "epsg:4326"
        for feat in src:
            g = shape(feat["geometry"])
            if "32645" not in crs:
                g = shp_transform(TO_UTM, g)
            if not g.is_valid: g = g.buffer(0)
            geoms.append(g)
    return unary_union(geoms)

def auroc(s, y):
    s=np.asarray(s,float); y=np.asarray(y)
    if y.sum()==0 or (y==0).sum()==0: return None
    u,inv,c=np.unique(s,return_inverse=True,return_counts=True); start=np.zeros(len(u)); start[1:]=np.cumsum(c)[:-1]
    r=start[inv]+(c[inv]+1)/2; npos=int(y.sum()); nneg=len(y)-npos
    return float((r[y==1].sum()-npos*(npos+1)/2)/(npos*nneg))

def main():
    labels = {k: load_vector(p) for k, p in VECTOR_LABELS.items()}
    union = prep(unary_union(list(labels.values())))
    scan = json.loads(SCAN.read_text())
    ranked = [w for w in scan["windows"] if w.get("status") == "ranked"]
    S_all, Y_all, rows = [], [], []
    for w in ranked:
        f = DELTAS / f"{w['id']}_delta.npz"
        if not f.exists(): continue
        d = np.load(f); de = d["d_event"]; v = d["valid_event"]; b = d["bounds_utm"]
        x0, y0, x1, y1 = [float(x) for x in b]; n = de.shape[0]; step = (x1 - x0) / n
        # 토큰 중심이 라벨 합집합 안이면 양성 (40 m 토큰 vs 벡터 경계 — 중심점 규칙, 사전 등록)
        xs = x0 + (np.arange(n) + 0.5) * step; ys = y1 - (np.arange(n) + 0.5) * step
        lab = np.zeros((n, n), bool)
        for i, yy in enumerate(ys):
            for j, xx in enumerate(xs):
                if v[i, j] and union.contains(box(xx-1, yy-1, xx+1, yy+1).centroid):
                    lab[i, j] = True
        s = de[v]; y = lab[v]
        a = auroc(s, y)
        rows.append({"id": w["id"], "rank": w.get("rank"), "valid_tokens": int(v.sum()), "label_token_frac": float(y.mean()) if len(y) else None, "token_auroc": a})
        S_all.append(s); Y_all.append(y)
    S = np.concatenate(S_all); Y = np.concatenate(Y_all)
    pooled = auroc(S, Y)
    per = [r["token_auroc"] for r in rows if r["token_auroc"] is not None]
    rep = {"schema": "external-label-token-score-v1", "measurement_id": "M88",
           "generated_at_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "preregistered_rule": "pooled token AUROC >=0.60 supports the ranking at 40 m; <=0.50 records the Nepal axis as indeterminate/negative at token scale",
           "claim_boundary": "rank-vs-proxy-label agreement at 40 m; labels are flood proxies frozen as published; not damage confirmation",
           "windows_scored": len(rows), "tokens_scored": int(len(Y)), "label_token_base_rate": float(Y.mean()),
           "pooled_token_auroc": pooled,
           "per_window_auroc_median": float(np.median(per)) if per else None,
           "per_window_auroc_iqr": [float(np.percentile(per,25)), float(np.percentile(per,75))] if per else None,
           "windows_auroc_above_060": sum(1 for a in per if a >= 0.60), "windows_with_auroc": len(per),
           "windows": rows}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "token_report.json").write_text(json.dumps(rep, indent=1))
    print(json.dumps({k: rep[k] for k in rep if k != "windows"}, indent=1))
if __name__ == "__main__":
    main()
