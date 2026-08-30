#!/usr/bin/env python3
"""레이더가 기여하는가 — Sen12 라벨 지역에서 S1(asc, dB)+S2 임베딩 Δz vs S2 전용 Δz 의 AUROC 를 같은 조건으로 비교함.

M68/M73 과 동일: 패치·시점 선택(S2 SCL clear 상위 4, 라벨 미참조)·라벨(토큰 MASK≥0.25)·AUROC.
S1 은 같은 패치 id 의 *_s1asc_*.nc 에서 pre/post 각각 4시점(S2 시점에 가장 가까운 것)을 고름.
S1 단위: 값이 대부분 음수면 dB 로 간주, 아니면 선형→dB(10·log10) 변환 (OlmoEarth 정규화는 dB 기대).
사전 등록 판정: S1+S2 AUROC − S2 AUROC ≥ +0.03 인 지역 수 / 전체. 0 이하가 다수면 "레이더 무기여(이 계약)".
"""
from __future__ import annotations
import argparse, glob, json, os, time
from datetime import datetime
from pathlib import Path
import numpy as np, xarray as xr
S2_BANDS = ["B02","B03","B04","B08","B05","B06","B07","B8A","B11","B12","B01","B09"]
KEEP = 4; CLEAR = {4,5,6,7}; PATCH, CROP = 4, 64

def auroc(s, y):
    s=np.asarray(s,float); y=np.asarray(y)
    if y.sum()==0 or (y==0).sum()==0: return None
    u,inv,c=np.unique(s,return_inverse=True,return_counts=True); start=np.zeros(len(u)); start[1:]=np.cumsum(c)[:-1]
    r=start[inv]+(c[inv]+1)/2; npos=int(y.sum()); nneg=len(y)-npos
    return float((r[y==1].sum()-npos*(npos+1)/2)/(npos*nneg))

