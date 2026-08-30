#!/usr/bin/env python3
"""사건 전(pre-event) 임베딩만으로 산사태 취약지도가 되는가 — LOCO 다지점 측정함.

동기: M66 placebo AUROC 0.53~0.60 — 사건 전 임베딩 변동이 미래 산사태 위치와
약하게 상관함. 이것이 "예방(취약지 구획) 입력"으로 성립하는지 직접 잼.

방법: M66과 같은 120패치×3지역(hokkaido/hiroshima/dominicamaria).
  - 특징 z_pre: 사건 전 clear 상위 4시점 스택의 frozen OlmoEarth v1 토큰(768d)
  - 라벨: 사건 후 MASK 토큰 평균 >= 0.25 (미래 산사태 발생 여부)
  - LOCO: 두 지역으로 선형 로지스틱 학습 → 남은 지역에서 AUROC
  - 대조: raw 특징(밴드별 시간 평균+표준편차 20d)로 같은 절차

사전 등록 판정 (실행 전 작성, L4):
  - 성공 = held-out 지역 AUROC >= 0.65 (3지역 모두에서) 그리고 raw 대비 +0.03 이상
  - 부분 신호 = 2/3 지역에서 >= 0.65
  - 미달이면 "미검출로 기록". 라벨은 학습 지역 것만 봄(테스트 지역 라벨은 채점 전용).
  - 무의미 조건: 어떤 지역이든 양성 토큰 < 500개면 그 지역 채점은 보고만 하고 판정 제외.
"""
from __future__ import annotations

import argparse, glob, json, os, time
from datetime import datetime
from pathlib import Path

MODEL_BANDS = ["B02", "B03", "B04", "B08",
               "B05", "B06", "B07", "B8A", "B11", "B12",
               "B01", "B09"]
PATCH, CROP, KEEP = 4, 64, 4
CLEAR_SCL = {4, 5, 6, 7}
REGIONS = ["hokkaido", "hiroshima", "dominicamaria"]


