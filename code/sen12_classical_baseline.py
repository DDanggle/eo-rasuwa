#!/usr/bin/env python3
"""AI 없이 같은 문제를 풀면? — 고전적 밴드 변화(classical change) 기준선을 M68과 동일 조건으로 측정함.

M68(frozen OlmoEarth Δz)과 같은 패치·같은 pre/post 시점 선택·같은 라벨(토큰 MASK ≥0.25)·같은 지표(AUROC).
고전 Δ = 토큰(4x4 px)별로 pre 4시점 평균과 post 4시점 평균의 정규화 밴드(10개) 절대차 평균.
추가로 SWIR/NIR 지수 변화(|ΔNDVI|+|ΔNBR|) 변형도 같이 냄. 라벨은 채점에만 씀. GPU 불필요.
판정: 지역별 AUROC를 M68의 AI AUROC와 나란히 보고. 사전 등록: AI가 고전보다 +0.05 이상이면 "AI 우위".
"""
from __future__ import annotations
import argparse, glob, json, os, time
from datetime import datetime
from pathlib import Path
import numpy as np, xarray as xr
BANDS = ["B02","B03","B04","B08","B05","B06","B07","B8A","B11","B12"]
KEEP = 4; CLEAR = {4,5,6,7}

def auroc(s, y):
    s=np.asarray(s,float); y=np.asarray(y)
    if y.sum()==0 or (y==0).sum()==0: return None
    u,inv,c=np.unique(s,return_inverse=True,return_counts=True); start=np.zeros(len(u)); start[1:]=np.cumsum(c)[:-1]
    r=start[inv]+(c[inv]+1)/2; npos=int(y.sum()); nneg=len(y)-npos
    return float((r[y==1].sum()-npos*(npos+1)/2)/(npos*nneg))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--regions", nargs="+", default=["hokkaido","hiroshima","dominicamaria","italy","indonesia","itogon","thrissur","usa_alaska","usa_puertorico"])
    ap.add_argument("--data-root", type=Path, default=Path("/home/work/data/sen12landslides/extracted"))
    ap.add_argument("--ai", type=Path, default=Path("/home/work/data/olmoearth/artifacts/sen12_event_delta_all/report.json"))
    ap.add_argument("--out", type=Path, default=Path("/home/work/data/olmoearth/artifacts/sen12_classical_baseline"))
    ap.add_argument("--per-region", type=int, default=120)
    a=ap.parse_args(); a.out.mkdir(parents=True, exist_ok=True)
    ai=json.load(open(a.ai))["regions"] if a.ai.exists() else {}
    rep={"schema":"sen12-classical-baseline-v1","regions":{}}
    for region in a.regions:
        used=0; S1=[]; S2=[]; Y=[]; t0=time.time()
        for f in sorted(glob.glob(str(a.data_root/f"{region}_s2_*.nc"))):
            if used>=a.per_region: break
            with xr.open_dataset(f, cache=False) as ds:
                at=ds.attrs
                if str(at.get("annotated"))!="True" or not at.get("event_date") or "," in str(at["event_date"]): continue
                try: conf=float(at.get("date_confidence") or 0)
                except ValueError: continue
                if conf<0.999: continue
                ev=datetime.fromisoformat(str(at["event_date"]))
                times=[datetime.fromisoformat(str(np.datetime_as_string(t,unit="s"))) for t in np.asarray(ds["time"].values)]
                scl=np.asarray(ds["SCL"].values); clear=np.stack([np.isin(scl[i],list(CLEAR)).mean() for i in range(len(times))])
                pre=[i for i,t in enumerate(times) if t<ev]; post=[i for i,t in enumerate(times) if t>=ev]
                pick=lambda idx: sorted(sorted(idx,key=lambda i:(-clear[i],i))[:KEEP])
                ps,qs=pick(pre),pick(post)
                if len(ps)<KEEP or len(qs)<KEEP: continue
                cube=np.stack([np.asarray(ds[b].values,dtype="float32") for b in BANDS],0)/10000.0  # (10,T,H,W)
                mask=np.asarray(ds["MASK"].values[0],dtype="float32")
            pre_m=cube[:,ps].mean(1); post_m=cube[:,qs].mean(1)                      # (10,H,W)
            d_band=np.abs(post_m-pre_m).mean(0)                                        # (H,W)
            def ndvi(x): return (x[3]-x[2])/np.clip(x[3]+x[2],1e-3,None)
            def nbr(x): return (x[3]-x[9])/np.clip(x[3]+x[9],1e-3,None)
            d_idx=np.abs(ndvi(post_m)-ndvi(pre_m))+np.abs(nbr(post_m)-nbr(pre_m))
            tok=lambda arr: arr.reshape(32,4,32,4).mean(axis=(1,3))
            y=(tok(mask)>=0.25).astype("int8")
            S1.append(tok(d_band).ravel()); S2.append(tok(d_idx).ravel()); Y.append(y.ravel()); used+=1
        if not Y: rep["regions"][region]={"patches":0}; print(region,"no data"); continue
        yy=np.concatenate(Y); a1=auroc(np.concatenate(S1),yy); a2=auroc(np.concatenate(S2),yy)
        ai_auroc=(ai.get(region) or {}).get("pooled_auroc")
        rep["regions"][region]={"patches":used,"classical_band_auroc":a1,"classical_index_auroc":a2,"ai_auroc":ai_auroc,
                                "ai_minus_best_classical": (ai_auroc-max(a1,a2)) if (ai_auroc is not None and a1 is not None) else None,
                                "elapsed_s":round(time.time()-t0,1)}
        print(f"[{region}] n={used} classical band={a1:.3f} index={a2:.3f} | AI={ai_auroc} | AI-best={rep['regions'][region]['ai_minus_best_classical']}", flush=True)
    (a.out/"report.json").write_text(json.dumps(rep,indent=1)); print("DONE")
if __name__=="__main__": main()
