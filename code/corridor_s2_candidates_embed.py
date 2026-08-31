#!/usr/bin/env python3
"""회랑 S2-only 후보 지도 — 2단계(GPU1): 창별 frozen OlmoEarth 임베딩 → Δ_event / Δ_placebo → 후보 순위.

사전 등록 (prepare 스크립트와 동일 설계):
  base = 날짜[0:3] (07-03·07-23·08-07), placebo 표적 = 08-12, 사건 후 = 08-27
  Δ_event = 1-cos(z_base, z_post), Δ_placebo = 1-cos(z_base, z_0812), 토큰(40 m)별
  마스크: 토큰 안 밝은 픽셀(B02>2600) 비율이 base 어느 날짜든/표적 날짜에 0.5 초과면 제외
  임계 = 전 회랑 유효 placebo 토큰의 99퍼센타일. 후보 토큰 = Δ_event > 임계.
  창 순위 = 후보 토큰 비율. 판정 문구는 "candidate change (S2-only, unsealed)"까지만.
"""
from __future__ import annotations
import argparse, json, os, time
from datetime import datetime
from pathlib import Path

from nepal_paths import ARTIFACT_ROOT

MODEL_BANDS = ["B02","B03","B04","B08","B05","B06","B07","B8A","B11","B12","B01","B09"]
PATCH, CROP = 4, 64

