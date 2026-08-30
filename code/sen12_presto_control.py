#!/usr/bin/env python3
"""Presto 대조군 — 같은 패치·같은 시점·같은 라벨에서 Presto(픽셀 시계열 FM, 128-d) Δz AUROC 를 재고
OlmoEarth(M73/M78 report) 와 비교함. 사전 등록: OlmoEarth − Presto ≥ +0.03 인 지역 수 / 7.
  - 패치·시점 선택은 sen12_radar_value.py 와 동일(라벨 미참조, S2 clear 상위 4시점 + 같은 쪽 S1 4시점).
  - Presto 는 픽셀 단위 → 128×128 픽셀 각각 임베딩 후 4×4 평균해 32×32 토큰으로 맞춤(OlmoEarth 40 m 토큰과 동일 격자).
  - 두 팔: Presto S2-only, Presto S1+S2. dynamic_world 는 missing(class_amount), ERA5/SRTM 없음(마스크).
  - S1 은 Sen12 가 이미 dB(GEE 관행) 라 그대로 사용.
"""
from __future__ import annotations
import argparse, glob, json, os, time
from datetime import datetime
from pathlib import Path
import numpy as np, xarray as xr
S2_IN = ["B02","B03","B04","B05","B06","B07","B08","B8A","B11","B12"]
S2_PRESTO = ["B2","B3","B4","B5","B6","B7","B8","B8A","B11","B12"]
KEEP=4; CLEAR={4,5,6,7}

def auroc(s, y):
    s=np.asarray(s,float); y=np.asarray(y)
    if y.sum()==0 or (y==0).sum()==0: return None
    u,inv,c=np.unique(s,return_inverse=True,return_counts=True); start=np.zeros(len(u)); start[1:]=np.cumsum(c)[:-1]
    r=start[inv]+(c[inv]+1)/2; npos=int(y.sum()); nneg=len(y)-npos
    return float((r[y==1].sum()-npos*(npos+1)/2)/(npos*nneg))

