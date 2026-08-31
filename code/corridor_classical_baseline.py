#!/usr/bin/env python3
"""네팔 100창: AI(OlmoEarth Δz) 순위 vs 고전 밴드 변화 순위 — 같은 큐브·같은 마스크·같은 placebo 구조.
고전 Δ_event = |mean(post 08-27) - mean(base 3장)| 정규화 밴드 평균 (토큰 4x4). placebo = 같은 식으로 08-12.
임계 = placebo 토큰 p99, 후보 비율로 창 순위. AI v2 report 와 Spearman·상위10 교집합·보도지 적중 비교.
"""
import json, numpy as np
from nepal_paths import ARTIFACT_ROOT
prep = ARTIFACT_ROOT/"corridor_s2_candidates/prepare_v2"; ai = json.load(open(ARTIFACT_ROOT/"corridor_s2_candidates/embed_scan_v2/report.json"))
dl = ARTIFACT_ROOT/"corridor_s2_candidates/embed_scan_v2/deltas"
tok = lambda a: a.reshape(64,4,64,4).mean(axis=(1,3))
rows=[]; pl_pool=[]
for w in ai["windows"]:
    d=np.load(prep/f"{w['id']}.npz"); cube=d["cube"].astype("float32")[:10]/10000.0  # 10 bands, 5 dates
    base=cube[:,0:3].mean(1); pl=cube[:,3]; post=cube[:,4]
    de=tok(np.abs(post-base).mean(0)); dp=tok(np.abs(pl-base).mean(0))
    m=np.load(dl/f"{w['id']}_delta.npz"); ve=m["valid_event"]; vp=m["valid_placebo"]
    pl_pool.append(dp[vp]); rows.append((w["id"], de, ve, w.get("rank"), w.get("candidate_token_frac"), w.get("status")))
thr=float(np.quantile(np.concatenate(pl_pool),0.99))
cl=[]
for wid,de,ve,ai_rank,ai_frac,status in rows:
    frac=float((de[ve]>thr).mean()) if ve.mean()>=0.2 else None
    cl.append({"id":wid,"classical_frac":frac,"ai_rank":ai_rank,"ai_frac":ai_frac,"status":status})
ranked=[c for c in cl if c["classical_frac"] is not None and c["status"]=="ranked"]
ranked.sort(key=lambda c:-c["classical_frac"])
for i,c in enumerate(ranked): c["classical_rank"]=i+1
from scipy.stats import spearmanr
ar=[c["ai_rank"] for c in ranked]; cr=[c["classical_rank"] for c in ranked]
rho=float(spearmanr(ar,cr).correlation)
top_ai={c["id"] for c in sorted(ranked,key=lambda c:c["ai_rank"])[:10]}; top_cl={c["id"] for c in ranked[:10]}
places=json.load(open(ARTIFACT_ROOT/"corridor_s2_candidates/embed_scan_v2/places.json"))
reported={"Timure","Bidur","Devighat","Tupche","Bhainse","Rasuwa Gadhi","Dalphedi","Syabrubesi","Trishuli"}
def hits(ids): return sum(1 for i in ids if any(r.lower() in (places.get(i,"")).lower() for r in reported))
out={"schema":"corridor-classical-vs-ai-v1","threshold_classical_p99":thr,"spearman_ai_vs_classical":rho,
     "top10_overlap":len(top_ai&top_cl),"reported_place_hits_top10":{"ai":hits(top_ai),"classical":hits(top_cl)},
     "classical_top10":[{"id":c["id"],"place":places.get(c["id"],""),"classical_frac":c["classical_frac"],"ai_rank":c["ai_rank"]} for c in ranked[:10]],
     "n_ranked":len(ranked)}
(ARTIFACT_ROOT/"corridor_s2_candidates/embed_scan_v2/classical_vs_ai.json").write_text(json.dumps(out,indent=1,ensure_ascii=False))
print(json.dumps({k:v for k,v in out.items() if k!="classical_top10"},indent=1)); [print(c) for c in out["classical_top10"]]
