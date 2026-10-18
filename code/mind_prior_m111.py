#!/usr/bin/env python3
"""M111. 좌표만으로 '이 자리의 평소 흔들림'을 예측할 수 있나 — MIND(Corley et al. 2026, arXiv 2609.25454) 좌표 임베딩으로 창별 플라시보 p99 를 회귀한다.

왜: 지금은 모든 창의 플라시보 Δz 를 한 통에 넣어 상위 1% 를 문턱으로 쓴다(전역 문턱). 산악·평야·젖은 지역이 같은 잣대를 받는다.
    MIND 는 위성 사진 없이 위경도만으로 그 자리의 기후·지형·토지피복 사전지식을 준다. 이것으로 창별 기준선을 예측할 수 있으면
    (a) 지역 홀드아웃에서도 버티는지, (b) 창별 문턱으로 바꿨을 때 GFM 대비 CSI 가 좋아지는지를 잰다.
설계: 훈련 집합 = 궤도 19·같은 플라시보 날짜(07-07·07-19·07-31→08-12)를 쓰는 2026 계약 t19·r19·x19·u19(248창).
      표적 = 창의 유효 플라시보 토큰 Δz 의 p99 (log). 특징 = MIND 전체 3072 차원(prefix 절단·Chunked Penalty 격자).
      홀드아웃 = 무작위 5-fold 와 **지역(aoi 단위 leave-one-group-out)**. 비교 = 상수(전역), 위경도 릿지, 좌표 IDW.
      전이 = b19(다른 플라시보 날짜, 산악 37창), x12(다른 궤도, 코시 51창), y19(2024년, 148창): 예측 vs 실측 순위상관.
      적용 = 지역 홀드아웃 예측치로 창별 문턱(전역 p99 × 예측/평균) → 사건 frac 재계산 → GFM(≥2%) 대비 CSI, 전역 문턱과 비교.
주장 경계: 사전지식이지 관측이 아니다. 문턱을 자리마다 바꾸는 것이 '감지'를 바꾸진 않는다. 현장 정답 0.
"""
from __future__ import annotations
import json, sys, itertools
from pathlib import Path
import numpy as np
sys.path.insert(0, "/home/work/data/olmoearth/mind")
from mind_standalone import load_mind, embed  # noqa: E402

ART = Path("/home/work/data/olmoearth/nepal_m99/artifacts"); OUT = ART / "mind_prior_m111"; OUT.mkdir(exist_ok=True)
CHUNKS = [64, 128, 256, 512, 1024, 2048, 3072]
GROUP = {"butwal": "tinau", "river_tinau": "tinau", "xriver_tinau": "tinau", "devghat": "narayani_upper", "xriver_narayani_upper": "narayani_upper",
         "susta": "narayani_susta", "river_narayani": "narayani_susta", "xriver_narayani": "gandak_lower", "dharapani": "rapti", "xriver_rapti": "rapti",
         "xriver_bagmati": "bagmati", "saptari": "koshi", "river_koshi": "koshi", "xriver_koshi": "koshi", "xriver_budhi_gandaki": "budhi_gandaki"}

def load_set(tags):
    rows = []
    for tag in tags:
        rep = json.loads((ART / tag / "report.json").read_text())
        for w in rep["windows"]:
            if w["status"] != "ranked": continue
            d = np.load(ART / tag / "embed" / f"{w['id']}_delta.npz")
            pl = d["d_placebo"][d["valid_placebo"]]; ev = d["d_event"][d["valid_event"]]
            if pl.size < 200 or ev.size < 200: continue
            rows.append({"id": w["id"], "tag": tag, "aoi": w["aoi"], "group": GROUP.get(w["aoi"], w["aoi"]), "lon": w["center_lonlat"][0], "lat": w["center_lonlat"][1],
                         "pl_p99": float(np.quantile(pl, 0.99)), "pl_mean": float(pl.mean()), "ev": ev, "thr_global": rep["threshold_placebo_p99"], "frac_global": w["candidate_token_frac"]})
    return rows

def ridge_cp(X, y, alpha, gamma, chunks=CHUNKS):
    """Chunked-Penalty ridge (논문 식): 차원 i 가 속한 청크 j 에 alpha*gamma**j. 표준화는 훈련 통계. 절편은 벌점 없음."""
    mu, sd = X.mean(0), X.std(0) + 1e-8; Xs = (X - mu) / sd; ym = y.mean()
    pen = np.empty(X.shape[1]); lo = 0
    for j, hi in enumerate(chunks):
        if lo >= X.shape[1]: break
        pen[lo:min(hi, X.shape[1])] = alpha * gamma ** j; lo = hi
    A = Xs.T @ Xs + np.diag(pen); b = np.linalg.solve(A, Xs.T @ (y - ym))
    return lambda Xt: ((Xt - mu) / sd) @ b + ym