def main():
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "1": raise SystemExit("CUDA_VISIBLE_DEVICES must be 1")
    import torch
    from presto.presto import Presto
    from presto.dataops.utils import construct_single_presto_input
    from presto.dataops.pipelines.dynamicworld import DynamicWorld2020_2021 as DW
    ap=argparse.ArgumentParser()
    ap.add_argument("--regions", nargs="+", default=["hokkaido","hiroshima","dominicamaria","italy","itogon","usa_alaska","usa_puertorico"])
    ap.add_argument("--data-root", type=Path, default=Path("/home/work/data/sen12landslides/extracted"))
    ap.add_argument("--out", type=Path, default=Path("/home/work/data/olmoearth/artifacts/sen12_presto_control"))
    ap.add_argument("--olmo-report", type=Path, default=Path("/home/work/data/olmoearth/artifacts/sen12_radar_value/report.json"))
    ap.add_argument("--per-region", type=int, default=120)
    a=ap.parse_args(); a.out.mkdir(parents=True, exist_ok=True)
    device=torch.device("cuda"); model=Presto.load_pretrained().to(device).eval()
    olmo=json.loads(a.olmo_report.read_text())["regions"] if a.olmo_report.exists() else {}

    def embed(s2cube, s2times, s1cube=None, lat=0.0, lon=0.0):
        # s2cube: (10,T,128,128) reflectance; s1cube: (2,T,128,128) dB. → (128,32,32) token grid
        T=len(s2times); H=W=128; n=H*W
        s2=torch.from_numpy(s2cube).permute(2,3,1,0).reshape(n,T,len(S2_IN)).float()  # n,T,B
        xs=[]; ms=[]
        s1=torch.from_numpy(s1cube).permute(2,3,1,0).reshape(n,T,2).float() if s1cube is not None else None
        # construct_single_presto_input 은 픽셀 단위 → 벡터화: 한 픽셀로 마스크/매핑을 얻고 배치로 확장
        x0,m0,dw0=construct_single_presto_input(s2=s2[0], s2_bands=S2_PRESTO, s1=(s1[0] if s1 is not None else None), s1_bands=(["VV","VH"] if s1 is not None else None), normalize=True)
        # 정규화는 밴드별 선형(shift/div) + NDVI 이므로 배치에 같은 함수 적용
        from presto.dataops.pipelines.s1_s2_era5_srtm import BANDS, S1_S2_ERA5_SRTM, NORMED_BANDS, S1_BANDS, S2_BANDS, REMOVED_BANDS
        X=torch.zeros(n,T,len(BANDS))
        idx_s2=[BANDS.index(b) for b in S2_PRESTO]; X[:,:,idx_s2]=s2
        if s1 is not None: idx_s1=[BANDS.index(b) for b in S1_BANDS]; X[:,:,idx_s1]=s1
        Xn=S1_S2_ERA5_SRTM.normalize(X.reshape(n*T,len(BANDS))).reshape(n,T,len(NORMED_BANDS))
        mask=m0.unsqueeze(0).expand(n,T,len(NORMED_BANDS)).contiguous()
        dw=torch.full((n,T), float(DW.class_amount)).long()
        latlons=torch.tensor([[lat,lon]],dtype=torch.float32).expand(n,2).contiguous()
        # v2: 시점별 실제 월 (v1 은 첫 시점 월부터 연속 월로 가정 → 4시점 중 3개가 틀린 달이었음)
        months=torch.tensor([[int(t.month)-1 for t in s2times]],dtype=torch.long).expand(n,T).contiguous()
        out=torch.empty(n,128)
        with torch.no_grad():
            for i in range(0,n,4096):
                sl=slice(i,i+4096)
                out[sl]=model.encoder(Xn[sl].to(device), dynamic_world=dw[sl].to(device), latlons=latlons[sl].to(device), mask=mask[sl].to(device), month=months[sl].to(device), eval_task=True).float().cpu()
        tok=out.reshape(H,W,128).permute(2,0,1).reshape(128,32,4,32,4).mean(dim=(2,4))
        return tok
    def delta(a_,b_):
        num=(a_*b_).sum(0); return (1-num/(a_.norm(dim=0).clamp(min=1e-8)*b_.norm(dim=0).clamp(min=1e-8))).numpy()
    rep={"schema":"sen12-presto-control-v2","regions":{}}
    for region in a.regions:
        used=0; P2=[]; P12=[]; Y=[]; t0=time.time(); skipped=0
        for f in sorted(glob.glob(str(a.data_root/f"{region}_s2_*.nc"))):
            if used>=a.per_region: break
            s1f=f.replace("_s2_","_s1asc_")
            if not os.path.exists(s1f): skipped+=1; continue
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
                lat=float(at.get("lat", at.get("latitude", 0.0)) or 0.0); lon=float(at.get("lon", at.get("longitude", 0.0)) or 0.0)
                def load2(idx):
                    return np.stack([np.asarray(ds[b].values[idx],dtype="float32") for b in S2_IN],0), [times[i] for i in idx]
                c2pre,t2pre=load2(ps); c2post,t2post=load2(qs); mask=np.asarray(ds["MASK"].values[0],dtype="float32")
            with xr.open_dataset(s1f, cache=False) as d1:
                t1=[datetime.fromisoformat(str(np.datetime_as_string(t,unit="s"))) for t in np.asarray(d1["time"].values)]
                vv=np.asarray(d1["VV"].values,dtype="float32"); vh=np.asarray(d1["VH"].values,dtype="float32")
                def load1(t2, side):
                    pool=[i for i,t in enumerate(t1) if (t<ev if side=="pre" else t>=ev)]; chosen=[]
                    for tt in t2:
                        cand=sorted((i for i in pool if i not in chosen), key=lambda i: abs((t1[i]-tt).total_seconds()))
                        if not cand: return None
                        chosen.append(cand[0])
                    idx=sorted(chosen); return np.stack([vv[idx],vh[idx]],0)
                c1pre=load1(t2pre,"pre"); c1post=load1(t2post,"post")
            if c1pre is None or c1post is None: skipped+=1; continue
            zb2=embed(c2pre,t2pre,None,lat,lon); zp2=embed(c2post,t2post,None,lat,lon)
            zb12=embed(c2pre,t2pre,c1pre,lat,lon); zp12=embed(c2post,t2post,c1post,lat,lon)
            y=(mask.reshape(32,4,32,4).mean(axis=(1,3))>=0.25).astype("int8").ravel()
            P2.append(delta(zb2,zp2).ravel()); P12.append(delta(zb12,zp12).ravel()); Y.append(y); used+=1
        if not Y: rep["regions"][region]={"patches":0}; print(region,"no data",flush=True); continue
        yy=np.concatenate(Y); a2=auroc(np.concatenate(P2),yy); a12=auroc(np.concatenate(P12),yy)
        o=olmo.get(region,{}); o2=o.get("auroc_s2_only"); o12=o.get("auroc_s1s2")
        rep["regions"][region]={"patches":used,"presto_s2_only":a2,"presto_s1s2":a12,"olmo_s2_only":o2,"olmo_s1s2":o12,
                                "gap_s2":(o2-a2) if (o2 is not None and a2 is not None) else None,"gap_s1s2":(o12-a12) if (o12 is not None and a12 is not None) else None,"elapsed_s":round(time.time()-t0,1)}
        print(f"[{region}] n={used} Presto S2={a2:.3f} S1+S2={a12:.3f} | OLMo S2={o2 if o2 is None else round(o2,3)} S1+S2={o12 if o12 is None else round(o12,3)} | gap S2={(o2-a2) if o2 else float('nan'):+.3f}", flush=True)
        (a.out/"report.json").write_text(json.dumps(rep,indent=1))
    print("DONE")
if __name__=="__main__": main()
