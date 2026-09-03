#!/usr/bin/env python3
"""발원지 권역 S1 레이더 확장 스캔 (M92) — 같은 궤도(121 desc)만 쓰는 3v1 계약.

배경: 발원지는 8/27 이후 광학이 계속 구름·눈에 막혀 판독 불가다. 8/31 pass는
5개 앵커를 다 덮지 못해 봉인된 s1_live 계약으로는 쓸 수 없지만(스와스 경계),
회랑 스캔 창 중 56개는 그 안에 든다. 레이더는 구름을 뚫으므로 그 56창에 대해
광학과 같은 구조의 변화 순위를 만들 수 있다.

계약 (실행 전 고정):
  궤도    : relative_orbit 121, descending, 전부 00:10 UTC — 궤도 혼합 금지
  event   : base{07-26, 08-07, 08-19} → 08-31
  placebo : base{07-02, 07-14, 07-26} → 08-19   (모두 사건 전)
  입력    : RTC gamma0 VV·VH → **dB 변환** (10*log10). RTC 자산은 선형 power이며
            선형값을 그대로 넣는 것이 M75 철회의 원인이었다.
  마스크  : nodata(-32768) 또는 비유한 값이 토큰 안 50% 초과면 제외
  임계    : placebo 유효 토큰의 p99 (이 실험 자체 풀)
주장 경계: 광학 6-리드 퍼널과 별개 목록. 피해·위험이 아니라 검토 순서.
"""
from __future__ import annotations
import argparse, json, time
from datetime import datetime
from pathlib import Path

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT

ORBIT = 121
DATES = ["2026-07-02", "2026-07-14", "2026-07-26", "2026-08-07", "2026-08-19", "2026-08-31"]
BASE_EVENT = ["2026-07-26", "2026-08-07", "2026-08-19"]
TARGET_EVENT = "2026-08-31"
BASE_PLACEBO = ["2026-07-02", "2026-07-14", "2026-07-26"]
TARGET_PLACEBO = "2026-08-19"
SIZE, PATCH, CROP = 256, 4, 64
OUT = ARTIFACT_ROOT / "source_radar_scan"


def stage_prepare(win_subset: list[dict]) -> None:
    """56창 × 6날짜 × VV/VH RTC 큐브(dB)를 로컬에 캐시."""
    import numpy as np, planetary_computer as pc, pystac_client, rasterio
    from rasterio.windows import from_bounds
    (OUT / "prepare").mkdir(parents=True, exist_ok=True)
    catalog = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
    items: dict[str, object] = {}
    for d in DATES:
        for attempt in range(5):
            try:
                found = [it for it in catalog.search(
                    collections=["sentinel-1-rtc"],
                    intersects={"type": "Point", "coordinates": [85.5194, 28.2765]},
                    datetime=f"{d}T00:00:00Z/{d}T23:59:59Z").items()
                    if it.properties.get("sat:relative_orbit") == ORBIT]
                break
            except Exception:
                if attempt == 4: raise
                time.sleep(8 * (attempt + 1))
        if not found:
            raise SystemExit(f"no orbit-{ORBIT} RTC for {d}")
        items[d] = pc.sign(found[0])
        print("item", d, found[0].id[:44], flush=True)

    for w in win_subset:
        out = OUT / "prepare" / f"{w['id']}.npz"
        if out.exists():
            print(w["id"], "cached", flush=True); continue
        cube = np.full((2, len(DATES), SIZE, SIZE), np.nan, dtype="float32")
        for ti, d in enumerate(DATES):
            it = items[d]
            for bi, band in enumerate(("vv", "vh")):
                with rasterio.open(it.assets[band].href) as ds:
                    win = from_bounds(*w["bounds_utm"], transform=ds.transform)
                    arr = ds.read(1, window=win, out_shape=(SIZE, SIZE), boundless=True, fill_value=-32768).astype("float32")
                arr[arr <= 0] = np.nan          # nodata & 비물리 값
                cube[bi, ti] = 10.0 * np.log10(arr)   # 선형 gamma0 → dB (M75 재발 방지)
        np.savez_compressed(out, cube=cube, dates=np.array(DATES), bounds_utm=np.array(w["bounds_utm"]),
                            center=np.array(w["center_lonlat"]), orbit=ORBIT, unit="dB")
        print(w["id"], "ok", flush=True)


