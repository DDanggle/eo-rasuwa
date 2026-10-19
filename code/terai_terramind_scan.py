#!/usr/bin/env python3
"""M113. 세 번째 모델 가족 — TerraMind v1 base(IBM·ESA)를 테라이 2026 궤도 19 계약에 올린다. 야드스틱 = Copernicus GFM 창 단위 CSI(M107).

왜: M98(Galileo)은 라수와 56창 자가 통과/실패 이진이라 가족 간 우열을 못 적었다. 테라이 231창에는 GFM 이라는 연속 자가 있다.
설계: 같은 prepare 큐브(gamma0 dB, 2×8×256×256), 같은 계약(t19·r19·x19·u19: base 08-24·09-05·09-17 → 09-29, 평시 07-07·07-19·07-31 → 08-12).
      TerraMind 는 단일 시점 인코더라 3장 기억 = 세 임베딩의 토큰별 평균(M108 2v1 과 같은 '기억' 정의), 토큰 = 16 px = 160 m(OlmoEarth 40 m 와 다름 — 명시).
      문턱 = 계약별 플라시보 p99(OlmoEarth 와 같은 절차). arm: dB(올바름)·linear(틀림, M97 재현). 비교 = 같은 창의 OlmoEarth candidate_token_frac.
주장 경계: 토큰 크기가 달라 frac 절대값은 같은 척도가 아니다. CSI 와 순위상관만 비교한다. 현장 정답 0.
"""
import json, sys, argparse
from pathlib import Path
import numpy as np, torch
ART = Path("/home/work/data/olmoearth/nepal_m99/artifacts"); OUT = ART / "terramind_scan_m113"; OUT.mkdir(exist_ok=True)
CONTRACTS = {"terai_radar_scan_t19": "t19", "terai_radar_scan_r19": "r19", "terai_radar_scan_x19": "x19", "terai_radar_scan_u19": "u19"}
BE, TE = ["2026-08-24", "2026-09-05", "2026-09-17"], "2026-09-29"; BP, TP = ["2026-07-07", "2026-07-19", "2026-07-31"], "2026-08-12"
dev = "cuda"

def build(size):
    """terratorch 전체 설치가 의존성 충돌로 불가(2026-10-19) → 휠에서 TerraMind 모델 코드만 꺼낸 셔림(`/home/work/data/olmoearth/tm_shim`)으로 TerraMindViT 를 직접 만든다.
    가중치는 HF `ibm-esa-geospatial/TerraMind-1.0-base` 원본, 로드는 terratorch checkpoint_filter_fn 과 같은 규칙(모양 일치 키만, strict)."""
    import torch.nn as nn
    from functools import partial
    from huggingface_hub import hf_hub_download
    sys.path.insert(0, "/home/work/data/olmoearth/tm_shim")
    from terratorch.models.backbones.terramind.model.terramind_vit import TerraMindViT
    from terratorch.models.backbones.terramind.model.tm_utils import LayerNorm
    cfg = {"terramind_v1_base": dict(encoder_depth=12, dim=768, num_heads=12, repo="ibm-esa-geospatial/TerraMind-1.0-base", file="TerraMind_v1_base.pt"),
           "terramind_v1_large": dict(encoder_depth=24, dim=1024, num_heads=16, repo="ibm-esa-geospatial/TerraMind-1.0-large", file="TerraMind_v1_large.pt")}[size]
    m = TerraMindViT(modalities=["S1RTC"], img_size=256, encoder_depth=cfg["encoder_depth"], dim=cfg["dim"], num_heads=cfg["num_heads"], mlp_ratio=4, qkv_bias=False, proj_bias=False, mlp_bias=False,
                     num_register_tokens=0, norm_layer=partial(LayerNorm, eps=1e-6, bias=False), act_layer=nn.SiLU, gated_mlp=True)
    sd = torch.load(hf_hub_download(cfg["repo"], cfg["file"]), map_location="cpu", weights_only=True); msd = m.state_dict()
    clean = {k: v for k, v in sd.items() if k in msd and v.shape == msd[k].shape}; missing = [k for k in msd if k not in clean]
    assert all("pos_emb" in k for k in missing), missing   # 고정 sin-cos 위치 버퍼만 비어도 된다(256 격자용으로 새로 계산됨)
    m.load_state_dict({**msd, **clean}); print("terramind loaded", len(clean), "tensors; missing(pos_emb only)", len(missing), flush=True)
    return m.to(dev).eval()

