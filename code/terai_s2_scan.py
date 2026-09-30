#!/usr/bin/env python3
"""M101. 홍수 지점 광학(S2 L2A 12밴드) 3v1 임베딩 스캔 — 레이더 M100 과 같은 창, 같은 판별 규칙.

날짜는 **창 SCL 판독**으로 골랐다(장면 구름 아님 — M99a·제주 교훈). 몬순이라 사전 맑은 날이 3~4장뿐이어서
사건 쌍 간격(예: 48/30/8일)이 레이더 36/24/12 와 다르고, 평시 쌍은 같은 간격을 못 맞춘다. 그래서 이 스캔은
회랑 S2 와 같은 등급 **"candidate change (S2-only, unsealed)"** 이며, 판별은 레이더(M100)·SCL 물 변화와 교차로만 한다.
토큰 마스크: SCL clear{4,5,6,7} 비율이 base 평균/표적에서 0.5 미만이면 무효.
"""
from __future__ import annotations
import argparse, json, os, time
from datetime import datetime
from pathlib import Path
from nepal_paths import ARTIFACT_ROOT

MODEL_BANDS = ["B02","B03","B04","B08","B05","B06","B07","B8A","B11","B12","B01","B09"]
SIZE, PATCH, CROP = 256, 4, 64
CLEAR = [4, 5, 6, 7]
CONTRACTS = {
    "s_saptari": {"measurement_id": "M101", "aois": ["saptari"],
                  "dates": ["2026-08-11", "2026-08-29", "2026-09-20", "2026-09-28"],
                  "base_event": ["2026-08-11", "2026-08-29", "2026-09-20"], "target_event": "2026-09-28",
                  "base_placebo": ["2026-08-11", "2026-08-29"], "target_placebo": "2026-09-20",
                  "out": "terai_s2_scan_saptari"},
}

def gaps(base, target):
    t = datetime.fromisoformat(target); return [(t - datetime.fromisoformat(b)).days for b in base]

def load_windows(C):
    return [w for w in json.loads((Path(__file__).parent / "terai_flood_windows.json").read_text()) if w["aoi"] in C["aois"]]

def stage_prepare(wins, C):
    import numpy as np, planetary_computer as pc, pystac_client, rasterio
    from rasterio.windows import from_bounds
    from rasterio.warp import transform_bounds
    OUT = ARTIFACT_ROOT / C["out"]; (OUT / "prepare").mkdir(parents=True, exist_ok=True)
    for k, v in {"GDAL_HTTP_TIMEOUT": "60", "GDAL_HTTP_CONNECTTIMEOUT": "30", "GDAL_HTTP_MAX_RETRY": "3"}.items(): os.environ.setdefault(k, v)
    cat = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
    centers = {a: next(w for w in wins if w["aoi"] == a)["center_lonlat"] for a in C["aois"]}
    raw = {}
    for a, pt in centers.items():
        for d in C["dates"]:
            its = list(cat.search(collections=["sentinel-2-l2a"], intersects={"type": "Point", "coordinates": pt}, datetime=f"{d}T00:00:00Z/{d}T23:59:59Z").items())
            if not its: raise SystemExit(f"no S2 for {a} {d}")
            raw[(a, d)] = sorted(its, key=lambda x: x.properties.get("eo:cloud_cover", 100))[0]
    signed, at = {}, [0.0]
    def fresh(k):
        if time.time() - at[0] > 1500:
            for kk, v in raw.items(): signed[kk] = pc.sign(v)
            at[0] = time.time(); print("resigned", flush=True)
        return signed[k]
    for w in wins:
        out = OUT / "prepare" / f"{w['id']}.npz"
        if out.exists(): print(w["id"], "cached", flush=True); continue
        cube = np.zeros((12, len(C["dates"]), SIZE, SIZE), dtype="uint16"); scl = np.zeros((len(C["dates"]), SIZE, SIZE), dtype="uint8")
        for ti, d in enumerate(C["dates"]):
            for bi, b in enumerate(MODEL_BANDS + ["SCL"]):
                for attempt in range(4):
                    try:
                        it = fresh((w["aoi"], d))
                        with rasterio.open(it.assets[b].href) as ds:
                            bb = transform_bounds(f"EPSG:{w['epsg']}", ds.crs, *w["bounds_utm"])
                            arr = ds.read(1, window=from_bounds(*bb, transform=ds.transform), out_shape=(SIZE, SIZE), boundless=True, fill_value=0)
                        break
                    except Exception as e:
                        if attempt == 3: raise
                        print("retry", w["id"], d, b, type(e).__name__, flush=True); at[0] = 0.0; time.sleep(5 * (attempt + 1))
                if b == "SCL": scl[ti] = arr
                else: cube[bi, ti] = np.clip(arr, 0, 65535)
        np.savez_compressed(out, cube=cube, scl=scl, dates=np.array(C["dates"]), bounds_utm=np.array(w["bounds_utm"]), epsg=w["epsg"], center=np.array(w["center_lonlat"]), aoi=w["aoi"])
        print(w["id"], "ok", flush=True)