def r2(y, p): return 1 - ((y - p) ** 2).sum() / ((y - y.mean()) ** 2).sum()
def spearman(a, b):
    ra = np.argsort(np.argsort(a)); rb = np.argsort(np.argsort(b)); return float(np.corrcoef(ra, rb)[0, 1])

def cv_predict(X, y, groups, fit, folds):
    pred = np.zeros_like(y)
    for tr, te in folds: pred[te] = fit(X[tr], y[tr])(X[te])
    return pred

def folds_random(n, k=5, seed=0):
    idx = np.random.default_rng(seed).permutation(n); parts = np.array_split(idx, k)
    return [(np.setdiff1d(idx, p), p) for p in parts]
def folds_group(groups):
    return [(np.where(groups != g)[0], np.where(groups == g)[0]) for g in np.unique(groups)]

def idw(k=10, power=1.0):
    def fit(Xc, y):
        def pred(Xt):
            out = np.empty(len(Xt))
            for i, c in enumerate(Xt):
                d = np.hypot((Xc[:, 0] - c[0]) * 99, (Xc[:, 1] - c[1]) * 111) + 1e-3; nn = np.argsort(d)[:k]; w = 1 / d[nn] ** power
                out[i] = (w * y[nn]).sum() / w.sum()
            return out
        return pred
    return fit

