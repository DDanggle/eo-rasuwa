#!/usr/bin/env python3
"""RQ-N1 — Δz(live vs baseline)를 placebo 분포와 비교함.

사전 등록 기준 (docs/NEPAL_OLMO_LIVE_TWIN_2026_08_27.md, RQ-N1):
  - 사건 delta가 같은 앵커의 pre-event placebo 분포 95 percentile을 넘고
    방향이 유지될 때만 anomaly라 부름
  - placebo 표본이 적으면(<20) 95p 대신 max(placebo) 초과 여부와 rank로 정직하게
    보고하고 표본 수를 결과에 명시함
  - placebo 준비 전에는 어떤 heatmap도 candidate change 이상으로 부르지 않음
  - anomaly가 없어도 숨기지 않고 "미검출"로 기록함

입력: materialized/<mode>/dataset/windows/nepal/<anchor>/layers/embeddings/**/*.tif
  (768-band COG, seal_nepal_olmo_embeddings.py가 봉인한 것)
출력: artifacts/external_data/nepal_olmo_live_v1/delta/<UTC>/nepal_delta_report.json
  + 앵커별 patch-level Δ GeoTIFF (live 모드가 있을 때)

봉인 항목(문서 :118): scene IDs(dataset items.json), model_id, code snapshot SHA,
vector SHA, placebo 표본 수·값 전부.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from nepal_paths import ARTIFACT_ROOT, display_path

ROOT = ARTIFACT_ROOT / "external_data/nepal_olmo_live_v1/materialized"
OUT_ROOT = ARTIFACT_ROOT / "external_data/nepal_olmo_live_v1/delta"
ANCHORS = ["source_provisional", "rasuwagadhi", "timure", "syabrubesi", "dhunche"]
# placebo 모드는 실물(임베딩 매니페스트 존재)로 발견함 — 2026-08-29 확장(주 단위 rolling 창)부터 동적
def _discover_placebo_modes() -> list[str]:
    return sorted(
        p.name
        for p in ROOT.glob("placebo_*")
        if (p / "embedding_manifest.json").exists()
    )
PLACEBO_MODES = _discover_placebo_modes()


def find_embedding(mode: str, anchor: str) -> Path | None:
    base = ROOT / mode / "dataset/windows/nepal" / anchor / "layers/embeddings"
    if not base.exists():
        return None
    tifs = sorted(base.rglob("*.tif"))
    return tifs[0] if len(tifs) == 1 else None


def load_cube(path: Path) -> np.ndarray:
    """(768, H, W) float32. rasterio가 있으면 그것, 없으면 tifffile."""
    try:
        import rasterio
        with rasterio.open(path) as src:
            arr = src.read().astype(np.float32)
    except ImportError:
        import tifffile
        arr = tifffile.imread(path).astype(np.float32)
        if arr.ndim == 3 and arr.shape[-1] == 768:  # HWC -> CHW
            arr = np.moveaxis(arr, -1, 0)
    assert arr.shape[0] == 768, f"bands {arr.shape} != 768: {path}"
    return arr


def cosine_delta(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """patch별 cosine distance (H, W). 0=동일, 2=정반대."""
    num = (a * b).sum(axis=0)
    den = np.linalg.norm(a, axis=0) * np.linalg.norm(b, axis=0)
    den = np.where(den == 0, 1e-12, den)
    return 1.0 - num / den


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def summarize(d: np.ndarray) -> dict:
    return {"mean": float(d.mean()), "p50": float(np.percentile(d, 50)),
            "p95": float(np.percentile(d, 95)), "max": float(d.max())}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--live-mode", default=None,
                    help="예: s1_live. 없으면 placebo self-test만 수행")
    ap.add_argument("--baseline-mode", default="baseline")
    args = ap.parse_args()

    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    out = OUT_ROOT / stamp
    out.mkdir(parents=True, exist_ok=True)

    report: dict = {"schema": "nepal-olmo-delta-v1", "created_at_utc": stamp,
                    "baseline_mode": args.baseline_mode, "live_mode": args.live_mode,
                    "metric": "cosine distance per patch (1 - cos)",
                    "anchors": {}, "inputs": {}}

    # ---- 입력 수집 + 봉인 ----
    cubes: dict[tuple[str, str], np.ndarray] = {}
    for mode in [args.baseline_mode, *PLACEBO_MODES,
                 *( [args.live_mode] if args.live_mode else [] )]:
        for anchor in ANCHORS:
            p = find_embedding(mode, anchor)
            if p is None:
                report["inputs"][f"{mode}/{anchor}"] = None
                continue
            cubes[(mode, anchor)] = load_cube(p)
            report["inputs"][f"{mode}/{anchor}"] = {
                "path": display_path(p), "sha256": sha256_file(p)}

    placebo_available = [m for m in PLACEBO_MODES
                         if all((m, a) in cubes for a in ANCHORS)]
    report["placebo_modes_available"] = placebo_available
    report["placebo_sample_note"] = (
        f"placebo 표본 {len(placebo_available)}개 — 95 percentile을 신뢰할 수 없어 "
        "max(placebo) 초과 여부와 rank로 판정함" if len(placebo_available) < 20 else
        "placebo 95 percentile 사용")

    for anchor in ANCHORS:
        entry: dict = {}
        base = cubes.get((args.baseline_mode, anchor))
        if base is None:
            report["anchors"][anchor] = {"status": "baseline embedding 없음"}
            continue

        # placebo Δ: 사건 없는 구간끼리의 일상 변화
        placebo_stats = {}
        placebo_means = []
        for m in placebo_available:
            d = cosine_delta(base, cubes[(m, anchor)])
            placebo_stats[m] = summarize(d)
            placebo_means.append(float(d.mean()))
        entry["placebo_delta"] = placebo_stats

        # self-test: placebo끼리의 Δ (분포대가 baseline-vs-placebo와 같아야 함)
        if len(placebo_available) >= 2:
            d_pp = cosine_delta(cubes[(placebo_available[0], anchor)],
                                cubes[(placebo_available[1], anchor)])
            entry["placebo_self_test"] = summarize(d_pp)

        if args.live_mode and (args.live_mode, anchor) in cubes:
            d_live = cosine_delta(base, cubes[(args.live_mode, anchor)])
            entry["live_delta"] = summarize(d_live)
            # 판정: 사전 등록 규칙. 표본이 적으므로 max 초과 + rank.
            if placebo_means:
                exceed = float(d_live.mean()) > max(placebo_means)
                rank = int(sum(float(d_live.mean()) > v for v in placebo_means))
                entry["verdict"] = {
                    "live_mean_exceeds_all_placebo": bool(exceed),
                    "rank_among_placebo": f"{rank}/{len(placebo_means)}",
                    "label": ("candidate change" if exceed else
                              "not detected above daily variability"),
                    "note": "placebo 표본이 적어 anomaly 확정 불가 — "
                            "candidate change 이상으로 부르지 않음",
                }
            # patch-level Δ 저장 (GeoTIFF 좌표 승계)
            try:
                import rasterio
                src_path = find_embedding(args.live_mode, anchor)
                if src_path is None:
                    raise FileNotFoundError(f"missing live embedding: {args.live_mode}/{anchor}")
                with rasterio.open(src_path) as src:
                    profile = src.profile
                profile.update(count=1, dtype="float32")
                dpath = out / f"delta_{anchor}.tif"
                with rasterio.open(dpath, "w", **profile) as dst:
                    dst.write(d_live.astype(np.float32), 1)
                entry["delta_geotiff"] = display_path(dpath)
            except ImportError:
                np.save(out / f"delta_{anchor}.npy", d_live)
                entry["delta_npy"] = display_path(out / f"delta_{anchor}.npy")
        report["anchors"][anchor] = entry

    rp = out / "nepal_delta_report.json"
    rp.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                  encoding="utf-8")
    (out / "SHA256SUMS").write_text(f"{sha256_file(rp)}  {rp.name}\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in
                      ("placebo_modes_available", "placebo_sample_note")},
                     ensure_ascii=False))
    for a, e in report["anchors"].items():
        v = e.get("verdict", {})
        print(f"  {a:20s} live={e.get('live_delta',{}).get('mean','—')} "
              f"placebo_means={[round(s['mean'],5) for s in e.get('placebo_delta',{}).values()]} "
              f"{v.get('label','')}")
    print(f"report → {display_path(rp)}")
    print("DONE")


if __name__ == "__main__":
    main()
