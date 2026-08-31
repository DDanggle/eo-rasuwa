#!/usr/bin/env python3
"""M17 후보 — OlmoEarth 임베딩의 cross-region 산사태 검색 실측 (CPU, 기존 캐시 재사용).

질문 (RQ-N2 계열): OlmoEarth v1 임베딩은 "이 산사태와 비슷한 곳"을 **다른 지역에서**
찾아내는가 — 아니면 지형·계절이 비슷한 곳을 찾을 뿐인가?

데이터: sen12_pilot_full128/holdout_chimanimani 캐시 (다른 세션 확증 실행의 부산물,
  이 실험은 읽기 전용 재사용임): 10지역 6,834패치,
  emb (768,32,32) fp16 / mask (128,128) u8 / raw (10,12,128,128) u16.

프로토콜 (사전 등록):
  - positive := mask 양성픽셀 ≥ 82 (=128²의 0.5%)
  - query    := 각 지역의 positive 패치. 두 변형:
      whole  = 토큰 전체 평균 768-d
      masked = mask를 32×32 토큰 그리드로 축소해 양성 토큰만 평균 (양성 토큰 0이면 whole)
  - gallery  := query 지역을 **제외한** 전 지역 whole-pooled 벡터 (leave-region-out)
  - metric   := precision@10 (cosine top-10 중 positive 비율), 지역별 + region-macro
  - baseline := (a) base rate: gallery의 positive 비율
                (b) raw-spectral: raw u16 (band,time) 평균 → 120-d, 동일 프로토콜

판정 (사전 등록, 어기면 '미검출'로 보고):
  OLMo(masked) region-macro P@10 이 (a) raw-spectral P@10 초과 AND (b) base-rate의 2배 초과
  일 때만 "임베딩이 지역을 넘는 산사태 서명을 담는다"고 말함.
  주의: 이 캐시는 12 timestep 전체를 인코딩하므로 patch에는 사건 전후가 섞여 있음 —
  '변화 벡터'가 아니라 'positive 패치의 상태 서명' 검색임. 그 한계를 결과에 명시함.
"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

import numpy as np

from nepal_paths import ARTIFACT_ROOT

DEFAULT_CACHE = Path(os.environ.get(
    "SEN12_EMBEDDING_CACHE",
    "/home/work/data/olmoearth/sen12_pilot_full128/holdout_chimanimani",
))
POS_PIXELS = 82           # 128*128 * 0.5%
TOPK = 10
TOKEN = 32


def region_of(name: str) -> str:
    return name.split("_s2_")[0]


def average_precision_at_k(hit_sorted: np.ndarray, total_relevant: int, k: int) -> float:
    """Standard AP@k with denominator min(total relevant in gallery, k).

    Dividing by only the positives retrieved inside k is not AP@k: it rewards a
    query that retrieves very few positives as long as those few appear early.
    """
    hit = np.asarray(hit_sorted, dtype=bool)[:k]
    denominator = min(int(total_relevant), int(k))
    if denominator <= 0 or not hit.any():
        return 0.0
    precision_at_rank = np.cumsum(hit) / np.arange(1, len(hit) + 1)
    return float((precision_at_rank * hit).sum() / denominator)


def recall_at_k(hit_sorted: np.ndarray, total_relevant: int, k: int) -> float:
    hit = np.asarray(hit_sorted, dtype=bool)[:k]
    return float(hit.sum() / total_relevant) if total_relevant > 0 else 0.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--out", type=Path, default=ARTIFACT_ROOT / "sen12_retrieval_probe")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data_root = args.cache
    output_root = args.out
    if not data_root.is_dir():
        raise SystemExit(f"missing SEN12 embedding cache: {data_root}; pass --cache")
    output_root.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    files = sorted(p.name for p in (data_root / "emb_fp16").glob("*.npy"))
    n = len(files)
    print(f"패치 {n}개 로드 시작")

    regions, positives = [], np.zeros(n, dtype=bool)
    emb_whole = np.zeros((n, 768), dtype=np.float32)
    emb_masked = np.zeros((n, 768), dtype=np.float32)
    raw_vec = np.zeros((n, 120), dtype=np.float32)

    for i, f in enumerate(files):
        regions.append(region_of(f))
        e = np.load(data_root / "emb_fp16" / f).astype(np.float32)  # (768,32,32)
        emb_whole[i] = e.mean(axis=(1, 2))
        m = np.load(data_root / "mask_u8" / f)                       # (128,128)
        pos = int((m > 0).sum())
        positives[i] = pos >= POS_PIXELS
        # mask -> 토큰 그리드(4px 블록 max)
        mt = m.reshape(TOKEN, 4, TOKEN, 4).max(axis=(1, 3)) > 0     # (32,32)
        if positives[i] and mt.any():
            emb_masked[i] = e[:, mt].mean(axis=1)
        else:
            emb_masked[i] = emb_whole[i]
        r = np.load(data_root / "raw_u16" / f).astype(np.float32)    # (10,12,128,128)
        raw_vec[i] = r.mean(axis=(2, 3)).reshape(-1)
        if (i + 1) % 1000 == 0:
            print(f"  {i+1}/{n}  {time.time()-t0:.0f}s")

    regions = np.array(regions)
    region_list = sorted(set(regions))
    print(f"로드 완료 {time.time()-t0:.0f}s | positive {int(positives.sum())}/{n} "
          f"({positives.mean():.3f})")

    def normalize(x):
        return x / np.clip(np.linalg.norm(x, axis=1, keepdims=True), 1e-9, None)

    def run(query_mat, gallery_mat, tag):
        Q, G = normalize(query_mat), normalize(gallery_mat)
        per_region = {}
        for reg in region_list:
            q_idx = np.where((regions == reg) & positives)[0]
            g_idx = np.where(regions != reg)[0]
            if len(q_idx) == 0:
                continue
            base = float(positives[g_idx].mean())
            sims = Q[q_idx] @ G[g_idx].T                # (nq, ng)
            order = np.argsort(-sims, axis=1)
            top = order[:, :TOPK]
            hit = positives[g_idx][top]                 # (nq, k)
            p10 = float(hit.mean())
            # AP@100/Recall@100: 상위 100 밖을 평가하지 않는 명시적 truncated metric.
            hit100 = positives[g_idx][order[:, :100]]
            total_relevant = int(positives[g_idx].sum())
            ap = float(np.mean([average_precision_at_k(h, total_relevant, 100) for h in hit100]))
            recall = float(np.mean([recall_at_k(h, total_relevant, 100) for h in hit100]))
            per_region[reg] = {"n_query": int(len(q_idx)), "gallery": int(len(g_idx)),
                               "base_rate": round(base, 4), "p_at_10": round(p10, 4),
                               "ap_at_100": round(ap, 4),
                               "recall_at_100": round(recall, 4),
                               "lift": round(p10 / base, 2) if base > 0 else None}
        macro = float(np.mean([v["p_at_10"] for v in per_region.values()]))
        macro_ap = float(np.mean([v["ap_at_100"] for v in per_region.values()]))
        macro_recall = float(np.mean([v["recall_at_100"] for v in per_region.values()]))
        macro_base = float(np.mean([v["base_rate"] for v in per_region.values()]))
        print(f"[{tag}] region-macro P@10={macro:.4f} AP@100={macro_ap:.4f} "
              f"R@100={macro_recall:.4f} "
              f"(base {macro_base:.4f}, lift {macro/macro_base:.2f}x)")
        return {"per_region": per_region, "macro_p_at_10": round(macro, 4),
                "macro_ap_at_100": round(macro_ap, 4),
                "macro_recall_at_100": round(macro_recall, 4),
                "macro_base_rate": round(macro_base, 4),
                "macro_lift": round(macro / macro_base, 2)}

    res_whole = run(emb_whole, emb_whole, "olmo_whole")
    res_masked = run(emb_masked, emb_whole, "olmo_masked")
    res_raw = run(raw_vec, raw_vec, "raw_spectral")

    verdict_pass = (res_masked["macro_p_at_10"] > res_raw["macro_p_at_10"]
                    and res_masked["macro_p_at_10"] > 2 * res_masked["macro_base_rate"])
    report = {
        "schema": "sen12-crossregion-retrieval-v2",
        "cache": str(data_root), "patches": n, "regions": region_list,
        "positive_def": f"mask>0 pixels >= {POS_PIXELS}",
        "positive_count": int(positives.sum()),
        "protocol": "leave-region-out cosine top-10",
        "olmo_whole": res_whole, "olmo_masked": res_masked, "raw_spectral": res_raw,
        "preregistered_verdict": {
            "rule": "olmo_masked macro P@10 > raw_spectral AND > 2x base rate",
            "pass": bool(verdict_pass),
            "label": ("cross-region landslide-state signature present"
                      if verdict_pass else "not detected above baselines"),
        },
        "limitations": [
            "12 timestep 전체 인코딩이라 변화 벡터가 아니라 상태 서명 검색임",
            "mask 저자는 지역별 동일(Höhn) — annotation 교락은 통제되나 라벨 정확도는 미검증",
            "positive 임계 0.5%는 사전 등록값이며 민감도 분석은 후속",
        ],
    }
    (output_root / "retrieval_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8")
    print(json.dumps(report["preregistered_verdict"], ensure_ascii=False))
    print(f"report → {output_root}/retrieval_report.json  ({time.time()-t0:.0f}s)")
    print("DONE")


if __name__ == "__main__":
    main()