def main():
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "1": raise SystemExit("CUDA_VISIBLE_DEVICES must be 1")
    import torch
    from olmoearth_pretrain_minimal import ModelID
    from rslearn.models.olmoearth_pretrain.model import MaskValue, OlmoEarth
    from rslearn.train.model_context import ModelContext, RasterImage
    ap=argparse.ArgumentParser()
    ap.add_argument("--regions", nargs="+", default=["hokkaido","hiroshima","dominicamaria","italy","indonesia","itogon","thrissur","usa_alaska","usa_puertorico"])
    ap.add_argument("--data-root", type=Path, default=Path("/home/work/data/sen12landslides/extracted"))
    ap.add_argument("--out", type=Path, default=Path("/home/work/data/olmoearth/artifacts/sen12_radar_value"))
    ap.add_argument("--per-region", type=int, default=120)
    # M80 구름 층화: post 쪽 S2 시점을 clear fraction 구간에서 고름(결과 보기 전 고정). 기본은 M78 그대로(가장 맑은 4개).
    ap.add_argument("--post-clear-min", type=float, default=None)
    ap.add_argument("--post-clear-max", type=float, default=None)
    ap.add_argument("--post-clear-target", type=float, default=None, help="post 4시점을 clear fraction 이 이 값에 가장 가까운 순으로 고름(구간 대신 목표치; 결과 보기 전 고정)")
    a=ap.parse_args(); a.out.mkdir(parents=True, exist_ok=True)
    device=torch.device("cuda"); torch.cuda.set_device(0)
    wrapper=OlmoEarth(patch_size=PATCH, model_id=ModelID.OLMOEARTH_V1_BASE, token_pooling=True, use_legacy_timestamps=False, normalize=True, autocast_dtype="bfloat16").to(device).eval()

    def embed(s2cube, s2times, s1cube=None, s1times=None):
        feat=torch.empty((768,32,32))
        for y0,x0 in ((0,0),(0,64),(64,0),(64,64)):
            inp={}
            if s2cube is not None:
                inp["sentinel2_l2a"]=RasterImage(image=torch.from_numpy(np.ascontiguousarray(s2cube[:,:,y0:y0+CROP,x0:x0+CROP])).to(device), timestamps=[(t,t) for t in s2times])
            if s1cube is not None:
                inp["sentinel1"]=RasterImage(image=torch.from_numpy(np.ascontiguousarray(s1cube[:,:,y0:y0+CROP,x0:x0+CROP])).to(device), timestamps=[(t,t) for t in s1times])
            wrapper.normalizer(inp, {}); ctx=ModelContext(inputs=[inp], metadatas=[])
            sample, present, _ = wrapper._prepare_modality_inputs(ctx)
            if s2cube is not None: sample.sentinel2_l2a_mask[..., 2] = MaskValue.MISSING.value  # B01/B09 부재
            with torch.no_grad(), torch.amp.autocast("cuda", dtype=torch.bfloat16):
                out=wrapper.model(sample, fast_pass=False, patch_size=PATCH); tm=out["tokens_and_masks"]
                key="sentinel2_l2a" if s2cube is not None else "sentinel1"
                tok=getattr(tm,key); mk=getattr(tm,key+"_mask")
                m=(mk != MaskValue.MISSING.value).unsqueeze(-1)
                pooled=(tok*m).sum(dim=(3,4))/m.sum(dim=(3,4)).clamp(min=1)
                f=pooled[0].permute(2,0,1).float().cpu()
            feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH]=f
        return feat
    def delta(a,b):
        num=(a*b).sum(0); return (1-num/(a.norm(dim=0).clamp(min=1e-8)*b.norm(dim=0).clamp(min=1e-8))).numpy()
    rep={"schema":"sen12-radar-value-v2","post_clear_band":[a.post_clear_min,a.post_clear_max],"post_clear_target":a.post_clear_target,"regions":{}}
    for region in a.regions:
        used=0; both=[]; s2only=[]; s1only=[]; s1cls=[]; Y=[]; s1_unit=None; t0=time.time(); no_s1=0; post_clear_log=[]
        for f in sorted(glob.glob(str(a.data_root/f"{region}_s2_*.nc"))):
            if used>=a.per_region: break
            s1f=f.replace("_s2_","_s1asc_")
            if not os.path.exists(s1f): no_s1+=1; continue
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
                ps=pick(pre)
                if a.post_clear_target is not None:
                    qs=sorted(sorted(post,key=lambda i:(abs(clear[i]-a.post_clear_target),i))[:KEEP])
                elif a.post_clear_min is not None or a.post_clear_max is not None:
                    lo=a.post_clear_min if a.post_clear_min is not None else -1; hi=a.post_clear_max if a.post_clear_max is not None else 2
                    band=[i for i in post if lo<=clear[i]<=hi]
                    qs=sorted(sorted(band,key=lambda i:(abs((times[i]-ev).days),i))[:KEEP])  # 사건에 가까운 순, 구름 구간 안에서
                else:
                    qs=pick(post)
                if len(ps)<KEEP or len(qs)<KEEP: continue
                post_clear_log.append(float(np.mean([clear[i] for i in qs])))
                def load2(idx):
                    bands=[np.asarray(ds[b].values[idx],dtype="float32") if b in ds else np.zeros((len(idx),128,128),dtype="float32") for b in S2_BANDS]
                    return np.stack(bands,0), [times[i] for i in idx]
                c2pre,t2pre=load2(ps); c2post,t2post=load2(qs); mask=np.asarray(ds["MASK"].values[0],dtype="float32")
            with xr.open_dataset(s1f, cache=False) as d1:
                t1=[datetime.fromisoformat(str(np.datetime_as_string(t,unit="s"))) for t in np.asarray(d1["time"].values)]
                vv=np.asarray(d1["VV"].values,dtype="float32"); vh=np.asarray(d1["VH"].values,dtype="float32")
                if s1_unit is None:
                    s1_unit = "dB" if np.nanmean(vv) < 0 else "linear"
                if s1_unit=="linear":
                    vv=10*np.log10(np.clip(vv,1e-4,None)); vh=10*np.log10(np.clip(vh,1e-4,None))
                def load1(t2, side):
                    # 같은 쪽(pre/post)의 S1 시점 중 S2 시점에 가까운 순으로 서로 다른 4개를 고름(중복 timestamp 금지)
                    pool=[i for i,t in enumerate(t1) if (t<ev if side=="pre" else t>=ev)]
                    chosen=[]
                    for tt in t2:
                        cand=sorted((i for i in pool if i not in chosen), key=lambda i: abs((t1[i]-tt).total_seconds()))
                        if not cand: return None, None
                        chosen.append(cand[0])
                    idx=sorted(chosen); return np.stack([vv[idx],vh[idx]],0), [t1[i] for i in idx]
                c1pre,t1pre=load1(t2pre,"pre"); c1post,t1post=load1(t2post,"post")
            if c1pre is None or c1post is None: no_s1+=1; continue
            zb2=embed(c2pre,t2pre); zp2=embed(c2post,t2post)
            zb12=embed(c2pre,t2pre,c1pre,t1pre); zp12=embed(c2post,t2post,c1post,t1post)
            zb1=embed(None,None,c1pre,t1pre); zp1=embed(None,None,c1post,t1post)
            # 고전 레이더: pre/post 시간 중앙값 dB 차의 절댓값(VV+VH), 4x4 토큰 평균 — 모델 없음
            lr=np.abs(np.nanmedian(c1post,axis=1)-np.nanmedian(c1pre,axis=1)).sum(0)
            lr=np.nan_to_num(lr).reshape(32,4,32,4).mean(axis=(1,3))
            y=(mask.reshape(32,4,32,4).mean(axis=(1,3))>=0.25).astype("int8").ravel()
            s2only.append(delta(zb2,zp2).ravel()); both.append(delta(zb12,zp12).ravel()); s1only.append(delta(zb1,zp1).ravel()); s1cls.append(lr.ravel()); Y.append(y); used+=1
        if not Y: rep["regions"][region]={"patches":0,"no_s1_files":no_s1}; print(region,"no data (no_s1=%d)"%no_s1, flush=True); continue
        yy=np.concatenate(Y); a2=auroc(np.concatenate(s2only),yy); a12=auroc(np.concatenate(both),yy); a1=auroc(np.concatenate(s1only),yy); ac=auroc(np.concatenate(s1cls),yy)
        rep["regions"][region]={"patches":used,"s1_unit_detected":s1_unit,"auroc_s2_only":a2,"auroc_s1s2":a12,"auroc_s1_only_olmo":a1,"auroc_s1_classical_logratio":ac,"post_clear_mean":(float(np.mean(post_clear_log)) if post_clear_log else None),"gain":(a12-a2) if (a2 is not None and a12 is not None) else None,"elapsed_s":round(time.time()-t0,1)}
        print(f"[{region}] n={used} postclear={np.mean(post_clear_log):.2f} S2-only={a2:.3f} S1+S2={a12:.3f} gain={a12-a2:+.3f} | S1-only OLMo={a1:.3f} S1 classical={ac:.3f}", flush=True)
        (a.out/"report.json").write_text(json.dumps(rep,indent=1))
    print("DONE")
if __name__=="__main__": main()
