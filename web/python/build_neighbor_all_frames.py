#!/usr/bin/env python3
"""확장 스캔 **모든** 순위 창에 전/후/Δ 프레임을 만든다.

왜: 지금까지 상위 12창만 이미지가 있어서, 나머지를 클릭하면 팝업에 숫자 한 줄만
나왔다("1% of cloud-free cells changed beyond ordinary here"). 숫자만으로는 왜 그
창이 그 순위인지 볼 수가 없다. 위성 타일을 켜서 창을 눌렀다면 그 창의 전후를 보고
싶은 것이므로, 251개 전부에 프레임을 준다.

밝기: 전·후에 같은 2–98 백분위 구간을 적용한다. 프레임별로 따로 늘리면 전후 슬라이더가
서로 다른 척도를 비교하는 셈이 되고, 구름 낀 후영상이 무지개빛 잡음으로 뜬다.

용량: pre/post 는 트루컬러라 PNG 대신 **WebP 256px**(약 20 KB, PNG 111 KB 대비 1/5).
Δ 는 후영상 위에 겹치려면 알파가 필요하므로 PNG 512px 유지(12 KB).
합계 약 13 MB. 지도 초기 로드에는 영향이 없다 — 클릭할 때만 받는다.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

from delta_style import render_delta_contour

REPO = Path(__file__).resolve().parents[2]
NB = REPO / "research-private/artifacts/neighbor_scan"
OUT = REPO / "web/public/data/neighbors/frames"
OUT.mkdir(parents=True, exist_ok=True)


def limits(ch: np.ndarray) -> tuple[float, float]:
    finite = ch[np.isfinite(ch) & (ch > 0)]
    if finite.size == 0:
        return 0.0, 1.0
    lo, hi = np.percentile(finite, [2, 98])
    return float(lo), float(max(hi, lo + 1))


def apply(ch: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return np.clip((ch - lo) / (hi - lo) * 255, 0, 255).astype(np.uint8)


def frame_limits(cube: np.ndarray, ti: int) -> list[tuple[float, float]]:
    """전·후에 **같은** 밝기 구간을 쓴다.

    프레임마다 2–98 백분위를 따로 잡으면 구름이 많은 후영상이 제 나름대로 늘어나
    무지개빛 잡음이 되고, 무엇보다 전후 슬라이더가 서로 다른 척도를 비교하게 된다.
    맑은 쪽(전영상)에서 구간을 정해 양쪽에 그대로 적용한다.
    """
    return [limits(cube[b, ti]) for b in (2, 1, 0)]


def main() -> None:
    report = json.loads((NB / "pooled3/report.json").read_text())
    thr = float(report["threshold_pooled3_p99"])
    ranked = [w for w in report["windows"] if w.get("status") == "ranked"]
    print(f"threshold {thr:.4f} · ranked windows {len(ranked)}")

    made, skipped = 0, 0
    for w in ranked:
        wid = w["id"]
        cube_p = NB / f"prepare/{wid}.npz"
        delta_p = NB / f"embed/{wid}_delta.npz"
        if not cube_p.exists() or not delta_p.exists():
            skipped += 1
            continue
        cube = np.load(cube_p)["cube"].astype("float32")      # (12, 5, 256, 256)
        lims = frame_limits(cube, 3)                          # 전영상에서 밝기 구간 확정
        for name, ti in (("pre", 3), ("post", 4)):            # 08-12, 08-27
            out = OUT / f"{wid}_{name}.webp"
            rgb = np.stack([apply(cube[b, ti], *lims[i]) for i, b in enumerate((2, 1, 0))], axis=-1)
            Image.fromarray(rgb).save(out, "WEBP", quality=82, method=5)
        dp = OUT / f"{wid}_delta.png"
        if not dp.exists():
            d = np.load(delta_p)
            render_delta_contour(d["d_event"], d["valid_event"], thr, dp, size=512)
        made += 1
        if made % 40 == 0:
            print(f"  {made}/{len(ranked)}", flush=True)

    files = sorted(OUT.glob("*"))
    total = sum(f.stat().st_size for f in files)
    print(f"windows rendered {made}, skipped (no cube) {skipped}")
    print(f"files {len(files)}  total {total / 1024 / 1024:.1f} MB")
    manifest = {"schema": "neighbor-frames-v1", "windows": made,
                "threshold_pooled3_p99": thr,
                "frames": {"pre": "08-12 (illustrative single before frame)",
                           "post": "08-27", "delta": "AI change field, bright line = pooled p99"},
                "path": "/data/neighbors/frames/{id}_{pre|post}.webp, {id}_delta.png"}
    (OUT.parent / "frames-manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")


if __name__ == "__main__":
    main()
