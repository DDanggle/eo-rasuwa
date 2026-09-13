#!/usr/bin/env python3
"""M98. 두 번째 모델 가족 — Galileo 로 같은 계약을 돌린다.

왜: M95(결합 47→97)와 M96(크기 무관)은 전부 OlmoEarth **한 가족** 안에서 나온 결과다.
"공유 임베딩 공간이 커버리지를 두 배로 만든다"가 OlmoEarth 고유인지 다중모달 GeoFM 일반인지
가르려면 다른 가족이 필요하다. Galileo(nasaharvest, MIT)는 S1·S2 를 함께 받는 다중모달이고
nano/tiny/base 세 크기가 있어 크기 질문도 같이 볼 수 있다.

계약은 M93(궤도 19)과 **완전히 동일**하다 — 같은 창 56개, 같은 날짜, 같은 3v1 구조,
같은 placebo p99 방식, 같은 마스크 규칙. 바뀌는 것은 인코더뿐이다.

단위: Galileo 도 S1 이 dB 인지 linear 인지 어디에도 적지 않는다(OlmoEarth 와 같은 문제).
정규화 상수가 shift 25 / div 25 로 dB 스케일 크기이긴 하나 문서화된 바 없으므로,
M97 에서 쓴 방법을 그대로 적용한다 — **양쪽 다 돌리고 계약 테스트로 판정한다.**

주의: Galileo 토큰은 밴드그룹 축을 갖는다([B,h,w,T,7,D]). S1 그룹만 꺼내 쓰고 나머지 6그룹은
마스크 1(인코더가 보지 않음)로 둔다. 광학을 함께 넣는 실험은 별도 계약으로 한다.
"""
from __future__ import annotations
import argparse, json, sys, time
from datetime import datetime
from pathlib import Path

import numpy as np

from nepal_paths import ARTIFACT_ROOT, REPO_ROOT

GALILEO_SRC = Path("/private/tmp/claude-501/-Users-dgyi-dong-ai-projects-nepal-live-twin/"
                   "97316674-c782-4104-8ec8-e39602593af8/scratchpad/galileo")
DATES = ["2026-07-07", "2026-07-19", "2026-07-31", "2026-08-12", "2026-08-24", "2026-09-05"]
BASE_EVENT, TARGET_EVENT = ["2026-07-31", "2026-08-12", "2026-08-24"], "2026-09-05"
BASE_PLACEBO, TARGET_PLACEBO = ["2026-07-07", "2026-07-19", "2026-07-31"], "2026-08-12"
SIZE, PATCH, CROP = 256, 4, 64
CUBES = ARTIFACT_ROOT / "source_radar_scan_o19/prepare"   # dB 로 캐시된 큐브를 공유


