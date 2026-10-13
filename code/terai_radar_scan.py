#!/usr/bin/env python3
"""M100. 뉴스가 가리킨 9월 하순 홍수 지점 5곳(부트왈·데브갓·수스타·다라파니·삽타리)에 대한 레이더 3v1 스캔 + 고전 판별.

source_radar_scan.py(M92/M93/M99)와 같은 3v1 구조·36/24/12일 간격·평시 p99 문턱·OlmoEarth frozen 임베딩을 쓰되,
  (1) 창을 뉴스 지점 중심 5×5 격자(2.56 km, `terai_flood_windows.json`)로 바꾸고, UTM 존을 창마다 들고 다니며
  (2) 창별로 **고전 레이더 물 지수**(VV 가 사전 중앙값 대비 −3 dB 넘게 떨어지고 −16 dB 아래로 내려간 픽셀 비율)를
      같이 재서, 임베딩 순위가 '물이 새로 덮인 곳'을 가리키는지 **독립 판별**한다. 근거: M86·네팔 홍수 검정에서
      평야 침수는 고전 지수가 임베딩보다 나았다 — 그러니 여기서는 임베딩이 채점기이고 고전 지수가 자다.
  (3) M99 교훈으로 지역 공통 이동(같은 날짜 전창 중앙값)을 뺀 초과도 함께 적는다.
주장 경계: 순위·물 비율은 '먼저 볼 곳'이다. 피해도, 수심도, 인과도 아니다. 현장 정답 0.
"""
from __future__ import annotations
import argparse, json, os, time
from datetime import datetime
from pathlib import Path

from nepal_paths import ARTIFACT_ROOT