def main():
    model = load_mind("/home/work/data/olmoearth/mind/weights/mind.safetensors", device="cuda")
    train = load_set(["terai_radar_scan_t19", "terai_radar_scan_r19", "terai_radar_scan_x19", "terai_radar_scan_u19"])
    # t19 와 x19/u19 가 같은 자리를 겹쳐 읽는 경우(뉴스 상자 vs 강 회랑)는 둘 다 둔다 — 창 경계가 다르다.
    y = np.log(np.array([r["pl_p99"] for r in train])); groups = np.array([r["group"] for r in train])
    lat = np.array([r["lat"] for r in train]); lon = np.array([r["lon"] for r in train])
    X = embed(model, lat, lon, dim=None).astype(np.float64); C = np.stack([lon, lat], 1)
    print("train windows", len(train), "groups", dict(zip(*np.unique(groups, return_counts=True))), "X", X.shape, flush=True)
    res = {"n_train": len(train), "groups": {g: int(n) for g, n in zip(*np.unique(groups, return_counts=True))}, "target": "log placebo p99 per window", "models": {}}
    F_rand = folds_random(len(y)); F_grp = folds_group(groups)
    def evaluate(name, fit, Xf):
        pr = cv_predict(Xf, y, groups, fit, F_rand); pg = cv_predict(Xf, y, groups, fit, F_grp)
        res["models"][name] = {"r2_random": float(r2(y, pr)), "r2_regional": float(r2(y, pg)), "rho_random": spearman(y, pr), "rho_regional": spearman(y, pg)}
        print(f"{name:34s} R² random {r2(y, pr):6.3f}  regional {r2(y, pg):6.3f}  ρ reg {spearman(y, pg):5.2f}", flush=True); return pg
    # 기준선들
    evaluate("constant (current global threshold)", lambda Xt, yt: (lambda Z: np.full(len(Z), yt.mean())), C)
    C2 = np.c_[C, C ** 2, C[:, :1] * C[:, 1:]]
    evaluate("lat/lon ridge (deg + deg²)", lambda Xt, yt: ridge_cp(Xt, yt, 1.0, 1.0, [5]), C2)
    evaluate("coordinate IDW k=10", idw(10), C)
    # MIND: prefix 절단 × 표준 릿지, 그리고 Chunked Penalty. 격자는 **내부** 검증으로 골라야 하지만 n 이 작아 격자 전체를 보고하고 최선과 중앙값을 같이 적는다(낙관 편향 명시).
    best = None
    for m in CHUNKS:
        for alpha in [0.1, 1, 10, 100, 1000]:
            pg = evaluate(f"MIND[:{m}] ridge α={alpha}", lambda Xt, yt, a=alpha: ridge_cp(Xt, yt, a, 1.0), X[:, :m])
            sc = res["models"][f"MIND[:{m}] ridge α={alpha}"]["r2_regional"]
            if best is None or sc > best[0]: best = (sc, f"MIND[:{m}] ridge α={alpha}", pg)
    for alpha, gamma in itertools.product([1, 10, 100], [3, 10, 100, 1000]):
        pg = evaluate(f"MIND full CP α={alpha} γ={gamma}", lambda Xt, yt, a=alpha, g=gamma: ridge_cp(Xt, yt, a, g), X)
        sc = res["models"][f"MIND full CP α={alpha} γ={gamma}"]["r2_regional"]
        if sc > best[0]: best = (sc, f"MIND full CP α={alpha} γ={gamma}", pg)
    mind_scores = [v["r2_regional"] for k, v in res["models"].items() if k.startswith("MIND")]
    res["best_regional"] = {"model": best[1], "r2": best[0]}; res["mind_regional_r2_median"] = float(np.median(mind_scores))
    print("BEST regional", best[1], round(best[0], 3), "| median over MIND grid", round(float(np.median(mind_scores)), 3), flush=True)
    # 전이: 다른 날짜/궤도/해 — 훈련 전체로 맞춘 최선 모델의 예측 vs 실측 순위상관
    name = best[1]
    if "CP" in name: a = float(name.split("α=")[1].split()[0]); g = float(name.split("γ=")[1]); fitted = ridge_cp(X, y, a, g); feat = lambda Z: Z
    else: m = int(name.split("[:")[1].split("]")[0]); a = float(name.split("α=")[1]); fitted = ridge_cp(X[:, :m], y, a, 1.0); feat = lambda Z, mm=m: Z[:, :mm]
    res["transfer"] = {}
    for tag, label in [("terai_radar_scan_b19", "b19 Budhi Gandaki (other placebo dates, mountains)"), ("terai_radar_scan_x12", "x12 Koshi (orbit 12)"), ("terai_radar_scan_r12", "r12 Koshi (orbit 12)"), ("terai_radar_scan_y19", "y19 2024 (2v1, other year)")]:
        if not (ART / tag / "report.json").exists(): continue
        rows = load_set([tag]); 
        if len(rows) < 8: continue
        Z = embed(model, np.array([r["lat"] for r in rows]), np.array([r["lon"] for r in rows]), dim=None).astype(np.float64)
        p = fitted(feat(Z)); t = np.log(np.array([r["pl_p99"] for r in rows]))
        res["transfer"][tag] = {"label": label, "n": len(rows), "rho": spearman(t, p), "r2_after_affine": float(r2(t, np.polyval(np.polyfit(p, t, 1), p)))}
        print(f"transfer {label:52s} n={len(rows):3d} ρ={spearman(t, p):5.2f}", flush=True)
    # 적용: 지역 홀드아웃 예측(최선 모델)으로 창별 문턱 → GFM CSI. 정답 = GFM 홍수 ≥2%(M107 과 같은 정의).
    gfm = json.loads((ART / "gfm/gfm_window_fracs.json").read_text()); pg = best[2]
    scale = np.exp(pg - pg.mean())   # 예측 p99 / 기하평균 → 전역 문턱에 곱한다
    rows_eval = [(r, s) for r, s in zip(train, scale) if r["id"] in gfm and gfm[r["id"]]["gfm_flood_frac"] is not None]
    def csi(flags, truth):
        tp = int(sum(f and t for f, t in zip(flags, truth))); fp = int(sum(f and not t for f, t in zip(flags, truth))); fn = int(sum((not f) and t for f, t in zip(flags, truth)))
        return {"csi": tp / max(tp + fp + fn, 1), "precision": tp / max(tp + fp, 1), "recall": tp / max(tp + fn, 1), "tp": tp, "fp": fp, "fn": fn}
    truth = [gfm[r["id"]]["gfm_flood_frac"] >= 0.02 for r, _ in rows_eval]
    res["application"] = {"n": len(rows_eval), "gfm_positive": int(sum(truth)), "rule": "flag if frac >= 5%; per-window threshold = global p99 × exp(pred − mean pred), pred from regional holdout"}
    for tau in (0.05, 0.03, 0.02):
        fg = [r["frac_global"] >= tau for r, _ in rows_eval]
        fw = [float((r["ev"] > r["thr_global"] * s).mean()) >= tau for r, s in rows_eval]
        res["application"][f"tau_{tau}"] = {"global_threshold": csi(fg, truth), "per_window_threshold": csi(fw, truth)}
        print(f"τ={tau}: global CSI {csi(fg, truth)['csi']:.3f} (P {csi(fg, truth)['precision']:.2f} R {csi(fg, truth)['recall']:.2f}) | per-window CSI {csi(fw, truth)['csi']:.3f} (P {csi(fw, truth)['precision']:.2f} R {csi(fw, truth)['recall']:.2f})", flush=True)
    # 창별 사전지식 산출물(웹용): id, group, 실측 log p99, 지역 홀드아웃 예측, 배율
    res["windows"] = [{"id": r["id"], "group": r["group"], "lon": r["lon"], "lat": r["lat"], "pl_p99": r["pl_p99"], "pred_log_p99_regional": float(p), "scale": float(s), "frac_global": r["frac_global"], "frac_per_window": float((r["ev"] > r["thr_global"] * s).mean())} for r, p, s in zip(train, pg, scale)]
    (OUT / "report.json").write_text(json.dumps(res, indent=1)); print("saved", OUT / "report.json")

if __name__ == "__main__": main()
