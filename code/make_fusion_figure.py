#!/usr/bin/env python3
"""M102 결합의 의미 그림 (a) 커버리지 (b) 삽타리 두 임베딩 산점 (c) 결합 상위 15. 팔레트는 dataviz 검증 통과 3색."""
import json, numpy as np, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt
from matplotlib.patches import Patch; from matplotlib.lines import Line2D
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; A=ROOT/'research-private/artifacts'
L=lambda t: json.loads((A/t/'report.json').read_text())
t19,t158,t12,s2=L('terai_radar_scan_t19'),L('terai_radar_scan_t158'),L('terai_radar_scan_t12'),L('terai_s2_scan_saptari')
fus=json.loads((ROOT/'artifacts/m100_flood_sites/fusion_M102.json').read_text())
RAD,RAD2,OPT,BOTH="#2a78d6","#8fbbea","#eb6834","#1baf7a"; INK="#0b0b0b"; INK2="#52514e"; GRID="#e6e5e1"; SURF="#fcfcfb"
plt.rcParams.update({"font.family":"AppleGothic","axes.unicode_minus":False,"axes.edgecolor":GRID,"axes.labelcolor":INK2,"xtick.color":INK2,"ytick.color":INK2,"text.color":INK,"figure.facecolor":SURF,"axes.facecolor":SURF})
sites=["butwal","devghat","susta","dharapani","saptari"]; names={"butwal":"부트왈","devghat":"데브갓","susta":"수스타","dharapani":"다라파니","saptari":"삽타리"}
obs=lambda rep,a: sum(1 for w in rep['windows'] if w['aoi']==a and w['status']=='ranked')
keys=["레이더 궤도19 (9/29)","레이더 궤도158 (9/26)","레이더 궤도12 (9/28)","광학 S2 (9/28)"]
cov={a:[obs(t19,a) if a!='saptari' else 0, obs(t158,a), obs(t12,a) if a=='saptari' else 0, obs(s2,a) if a=='saptari' else 0] for a in sites}
fused_cov={a:sum(1 for f in fus['windows'] if f['aoi']==a) for a in sites}
fig=plt.figure(figsize=(14,9.6)); gs=fig.add_gridspec(2,2,height_ratios=[1,1.05],hspace=.5,wspace=.3)
# (a)
ax=fig.add_subplot(gs[0,0]); y=np.arange(len(sites)); h=0.17; cols=[RAD,RAD2,RAD,OPT]
for k,c in enumerate(cols):
    v=[cov[a][k] for a in sites]; ax.barh(y+(k-1.5)*h,v,h-.03,color=c,edgecolor=SURF,linewidth=1)
    for i,val in enumerate(v):
        if val: ax.text(val+.4,y[i]+(k-1.5)*h,str(val),va='center',fontsize=8,color=INK2)
ax.scatter([fused_cov[a]+0.9 for a in sites],y,marker='<',s=70,color=BOTH,zorder=3)
ax.set_yticks(y); ax.set_yticklabels([names[a] for a in sites]); ax.invert_yaxis(); ax.set_xlim(0,31); ax.set_xlabel("판독된 창 수 (지점당 25창)")
ax.set_title("(a) 커버리지: 결합이 넓힌 것은 없다. 레이더가 이미 다 읽었다",loc='left',fontsize=11,fontweight='bold',pad=22)
ax.text(0,-0.85,"데브갓은 궤도19 장면 밖(8/25) → 궤도158 로 25/25. 커버리지를 바꾼 것은 센서가 아니라 궤도였다.",fontsize=8,color=INK2,transform=ax.transData,clip_on=False)
ax.grid(axis='x',color=GRID,linewidth=.6); ax.set_axisbelow(True); [s.set_visible(False) for s in (ax.spines['top'],ax.spines['right'])]
ax.legend(handles=[Patch(color=RAD,label="레이더 (궤도 19·12)"),Patch(color=RAD2,label="레이더 궤도 158"),Patch(color=OPT,label="광학 S2"),Line2D([],[],marker='<',color=BOTH,linestyle='',markersize=8,label="결합 후 읽힌 창")],loc='upper center',fontsize=8,frameon=False,bbox_to_anchor=(0.5,-0.16),ncol=4)
# (b)
ax=fig.add_subplot(gs[0,1]); rw={w['id']:w for w in t12['windows']}; ow={w['id']:w for w in s2['windows']}
ids=[i for i in rw if i in ow]; x=np.array([rw[i]['candidate_token_frac'] for i in ids])*100; yv=np.array([ow[i]['candidate_token_frac'] for i in ids])*100; dw=np.array([ow[i]['scl_water_delta'] for i in ids])*100
cmap=matplotlib.colors.LinearSegmentedColormap.from_list("seq",["#dbe8f7","#2a78d6","#0b2f66"])
sc=ax.scatter(x,yv,s=20+dw.clip(0)*9,c=dw,cmap=cmap,vmin=0,vmax=32,edgecolor=SURF,linewidth=1.2,zorder=3)
off={"saptari_02":(8,10),"saptari_03":(8,-14),"saptari_04":(8,6),"saptari_14":(8,6)}
for i,xi,yi,d in zip(ids,x,yv,dw):
    if d>8: ax.annotate(f"{i.split('_')[1]}  물 +{d:.0f}%p",(xi,yi),xytext=off.get(i,(6,4)),textcoords='offset points',fontsize=8,color=INK)