CONTRACTS: dict[str, dict] = {
    # 궤도 19 desc — 발원 회랑 M93/M99 와 같은 궤도·같은 날짜. 서·중부 테라이 4지점.
    "t19": {
        "measurement_id": "M100", "orbit": 19, "direction": "descending",
        "aois": ["butwal", "devghat", "susta", "dharapani"],
        "dates": ["2026-07-07", "2026-07-19", "2026-07-31", "2026-08-12", "2026-08-24", "2026-09-05", "2026-09-17", "2026-09-29"],
        "base_event": ["2026-08-24", "2026-09-05", "2026-09-17"], "target_event": "2026-09-29",
        "base_placebo": ["2026-07-07", "2026-07-19", "2026-07-31"], "target_placebo": "2026-08-12",
        "out": "terai_radar_scan_t19",
    },
    # 궤도 12 asc — 삽타리(코시). 사후 09-28 은 홍수 정점 당일.
    "t12": {
        "measurement_id": "M100b", "orbit": 12, "direction": "ascending",
        "aois": ["saptari"],
        "dates": ["2026-07-06", "2026-07-18", "2026-07-30", "2026-08-11", "2026-08-23", "2026-09-04", "2026-09-16", "2026-09-28"],
        "base_event": ["2026-08-23", "2026-09-04", "2026-09-16"], "target_event": "2026-09-28",
        "base_placebo": ["2026-07-06", "2026-07-18", "2026-07-30"], "target_placebo": "2026-08-11",
        "out": "terai_radar_scan_t12",
    },
    # 궤도 158 asc — 데브갓이 궤도 19 장면 밖(17/25 창 nodata)이라 다른 궤도로 다시 본다. 사후 09-26 은 호우 3일째.
    # 06-27→07-16 에 취득 공백이 있어 7날짜. 평시 목표 08-21 은 8월 재난 5일 전(사전).
    "t158": {
        "measurement_id": "M100c", "orbit": 158, "direction": "ascending",
        "aois": ["devghat", "susta", "butwal"],
        "dates": ["2026-07-16", "2026-07-28", "2026-08-09", "2026-08-21", "2026-09-02", "2026-09-14", "2026-09-26"],
        "base_event": ["2026-08-21", "2026-09-02", "2026-09-14"], "target_event": "2026-09-26",
        "base_placebo": ["2026-07-16", "2026-07-28", "2026-08-09"], "target_placebo": "2026-08-21",
        "out": "terai_radar_scan_t158",
    },
    # M103 — 강을 따라 2.56 km 간격으로 이어 붙인 창(1장 회랑 방식). 나라야니(데브갓→수스타→국경)·티나우(부트왈 하류)는 궤도 19, 코시(삽타리)는 궤도 12.
    "r19": {
        "measurement_id": "M103", "orbit": 19, "direction": "descending",
        "aois": ["river_narayani", "river_tinau"],
        "dates": ["2026-07-07", "2026-07-19", "2026-07-31", "2026-08-12", "2026-08-24", "2026-09-05", "2026-09-17", "2026-09-29"],
        "base_event": ["2026-08-24", "2026-09-05", "2026-09-17"], "target_event": "2026-09-29",
        "base_placebo": ["2026-07-07", "2026-07-19", "2026-07-31"], "target_placebo": "2026-08-12",
        "out": "terai_radar_scan_r19",
    },
    "r12": {
        "measurement_id": "M103b", "orbit": 12, "direction": "ascending",
        "aois": ["river_koshi"],
        "dates": ["2026-07-06", "2026-07-18", "2026-07-30", "2026-08-11", "2026-08-23", "2026-09-04", "2026-09-16", "2026-09-28"],
        "base_event": ["2026-08-23", "2026-09-04", "2026-09-16"], "target_event": "2026-09-28",
        "base_placebo": ["2026-07-06", "2026-07-18", "2026-07-30"], "target_placebo": "2026-08-11",
        "out": "terai_radar_scan_r12",
    },
    # M104 — 확장 회랑: 테라이 큰 강 본류 전 구간(나라야니·티나우·동라프티·바그마티 = 궤도 19, 코시 = 궤도 12).
    "x19": {
        "measurement_id": "M104", "orbit": 19, "direction": "descending",
        "aois": ["xriver_narayani", "xriver_tinau", "xriver_rapti", "xriver_bagmati"],
        "dates": ["2026-07-07", "2026-07-19", "2026-07-31", "2026-08-12", "2026-08-24", "2026-09-05", "2026-09-17", "2026-09-29"],
        "base_event": ["2026-08-24", "2026-09-05", "2026-09-17"], "target_event": "2026-09-29",
        "base_placebo": ["2026-07-07", "2026-07-19", "2026-07-31"], "target_placebo": "2026-08-12",
        "out": "terai_radar_scan_x19",
    },
    "x12": {
        "measurement_id": "M104b", "orbit": 12, "direction": "ascending",
        "aois": ["xriver_koshi"],
        "dates": ["2026-07-06", "2026-07-18", "2026-07-30", "2026-08-11", "2026-08-23", "2026-09-04", "2026-09-16", "2026-09-28"],
        "base_event": ["2026-08-23", "2026-09-04", "2026-09-16"], "target_event": "2026-09-28",
        "base_placebo": ["2026-07-06", "2026-07-18", "2026-07-30"], "target_placebo": "2026-08-11",
        "out": "terai_radar_scan_x12",
    },
    # M105 — 데브갓→트리베니 상류 나라야니(사행 구간). OSM 조각이 끊겨 M103/M104 에서 빠졌던 60 km.
    "u19": {
        "measurement_id": "M105", "orbit": 19, "direction": "descending",
        "aois": ["xriver_narayani_upper"],
        "dates": ["2026-07-07", "2026-07-19", "2026-07-31", "2026-08-12", "2026-08-24", "2026-09-05", "2026-09-17", "2026-09-29"],
        "base_event": ["2026-08-24", "2026-09-05", "2026-09-17"], "target_event": "2026-09-29",
        "base_placebo": ["2026-07-07", "2026-07-19", "2026-07-31"], "target_placebo": "2026-08-12",
        "out": "terai_radar_scan_u19",
    },
    # M108 — 2024년 9월 27~28일 홍수(바그마티·카트만두 사망 249명), 같은 강 회랑·같은 궤도 19. 2024 년엔 S1B 가 없어 09-08 통과가 비므로
    # 3v1 대신 **2v1(36·12일)**. 평시 쌍도 같은 간격으로 맞춘다. 사후 10-02 는 정점 4~5일 뒤.
    "y19": {
        "measurement_id": "M108", "orbit": 19, "direction": "descending",
        "aois": ["river_narayani", "river_tinau", "xriver_narayani", "xriver_tinau", "xriver_rapti", "xriver_bagmati", "xriver_narayani_upper"],
        "dates": ["2024-07-10", "2024-08-03", "2024-08-15", "2024-08-27", "2024-09-20", "2024-10-02"],
        "base_event": ["2024-08-27", "2024-09-20"], "target_event": "2024-10-02",
        "base_placebo": ["2024-07-10", "2024-08-03"], "target_placebo": "2024-08-15",
        "out": "terai_radar_scan_y19",
    },
    # M108b — 2026 을 2024 와 **같은 2v1(36·12일)** 로 다시 잰다(공정 비교). 큐브는 r19/x19/u19 prepare 를 링크해 재다운로드 없음.
    "z19": {
        "measurement_id": "M108b", "orbit": 19, "direction": "descending",
        "aois": ["river_narayani", "river_tinau", "xriver_narayani", "xriver_tinau", "xriver_rapti", "xriver_bagmati", "xriver_narayani_upper"],
        "dates": ["2026-07-07", "2026-07-19", "2026-07-31", "2026-08-12", "2026-08-24", "2026-09-05", "2026-09-17", "2026-09-29"],
        "base_event": ["2026-08-24", "2026-09-17"], "target_event": "2026-09-29",
        "base_placebo": ["2026-07-07", "2026-07-31"], "target_placebo": "2026-08-12",
        "out": "terai_radar_scan_z19",
    },
    # M109 물 빠짐 확인: 궤도 85(상승) 10-03 — 홍수 뒤 4일, 다른 각도. 평시 기억 3장(08-28·09-09·09-21)은 전부 홍수 전.
    # 수스타·비하르 간다크는 궤도 85 장면 밖(창별 장면 탐색이 건너뜀). 궤도가 다르므로 09-29 궤도19 값과는 계급·순위만 비교한다.
    "a85": {
        "measurement_id": "M109", "orbit": 85, "direction": "ascending",
        "aois": ["river_narayani", "river_tinau", "river_koshi", "xriver_narayani", "xriver_tinau", "xriver_rapti", "xriver_bagmati", "xriver_koshi", "xriver_narayani_upper"],
        "dates": ["2026-07-11", "2026-07-23", "2026-08-04", "2026-08-16", "2026-08-28", "2026-09-09", "2026-09-21", "2026-10-03"],
        "base_event": ["2026-08-28", "2026-09-09", "2026-09-21"], "target_event": "2026-10-03",
        "base_placebo": ["2026-07-11", "2026-07-23", "2026-08-04"], "target_placebo": "2026-08-16",
        "out": "terai_radar_scan_a85",
    },
    # M110 — 10-11 부디 간다키(고르카 Chumchet) 산사태댐 붕괴 홍수. 궤도 19 하강 10-11 00:18 UTC = 06:03 NPT(붕괴 직후).
    # 1장과 같은 3v1. 평시 기억 3장은 전부 홍수 전(09-05·09-17·09-29). 평시 쌍은 7~8월 몬순 한복판이라 보수적인 문턱.
    "b19": {
        "measurement_id": "M110", "orbit": 19, "direction": "descending",
        "aois": ["xriver_budhi_gandaki"],
        "dates": ["2026-07-19", "2026-07-31", "2026-08-12", "2026-08-24", "2026-09-05", "2026-09-17", "2026-09-29", "2026-10-11"],
        "base_event": ["2026-09-05", "2026-09-17", "2026-09-29"], "target_event": "2026-10-11",
        "base_placebo": ["2026-07-19", "2026-07-31", "2026-08-12"], "target_placebo": "2026-08-24",
        "out": "terai_radar_scan_b19",
    },
}
SIZE, PATCH, CROP = 256, 4, 64
MODEL_ID_NAME = "OLMOEARTH_V1_BASE"
WATER_DB, DROP_DB = -16.0, -3.0     # 고전 물 판별: 절대 −16 dB 아래 + 사전 대비 −3 dB 넘는 하락


