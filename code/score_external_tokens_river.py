#!/usr/bin/env python3
"""M89 — M88의 강 마스크 층화: '강을 찾는 능력'과 '변화를 찾는 능력' 분리.

강 마스크 = OSM 검증 중심선(hydrography simulation_route)을 UTM에서 반경 300 m 버퍼.
사전 등록(결과 보기 전):
  (a) 강 밖(off-river) 토큰만으로 pooled AUROC ≥0.60 이면 "강 근접성만으로 설명되지 않음".
  (b) 강 안(on-river) 토큰만의 AUROC — 강 안에서 라벨/비라벨을 가르는가.
  (c) 각 층에서 고전 |ΔNDVI| 대비 우위 유지 여부.
한계: 300 m 버퍼는 임의 폭(민감도로 150/600 m 병기), 라벨은 홍수 대리."""
import json, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from nepal_paths import ARTIFACT_ROOT, REPO_ROOT
from score_external_tokens import load_vector, auroc, VECTOR_LABELS, TO_UTM
from shapely.ops import unary_union, transform as shp_transform
from shapely.prepared import prep
from shapely.geometry import LineString, Point
DELTAS = ARTIFACT_ROOT / "corridor_s2_candidates/embed_scan_v2/deltas"
CUBES = ARTIFACT_ROOT / "corridor_s2_candidates/prepare_v2"
SCAN = ARTIFACT_ROOT / "corridor_s2_candidates/embed_scan_v2/report.json"
union = prep(unary_union([load_vector(p) for p in VECTOR_LABELS.values()]))
route = json.loads((REPO_ROOT/"web/public/data/hydrography.geojson").read_text())["simulation_route"]
line_utm = shp_transform(TO_UTM, LineString(route))
rivers = {w: prep(line_utm.buffer(w)) for w in (150, 300, 600)}
scan = json.loads(SCAN.read_text()); tok = lambda a: a.reshape(64,4,64,4).mean(axis=(1,3))
S_ai, S_nd, Y, R = [], [], [], {w: [] for w in rivers}
for w in [w for w in scan["windows"] if w.get("status")=="ranked"]:
    f=DELTAS/f"{w['id']}_delta.npz"; c=CUBES/f"{w['id']}.npz"
    if not (f.exists() and c.exists()): continue
    d=np.load(f); de=d["d_event"]; v=d["valid_event"]; b=d["bounds_utm"]
    cube=np.load(c)["cube"].astype("float32"); base=cube[:,0:3].mean(1); post=cube[:,4]
    ndvi=lambda a:(a[3]-a[2])/(a[3]+a[2]+1e-6); nd=np.abs(tok(ndvi(post))-tok(ndvi(base)))
    x0,y0,x1,y1=[float(x) for x in b]; n=64; step=(x1-x0)/n
    xs=x0+(np.arange(n)+0.5)*step; ys=y1-(np.arange(n)+0.5)*step
    lab=np.zeros((n,n),bool); riv={ww:np.zeros((n,n),bool) for ww in rivers}
    for i,yy in enumerate(ys):
        for j,xx in enumerate(xs):
            if not v[i,j]: continue
            p=Point(xx,yy)
            if union.contains(p): lab[i,j]=True
            for ww,pr in rivers.items():
                if pr.contains(p): riv[ww][i,j]=True
    S_ai.append(de[v]); S_nd.append(nd[v]); Y.append(lab[v])
    for ww in rivers: R[ww].append(riv[ww][v])
S_ai=np.concatenate(S_ai); S_nd=np.concatenate(S_nd); Y=np.concatenate(Y)
out={"schema":"external-label-token-river-strata-v1","measurement_id":"M89","tokens":int(len(Y)),
     "preregistered_rule":"off-river pooled AUROC >=0.60 means the agreement is not explained by river proximity alone; classical comparison in each stratum","strata":{}}
for ww in rivers:
    r=np.concatenate(R[ww])
    for name,mask in (("on_river",r),("off_river",~r)):
        y=Y[mask]
        out["strata"][f"{name}_{ww}m"]={"tokens":int(mask.sum()),"label_base_rate":float(y.mean()) if mask.any() else None,
            "auroc_olmo":auroc(S_ai[mask],y),"auroc_dNDVI":auroc(S_nd[mask],y)}
(REPO_ROOT/"artifacts/external_label_score/token_river_strata.json").write_text(json.dumps(out,indent=1))
for k,v in out["strata"].items(): print(k,v)