ax.axhline(1,color=GRID,lw=1); ax.axvline(1,color=GRID,lw=1); ax.text(.08,1.12,"귀무 1%",fontsize=7,color=INK2)
ax.set_xlabel("레이더 임베딩 깃발 (%)"); ax.set_ylabel("광학 임베딩 깃발 (%)"); ax.set_xlim(-.2,3.2); ax.set_ylim(-.3,6.2)
cb=fig.colorbar(sc,ax=ax,fraction=.04,pad=.02); cb.set_label("SCL 물 비율 변화 (%p, 9/20→9/28)",fontsize=8); cb.ax.tick_params(labelsize=7)
ax.set_title("(b) 삽타리 25창: 두 임베딩은 서로 다른 창을 올린다 (Spearman -0.50)",loc='left',fontsize=11,fontweight='bold',pad=30)
ax.text(-0.2,6.5,"물이 가장 늘어난 하도 창(02·04·14)은 두 임베딩 모두 귀무 근처다. 여기선 고전 자(SCL 물)가 판별한다.",fontsize=8,color=INK2,clip_on=False)
ax.grid(color=GRID,linewidth=.6); ax.set_axisbelow(True); [s.set_visible(False) for s in (ax.spines['top'],ax.spines['right'])]
# (c)
ax=fig.add_subplot(gs[1,:]); top=fus['windows'][:15]; xs=np.arange(len(top)); srcc={"radar":RAD,"optical":OPT,"both":BOTH}
ax.bar(xs,[f['frac']*100 for f in top],color=[srcc[f['source']] for f in top],width=.72,edgecolor=SURF)
for k,f in enumerate(top):
    ax.text(k,-0.6,f"{names[f['aoi']]}\n{f['id'].split('_')[1]}",ha='center',va='top',fontsize=8,color=INK2)
    if f['radar_new_water'] and f['radar_new_water']>0.04: ax.text(k,f['frac']*100+.4,f"새-물 {f['radar_new_water']*100:.0f}%",ha='center',fontsize=7.5,color=INK)
    if f['source']=='both' and f['radar_frac'] is not None: ax.plot([k-.3,k+.3],[f['radar_frac']*100]*2,color=RAD,lw=2.2)
ax.axhline(1,color=GRID,lw=1); ax.text(14.45,1.25,"귀무 1%",fontsize=7,color=INK2,ha='right')
ax.set_xticks([]); ax.set_yticks([0,5,10,15]); ax.set_ylim(-3.2,18.5); ax.set_ylabel("결합 깃발 (%) = max(광학, 레이더 평균)")
ax.set_title("(c) 결합 순위 상위 15: 1·2위 수스타(두 궤도 복제, 강폭 확대) · 삽타리 상위는 광학 평지 창(원인 미확인) · 막대 안 가로선 = 그 창의 레이더 값",loc='left',fontsize=11,fontweight='bold')
ax.legend(handles=[Patch(color=RAD,label="레이더만 읽힘"),Patch(color=BOTH,label="두 센서 다 읽힘 (결합값 = max)"),Patch(color=OPT,label="광학만")],loc='upper right',fontsize=8,frameon=False)
ax.grid(axis='y',color=GRID,linewidth=.6); ax.set_axisbelow(True); [s.set_visible(False) for s in (ax.spines['top'],ax.spines['right'],ax.spines['bottom'])]
fig.suptitle("뉴스 홍수 지점 5곳 · 광학+레이더 결합(M102)의 의미: 커버리지는 레이더가 이미 채웠고, 정확도는 결합이 올리지 않았다",fontsize=13,fontweight='bold',x=.01,ha='left',y=.995)
fig.text(.01,.005,"공통 척도 = 각 센서 자기 평시 p99 초과 토큰 비율(귀무 1%). 사후 1~2시점, 현장 정답 0. 발원 회랑 M95(광학 47 → 결합 97창)와 달리 테라이에선 레이더가 처음부터 125/125 창을 읽었다.",fontsize=8,color=INK2)
out=ROOT/'artifacts/m100_flood_sites/fusion_M102_figure.png'; fig.savefig(out,dpi=160,bbox_inches='tight'); print("saved",out)