def gaps(base, target):
    t = datetime.fromisoformat(target)
    return [(t - datetime.fromisoformat(b)).days for b in base]


def load_windows(C):
    allw = json.loads((Path(__file__).parent / "terai_flood_windows.json").read_text())
    return [w for w in allw if w["aoi"] in C["aois"]]


def stage_prepare(wins, C):
    import numpy as np, planetary_computer as pc, pystac_client, rasterio
    from rasterio.windows import from_bounds
    from rasterio.warp import transform_bounds
    OUT = ARTIFACT_ROOT / C["out"]; (OUT / "prepare").mkdir(parents=True, exist_ok=True)
    DATES, ORBIT = C["dates"], C["orbit"]
    os.environ.setdefault("GDAL_HTTP_TIMEOUT", "60"); os.environ.setdefault("GDAL_HTTP_CONNECTTIMEOUT", "30")
    os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3"); os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "5")
    SIGN_TTL = 1500.0
    cat = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
    # 지점(AOI)마다 장면이 다를 수 있으므로 AOI 별로 item 을 푼다.
    # 2026-10-01: 긴 강 회랑은 같은 궤도 안에서도 프레임이 바뀌므로 장면을 창마다 찾는다(AOI 중심 1점이면 끝 창이 nodata).
    centers = {w["id"]: w["center_lonlat"] for w in wins}
    raw: dict[tuple, object] = {}
    for a, pt in centers.items():
        for d in DATES:
            for attempt in range(5):
                try:
                    found = [it for it in cat.search(collections=["sentinel-1-rtc"], intersects={"type": "Point", "coordinates": pt},
                                                     datetime=f"{d}T00:00:00Z/{d}T23:59:59Z").items()
                             if it.properties.get("sat:relative_orbit") == ORBIT]
                    break
                except Exception:
                    if attempt == 4: raise
                    time.sleep(8 * (attempt + 1))
            if not found:
                print("no scene", a, d, "→ window skipped", flush=True); raw[(a, d)] = None; continue
            raw[(a, d)] = found[0]
        print("items", a, len(DATES), flush=True)
    signed: dict = {}; signed_at = [0.0]

    def fresh(key):
        if time.time() - signed_at[0] > SIGN_TTL:
            for k, v in raw.items(): signed[k] = pc.sign(v) if v is not None else None
            signed_at[0] = time.time(); print("resigned", len(signed), flush=True)
        return signed[key]

    for w in wins:
        out = OUT / "prepare" / f"{w['id']}.npz"
        if out.exists(): print(w["id"], "cached", flush=True); continue
        if any(raw.get((w["id"], d)) is None for d in DATES): print(w["id"], "skipped (no scene on some date)", flush=True); continue
        cube = np.full((2, len(DATES), SIZE, SIZE), np.nan, dtype="float32")
        for ti, d in enumerate(DATES):
            for bi, band in enumerate(("vv", "vh")):
                for attempt in range(4):
                    try:
                        it = fresh((w["id"], d))
                        with rasterio.open(it.assets[band].href) as ds:
                            b = transform_bounds(f"EPSG:{w['epsg']}", ds.crs, *w["bounds_utm"])
                            arr = ds.read(1, window=from_bounds(*b, transform=ds.transform), out_shape=(SIZE, SIZE),
                                          boundless=True, fill_value=-32768).astype("float32")
                        break
                    except Exception as e:
                        if attempt == 3: raise
                        print(f"retry {w['id']} {d} {band} ({type(e).__name__})", flush=True)
                        signed_at[0] = 0.0; time.sleep(5 * (attempt + 1))
                arr[arr <= 0] = np.nan
                cube[bi, ti] = 10.0 * np.log10(arr)
        np.savez_compressed(out, cube=cube, dates=np.array(DATES), bounds_utm=np.array(w["bounds_utm"]), epsg=w["epsg"],
                            center=np.array(w["center_lonlat"]), aoi=w["aoi"], orbit=ORBIT, unit="dB")
        print(w["id"], "ok", flush=True)


