#!/usr/bin/env python3
"""이웃 하천 확장 — pooled three-pair 승격 (본선 M82와 같은 계약, CPU/MPS).

  event : base{07-03,07-23,08-07} → 08-27   (1단계 embed의 d_event 재사용)
  P1    : 같은 base → 08-12                  (1단계 embed의 d_placebo 재사용)
  P2    : base{06-03,06-18,07-03} → 07-23
  P3    : base{05-19,06-03,06-18} → 07-03
임계 = 이웃 269창의 P1∪P2∪P3 유효 토큰 p99 (pooled).
"""
from __future__ import annotations
import json, time
from datetime import datetime
from pathlib import Path

from nepal_paths import ARTIFACT_ROOT

PATCH, CROP = 4, 64
NB = ARTIFACT_ROOT / "neighbor_scan"

def main():
    import numpy as np, torch
    from rslearn.models.olmoearth_pretrain.model import OlmoEarth, ModelID
    from rslearn.train.model_context import ModelContext, RasterImage
    from olmoearth_pretrain.data.normalize import Normalizer, Strategy
    from olmoearth_pretrain.data.constants import Modality
    s2_spec = Modality.get("sentinel2_l2a")
    normalizer = Normalizer(Strategy.COMPUTED, std_multiplier=2)
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    out_dir = NB / "pooled3"; out_dir.mkdir(exist_ok=True)
    wrapper = OlmoEarth(patch_size=PATCH, model_id=ModelID.OLMOEARTH_V1_BASE, token_pooling=True,
                        use_legacy_timestamps=False, autocast_dtype=None).to(device).eval()

    def norm(cube):  # (12,T,H,W) uint→norm float32
        x = np.transpose(cube.astype("float32"), (1, 2, 3, 0))
        return np.transpose(normalizer.normalize(s2_spec, x), (3, 0, 1, 2)).astype("float32")

    def embed_stack(cube, times):
        H = cube.shape[-1]; n = H // CROP
        feat = torch.empty((768, H // PATCH, H // PATCH), dtype=torch.float32)
        for iy in range(n):
            for ix in range(n):
                y0, x0 = iy * CROP, ix * CROP
                image = torch.from_numpy(np.ascontiguousarray(cube[:, :, y0:y0+CROP, x0:x0+CROP])).to(device)
                inp = {"sentinel2_l2a": RasterImage(image=image, timestamps=[(t, t) for t in times])}
                ctx = ModelContext(inputs=[inp], metadatas=[])
                sample, _, _ = wrapper._prepare_modality_inputs(ctx)
                with torch.no_grad():
                    tm = wrapper.model(sample, fast_pass=False, patch_size=PATCH)["tokens_and_masks"]
                    m = (tm.sentinel2_l2a_mask != 2).unsqueeze(-1)
                    f = ((tm.sentinel2_l2a * m).sum(dim=(3, 4)) / m.sum(dim=(3, 4)).clamp(min=1))[0].permute(2, 0, 1).float().cpu()
                feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH] = f
        return feat

    def delta(za, zb):
        num = (za * zb).sum(0)
        return (1 - num / (za.norm(dim=0).clamp(min=1e-8) * zb.norm(dim=0).clamp(min=1e-8))).numpy().astype("float32")

    tok = lambda arr: arr.reshape(64, 4, 64, 4).mean(axis=(1, 3))
    rows = []; pools = {"P1": [], "P2": [], "P3": []}
    t0 = time.time()
    files = sorted((NB / "prepare").glob("n*.npz"))
    for f in files:
        wid = f.stem
        early_f = NB / "prepare_early" / f.name
        emb_f = NB / "embed" / f"{wid}_delta.npz"
        if not early_f.exists() or not emb_f.exists():
            continue
        outp = out_dir / f"{wid}_pooled.npz"
        d_main = np.load(f); d_early = np.load(early_f); d_emb = np.load(emb_f)
        raw = {str(x): d_main["cube"][:, i] for i, x in enumerate(d_main["dates"])}
        raw.update({str(x): d_early["cube"][:, i] for i, x in enumerate(d_early["dates"])})
        need = ["2026-05-19", "2026-06-03", "2026-06-18", "2026-07-03", "2026-07-23"]
        if any(k not in raw for k in need):
            continue
        if outp.exists():
            dd = np.load(outp)
            d2, v2, d3, v3 = dd["d_P2"], dd["v_P2"], dd["d_P3"], dd["v_P3"]
        else:
            def stack(dates):
                cube = np.stack([raw[k] for k in dates], axis=1)  # (12,T,H,W)
                return norm(cube), [datetime.fromisoformat(k) for k in dates]
            zb2, tb2 = stack(["2026-06-03", "2026-06-18", "2026-07-03"])
            zt2, tt2 = stack(["2026-07-23"])
            zb3, tb3 = stack(["2026-05-19", "2026-06-03", "2026-06-18"])
            zt3, tt3 = stack(["2026-07-03"])
            d2 = delta(embed_stack(zb2, tb2), embed_stack(zt2, tt2))
            d3 = delta(embed_stack(zb3, tb3), embed_stack(zt3, tt3))
            bright = {k: tok(raw[k][0].astype("float32") > 2600) for k in need}
            v2 = (np.mean([bright[k] for k in ("2026-06-03", "2026-06-18", "2026-07-03")], axis=0) <= 0.5) & (bright["2026-07-23"] <= 0.5)
            v3 = (np.mean([bright[k] for k in ("2026-05-19", "2026-06-03", "2026-06-18")], axis=0) <= 0.5) & (bright["2026-07-03"] <= 0.5)
            np.savez_compressed(outp, d_P2=d2, v_P2=v2, d_P3=d3, v_P3=v3)
        p1, vp1 = d_emb["d_placebo"], d_emb["valid_placebo"]
        pools["P1"].append(p1[vp1]); pools["P2"].append(d2[v2]); pools["P3"].append(d3[v3])
        rows.append({"id": wid, "center_lonlat": d_emb["center"].tolist(), "bounds_utm": d_emb["bounds_utm"].tolist(),
                     "event_valid_frac": float(d_emb["valid_event"].mean())})
        print(wid, "P2v", round(float(v2.mean()), 2), "P3v", round(float(v3.mean()), 2), flush=True)

    import numpy as np2
    pool_all = np2.concatenate([np2.concatenate(v) for v in pools.values() if v])
    thr = float(np2.quantile(pool_all, 0.99))
    thr_each = {k: float(np2.quantile(np2.concatenate(v), 0.99)) for k, v in pools.items() if v}
    for r in rows:
        d_emb = np.load(NB / "embed" / f"{r['id']}_delta.npz")
        v, de = d_emb["valid_event"], d_emb["d_event"]
        r["candidate_frac_pooled3"] = float((de[v] > thr).mean()) if v.any() else None
        r["status"] = "ranked" if (r["event_valid_frac"] >= 0.2 and r["candidate_frac_pooled3"] is not None) else "unobservable"
        if r["status"] == "unobservable": r["candidate_frac_pooled3"] = None
    ranked = sorted([r for r in rows if r["status"] == "ranked"], key=lambda x: -x["candidate_frac_pooled3"])
    for i, r in enumerate(ranked): r["rank_pooled3"] = i + 1
    rep = {"schema": "neighbor-pooled3-v1",
           "claim": "neighbor-river extension upgraded to the pooled three-pair ordinary baseline (same contract as M82); review order only",
           "threshold_pooled3_p99": thr, "threshold_each_p99": thr_each,
           "pooled_tokens": int(len(pool_all)), "windows": rows,
           "top10": [{k: r[k] for k in ("id", "rank_pooled3", "center_lonlat", "candidate_frac_pooled3", "event_valid_frac")} for r in ranked[:10]],
           "elapsed_s": round(time.time() - t0, 1), "device": str(device)}
    (out_dir / "report.json").write_text(json.dumps(rep, indent=1))
    print("THRESHOLD pooled3", thr, "each", thr_each)
    for r in ranked[:8]: print(r["rank_pooled3"], r["id"], round(r["candidate_frac_pooled3"], 3), r["center_lonlat"])
    print("DONE", len(ranked), "ranked, elapsed", rep["elapsed_s"])

if __name__ == "__main__":
    main()
