#!/usr/bin/env python3
"""Presto 파이프라인 정합성 진단(히로시마 5패치): Presto Δ 가 고전 |ΔNDVI| 와 양의 상관인가,
라벨 토큰의 Δ 가 비라벨보다 큰가, 임베딩 분산이 살아있는가, eval_task=False(토큰 전체) 와 차이."""
import os, glob, numpy as np, xarray as xr, torch, importlib.util, sys
from pathlib import Path
sys.argv=[sys.argv[0]]
SCRIPT_DIR = Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("pc", SCRIPT_DIR / "sen12_presto_control.py"); pc=importlib.util.module_from_spec(spec); spec.loader.exec_module(pc)
from datetime import datetime
from presto.presto import Presto
from presto.dataops.pipelines.dynamicworld import DynamicWorld2020_2021 as DW
from presto.dataops.pipelines.s1_s2_era5_srtm import BANDS, S1_S2_ERA5_SRTM, NORMED_BANDS
device=torch.device("cuda"); model=Presto.load_pretrained().to(device).eval()
def emb(s2cube, month, eval_task=True):
    T=s2cube.shape[1]; n=128*128
    s2=torch.from_numpy(s2cube).permute(2,3,1,0).reshape(n,T,10).float()
    X=torch.zeros(n,T,len(BANDS)); X[:,:,[BANDS.index(b) for b in pc.S2_PRESTO]]=s2
    Xn=S1_S2_ERA5_SRTM.normalize(X.reshape(n*T,len(BANDS))).reshape(n,T,len(NORMED_BANDS))
    mask=torch.ones(n,T,len(NORMED_BANDS)); mask[:,:,[NORMED_BANDS.index(b) for b in pc.S2_PRESTO+["NDVI"]]]=0
    dw=torch.full((n,T),float(DW.class_amount)).long(); ll=torch.zeros(n,2)
    out=[]
    with torch.no_grad():
        for i in range(0,n,4096):
            sl=slice(i,i+4096); o=model.encoder(Xn[sl].to(device),dynamic_world=dw[sl].to(device),latlons=ll[sl].to(device),mask=mask[sl].to(device),month=month,eval_task=eval_task)
            out.append(o.float().cpu() if eval_task else o.mean(1).float().cpu())
    return torch.cat(out).reshape(128,128,-1)
sen12_root = Path(os.environ.get("SEN12_DATA_ROOT", "/home/work/data/sen12landslides/extracted"))
files=sorted(glob.glob(str(sen12_root / "hiroshima_s2_*.nc"))); k=0
print("Xn stats check"); 
for f in files:
    with xr.open_dataset(f) as ds:
        at=ds.attrs
        if str(at.get("annotated"))!="True" or "," in str(at.get("event_date","")): continue
        ev=datetime.fromisoformat(str(at["event_date"])); times=[datetime.fromisoformat(str(np.datetime_as_string(t,unit="s"))) for t in ds["time"].values]
        scl=ds["SCL"].values; clear=np.stack([np.isin(scl[i],[4,5,6,7]).mean() for i in range(len(times))])
        pre=[i for i,t in enumerate(times) if t<ev]; post=[i for i,t in enumerate(times) if t>=ev]
        pick=lambda idx: sorted(sorted(idx,key=lambda i:(-clear[i],i))[:4]); ps,qs=pick(pre),pick(post)
        if len(ps)<4 or len(qs)<4: continue
        L=lambda idx: np.stack([ds[b].values[idx].astype("float32") for b in pc.S2_IN],0)
        cp,cq=L(ps),L(qs); mask=ds["MASK"].values[0].astype("float32")
        if k==0: print("S2 raw range", float(cp.min()), float(cp.max()))
        zp=emb(cp,times[ps[0]].month-1); zq=emb(cq,times[qs[0]].month-1)
        d=(1-torch.nn.functional.cosine_similarity(zp,zq,dim=-1)).numpy()
        ndvi=lambda c: (c[6]-c[2])/(c[6]+c[2]+1e-6)
        cl=np.abs(ndvi(cq).mean(0)-ndvi(cp).mean(0))
        from scipy.stats import spearmanr
        y=mask>=0.5
        print(f"patch{k}: presto Δ pos {d[y].mean():.4f} neg {d[~y].mean():.4f} | classical |ΔNDVI| pos {cl[y].mean():.3f} neg {cl[~y].mean():.3f} | spearman(Δ,|ΔNDVI|)={spearmanr(d.ravel(),cl.ravel())[0]:+.3f} | emb std {zp.std().item():.3f} | pos frac {y.mean():.3f}")
        zp2=emb(cp,times[ps[0]].month-1,False); zq2=emb(cq,times[qs[0]].month-1,False); d2=(1-torch.nn.functional.cosine_similarity(zp2,zq2,dim=-1)).numpy()
        print(f"        eval_task=False: Δ pos {d2[y].mean():.4f} neg {d2[~y].mean():.4f}")
        k+=1
        if k>=5: break