def gaps(base, target):
    t = datetime.fromisoformat(target)
    return [(t - datetime.fromisoformat(b)).days for b in base]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", choices=["nano", "tiny", "base"], default="base")
    ap.add_argument("--units", choices=["db", "linear"], default="db")
    a = ap.parse_args()
    assert gaps(BASE_EVENT, TARGET_EVENT) == gaps(BASE_PLACEBO, TARGET_PLACEBO)

    sys.path.insert(0, str(GALILEO_SRC))
    import torch
    import single_file_galileo as G

    out_dir = ARTIFACT_ROOT / f"galileo_scan_o19_{a.model}" / (a.units if a.units != "db" else "")
    (out_dir / "embed").mkdir(parents=True, exist_ok=True)
    device = torch.device("cpu")   # Galileo 는 작고, MPS 이슈를 피한다
    enc = G.Encoder.load_from_folder(GALILEO_SRC / "models" / a.model, device).eval()
    D = enc.embedding_size
    n_st, n_sp, n_t, n_stat = (len(G.SPACE_TIME_BANDS), len(G.SPACE_BANDS),
                               len(G.TIME_BANDS), len(G.STATIC_BANDS))
    g_st, g_sp, g_t, g_stat = (len(G.SPACE_TIME_BANDS_GROUPS_IDX), len(G.SPACE_BAND_GROUPS_IDX),
                               len(G.TIME_BAND_GROUPS_IDX), len(G.STATIC_BAND_GROUPS_IDX))
    # single_file_galileo.py 에는 정규화 상수가 들어 있지 않다(포팅용 파일인데도).
    # 출처: nasaharvest/galileo src/data/earthengine/s1.py
    #   S1_SHIFT_VALUES = [25.0, 25.0] ; S1_DIV_VALUES = [25.0, 25.0]
    # 25 dB 폭이라는 크기 자체가 dB 스케일을 전제하나, 문서에 그렇게 적힌 곳은 없다.
    shift = np.array([25.0, 25.0], dtype="float32")
    div = np.array([25.0, 25.0], dtype="float32")
    print(f"galileo {a.model}: D={D}  units={a.units}  S1 shift={shift} div={div}", flush=True)

    months = {d: datetime.fromisoformat(d).month for d in DATES}

    def embed(raw_db: np.ndarray, dates: list[str]) -> np.ndarray:
        """raw_db: (2, T, 256, 256) dB. 반환: (D, 64, 64) 토큰맵."""
        x = raw_db.copy()
        if a.units == "linear":
            x = np.power(10.0, x / 10.0)
        x = np.nan_to_num(x, nan=(-25.0 if a.units == "db" else 10.0 ** -2.5))
        x = (x - shift[:, None, None, None]) / div[:, None, None, None]
        T = len(dates)
        mo = torch.tensor([[months[d] for d in dates]], dtype=torch.long)
        feat = np.zeros((D, SIZE // PATCH, SIZE // PATCH), dtype="float32")
        n = SIZE // CROP
        for iy in range(n):
            for ix in range(n):
                y0, x0 = iy * CROP, ix * CROP
                patch = x[:, :, y0:y0 + CROP, x0:x0 + CROP]                  # (2,T,64,64)
                st_x = torch.zeros(1, CROP, CROP, T, n_st)
                st_x[0, :, :, :, 0] = torch.from_numpy(patch[0].transpose(1, 2, 0))
                st_x[0, :, :, :, 1] = torch.from_numpy(patch[1].transpose(1, 2, 0))
                st_m = torch.ones(1, CROP, CROP, T, g_st, dtype=torch.long)
                st_m[..., 0] = 0                                              # S1 그룹만 본다
                with torch.no_grad():
                    o = enc(st_x, torch.zeros(1, CROP, CROP, n_sp), torch.zeros(1, T, n_t),
                            torch.zeros(1, n_stat), st_m,
                            torch.ones(1, CROP, CROP, g_sp, dtype=torch.long),
                            torch.ones(1, T, g_t, dtype=torch.long),
                            torch.ones(1, g_stat, dtype=torch.long), mo, patch_size=PATCH)
                tok = o[0][0, :, :, :, 0, :].mean(dim=2)                       # S1 그룹, 시간 평균 → (h,w,D)
                h = CROP // PATCH
                feat[:, y0 // PATCH:y0 // PATCH + h, x0 // PATCH:x0 // PATCH + h] = \
                    tok.permute(2, 0, 1).numpy()
        return feat

    def delta(za, zb):
        num = (za * zb).sum(0)
        na = np.linalg.norm(za, axis=0).clip(min=1e-8)
        nb = np.linalg.norm(zb, axis=0).clip(min=1e-8)
        return (1 - num / (na * nb)).astype("float32")

    tok = lambda arr: arr.reshape(64, 4, 64, 4).mean(axis=(1, 3))
    rows, pool, t0 = [], [], time.time()
    for f in sorted(CUBES.glob("v*.npz")):
        wid = f.stem
        outp = out_dir / "embed" / f"{wid}_delta.npz"
        d = np.load(f)
        raw = {str(x): d["cube"][:, i] for i, x in enumerate(d["dates"])}
        if outp.exists():
            dd = np.load(outp)
            d_ev, d_pl, v_ev, v_pl = dd["d_event"], dd["d_placebo"], dd["valid_event"], dd["valid_placebo"]
        else:
            st = lambda ds: np.stack([raw[k] for k in ds], axis=1)
            d_ev = delta(embed(st(BASE_EVENT), BASE_EVENT), embed(st([TARGET_EVENT]), [TARGET_EVENT]))
            d_pl = delta(embed(st(BASE_PLACEBO), BASE_PLACEBO), embed(st([TARGET_PLACEBO]), [TARGET_PLACEBO]))
            bad = {k: tok(~np.isfinite(raw[k][0])) for k in DATES}
            v_ev = (np.mean([bad[k] for k in BASE_EVENT], axis=0) <= 0.5) & (bad[TARGET_EVENT] <= 0.5)
            v_pl = (np.mean([bad[k] for k in BASE_PLACEBO], axis=0) <= 0.5) & (bad[TARGET_PLACEBO] <= 0.5)
            np.savez_compressed(outp, d_event=d_ev, d_placebo=d_pl,
                                valid_event=v_ev, valid_placebo=v_pl, center=d["center"])
        pool.append(d_pl[v_pl])
        rows.append({"id": wid, "center_lonlat": d["center"].tolist(),
                     "valid_event_frac": float(v_ev.mean()),
                     "d_event_mean": float(d_ev[v_ev].mean()) if v_ev.any() else None,
                     "d_placebo_mean": float(d_pl[v_pl].mean()) if v_pl.any() else None})
        print(f"  {wid} Δev {rows[-1]['d_event_mean']:.4f}  ({time.time()-t0:.0f}s)", flush=True)

    pool_all = np.concatenate([p for p in pool if len(p)])
    thr = float(np.quantile(pool_all, 0.99))
    for r in rows:
        dd = np.load(out_dir / "embed" / f"{r['id']}_delta.npz")
        v, de = dd["valid_event"], dd["d_event"]
        r["candidate_token_frac"] = float((de[v] > thr).mean()) if v.any() else None
        r["status"] = "ranked" if (r["valid_event_frac"] >= 0.2 and r["candidate_token_frac"] is not None) else "unobservable"
    ranked = sorted([r for r in rows if r["status"] == "ranked"], key=lambda r: -r["candidate_token_frac"])
    for i, r in enumerate(ranked):
        r["rank"] = i + 1
    rep = {"schema": "galileo-scan-v1", "measurement_id": "M98",
           "model_family": "Galileo (nasaharvest)", "model_size": a.model,
           "embedding_dim": D, "input_unit": a.units,
           "contract": "identical to M93: orbit 19 desc, base 07-31/08-12/08-24 -> 09-05, placebo 07-07/07-19/07-31 -> 08-12",
           "gap_days": {"event": gaps(BASE_EVENT, TARGET_EVENT), "placebo": gaps(BASE_PLACEBO, TARGET_PLACEBO)},
           "threshold_placebo_p99": thr, "placebo_tokens": int(len(pool_all)),
           "windows": rows,
           "top10": [{k: r[k] for k in ("id", "rank", "center_lonlat", "candidate_token_frac")} for r in ranked[:10]],
           "elapsed_s": round(time.time() - t0, 1)}
    (out_dir / "report.json").write_text(json.dumps(rep, indent=1) + "\n")
    print(f"\nTHRESHOLD {thr:.4f}  ranked {len(ranked)}  ({rep['elapsed_s']}s)")
    for r in ranked[:8]:
        print(f"  {r['rank']:2} {r['id']} {r['candidate_token_frac']:.3f}")


if __name__ == "__main__":
    main()