def stage_embed(C):
    import numpy as np, torch
    from rslearn.models.olmoearth_pretrain.model import OlmoEarth, ModelID
    from rslearn.train.model_context import ModelContext, RasterImage
    from olmoearth_pretrain.data.normalize import Normalizer, Strategy
    from olmoearth_pretrain.data.constants import Modality
    # 서버 rslearn 의 OlmoEarth 래퍼에는 normalize= 인자가 없다(회랑 스크립트 시절과 버전 차). 레이더 스캔과 같은 방식으로
    # olmoearth_pretrain 의 Normalizer 를 직접 쓴다. 밴드 순서는 모델 spec 과 대조한다.
    spec = Modality.get("sentinel2_l2a"); normalizer = Normalizer(Strategy.COMPUTED, std_multiplier=2)
    assert list(spec.band_order) == MODEL_BANDS, f"band order mismatch: {spec.band_order}"
    OUT = ARTIFACT_ROOT / C["out"]; (OUT / "embed").mkdir(parents=True, exist_ok=True)
    BE, TE, BP, TP = C["base_event"], C["target_event"], C["base_placebo"], C["target_placebo"]
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    wrapper = OlmoEarth(patch_size=PATCH, model_id=ModelID.OLMOEARTH_V1_BASE, token_pooling=True, use_legacy_timestamps=False, autocast_dtype=None).to(device).eval()
    print("device", device, "bands", spec.band_order, flush=True)
    def norm(cube):   # (12,T,H,W) DN → 정규화 float32
        x = np.transpose(cube, (1, 2, 3, 0))
        return np.transpose(normalizer.normalize(spec, x), (3, 0, 1, 2)).astype("float32")
    def embed(cube, times):
        cube = norm(cube)
        H = cube.shape[-1]; n = H // CROP; feat = None
        for iy in range(n):
            for ix in range(n):
                y0, x0 = iy * CROP, ix * CROP
                image = torch.from_numpy(np.ascontiguousarray(cube[:, :, y0:y0+CROP, x0:x0+CROP])).to(device)
                inp = {"sentinel2_l2a": RasterImage(image=image, timestamps=[(t, t) for t in times])}
                sample, _, _ = wrapper._prepare_modality_inputs(ModelContext(inputs=[inp], metadatas=[]))
                with torch.no_grad():
                    tm = wrapper.model(sample, fast_pass=False, patch_size=PATCH)["tokens_and_masks"]
                    m = (tm.sentinel2_l2a_mask != 2).unsqueeze(-1)
                    f = ((tm.sentinel2_l2a * m).sum(dim=(3, 4)) / m.sum(dim=(3, 4)).clamp(min=1))[0].permute(2, 0, 1).float().cpu()
                if feat is None: feat = torch.empty((f.shape[0], H // PATCH, H // PATCH), dtype=torch.float32)
                feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH] = f
        return feat
    def delta(za, zb):
        num = (za * zb).sum(0); return (1 - num / (za.norm(dim=0).clamp(min=1e-8) * zb.norm(dim=0).clamp(min=1e-8))).numpy().astype("float32")
    tok = lambda a: a.reshape(64, 4, 64, 4).mean(axis=(1, 3))
    rows, pool = [], []; t0 = time.time()
    for f in sorted((OUT / "prepare").glob("*.npz")):
        d = np.load(f); dates = [str(x) for x in d["dates"]]; cube = d["cube"].astype("float32"); scl = d["scl"]
        ix = {k: i for i, k in enumerate(dates)}
        st = lambda ds: (cube[:, [ix[k] for k in ds]], [datetime.fromisoformat(k) for k in ds])
        d_ev = delta(embed(*st(BE)), embed(*st([TE]))); d_pl = delta(embed(*st(BP)), embed(*st([TP])))
        clear = {k: tok(np.isin(scl[ix[k]], CLEAR).astype("float32")) for k in dates}
        v_ev = (np.mean([clear[k] for k in BE], axis=0) >= 0.5) & (clear[TE] >= 0.5)
        v_pl = (np.mean([clear[k] for k in BP], axis=0) >= 0.5) & (clear[TP] >= 0.5)
        water = {k: float((scl[ix[k]] == 6).mean()) for k in dates}
        np.savez_compressed(OUT / "embed" / f"{f.stem}_delta.npz", d_event=d_ev, d_placebo=d_pl, valid_event=v_ev, valid_placebo=v_pl)
        pool.append(d_pl[v_pl])
        rows.append({"id": f.stem, "aoi": str(d["aoi"]), "center_lonlat": d["center"].tolist(), "valid_event_frac": float(v_ev.mean()),
                     "d_event_mean": float(d_ev[v_ev].mean()) if v_ev.any() else None, "d_placebo_mean": float(d_pl[v_pl].mean()) if v_pl.any() else None,
                     "scl_water_frac": water, "scl_water_delta": water[TE] - float(np.mean([water[k] for k in BE]))})
        print(f.stem, "valid", round(rows[-1]["valid_event_frac"], 2), "Δev", None if rows[-1]["d_event_mean"] is None else round(rows[-1]["d_event_mean"], 3), "Δwater", round(rows[-1]["scl_water_delta"], 3), flush=True)
    pool_all = np.concatenate([p for p in pool if len(p)]); thr = float(np.quantile(pool_all, 0.99))
    for r in rows:
        dd = np.load(OUT / "embed" / f"{r['id']}_delta.npz"); v, de = dd["valid_event"], dd["d_event"]
        r["candidate_token_frac"] = float((de[v] > thr).mean()) if v.any() else None
        r["status"] = "ranked" if (r["valid_event_frac"] >= 0.2 and r["candidate_token_frac"] is not None) else "unobservable"
    ranked = sorted([r for r in rows if r["status"] == "ranked"], key=lambda r: -r["candidate_token_frac"])
    for i, r in enumerate(ranked): r["rank"] = i + 1
    med = float(np.median([r["d_event_mean"] for r in ranked]))
    for r in ranked: r["excess_over_median"] = r["d_event_mean"] - med
    rep = {"schema": "terai-s2-scan-v1", "measurement_id": C["measurement_id"], "grade": "candidate change (S2-only, unsealed): placebo gaps do not match the event pair",
           "dates": C["dates"], "event_pair": {"base": BE, "target": TE, "gaps": gaps(BE, TE)}, "placebo_pair": {"base": BP, "target": TP, "gaps": gaps(BP, TP)},
           "threshold_placebo_p99": thr, "placebo_tokens": int(len(pool_all)), "regional_median_d_event": med, "windows": rows, "elapsed_s": round(time.time() - t0, 1)}
    (OUT / "report.json").write_text(json.dumps(rep, indent=1)); print("THRESHOLD", thr, "ranked", len(ranked))
    for r in ranked[:8]: print(r["rank"], r["id"], round(r["candidate_token_frac"], 3), "excess", round(r["excess_over_median"], 3), "Δwater", round(r["scl_water_delta"], 3))
    print("wrote", OUT / "report.json")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--stage", choices=["prepare", "embed", "all"], default="all"); ap.add_argument("--contract", default="s_saptari")
    a = ap.parse_args(); C = CONTRACTS[a.contract]; wins = load_windows(C)
    print("contract", a.contract, C["measurement_id"], "windows", len(wins), "event gaps", gaps(C["base_event"], C["target_event"]), "placebo gaps", gaps(C["base_placebo"], C["target_placebo"]), flush=True)
    if a.stage in ("prepare", "all"): stage_prepare(wins, C)
    if a.stage in ("embed", "all"): stage_embed(C)

if __name__ == "__main__": main()
