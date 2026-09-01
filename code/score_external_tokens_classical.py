#!/usr/bin/env python3
"""M88 부속 — 같은 토큰·같은 라벨에서 고전 |ΔNDVI|·|Δ밴드| AUROC (AI 없이 되는지 대조)."""
import json, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from nepal_paths import ARTIFACT_ROOT, REPO_ROOT
from score_external_tokens import load_vector, auroc, VECTOR_LABELS
from shapely.ops import unary_union
from shapely.prepared import prep
from shapely.geometry import box
DELTAS = ARTIFACT_ROOT / "corridor_s2_candidates/embed_scan_v2/deltas"
CUBES = ARTIFACT_ROOT / "corridor_s2_candidates/prepare_v2"
SCAN = ARTIFACT_ROOT / "corridor_s2_candidates/embed_scan_v2/report.json"
union = prep(unary_union([load_vector(p) for p in VECTOR_LABELS.values()]))
scan = json.loads(SCAN.read_text()); tok = lambda a: a.reshape(64,4,64,4).mean(axis=(1,3))
S_ai, S_nd, S_bd, Y = [], [], [], []
for w in [w for w in scan["windows"] if w.get("status")=="ranked"]:
    f=DELTAS/f"{w['id']}_delta.npz"; c=CUBES/f"{w['id']}.npz"
    if not (f.exists() and c.exists()): continue
    d=np.load(f); de=d["d_event"]; v=d["valid_event"]; b=d["bounds_utm"]
    cube=np.load(c)["cube"].astype("float32")  # (12,5,256,256) B02,B03,B04,B08,...
    base=cube[:,0:3].mean(1); post=cube[:,4]
    ndvi=lambda a:(a[3]-a[2])/(a[3]+a[2]+1e-6)
    nd=np.abs(tok(ndvi(post))-tok(ndvi(base)))
    bd=tok(np.abs(post-base).mean(0))/3000.0
    x0,y0,x1,y1=[float(x) for x in b]; n=64; step=(x1-x0)/n
    xs=x0+(np.arange(n)+0.5)*step; ys=y1-(np.arange(n)+0.5)*step
    lab=np.zeros((n,n),bool)
    for i,yy in enumerate(ys):
        for j,xx in enumerate(xs):
            if v[i,j] and union.contains(box(xx-1,yy-1,xx+1,yy+1).centroid): lab[i,j]=True
    S_ai.append(de[v]); S_nd.append(nd[v]); S_bd.append(bd[v]); Y.append(lab[v])
Y=np.concatenate(Y)
out={"schema":"external-label-token-classical-v1","tokens":int(len(Y)),"base_rate":float(Y.mean()),
     "auroc_olmo_delta":auroc(np.concatenate(S_ai),Y),"auroc_abs_dNDVI":auroc(np.concatenate(S_nd),Y),"auroc_abs_band_diff":auroc(np.concatenate(S_bd),Y)}
(REPO_ROOT/"artifacts/external_label_score/token_classical.json").write_text(json.dumps(out,indent=1)); print(json.dumps(out,indent=1))