def stage_embed() -> None:
    import numpy as np, torch
    from rslearn.models.olmoearth_pretrain.model import OlmoEarth, ModelID
    from rslearn.train.model_context import ModelContext, RasterImage
    from olmoearth_pretrain.data.normalize import Normalizer, Strategy
    from olmoearth_pretrain.data.constants import Modality
    spec = Modality.get("sentinel1")
    normalizer = Normalizer(Strategy.COMPUTED, std_multiplier=2)
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    (OUT / "embed").mkdir(parents=True, exist_ok=True)
    wrapper = OlmoEarth(patch_size=PATCH, model_id=ModelID.OLMOEARTH_V1_BASE, token_pooling=True,
                        use_legacy_timestamps=False, autocast_dtype=None).to(device).eval()
    print("device", device, "modality bands", spec.band_order, flush=True)

    def norm(cube):
        x = np.transpose(np.nan_to_num(cube, nan=-25.0), (1, 2, 3, 0))
        return np.transpose(normalizer.normalize(spec, x), (3, 0, 1, 2)).astype("float32")

    def embed(cube, times):
        H = cube.shape[-1]; n = H // CROP
        feat = torch.empty((768, H // PATCH, H // PATCH), dtype=torch.float32)
        for iy in range(n):
            for ix in range(n):
                y0, x0 = iy * CROP, ix * CROP
                image = torch.from_numpy(np.ascontiguousarray(cube[:, :, y0:y0+CROP, x0:x0+CROP])).to(device)
                inp = {"sentinel1": RasterImage(image=image, timestamps=[(t, t) for t in times])}
                sample, _, _ = wrapper._prepare_modality_inputs(ModelContext(inputs=[inp], metadatas=[]))
                with torch.no_grad():
                    tm = wrapper.model(sample, fast_pass=False, patch_size=PATCH)["tokens_and_masks"]
                    m = (tm.sentinel1_mask != 2).unsqueeze(-1)
                    f = ((tm.sentinel1 * m).sum(dim=(3, 4)) / m.sum(dim=(3, 4)).clamp(min=1))[0].permute(2, 0, 1).float().cpu()
                feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH] = f
        return feat

    def delta(za, zb):
        num = (za * zb).sum(0)
        return (1 - num / (za.norm(dim=0).clamp(min=1e-8) * zb.norm(dim=0).clamp(min=1e-8))).numpy().astype("float32")

    tok = lambda a: a.reshape(64, 4, 64, 4).mean(axis=(1, 3))
    rows, pool = [], []
    t0 = time.time()
    for f in sorted((OUT / "prepare").glob("v*.npz")):
        wid = f.stem
        outp = OUT / "embed" / f"{wid}_delta.npz"
        d = np.load(f)
        raw = {str(x): d["cube"][:, i] for i, x in enumerate(d["dates"])}
        if outp.exists():
            dd = np.load(outp); d_ev, d_pl, v_ev, v_pl = dd["d_event"], dd["d_placebo"], dd["valid_event"], dd["valid_placebo"]
        else:
            stack = lambda ds: (norm(np.stack([raw[k] for k in ds], axis=1)), [datetime.fromisoformat(k) for k in ds])
            d_ev = delta(embed(*stack(BASE_EVENT)), embed(*stack([TARGET_EVENT])))
            d_pl = delta(embed(*stack(BASE_PLACEBO)), embed(*stack([TARGET_PLACEBO])))
            bad = {k: tok(~np.isfinite(raw[k][0])) for k in DATES}
            v_ev = (np.mean([bad[k] for k in BASE_EVENT], axis=0) <= 0.5) & (bad[TARGET_EVENT] <= 0.5)
            v_pl = (np.mean([bad[k] for k in BASE_PLACEBO], axis=0) <= 0.5) & (bad[TARGET_PLACEBO] <= 0.5)
            np.savez_compressed(outp, d_event=d_ev, d_placebo=d_pl, valid_event=v_ev, valid_placebo=v_pl,
                                bounds_utm=d["bounds_utm"], center=d["center"])
        pool.append(d_pl[v_pl])
        rows.append({"id": wid, "center_lonlat": d["center"].tolist(), "bounds_utm": d["bounds_utm"].tolist(),
                     "valid_event_frac": float(v_ev.mean()),
                     "d_event_mean": float(d_ev[v_ev].mean()) if v_ev.any() else None,
                     "d_placebo_mean": float(d_pl[v_pl].mean()) if v_pl.any() else None})
        print(wid, "valid", round(rows[-1]["valid_event_frac"], 2), "Δev", rows[-1]["d_event_mean"], flush=True)
    pool_all = np.concatenate([p for p in pool if len(p)]) if pool else np.array([])
    thr = float(np.quantile(pool_all, 0.99)) if len(pool_all) else None
    for r in rows:
        dd = np.load(OUT / "embed" / f"{r['id']}_delta.npz")
        v, de = dd["valid_event"], dd["d_event"]
        r["candidate_token_frac"] = float((de[v] > thr).mean()) if (thr and v.any()) else None
        r["status"] = "ranked" if (r["valid_event_frac"] >= 0.2 and r["candidate_token_frac"] is not None) else "unobservable"
        if r["status"] == "unobservable": r["candidate_token_frac"] = None
    ranked = sorted([r for r in rows if r["status"] == "ranked"], key=lambda r: -r["candidate_token_frac"])
    for i, r in enumerate(ranked): r["rank"] = i + 1
    rep = {"schema": "source-radar-scan-v1", "measurement_id": "M92",
           "claim": "radar-only change ranking for the source region under persistent cloud; same-orbit (121 desc) 3v1 contract; separate from the optical six-lead funnel; not damage, not risk",
           "orbit": ORBIT, "dates": DATES, "event_pair": {"base": BASE_EVENT, "target": TARGET_EVENT},
           "placebo_pair": {"base": BASE_PLACEBO, "target": TARGET_PLACEBO},
           "input_unit": "gamma0 dB (10*log10 of RTC linear power)",
           "threshold_placebo_p99": thr, "placebo_tokens": int(len(pool_all)),
           "windows": rows, "top10": [{k: r[k] for k in ("id", "rank", "center_lonlat", "candidate_token_frac", "valid_event_frac")} for r in ranked[:10]],
           "elapsed_s": round(time.time() - t0, 1), "device": str(device)}
    (OUT / "report.json").write_text(json.dumps(rep, indent=1))
    print("THRESHOLD", thr, "ranked", len(ranked))
    for r in ranked[:8]: print(r["rank"], r["id"], round(r["candidate_token_frac"], 3), r["center_lonlat"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", choices=["prepare", "embed", "all"], default="all")
    a = ap.parse_args()
    footprint = json.loads((Path(__file__).parent / "source_radar_windows.json").read_text())
    if a.stage in ("prepare", "all"): stage_prepare(footprint)
    if a.stage in ("embed", "all"): stage_embed()


if __name__ == "__main__":
    main()