def main():
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "1":
        raise SystemExit("refusing to run: CUDA_VISIBLE_DEVICES must be exactly 1")
    import numpy as np, torch, xarray as xr
    from olmoearth_pretrain_minimal import ModelID
    from rslearn.models.olmoearth_pretrain.model import MaskValue, OlmoEarth
    from rslearn.train.model_context import ModelContext, RasterImage

    p = argparse.ArgumentParser()
    p.add_argument("--data-root", type=Path, default=Path("/home/work/data/sen12landslides/extracted"))
    p.add_argument("--out", type=Path, default=Path("/home/work/data/olmoearth/artifacts/sen12_susceptibility_probe"))
    p.add_argument("--per-region", type=int, default=120)
    args = p.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    cache_dir = args.out / "zpre_cache"; cache_dir.mkdir(exist_ok=True)

    device = torch.device("cuda"); torch.cuda.set_device(0)
    wrapper = OlmoEarth(patch_size=PATCH, model_id=ModelID.OLMOEARTH_V1_BASE,
                        token_pooling=True, use_legacy_timestamps=False,
                        normalize=True, autocast_dtype="bfloat16").to(device).eval()

    def embed_stack(cube, times):
        feat = torch.empty((768, 32, 32), dtype=torch.float32)
        for y0, x0 in ((0, 0), (0, 64), (64, 0), (64, 64)):
            image = torch.from_numpy(np.ascontiguousarray(cube[:, :, y0:y0+CROP, x0:x0+CROP])).to(device)
            input_dict = {"sentinel2_l2a": RasterImage(image=image, timestamps=[(t, t) for t in times])}
            wrapper.normalizer(input_dict, {})
            context = ModelContext(inputs=[input_dict], metadatas=[])
            sample, present, _ = wrapper._prepare_modality_inputs(context)
            sample.sentinel2_l2a_mask[..., 2] = MaskValue.MISSING.value
            with torch.no_grad(), torch.amp.autocast("cuda", dtype=torch.bfloat16):
                output = wrapper.model(sample, fast_pass=False, patch_size=PATCH)
                tm = output["tokens_and_masks"]
                m = (tm.sentinel2_l2a_mask != MaskValue.MISSING.value).unsqueeze(-1)
                pooled = (tm.sentinel2_l2a * m).sum(dim=(3, 4)) / m.sum(dim=(3, 4)).clamp(min=1)
                f = pooled[0].permute(2, 0, 1).float().cpu()
            feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH] = f
        return feat.numpy()

    # ---- 1) 지역별 z_pre / raw 특징 / 라벨 수집 (M66과 동일 선택 규칙) ----
    data = {}
    for region in REGIONS:
        files = sorted(glob.glob(str(args.data_root / f"{region}_s2_*.nc")))
        Z, R, Y = [], [], []
        used = 0
        t0 = time.perf_counter()
        for f in files:
            if used >= args.per_region:
                break
            sid = os.path.basename(f).replace(".nc", "")
            cpath = cache_dir / f"{sid}.npz"
            with xr.open_dataset(f, cache=False) as ds:
                a = ds.attrs
                if str(a.get("annotated")) != "True" or not a.get("event_date"):
                    continue
                try:
                    conf = float(a.get("date_confidence") or 0)
                except ValueError:
                    continue
                if conf < 0.999:
                    continue
                ev = datetime.fromisoformat(str(a["event_date"]))
                times = [datetime.fromisoformat(str(np.datetime_as_string(t, unit="s")))
                         for t in np.asarray(ds["time"].values)]
                scl = np.asarray(ds["SCL"].values)
                clear = np.stack([np.isin(scl[i], list(CLEAR_SCL)).mean() for i in range(len(times))])
                pre_i = [i for i, t in enumerate(times) if t < ev]
                post_i = [i for i, t in enumerate(times) if t >= ev]
                pre_sel = sorted(sorted(pre_i, key=lambda i: (-clear[i], i))[:KEEP])
                if len(pre_sel) < KEEP or len(post_i) < 1:
                    continue
                if cpath.exists():
                    d = np.load(cpath)
                    z, raw_feat, y = d["z"], d["raw"], d["y"]
                else:
                    bands = []
                    for b in MODEL_BANDS:
                        if b in ds:
                            bands.append(np.asarray(ds[b].values[pre_sel], dtype="float32"))
                        else:
                            bands.append(np.zeros((len(pre_sel), 128, 128), dtype="float32"))
                    cube = np.stack(bands, 0)
                    z = embed_stack(cube, [times[i] for i in pre_sel])  # 768,32,32
                    real = cube[:10]                                     # 10,T,128,128
                    tok = real.reshape(10, KEEP, 32, 4, 32, 4).mean(axis=(3, 5))  # 10,T,32,32
                    raw_feat = np.concatenate([tok.mean(1), tok.std(1)], axis=0)  # 20,32,32
                    mask = np.asarray(ds["MASK"].values[0], dtype="float32")
                    y = (mask.reshape(32, 4, 32, 4).mean(axis=(1, 3)) >= 0.25).astype("int8")
                    np.savez_compressed(cpath, z=z.astype("float16"),
                                        raw=raw_feat.astype("float32"), y=y)
            Z.append(np.asarray(z, dtype="float32").reshape(768, -1).T)
            R.append(np.asarray(raw_feat, dtype="float32").reshape(20, -1).T)
            Y.append(np.asarray(y).ravel())
            used += 1
        data[region] = (np.concatenate(Z), np.concatenate(R), np.concatenate(Y))
        print(f"[{region}] patches={used} tokens={len(data[region][2])} "
              f"pos={int(data[region][2].sum())} ({time.perf_counter()-t0:.0f}s)", flush=True)

    # ---- 2) LOCO 선형 프로브 (torch 로지스틱 — venv에 sklearn 없음) ----
    def fit_logistic(Xtr, ytr, Xte):
        Xtr_t = torch.from_numpy(Xtr).to(device)
        mu, sd = Xtr_t.mean(0), Xtr_t.std(0).clamp(min=1e-6)
        Xtr_t = (Xtr_t - mu) / sd
        y_t = torch.from_numpy(ytr.astype("float32")).to(device)
        n_pos = float(y_t.sum()); n_neg = float(len(y_t) - y_t.sum())
        w_pos, w_neg = len(y_t) / (2 * n_pos), len(y_t) / (2 * n_neg)
        weights = torch.where(y_t == 1, w_pos, w_neg)
        w = torch.zeros(Xtr_t.shape[1], device=device, requires_grad=True)
        b = torch.zeros(1, device=device, requires_grad=True)
        opt = torch.optim.LBFGS([w, b], max_iter=200, line_search_fn="strong_wolfe")
        def closure():
            opt.zero_grad()
            logits = Xtr_t @ w + b
            loss = (torch.nn.functional.binary_cross_entropy_with_logits(
                logits, y_t, weight=weights) + 1e-4 * (w * w).sum())
            loss.backward(); return loss
        opt.step(closure)
        with torch.no_grad():
            Xte_t = (torch.from_numpy(Xte).to(device) - mu) / sd
            return (Xte_t @ w + b).cpu().numpy()

    def auroc_np(scores, labels):
        import numpy as _np
        s = _np.asarray(scores, dtype="float64"); y = _np.asarray(labels)
        uniq, inv, cnts = _np.unique(s, return_inverse=True, return_counts=True)
        start = _np.zeros(len(uniq)); start[1:] = _np.cumsum(cnts)[:-1]
        ranks = start[inv] + (cnts[inv] + 1) / 2.0
        n_pos, n_neg = int(y.sum()), int(len(y) - y.sum())
        return float((ranks[y == 1].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))

    report = {"schema": "sen12-susceptibility-probe-v1", "keep_pre": KEEP,
              "label_rule": "token mask mean >= 0.25", "probe": "torch logistic LBFGS, balanced, L2 1e-4",
              "loco": {}}
    for held in REGIONS:
        train = [r for r in REGIONS if r != held]
        res = {}
        for name, col in (("olmoearth", 0), ("raw", 1)):
            Xtr = np.concatenate([data[r][col] for r in train])
            ytr = np.concatenate([data[r][2] for r in train])
            Xte, yte = data[held][col], data[held][2]
            s = fit_logistic(Xtr, ytr, Xte)
            res[name] = {"auroc": auroc_np(s, yte),
                         "test_pos": int(yte.sum()), "test_tokens": int(len(yte))}
        emb, raw = res["olmoearth"]["auroc"], res["raw"]["auroc"]
        res["verdict"] = ("pass" if emb >= 0.65 and emb >= raw + 0.03 else "not detected")
        report["loco"][held] = res
        print(f"[LOCO held={held}] olmoearth={emb:.3f} raw={raw:.3f} verdict={res[chr(39)+chr(39) if False else 'verdict']}", flush=True)
    n_pass = sum(1 for v in report["loco"].values() if v["verdict"] == "pass")
    report["overall"] = ("pre-event susceptibility signal (pre-registered pass)" if n_pass == 3
                         else "partial signal (2/3)" if n_pass == 2 else "not detected")
    (args.out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                                          encoding="utf-8")
    print(json.dumps(report["loco"], indent=1))
    print("OVERALL:", report["overall"])
    print("DONE")


if __name__ == "__main__":
    main()