def stage_embed(C):
    OUT = ARTIFACT_ROOT / C["out"]; PREP = OUT / "prepare"
    DATES = C["dates"]; BE, TE = C["base_event"], C["target_event"]; BP, TP = C["base_placebo"], C["target_placebo"]
    assert gaps(BE, TE) == gaps(BP, TP), "placebo gaps must match the event pair"
    import numpy as np, torch
    from rslearn.models.olmoearth_pretrain.model import OlmoEarth, ModelID
    from rslearn.train.model_context import ModelContext, RasterImage
    from olmoearth_pretrain.data.normalize import Normalizer, Strategy
    from olmoearth_pretrain.data.constants import Modality
    spec = Modality.get("sentinel1"); normalizer = Normalizer(Strategy.COMPUTED, std_multiplier=2)
    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    (OUT / "embed").mkdir(parents=True, exist_ok=True)
    wrapper = OlmoEarth(patch_size=PATCH, model_id=getattr(ModelID, MODEL_ID_NAME), token_pooling=True,
                        use_legacy_timestamps=False, autocast_dtype=None).to(device).eval()
    print("device", device, flush=True)

    def norm(cube):
        x = np.transpose(np.nan_to_num(cube, nan=-25.0), (1, 2, 3, 0))
        return np.transpose(normalizer.normalize(spec, x), (3, 0, 1, 2)).astype("float32")

    def embed(cube, times):
        H = cube.shape[-1]; n = H // CROP; feat = None
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
                if feat is None: feat = torch.empty((f.shape[0], H // PATCH, H // PATCH), dtype=torch.float32)
                feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH] = f
        return feat

    def delta(za, zb):
        num = (za * zb).sum(0)
        return (1 - num / (za.norm(dim=0).clamp(min=1e-8) * zb.norm(dim=0).clamp(min=1e-8))).numpy().astype("float32")

    def water(raw, base, target):
        """고전 판별: 사전(base 3장) VV 픽셀 중앙값 대비 target 이 −3 dB 넘게 떨어지고 −16 dB 아래 = 새 물 후보 픽셀 비율."""
        pre = np.nanmedian(np.stack([raw[k][0] for k in base]), axis=0); tgt = raw[target][0]
        ok = np.isfinite(pre) & np.isfinite(tgt)
        if not ok.any(): return None, None
        new_water = ((tgt - pre) < DROP_DB) & (tgt < WATER_DB) & ok
        return float(new_water.sum() / ok.sum()), float(((tgt - pre)[ok]).mean())

    tok = lambda a: a.reshape(64, 4, 64, 4).mean(axis=(1, 3))
    rows, pool = [], []; t0 = time.time()
    for f in sorted(PREP.glob("*.npz")):
        wid = f.stem; outp = OUT / "embed" / f"{wid}_delta.npz"; d = np.load(f)
        raw = {str(x): d["cube"][:, i] for i, x in enumerate(d["dates"])}
        if outp.exists():
            dd = np.load(outp); d_ev, d_pl, v_ev, v_pl = dd["d_event"], dd["d_placebo"], dd["valid_event"], dd["valid_placebo"]
        else:
            stack = lambda ds: (norm(np.stack([raw[k] for k in ds], axis=1)), [datetime.fromisoformat(k) for k in ds])
            d_ev = delta(embed(*stack(BE)), embed(*stack([TE]))); d_pl = delta(embed(*stack(BP)), embed(*stack([TP])))
            bad = {k: tok(~np.isfinite(raw[k][0])) for k in DATES}
            v_ev = (np.mean([bad[k] for k in BE], axis=0) <= 0.5) & (bad[TE] <= 0.5)
            v_pl = (np.mean([bad[k] for k in BP], axis=0) <= 0.5) & (bad[TP] <= 0.5)
            np.savez_compressed(outp, d_event=d_ev, d_placebo=d_pl, valid_event=v_ev, valid_placebo=v_pl)
        pool.append(d_pl[v_pl])
        w_ev, dvv_ev = water(raw, BE, TE); w_pl, dvv_pl = water(raw, BP, TP)
        rows.append({"id": wid, "aoi": str(d["aoi"]), "center_lonlat": d["center"].tolist(), "bounds_utm": d["bounds_utm"].tolist(), "epsg": int(d["epsg"]),
                     "valid_event_frac": float(v_ev.mean()),
                     "d_event_mean": float(d_ev[v_ev].mean()) if v_ev.any() else None,
                     "d_placebo_mean": float(d_pl[v_pl].mean()) if v_pl.any() else None,
                     "water_new_frac_event": w_ev, "water_new_frac_placebo": w_pl, "dvv_event_db": dvv_ev, "dvv_placebo_db": dvv_pl})
        print(wid, "valid", round(rows[-1]["valid_event_frac"], 2), "Δev", None if rows[-1]["d_event_mean"] is None else round(rows[-1]["d_event_mean"], 3), "water", None if w_ev is None else round(w_ev, 3), flush=True)
    pool_all = np.concatenate([p for p in pool if len(p)]) if pool else np.array([])
    thr = float(np.quantile(pool_all, 0.99)) if len(pool_all) else None
    for r in rows:
        dd = np.load(OUT / "embed" / f"{r['id']}_delta.npz"); v, de = dd["valid_event"], dd["d_event"]
        r["candidate_token_frac"] = float((de[v] > thr).mean()) if (thr and v.any()) else None
        r["status"] = "ranked" if (r["valid_event_frac"] >= 0.2 and r["candidate_token_frac"] is not None) else "unobservable"
        if r["status"] == "unobservable": r["candidate_token_frac"] = None
    ranked = sorted([r for r in rows if r["status"] == "ranked"], key=lambda r: -r["candidate_token_frac"])
    for i, r in enumerate(ranked): r["rank"] = i + 1
    med = float(np.median([r["d_event_mean"] for r in ranked])) if ranked else None
    for r in ranked: r["excess_over_median"] = r["d_event_mean"] - med
    wp = [r["water_new_frac_placebo"] for r in ranked if r["water_new_frac_placebo"] is not None]
    water_null_p99 = float(np.quantile(wp, 0.99)) if wp else None
    rep = {"schema": "terai-radar-scan-v1", "measurement_id": C["measurement_id"], "model_id": MODEL_ID_NAME,
           "claim": "radar-only 3v1 change ranking at news-reported late-September flood sites, with a classical new-water fraction as an independent yardstick; reading order, not damage",
           "orbit": C["orbit"], "orbit_direction": C["direction"], "aois": C["aois"],
           "gap_days": {"event": gaps(BE, TE), "placebo": gaps(BP, TP)}, "dates": DATES,
           "event_pair": {"base": BE, "target": TE}, "placebo_pair": {"base": BP, "target": TP},
           "input_unit": "gamma0 dB", "threshold_placebo_p99": thr, "placebo_tokens": int(len(pool_all)),
           "regional_median_d_event": med, "water_rule": f"VV drop < {DROP_DB} dB vs base median AND VV < {WATER_DB} dB",
           "water_new_frac_placebo_p99": water_null_p99,
           "windows": rows, "elapsed_s": round(time.time() - t0, 1), "device": str(device)}
    (OUT / "report.json").write_text(json.dumps(rep, indent=1))
    print("THRESHOLD", thr, "ranked", len(ranked), "water null p99", water_null_p99)
    for r in ranked[:10]: print(r["rank"], r["id"], round(r["candidate_token_frac"], 3), "excess", round(r["excess_over_median"], 3), "water", None if r["water_new_frac_event"] is None else round(r["water_new_frac_event"], 3))
    print("wrote", OUT / "report.json")


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--stage", choices=["prepare", "embed", "all"], default="all")
    ap.add_argument("--contract", choices=sorted(CONTRACTS), default="t19"); a = ap.parse_args()
    C = CONTRACTS[a.contract]; wins = load_windows(C)
    print("contract", a.contract, C["measurement_id"], "orbit", C["orbit"], "windows", len(wins), "gaps", gaps(C["base_event"], C["target_event"]), flush=True)
    if a.stage in ("prepare", "all"): stage_prepare(wins, C)
    if a.stage in ("embed", "all"): stage_embed(C)


if __name__ == "__main__":
    main()
