#!/usr/bin/env python3
"""회랑 변화-벡터 검색(GPU1) — 상위 후보의 변화 방향을 질의로 27창 전체 토큰을 검색함.

사전 등록:
  - 토큰 변화 벡터 v = z_post(08-27) − z_base(07-03·07-23·08-07), 768-d (frozen OlmoEarth v1, 40 m 토큰)
  - 질의 q = v2 순위 상위 3창의 "후보 토큰"(Δ_event > placebo p99, 유효) 변화 벡터 평균
  - 점수 s = cos(q, v) 를 모든 창·모든 유효 토큰에 대해 계산 (placebo 쪽 v_pl = z_0812 − z_base 도 같은 q로 채점 → 대조)
  - 창 순위 = 유효 토큰 중 s > placebo-s p99 비율. 라벨: "similar change (S2-only, unsealed)".
  - 이것은 '같은 종류의 변화가 또 어디 있나'이지 산사태 확정이 아님.
"""
from __future__ import annotations
import argparse, json, os, time
from datetime import datetime
from pathlib import Path
from nepal_paths import ARTIFACT_ROOT
MODEL_BANDS = ["B02","B03","B04","B08","B05","B06","B07","B8A","B11","B12","B01","B09"]
PATCH, CROP = 4, 64

def main():
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "1": raise SystemExit("CUDA_VISIBLE_DEVICES must be 1")
    import numpy as np, torch
    from olmoearth_pretrain_minimal import ModelID
    from rslearn.models.olmoearth_pretrain.model import OlmoEarth
    from rslearn.train.model_context import ModelContext, RasterImage
    ap = argparse.ArgumentParser()
    ap.add_argument("--inp", type=Path, default=ARTIFACT_ROOT / "corridor_s2_candidates/prepare")
    ap.add_argument("--v2", type=Path, default=ARTIFACT_ROOT / "corridor_s2_candidates/embed_v2")
    ap.add_argument("--out", type=Path, default=ARTIFACT_ROOT / "corridor_s2_candidates/retrieval")
    a = ap.parse_args(); a.out.mkdir(parents=True, exist_ok=True)
    device = torch.device("cuda"); torch.cuda.set_device(0)
    wrapper = OlmoEarth(patch_size=PATCH, model_id=ModelID.OLMOEARTH_V1_BASE, token_pooling=True,
                        use_legacy_timestamps=False, normalize=True, autocast_dtype="bfloat16").to(device).eval()
    def embed_stack(cube, times):
        H = cube.shape[-1]; n = H // CROP
        feat = torch.empty((768, H//PATCH, H//PATCH), dtype=torch.float32)
        for iy in range(n):
            for ix in range(n):
                y0, x0 = iy*CROP, ix*CROP
                image = torch.from_numpy(np.ascontiguousarray(cube[:, :, y0:y0+CROP, x0:x0+CROP])).to(device)
                inp = {"sentinel2_l2a": RasterImage(image=image, timestamps=[(t,t) for t in times])}
                wrapper.normalizer(inp, {}); ctx = ModelContext(inputs=[inp], metadatas=[])
                sample, present, _ = wrapper._prepare_modality_inputs(ctx)
                with torch.no_grad(), torch.amp.autocast("cuda", dtype=torch.bfloat16):
                    out = wrapper.model(sample, fast_pass=False, patch_size=PATCH); tm = out["tokens_and_masks"]
                    m = (tm.sentinel2_l2a_mask != 2).unsqueeze(-1)
                    pooled = (tm.sentinel2_l2a * m).sum(dim=(3,4)) / m.sum(dim=(3,4)).clamp(min=1)
                    f = pooled[0].permute(2,0,1).float().cpu()
                feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH] = f
        return feat
    rep = json.load(open(a.v2/"report.json")); thr = rep["threshold_placebo_p99"]
    ranked = sorted([w for w in rep["windows"] if w.get("status")=="ranked"], key=lambda w: w["rank"])
    top_ids = [w["id"] for w in ranked[:3]]
    t0=time.time(); V={}; VP={}; VAL={}; VALP={}
    for f in sorted(f for f in a.inp.glob("*.npz") if f.stem[0] in "wv"):
        d = np.load(f); cube = d["cube"].astype("float32"); times=[datetime.fromisoformat(str(x)) for x in d["dates"]]
        zb = embed_stack(cube[:,0:3], times[0:3]); zp = embed_stack(cube[:,4:5], times[4:5]); zl = embed_stack(cube[:,3:4], times[3:4])
        V[f.stem] = (zp - zb); VP[f.stem] = (zl - zb)
        dd = np.load(a.v2/f"{f.stem}_delta.npz"); VAL[f.stem] = dd["valid_event"]; VALP[f.stem] = dd["valid_placebo"]
        np.save(a.out/f"{f.stem}_v.npy", V[f.stem].numpy().astype("float16"))
        print(f.stem, "embedded", flush=True)
    # 질의: 상위 3창의 후보 토큰 변화벡터 평균
    qs=[]
    for wid in top_ids:
        dd = np.load(a.v2/f"{wid}_delta.npz"); cand = (dd["d_event"] > thr) & dd["valid_event"]
        v = V[wid].permute(1,2,0)[torch.from_numpy(cand)]  # (n,768)
        if len(v): qs.append(v)
    q = torch.cat(qs).mean(0); q = q / q.norm().clamp(min=1e-8)
    print("query tokens:", sum(len(x) for x in qs), "from", top_ids, flush=True)
    def score(v): 
        vn = v / v.norm(dim=0).clamp(min=1e-8); return (vn * q[:,None,None]).sum(0).numpy()
    rows=[]; pl_scores=[]
    for wid in V:
        s = score(V[wid]); sp = score(VP[wid]); np.savez_compressed(a.out/f"{wid}_sim.npz", sim_event=s.astype("float32"), sim_placebo=sp.astype("float32"))
        pl_scores.append(sp[VALP[wid]]); rows.append({"id":wid, "s":s, "sp":sp})
    pl_pool = np.concatenate(pl_scores); s_thr = float(np.quantile(pl_pool, 0.99))
    out=[]
    for r in rows:
        v = VAL[r["id"]]; frac = float((r["s"][v] > s_thr).mean()) if v.mean() >= 0.2 else None
        out.append({"id": r["id"], "similar_token_frac": frac, "sim_mean": float(r["s"][v].mean()) if v.any() else None,
                    "status": "ranked" if frac is not None else "unobservable"})
    rk = sorted([o for o in out if o["status"]=="ranked"], key=lambda o: -o["similar_token_frac"])
    for i,o in enumerate(rk): o["rank"] = i+1
    json.dump({"schema":"corridor-change-retrieval-v1","query_windows":top_ids,"threshold_sim_placebo_p99":s_thr,
               "claim":"similar change to the top candidates · S2-only · unsealed · not a landslide label",
               "windows":out, "top10":rk[:10], "elapsed_s": round(time.time()-t0,1)}, open(a.out/"report.json","w"), indent=1)
    print("SIM_THRESHOLD", s_thr); [print(o["rank"], o["id"], round(o["similar_token_frac"],3)) for o in rk[:10]]; print("DONE")
if __name__ == "__main__": main()
