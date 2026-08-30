#!/usr/bin/env python3
"""Sen12 다지점 사건 Δz 파일럿 — "임베딩 변화가 산사태 폴리곤을 골라내는가"를 여러 지역에서 동시 측정함.

배경: Nepal Rasuwa Δz 프로토콜은 단일 사건임. Sen12Landslides의 주석 패치는
event_date(신뢰도 포함)와 시간 축·MASK를 갖고 있어, 같은 frozen OlmoEarth v1로
pre/post 스택을 따로 임베딩하면 Δz의 지역화 능력을 다지점에서 잴 수 있음.

계약 (extract_sen12_fold_cache.py와 동일한 인코딩 경로를 재사용함):
  - MODEL_BANDS 12 (B01/B09 zeros + band-set 2 MISSING), patch 4, crop 64 x 4장, 32x32 토큰
  - timestep 선택은 라벨 미참조: SCL clear fraction(클래스 4/5/6/7) 상위 K=4, 시간순 복원
  - pre = event_date 이전, post = event_date 이후(당일 포함)
  - placebo = pre 구간의 clear 시점이 8개 이상일 때 pre 전반 4 vs pre 후반 4

사전 등록 판정 기준 (실행 전 작성함, L4):
  - 라벨: 토큰(4px=40m) 내 MASK 평균 >= 0.25 를 양성으로 함
  - 1차 지표: 지역별 pooled token AUROC(Δz vs 라벨)
  - 성공 = AUROC >= 0.60 그리고 (placebo AUROC 존재 시) AUROC >= placebo AUROC + 0.05
  - 미달이면 "미검출로 기록"함. 사후 임계 조정 금지.
  - 이 결과가 무의미해지는 경우: pre/post clear 시점이 4개 미달인 패치 비율이 50%를
    넘는 지역(관측 부족이 지배), 또는 placebo 표본 < 30패치인 지역의 placebo 비교.
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


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--regions", nargs="+", default=["hokkaido", "hiroshima", "dominicamaria", "nepal", "kyrgyzstan1", "kyrgyzstan2", "italy", "china", "newzealand", "indonesia", "itogon", "lanaodelnorte", "thrissur", "usa_alaska", "usa_puertorico"])
    p.add_argument("--data-root", type=Path, default=Path("/home/work/data/sen12landslides/extracted"))
    p.add_argument("--out", type=Path, default=Path("/home/work/data/olmoearth/artifacts/sen12_event_delta_all"))
    p.add_argument("--per-region", type=int, default=120)
    return p.parse_args()


def auroc(scores, labels):
    import numpy as np
    scores = np.asarray(scores, dtype="float64"); labels = np.asarray(labels)
    pos, neg = scores[labels == 1], scores[labels == 0]
    if len(pos) == 0 or len(neg) == 0:
        return None
    order = np.argsort(np.concatenate([pos, neg]), kind="mergesort")
    ranks = np.empty(len(order)); ranks[order] = np.arange(1, len(order) + 1)
    # 동률 평균 순위
    allv = np.concatenate([pos, neg])
    sv = np.sort(allv); import numpy as _np
    uniq, inv, cnts = _np.unique(allv, return_inverse=True, return_counts=True)
    start = _np.zeros(len(uniq)); start[1:] = _np.cumsum(cnts)[:-1]
    ranks = start[inv] + (cnts[inv] + 1) / 2.0
    r_pos = ranks[:len(pos)].sum()
    return float((r_pos - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg)))


def main():
    if os.environ.get("CUDA_VISIBLE_DEVICES") != "1":
        raise SystemExit("refusing to run: CUDA_VISIBLE_DEVICES must be exactly 1")
    import numpy as np, torch, xarray as xr
    from olmoearth_pretrain_minimal import ModelID
    from rslearn.models.olmoearth_pretrain.model import MaskValue, OlmoEarth
    from rslearn.train.model_context import ModelContext, RasterImage

    args = parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
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
            assert present == ["sentinel2_l2a"]
            sample.sentinel2_l2a_mask[..., 2] = MaskValue.MISSING.value
            with torch.no_grad(), torch.amp.autocast("cuda", dtype=torch.bfloat16):
                output = wrapper.model(sample, fast_pass=False, patch_size=PATCH)
                tm = output["tokens_and_masks"]
                m = (tm.sentinel2_l2a_mask != MaskValue.MISSING.value).unsqueeze(-1)
                pooled = (tm.sentinel2_l2a * m).sum(dim=(3, 4)) / m.sum(dim=(3, 4)).clamp(min=1)
                f = pooled[0].permute(2, 0, 1).float().cpu()
            feat[:, y0//PATCH:(y0+CROP)//PATCH, x0//PATCH:(x0+CROP)//PATCH] = f
        return feat  # 768,32,32

    def delta(a, b):
        num = (a * b).sum(0)
        d = 1.0 - num / (a.norm(dim=0).clamp(min=1e-8) * b.norm(dim=0).clamp(min=1e-8))
        return d.numpy()  # 32,32

    report = {"schema": "sen12-event-delta-pilot-v1", "keep_per_side": KEEP,
              "label_rule": "token mask mean >= 0.25", "regions": {}}
    per_patch_path = args.out / "per_patch.jsonl"
    fh = per_patch_path.open("w", encoding="utf-8")

    for region in args.regions:
        files = sorted(glob.glob(str(args.data_root / f"{region}_s2_*.nc")))
        used = skipped_obs = 0
        ev_scores, ev_labels, pl_scores, pl_labels = [], [], [], []
        patch_rows = []
        t0 = time.perf_counter()
        for f in files:
            if used >= args.per_region:
                break
            with xr.open_dataset(f, cache=False) as ds:
                a = ds.attrs
                if str(a.get("annotated")) != "True" or not a.get("event_date"):
                    continue
                try:
                    conf = float(a.get("date_confidence") or 0)
                except ValueError:
                    conf = 0
                if conf < 0.999:
                    continue
                # 사건 날짜가 여러 개(예: "2018-09-28,2017-05-29")면 전후 구분이 모호하므로 제외함
                if "," in str(a["event_date"]):
                    skipped_obs += 1
                    continue
                ev = datetime.fromisoformat(str(a["event_date"]))
                times = [datetime.fromisoformat(str(np.datetime_as_string(t, unit="s")))
                         for t in np.asarray(ds["time"].values)]
                scl = np.asarray(ds["SCL"].values)  # T,H,W
                clear = np.stack([np.isin(scl[i], list(CLEAR_SCL)).mean() for i in range(len(times))])
                pre_i = [i for i, t in enumerate(times) if t < ev]
                post_i = [i for i, t in enumerate(times) if t >= ev]
                pick = lambda idxs: sorted(sorted(idxs, key=lambda i: (-clear[i], i))[:KEEP])
                pre_sel, post_sel = pick(pre_i), pick(post_i)
                if len(pre_sel) < KEEP or len(post_sel) < KEEP:
                    skipped_obs += 1
                    continue
                def load(idxs):
                    bands = []
                    for b in MODEL_BANDS:
                        if b in ds:
                            bands.append(np.asarray(ds[b].values[idxs], dtype="float32"))
                        else:
                            bands.append(np.zeros((len(idxs), 128, 128), dtype="float32"))
                    return np.stack(bands, 0), [times[i] for i in idxs]
                cube_pre, t_pre = load(pre_sel)
                cube_post, t_post = load(post_sel)
                mask = np.asarray(ds["MASK"].values[0], dtype="float32")
                # placebo: pre clear 시점 8개 이상일 때 pre 전반/후반
                pl = None
                if len(pre_i) >= 2 * KEEP:
                    pre_sorted = sorted(pre_i)
                    ha, hb = pre_sorted[:len(pre_sorted)//2], pre_sorted[len(pre_sorted)//2:]
                    pa, pb = pick(ha), pick(hb)
                    if len(pa) == KEEP and len(pb) == KEEP:
                        pl = (load(pa), load(pb))
            z_pre = embed_stack(cube_pre, t_pre)
            z_post = embed_stack(cube_post, t_post)
            d_ev = delta(z_pre, z_post)
            # 토큰 라벨: 4x4 평균
            lab = mask.reshape(32, 4, 32, 4).mean(axis=(1, 3))
            y = (lab >= 0.25).astype("int8")
            ev_scores.append(d_ev.ravel()); ev_labels.append(y.ravel())
            row = {"region": region, "file": os.path.basename(f),
                   "event_date": str(a["event_date"]),
                   "pos_tokens": int(y.sum()),
                   "delta_mean_pos": float(d_ev[y == 1].mean()) if y.sum() else None,
                   "delta_mean_neg": float(d_ev[y == 0].mean()),
                   "auroc": auroc(d_ev.ravel(), y.ravel())}
            if pl is not None:
                (ca, ta), (cb, tb) = pl
                d_pl = delta(embed_stack(ca, ta), embed_stack(cb, tb))
                pl_scores.append(d_pl.ravel()); pl_labels.append(y.ravel())
                row["placebo_auroc"] = auroc(d_pl.ravel(), y.ravel())
            patch_rows.append(row)
            fh.write(json.dumps(row, ensure_ascii=False) + "\n"); fh.flush()
            used += 1
        el = time.perf_counter() - t0
        pooled = auroc(np.concatenate(ev_scores), np.concatenate(ev_labels)) if ev_scores else None
        # 보조 지표: 오경보 5%로 고정했을 때 실제 산사태 토큰 중 몇 %를 잡는가 (커버율)
        recall5 = None
        if ev_scores:
            s_all = np.concatenate(ev_scores); y_all = np.concatenate(ev_labels)
            neg = s_all[y_all == 0]; pos = s_all[y_all == 1]
            if len(neg) and len(pos):
                thr = float(np.quantile(neg, 0.95))
                recall5 = float((pos > thr).mean())
        pooled_pl = auroc(np.concatenate(pl_scores), np.concatenate(pl_labels)) if pl_scores else None
        ok = (pooled is not None and pooled >= 0.60 and
              (pooled_pl is None or pooled >= pooled_pl + 0.05))
        report["regions"][region] = {
            "patches_used": used, "skipped_insufficient_obs": skipped_obs,
            "pooled_auroc": pooled, "recall_at_5pct_fpr": recall5, "placebo_pooled_auroc": pooled_pl,
            "placebo_patches": len(pl_scores),
            "verdict": ("candidate localization signal" if ok else "not detected"),
            "elapsed_s": round(el, 1)}
        print(f"[{region}] used={used} skipped={skipped_obs} AUROC={pooled} recall@5%FPR={recall5} placebo={pooled_pl} "
              f"verdict={report['regions'][region]['verdict']}", flush=True)
    fh.close()
    (args.out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("DONE")


if __name__ == "__main__":
    main()
