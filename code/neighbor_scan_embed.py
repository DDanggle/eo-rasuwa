#!/usr/bin/env python3
"""이웃 하천 확장 스캔 — 2단계: frozen OlmoEarth 임베딩 → Δ_event/Δ_placebo → 자체 p99 순위.

corridor_s2_candidates_embed.py(v2)와 같은 수식·마스크 규칙을 CPU/MPS에서 돌리는 판.
(GPU 서버 없이 로컬 재현 가능하도록 device 자동 선택, autocast는 CUDA에서만.)
확장 창(n###)은 자체 placebo 풀의 p99로만 순위를 매기며, 봉인된 6-리드 퍼널과 무관하다.
"""
from __future__ import annotations
import argparse, json, time
from datetime import datetime
from pathlib import Path

from nepal_paths import ARTIFACT_ROOT

MODEL_BANDS = ["B02","B03","B04","B08","B05","B06","B07","B8A","B11","B12","B01","B09"]
PATCH, CROP = 4, 64

def main():
    import numpy as np, torch
    from rslearn.models.olmoearth_pretrain.model import OlmoEarth, ModelID
    from rslearn.train.model_context import ModelContext, RasterImage
    from olmoearth_pretrain.data.normalize import Normalizer, Strategy
    from olmoearth_pretrain.data.constants import Modality
    s2_spec = Modality.get("sentinel2_l2a")
    normalizer = Normalizer(Strategy.COMPUTED, std_multiplier=2)
    def normalize_cube(cube):  # (12,T,H,W) → 정규화 float32
        x = np.transpose(cube, (1, 2, 3, 0))            # (T,H,W,12)
        x = normalizer.normalize(s2_spec, x)
        return np.transpose(x, (3, 0, 1, 2)).astype("float32")
    ap = argparse.ArgumentParser()
    ap.add_argument("--inp", type=Path, default=ARTIFACT_ROOT / "neighbor_scan/prepare")
    ap.add_argument("--out", type=Path, default=ARTIFACT_ROOT / "neighbor_scan/embed")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--prefix", default="n")
    a = ap.parse_args(); a.out.mkdir(parents=True, exist_ok=True)
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print("device:", device, flush=True)
    wrapper = OlmoEarth(patch_size=PATCH, model_id=ModelID.OLMOEARTH_V1_BASE, token_pooling=True,
                        use_legacy_timestamps=False, autocast_dtype=None).to(device).eval()

    def embed_stack(cube, times):  # (12,T,256,256) float32 → (768,64,64)
        H = cube.shape[-1]; n = H // CROP
        feat = torch.empty((768, H//PATCH, H//PATCH), dtype=torch.float32)
        for iy in range(n):
            for ix in range(n):
                y0, x0 = iy*CROP, ix*CROP
                image = torch.from_numpy(np.ascontiguousarray(cube[:, :, y0:y0+CROP, x0:x0+CROP])).to(device)
                inp = {"sentinel2_l2a": RasterImage(image=image, timestamps=[(t, t) for t in times])}
                ctx = ModelContext(inputs=[inp], metadatas=[])
                sample, present, _ = wrapper._prepare_modality_inputs(ctx)
                with torch.no_grad():
                    out = wrapper.model(sample, fast_pass=False, patch_size=PATCH)
                    tm = out["tokens_and_masks"]
                    m = (tm.sentinel2_l2a_mask != 2).unsqueeze(-1)
                    pooled = (tm.sentinel2_l2a * m).sum(dim=(3,4)) / m.sum(dim=(3,4)).clamp(min=1)
                    f = pooled[0].permute(2,0,1).float().cpu()
                feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH] = f
        return feat

    def delta(za, zb):
        num = (za*zb).sum(0); return (1 - num/(za.norm(dim=0).clamp(min=1e-8)*zb.norm(dim=0).clamp(min=1e-8))).numpy()

    files = sorted(f for f in a.inp.glob("*.npz") if f.stem.startswith(a.prefix))
    if a.limit: files = files[:a.limit]
    print("windows", len(files), flush=True)
    rows = []; pl_all = []
    t0 = time.time()
    for f in files:
        outp = a.out / f"{f.stem}_delta.npz"
        d = np.load(f); cube = normalize_cube(d["cube"]); dates = [str(x) for x in d["dates"]]
        times = [datetime.fromisoformat(x) for x in dates]
        if outp.exists():
            dd = np.load(outp)
            d_ev, d_pl, valid_ev, valid_pl = dd["d_event"], dd["d_placebo"], dd["valid_event"], dd["valid_placebo"]
        else:
            z_base = embed_stack(cube[:, 0:3], times[0:3]); z_pl = embed_stack(cube[:, 3:4], times[3:4]); z_post = embed_stack(cube[:, 4:5], times[4:5])
            d_ev = delta(z_base, z_post).astype("float32"); d_pl = delta(z_base, z_pl).astype("float32")
            b02 = d["cube"].astype("float32")[0]
            tok = lambda arr: arr.reshape(64,4,64,4).mean(axis=(1,3))
            bright_base = np.mean([tok(b02[i] > 2600) for i in range(3)], axis=0)
            valid_ev = (bright_base <= 0.5) & (tok(b02[4] > 2600) <= 0.5)
            valid_pl = (bright_base <= 0.5) & (tok(b02[3] > 2600) <= 0.5)
            np.savez_compressed(outp, d_event=d_ev, d_placebo=d_pl, valid_event=valid_ev, valid_placebo=valid_pl,
                                bounds_utm=d["bounds_utm"], center=d["center"])
        pl_all.append(d_pl[valid_pl])
        rows.append({"id": f.stem, "center_lonlat": d["center"].tolist(), "bounds_utm": d["bounds_utm"].tolist(),
                     "valid_event_frac": float(valid_ev.mean()),
                     "d_event_mean": float(d_ev[valid_ev].mean()) if valid_ev.any() else None,
                     "d_placebo_mean": float(d_pl[valid_pl].mean()) if valid_pl.any() else None})
        print(f.stem, "valid", round(rows[-1]["valid_event_frac"],2), "Δev", rows[-1]["d_event_mean"], flush=True)
    import numpy as np2
    pl_pool = np2.concatenate(pl_all) if pl_all else np2.array([])
    thr = float(np2.quantile(pl_pool, 0.99)) if len(pl_pool) else None
    for r in rows:
        dd = np.load(a.out / f"{r['id']}_delta.npz"); v = dd["valid_event"]; de = dd["d_event"]
        r["candidate_token_frac"] = float((de[v] > thr).mean()) if (thr is not None and v.any()) else None
        r["status"] = "ranked" if (r["valid_event_frac"] >= 0.2 and r["candidate_token_frac"] is not None) else "unobservable"
        if r["status"] == "unobservable": r["candidate_token_frac"] = None
    ranked = sorted([r for r in rows if r["status"] == "ranked"], key=lambda r: -r["candidate_token_frac"])
    for i, r in enumerate(ranked): r["rank"] = i + 1
    report = {"schema": "neighbor-scan-v1", "claim": "candidate change only · S2-only · neighbor-river extension · separate from the sealed 6-lead funnel",
              "threshold_placebo_p99": thr, "placebo_tokens": int(len(pl_pool)), "windows": rows,
              "elapsed_s": round(time.time() - t0, 1), "device": str(device)}
    (a.out / "report.json").write_text(json.dumps(report, indent=1))
    print("THRESHOLD", thr, "ranked", len(ranked), "elapsed", report["elapsed_s"], flush=True)

if __name__ == "__main__":
    main()