def main():
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "1":
        raise SystemExit("refusing to run: CUDA_VISIBLE_DEVICES must be exactly 1")
    import numpy as np, torch
    from olmoearth_pretrain_minimal import ModelID
    from rslearn.models.olmoearth_pretrain.model import OlmoEarth
    from rslearn.train.model_context import ModelContext, RasterImage
    ap = argparse.ArgumentParser()
    ap.add_argument("--inp", type=Path, default=ARTIFACT_ROOT / "corridor_s2_candidates/prepare")
    ap.add_argument("--out", type=Path, default=ARTIFACT_ROOT / "corridor_s2_candidates/embed_v2")
    a = ap.parse_args(); a.out.mkdir(parents=True, exist_ok=True)
    device = torch.device("cuda"); torch.cuda.set_device(0)
    wrapper = OlmoEarth(patch_size=PATCH, model_id=ModelID.OLMOEARTH_V1_BASE, token_pooling=True,
                        use_legacy_timestamps=False, normalize=True, autocast_dtype="bfloat16").to(device).eval()

    def embed_stack(cube, times):  # cube: (12,T,256,256) float32 → (768,64,64)
        H = cube.shape[-1]; n = H // CROP
        feat = torch.empty((768, H//PATCH, H//PATCH), dtype=torch.float32)
        for iy in range(n):
            for ix in range(n):
                y0, x0 = iy*CROP, ix*CROP
                image = torch.from_numpy(np.ascontiguousarray(cube[:, :, y0:y0+CROP, x0:x0+CROP])).to(device)
                inp = {"sentinel2_l2a": RasterImage(image=image, timestamps=[(t,t) for t in times])}
                wrapper.normalizer(inp, {})
                ctx = ModelContext(inputs=[inp], metadatas=[])
                sample, present, _ = wrapper._prepare_modality_inputs(ctx)
                with torch.no_grad(), torch.amp.autocast("cuda", dtype=torch.bfloat16):
                    out = wrapper.model(sample, fast_pass=False, patch_size=PATCH)
                    tm = out["tokens_and_masks"]
                    m = (tm.sentinel2_l2a_mask != 2).unsqueeze(-1)  # MISSING=2 제외 (여기선 12밴드 전부 있음)
                    pooled = (tm.sentinel2_l2a * m).sum(dim=(3,4)) / m.sum(dim=(3,4)).clamp(min=1)
                    f = pooled[0].permute(2,0,1).float().cpu()
                feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH] = f
        return feat
    def delta(za, zb):
        num = (za*zb).sum(0); return (1 - num/(za.norm(dim=0).clamp(min=1e-8)*zb.norm(dim=0).clamp(min=1e-8))).numpy()

    files = sorted(f for f in a.inp.glob("*.npz") if f.stem[0] in "wv"); print("windows", len(files), flush=True)
    if not files: raise SystemExit("no window cubes found in " + str(a.inp))
    rows = []; ev_all=[]; pl_all=[]
    t0=time.time()
    for f in files:
        d = np.load(f); cube = d["cube"].astype("float32"); dates=[str(x) for x in d["dates"]]
        times=[datetime.fromisoformat(x) for x in dates]
        base = cube[:, 0:3]; pl = cube[:, 3:4]; post = cube[:, 4:5]
        z_base = embed_stack(base, times[0:3]); z_pl = embed_stack(pl, times[3:4]); z_post = embed_stack(post, times[4:5])
        d_ev = delta(z_base, z_post); d_pl = delta(z_base, z_pl)
        # 토큰 밝기 마스크 (B02 = band 0)
        b02 = cube[0]  # (5,256,256)
        tok = lambda arr: arr.reshape(64,4,64,4).mean(axis=(1,3))
        # v2(2026-08-29): v1은 3장 중 최대값 마스크였고 몬순 7월 장면 때문에 27창 중 12창이 유효 20% 미만이었음.
        # 모델은 스택 안 일부 구름을 견디므로 평균 밝기로 완화함. v1 결과는 embed/ 에 보존.
        bright_base = np.mean([tok(b02[i] > 2600) for i in range(3)], axis=0)
        bright_pl = tok(b02[3] > 2600); bright_post = tok(b02[4] > 2600)
        valid_ev = (bright_base <= 0.5) & (bright_post <= 0.5)
        valid_pl = (bright_base <= 0.5) & (bright_pl <= 0.5)
        np.savez_compressed(a.out/f"{f.stem}_delta.npz", d_event=d_ev.astype("float32"), d_placebo=d_pl.astype("float32"),
                            valid_event=valid_ev, valid_placebo=valid_pl, bounds_utm=d["bounds_utm"], center=d["center"])
        ev_all.append(d_ev[valid_ev]); pl_all.append(d_pl[valid_pl])
        rows.append({"id": f.stem, "center_lonlat": d["center"].tolist(), "bounds_utm": d["bounds_utm"].tolist(),
                     "valid_event_frac": float(valid_ev.mean()), "valid_placebo_frac": float(valid_pl.mean()),
                     "d_event_mean": float(d_ev[valid_ev].mean()) if valid_ev.any() else None,
                     "d_placebo_mean": float(d_pl[valid_pl].mean()) if valid_pl.any() else None,
                     "d_event_p95": float(np.quantile(d_ev[valid_ev],0.95)) if valid_ev.any() else None})
        print(f.stem, "valid_ev", round(float(valid_ev.mean()),2), "Δev", rows[-1]["d_event_mean"], "Δpl", rows[-1]["d_placebo_mean"], flush=True)
    pl_pool = np.concatenate(pl_all) if pl_all else np.array([])
    thr = float(np.quantile(pl_pool, 0.99)) if len(pl_pool) else None
    for r in rows:
        dd = np.load(a.out/f"{r['id']}_delta.npz")
        v = dd["valid_event"]; de = dd["d_event"]
        r["candidate_token_frac"] = float((de[v] > thr).mean()) if (thr is not None and v.any()) else None
        r["candidate_token_count"] = int((de[v] > thr).sum()) if (thr is not None and v.any()) else 0
    MIN_VALID = 0.2  # 유효 토큰 20% 미만 창은 순위에서 제외(v1의 빈 집합 NaN 1위 버그 수정)
    for r in rows:
        if r["valid_event_frac"] < MIN_VALID or r["candidate_token_frac"] is None or not np.isfinite(r["candidate_token_frac"]):
            r["status"] = "unobservable"; r["candidate_token_frac"] = None
        else:
            r["status"] = "ranked"
    ranked = sorted([r for r in rows if r["status"] == "ranked"], key=lambda r: -r["candidate_token_frac"])
    for i,r in enumerate(ranked): r["rank"] = i+1
    report = {"schema":"corridor-s2-candidates-v2", "mask_rule":"base mean bright<=0.5; post/placebo bright<=0.5; windows with valid<0.2 unobservable", "claim":"candidate change only · S2-only · not the sealed S1+S2 contract",
              "threshold_placebo_p99": thr, "placebo_tokens": int(len(pl_pool)), "windows": rows,
              "top10": [{k:r[k] for k in ("id","rank","center_lonlat","candidate_token_frac","d_event_mean","d_placebo_mean","valid_event_frac")} for r in ranked[:10]],
              "elapsed_s": round(time.time()-t0,1)}
    (a.out/"report.json").write_text(json.dumps(report, indent=1))
    print("THRESHOLD", thr); [print(r["rank"], r["id"], round(r["candidate_token_frac"],3), r["center_lonlat"]) for r in ranked[:10]]
    print("DONE")

if __name__ == "__main__":
    main()
