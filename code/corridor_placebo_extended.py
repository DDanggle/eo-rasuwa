#!/usr/bin/env python3
"""평시 기준 확장(M82): 100창에 5-19·6-03·6-18 을 더해 플라시보 3쌍으로 임계를 다시 잡음.
  event : base{07-03,07-23,08-07} → 08-27
  P1    : 같은 base → 08-12            (기존)
  P2    : base{06-03,06-18,07-03} → 07-23
  P3    : base{05-19,06-03,06-18} → 07-03
임계 = P1∪P2∪P3 유효 토큰 p99 (pooled). 창별 local 임계도 기록. 결과: 순위·후보 비율 + scan_v2 순위와 Spearman.
"""
import argparse, json, os, time
from datetime import datetime
from pathlib import Path
import numpy as np
PATCH, CROP = 4, 64
def main():
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "1": raise SystemExit("CUDA_VISIBLE_DEVICES must be 1")
    import torch
    from olmoearth_pretrain_minimal import ModelID
    from rslearn.models.olmoearth_pretrain.model import OlmoEarth
    from rslearn.train.model_context import ModelContext, RasterImage
    ap=argparse.ArgumentParser(); R=Path("/home/work/data/olmoearth/artifacts/corridor_s2_candidates")
    ap.add_argument("--main", type=Path, default=R/"prepare_v2"); ap.add_argument("--early", type=Path, default=R/"prepare_v2_early")
    ap.add_argument("--scan-report", type=Path, default=R/"embed_scan_v2/report.json"); ap.add_argument("--out", type=Path, default=R/"embed_placebo_ext")
    a=ap.parse_args(); a.out.mkdir(parents=True, exist_ok=True)
    device=torch.device("cuda"); wrapper=OlmoEarth(patch_size=PATCH, model_id=ModelID.OLMOEARTH_V1_BASE, token_pooling=True, use_legacy_timestamps=False, normalize=True, autocast_dtype="bfloat16").to(device).eval()
    def embed_stack(cube, times):
        H=cube.shape[-1]; n=H//CROP; feat=torch.empty((768,H//PATCH,H//PATCH))
        for iy in range(n):
            for ix in range(n):
                y0,x0=iy*CROP,ix*CROP; image=torch.from_numpy(np.ascontiguousarray(cube[:,:,y0:y0+CROP,x0:x0+CROP])).to(device)
                inp={"sentinel2_l2a": RasterImage(image=image, timestamps=[(t,t) for t in times])}; wrapper.normalizer(inp,{})
                sample,_,_=wrapper._prepare_modality_inputs(ModelContext(inputs=[inp],metadatas=[]))
                with torch.no_grad(), torch.amp.autocast("cuda",dtype=torch.bfloat16):
                    tm=wrapper.model(sample,fast_pass=False,patch_size=PATCH)["tokens_and_masks"]; m=(tm.sentinel2_l2a_mask!=2).unsqueeze(-1)
                    f=((tm.sentinel2_l2a*m).sum(dim=(3,4))/m.sum(dim=(3,4)).clamp(min=1))[0].permute(2,0,1).float().cpu()
                feat[:,y0//PATCH:(y0+CROP)//PATCH,x0//PATCH:(x0+CROP)//PATCH]=f
        return feat
    def delta(za,zb): num=(za*zb).sum(0); return (1-num/(za.norm(dim=0).clamp(min=1e-8)*zb.norm(dim=0).clamp(min=1e-8))).numpy()
    tok=lambda arr: arr.reshape(64,4,64,4).mean(axis=(1,3))
    PAIRS={"event":(["2026-07-03","2026-07-23","2026-08-07"],"2026-08-27"),"P1":(["2026-07-03","2026-07-23","2026-08-07"],"2026-08-12"),
           "P2":(["2026-06-03","2026-06-18","2026-07-03"],"2026-07-23"),"P3":(["2026-05-19","2026-06-03","2026-06-18"],"2026-07-03")}
    rows=[]; pools={k:[] for k in PAIRS if k!="event"}; t0=time.time()
    for f in sorted(a.main.glob("v*.npz")):
        g=a.early/f.name
        if not g.exists(): continue
        d=np.load(f); e=np.load(g)
        cube={str(x):d["cube"][:,i].astype("float32") for i,x in enumerate(d["dates"])}; cube.update({str(x):e["cube"][:,i].astype("float32") for i,x in enumerate(e["dates"])})
        zc={}; 
        def z(dates):
            key=tuple(dates)
            if key not in zc: zc[key]=embed_stack(np.stack([cube[x] for x in dates],1), [datetime.fromisoformat(x) for x in dates])
            return zc[key]
        out={"id":f.stem,"center_lonlat":d["center"].tolist()}; save={}
        for k,(base,tgt) in PAIRS.items():
            dd=delta(z(base),z([tgt])); bb=np.mean([tok(cube[x][0]>2600) for x in base],axis=0); bt=tok(cube[tgt][0]>2600); valid=(bb<=0.5)&(bt<=0.5)
            save[k]=dd.astype("float32"); save[k+"_valid"]=valid; out[k+"_valid_frac"]=float(valid.mean()); out[k+"_mean"]=float(dd[valid].mean()) if valid.any() else None
            if k!="event": pools[k].append(dd[valid])
        np.savez_compressed(a.out/f"{f.stem}_delta.npz", **save); rows.append(out)
        print(f.stem, {k:(round(out[k+"_mean"],3) if out[k+"_mean"] is not None else None) for k in PAIRS}, f"{time.time()-t0:.0f}s", flush=True)
    pool_all=np.concatenate([np.concatenate(v) for v in pools.values() if v]); thr_all=float(np.quantile(pool_all,0.99))
    thr_each={k:float(np.quantile(np.concatenate(v),0.99)) for k,v in pools.items() if v}
    for r in rows:
        dd=np.load(a.out/f"{r['id']}_delta.npz"); v=dd["event_valid"]; de=dd["event"]
        r["candidate_frac_pooled3"]=float((de[v]>thr_all).mean()) if v.any() else None
        r["candidate_frac_P1only"]=float((de[v]>thr_each["P1"]).mean()) if (v.any() and "P1" in thr_each) else None
        loc=np.concatenate([dd[k][dd[k+"_valid"]] for k in ("P1","P2","P3") if dd[k+"_valid"].any()])
        r["candidate_frac_local3"]=float((de[v]>np.quantile(loc,0.99)).mean()) if (v.any() and len(loc)>50) else None
        r["status"]="ranked" if r["event_valid_frac"]>=0.2 and r["candidate_frac_pooled3"] is not None else "unobservable"
    ranked=sorted([r for r in rows if r["status"]=="ranked"], key=lambda r:-r["candidate_frac_pooled3"])
    for i,r in enumerate(ranked): r["rank_pooled3"]=i+1
    # scan_v2 순위와 비교
    sp=None
    if a.scan_report.exists():
        sv={w["id"]:w.get("candidate_token_frac") for w in json.loads(a.scan_report.read_text())["windows"]}
        xs=[(r["candidate_frac_pooled3"], sv[r["id"]]) for r in ranked if sv.get(r["id"]) is not None]
        if len(xs)>5:
            from scipy.stats import spearmanr; sp=float(spearmanr([x[0] for x in xs],[x[1] for x in xs])[0])
    rep={"schema":"corridor-placebo-extended-v1","pairs":{k:{"base":v[0],"target":v[1]} for k,v in PAIRS.items()},"threshold_pooled3_p99":thr_all,"threshold_each_p99":thr_each,
         "windows":rows,"top10":[{k:r[k] for k in ("id","rank_pooled3","center_lonlat","candidate_frac_pooled3","candidate_frac_P1only","candidate_frac_local3","event_valid_frac")} for r in ranked[:10]],
         "spearman_vs_scan_v2":sp,"ranked_windows":len(ranked)}
    (a.out/"report.json").write_text(json.dumps(rep,indent=1)); print("thr pooled3",round(thr_all,4),"each",{k:round(v,4) for k,v in thr_each.items()},"spearman",sp,"DONE",flush=True)
if __name__=="__main__": main()