# TerraMind v1 사전학습 표준화(terratorch terramind_register.py v1_pretraining_mean/std, untok_sen1rtc@224, dB)
MEAN = np.array([-10.93, -17.329], dtype="float32"); STD = np.array([4.391, 4.459], dtype="float32")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--size", default="terramind_v1_base"); ap.add_argument("--limit", type=int, default=0); a = ap.parse_args()
    model = build(a.size); print("MEAN/STD", MEAN, STD, flush=True)

    def embed(img_db, linear=False):
        x = img_db.copy(); x = np.nan_to_num(x, nan=-25.0)
        if linear: x = 10 ** (x / 10.0)
        x = (x - MEAN[:, None, None]) / STD[:, None, None]
        t = torch.from_numpy(x[None]).float().to(dev)
        with torch.no_grad():
            out = model({"S1RTC": t})
        tok = out[-1] if isinstance(out, (list, tuple)) else out
        if tok.dim() == 3:  # B, N, D → grid
            n = int(round(tok.shape[1] ** 0.5)); tok = tok[0].T.reshape(-1, n, n)
        else: tok = tok[0]
        return tok.float().cpu()

    def delta(za, zb):
        num = (za * zb).sum(0); return (1 - num / (za.norm(dim=0).clamp(min=1e-8) * zb.norm(dim=0).clamp(min=1e-8))).numpy()

    gfm = json.loads((ART / "gfm/gfm_window_fracs.json").read_text())
    res = {"model": a.size, "memory": "mean of 3 pre-date token embeddings (single-timestep encoder)", "token_px": 16, "contracts": {}, "windows": []}
    for tag, short in CONTRACTS.items():
        rep = json.loads((ART / tag / "report.json").read_text()); oe = {w["id"]: w for w in rep["windows"]}
        files = sorted((ART / tag / "prepare").glob("*.npz"))
        if a.limit: files = files[:a.limit]
        rows = []; pools = {"db": [], "linear": []}
        for f in files:
            d = np.load(f); dates = [str(x) for x in d["dates"]]; raw = {k: d["cube"][:, i] for i, k in enumerate(dates)}
            w = oe.get(f.stem)
            if w is None or w["status"] != "ranked": continue
            row = {"id": f.stem, "aoi": str(d["aoi"]), "contract": short, "oe_frac": w["candidate_token_frac"]}
            for arm in ("db", "linear"):
                lin = arm == "linear"
                mem_e = torch.stack([embed(raw[k], lin) for k in BE]).mean(0); d_ev = delta(mem_e, embed(raw[TE], lin))
                mem_p = torch.stack([embed(raw[k], lin) for k in BP]).mean(0); d_pl = delta(mem_p, embed(raw[TP], lin))
                n = d_ev.shape[0]; tok = lambda m: np.isnan(m[0]).reshape(n, 256 // n, n, 256 // n).mean(axis=(1, 3))
                v_ev = (np.mean([tok(raw[k]) for k in BE], 0) <= 0.5) & (tok(raw[TE]) <= 0.5); v_pl = (np.mean([tok(raw[k]) for k in BP], 0) <= 0.5) & (tok(raw[TP]) <= 0.5)
                row[f"{arm}_d_event"] = d_ev[v_ev].tolist(); row[f"{arm}_d_placebo_valid"] = d_pl[v_pl].tolist(); pools[arm].append(d_pl[v_pl])
            rows.append(row); print(short, f.stem, "ev mean db %.3f lin %.3f" % (np.mean(row["db_d_event"]), np.mean(row["linear_d_event"])), flush=True)
        thr = {arm: float(np.quantile(np.concatenate(pools[arm]), 0.99)) for arm in pools}
        for r in rows:
            for arm in ("db", "linear"):
                r[f"{arm}_frac"] = float((np.array(r[f"{arm}_d_event"]) > thr[arm]).mean()); del r[f"{arm}_d_event"]; del r[f"{arm}_d_placebo_valid"]
        res["contracts"][short] = {"threshold_p99": thr, "n": len(rows), "oe_threshold": rep["threshold_placebo_p99"]}
        res["windows"] += rows; print(short, "thr", thr, "n", len(rows), flush=True)
    # 비교: 순위상관 + GFM CSI
    W = res["windows"]
    def sp(a, b):
        ra = np.argsort(np.argsort(a)); rb = np.argsort(np.argsort(b)); return float(np.corrcoef(ra, rb)[0, 1])
    oe = np.array([w["oe_frac"] for w in W]); tdb = np.array([w["db_frac"] for w in W]); tlin = np.array([w["linear_frac"] for w in W])
    res["rank_corr"] = {"terramind_db_vs_olmoearth": sp(oe, tdb), "terramind_linear_vs_olmoearth": sp(oe, tlin), "terramind_db_vs_linear": sp(tdb, tlin)}
    ev = [(w, gfm[w["id"]]["gfm_flood_frac"]) for w in W if w["id"] in gfm and gfm[w["id"]]["gfm_flood_frac"] is not None]
    truth = np.array([g >= 0.02 for _, g in ev])
    def csi(flags):
        tp = int((flags & truth).sum()); fp = int((flags & ~truth).sum()); fn = int((~flags & truth).sum())
        return {"csi": tp / max(tp + fp + fn, 1), "precision": tp / max(tp + fp, 1), "recall": tp / max(tp + fn, 1), "tp": tp, "fp": fp, "fn": fn}
    res["gfm"] = {"n": len(ev), "positive": int(truth.sum()), "by_tau": {}}
    for tau in (0.05, 0.03, 0.02):
        res["gfm"]["by_tau"][str(tau)] = {k: csi(np.array([w[f] >= tau for w, _ in ev])) for k, f in (("olmoearth", "oe_frac"), ("terramind_db", "db_frac"), ("terramind_linear", "linear_frac"))}
        print("τ", tau, {k: round(v["csi"], 3) for k, v in res["gfm"]["by_tau"][str(tau)].items()}, flush=True)
    # 강 그룹별 깃발 평균(≥5%) 비교
    groups = {}
    for w in W: groups.setdefault(w["aoi"], []).append(w)
    res["by_aoi"] = {g: {"n": len(v), "oe_big": int(sum(x["oe_frac"] >= 0.05 for x in v)), "tm_big": int(sum(x["db_frac"] >= 0.05 for x in v)), "rho": sp([x["oe_frac"] for x in v], [x["db_frac"] for x in v]) if len(v) > 4 else None} for g, v in groups.items()}
    print(json.dumps(res["rank_corr"]), flush=True); print(json.dumps(res["by_aoi"], indent=0)[:1500], flush=True)
    (OUT / f"report_{a.size}.json").write_text(json.dumps(res, indent=1)); print("saved", OUT / f"report_{a.size}.json")

if __name__ == "__main__": main()
