#!/usr/bin/env python3
"""M112. M111 의 후속 — 같은 폴드·같은 표적으로 다른 위치 인코더를 나란히 둔다: SatCLIP(L10·L40, Klemmer et al. 2023), GeoCLIP(Vivanco Cepeda et al. 2023), MIND.

왜: M111 은 MIND 만 시험했다. 위치 인코더 비교 없이는 "좌표 사전지식이 지역 홀드아웃에서 무너진다"가 MIND 의 성질인지 과제의 성질인지 가를 수 없다.
설계: M111 과 동일 — 훈련 231창(궤도 19, 같은 플라시보 날짜), 표적 log 플라시보 p99, 무작위 5-fold·강 그룹 leave-one-out, 표준화 릿지 α 격자.
      각 인코더의 최선(지역 R² 기준, 낙관 편향 명시)으로 전이(b19·x12·r12·y19) ρ. 그룹별 홀드아웃 R² 도 적는다.
주장 경계: 격자 선택을 시험 지표로 했으므로 최선 행은 상한. 현장 정답 0.
"""
import json, sys, os
from pathlib import Path
import numpy as np, torch
sys.path.insert(0, "/home/work/data/olmoearth/nepal_m99/code"); sys.path.insert(0, "/home/work/data/olmoearth/mind"); sys.path.insert(0, "/home/work/data/olmoearth/satclip/satclip")
from mind_prior_m111 import load_set, ridge_cp, r2, spearman, cv_predict, folds_random, folds_group, ART  # noqa: E402
from mind_standalone import load_mind, embed  # noqa: E402
from load_lightweight import get_satclip_loc_encoder  # noqa: E402
from huggingface_hub import hf_hub_download  # noqa: E402
OUT = ART / "location_priors_m112"; OUT.mkdir(exist_ok=True)
dev = "cuda"

def enc_satclip(ckpt):
    le = get_satclip_loc_encoder(ckpt, dev).to(dev)
    def f(lat, lon):
        with torch.no_grad(): return le(torch.tensor(np.stack([lon, lat], 1), dtype=torch.float64, device=dev)).cpu().numpy().astype(np.float64)
    return f
def enc_geoclip():
    from geoclip import LocationEncoder
    le = LocationEncoder().to(dev).eval()
    def f(lat, lon):
        with torch.no_grad(): return le(torch.tensor(np.stack([lat, lon], 1), dtype=torch.float32, device=dev)).cpu().numpy().astype(np.float64)
    return f
def enc_mind(m):
    model = load_mind("/home/work/data/olmoearth/mind/weights/mind.safetensors", device=dev)
    return lambda lat, lon: embed(model, lat, lon, dim=None).astype(np.float64)[:, :m]

def main():
    train = load_set(["terai_radar_scan_t19", "terai_radar_scan_r19", "terai_radar_scan_x19", "terai_radar_scan_u19"])
    y = np.log(np.array([r["pl_p99"] for r in train])); groups = np.array([r["group"] for r in train])
    lat = np.array([r["lat"] for r in train]); lon = np.array([r["lon"] for r in train])
    F_rand = folds_random(len(y)); F_grp = folds_group(groups)
    encoders = {
        "SatCLIP L10 (ResNet50, 256-d)": enc_satclip(hf_hub_download("microsoft/SatCLIP-ResNet50-L10", "satclip-resnet50-l10.ckpt")),
        "SatCLIP L40 (ResNet50, 256-d)": enc_satclip(hf_hub_download("microsoft/SatCLIP-ResNet50-L40", "satclip-resnet50-l40.ckpt")),
        "GeoCLIP (512-d)": enc_geoclip(),
        "MIND[:64]": enc_mind(64), "MIND[:256]": enc_mind(256), "MIND[:3072]": enc_mind(3072),
    }
    res = {"n_train": len(train), "target": "log placebo p99 per window (same as M111)", "encoders": {}}
    C = np.stack([lon, lat], 1); C2 = np.c_[C, C ** 2, C[:, :1] * C[:, 1:]]
    pg_ll = cv_predict(C2, y, groups, lambda Xt, yt: ridge_cp(Xt, yt, 1.0, 1.0, [5]), F_grp)
    res["latlon_quadratic"] = {"r2_regional": float(r2(y, pg_ll)), "rho_regional": spearman(y, pg_ll)}
    for name, enc in encoders.items():
        X = enc(lat, lon); print(name, X.shape, flush=True); rows = {}; best = None
        for alpha in [0.1, 1, 10, 100, 1000, 10000]:
            fit = lambda Xt, yt, a=alpha: ridge_cp(Xt, yt, a, 1.0, [X.shape[1]])
            pr = cv_predict(X, y, groups, fit, F_rand); pg = cv_predict(X, y, groups, fit, F_grp)
            rows[f"α={alpha}"] = {"r2_random": float(r2(y, pr)), "r2_regional": float(r2(y, pg)), "rho_regional": spearman(y, pg)}
            print(f"  α={alpha:<6} R² random {r2(y, pr):6.3f} regional {r2(y, pg):6.3f} ρ {spearman(y, pg):5.2f}", flush=True)
            if best is None or r2(y, pg) > best[0]: best = (float(r2(y, pg)), alpha, pg)
        per_group = {g: float(r2(y[groups == g], best[2][groups == g])) for g in np.unique(groups)}
        fitted = ridge_cp(X, y, best[1], 1.0, [X.shape[1]]); transfer = {}
        for tag, label in [("terai_radar_scan_b19", "Budhi Gandaki"), ("terai_radar_scan_x12", "Koshi x12"), ("terai_radar_scan_r12", "Koshi r12"), ("terai_radar_scan_y19", "2024 same windows")]:
            rs = load_set([tag])
            if len(rs) < 8: continue
            Z = enc(np.array([r["lat"] for r in rs]), np.array([r["lon"] for r in rs])); t = np.log(np.array([r["pl_p99"] for r in rs]))
            transfer[label] = {"n": len(rs), "rho": spearman(t, fitted(Z))}
        res["encoders"][name] = {"dim": int(X.shape[1]), "grid": rows, "best_alpha": best[1], "best_r2_regional": best[0], "r2_regional_median": float(np.median([v["r2_regional"] for v in rows.values()])), "per_group_r2_at_best": per_group, "transfer_at_best": transfer}
        print("  best α", best[1], "regional", round(best[0], 3), "| per-group", {k: round(v, 2) for k, v in per_group.items()}, "| transfer", {k: round(v["rho"], 2) for k, v in transfer.items()}, flush=True)
    (OUT / "report.json").write_text(json.dumps(res, indent=1)); print("saved", OUT / "report.json")

if __name__ == "__main__": main()
