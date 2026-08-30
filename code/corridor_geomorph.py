#!/usr/bin/env python3
"""회랑 지형 매개변수(M84) — Copernicus DEM GLO-30 로 (1) 발원 E→충격 A 렌데 계곡 종단면(표고·경사·계곡 폭·병목),
(2) 강 창(v000~)별 경사·계곡 폭·굴곡도(tortuosity)·기복 → OlmoEarth 후보 비율(M82 pooled3)과 Spearman 상관.
모델 없음, 물리 시뮬레이션 없음. 상관은 n≈40 탐색적 결과이며 예측 주장 아님."""
import json, math, numpy as np, rasterio, pystac_client, planetary_computer as pc
from rasterio.windows import from_bounds
from rasterio.warp import transform
from rasterio.merge import merge
from pathlib import Path
from scipy.stats import spearmanr
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/"artifacts/corridor_geomorph"; OUT.mkdir(parents=True,exist_ok=True)
UTM="EPSG:32645"
h=json.loads((ROOT/"apps/nepal-olmo-gis/public/data/hydrography.geojson").read_text()); route=h["simulation_route"]
E=(85.5194,28.2765); A=(85.378,28.276)
# --- DEM mosaic over bbox
lons=[p[0] for p in route]+[E[0],A[0]]; lats=[p[1] for p in route]+[E[1],A[1]]
bbox=[min(lons)-0.08,min(lats)-0.08,max(lons)+0.08,max(lats)+0.08]
cat=pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
items=[pc.sign(i) for i in cat.search(collections=["cop-dem-glo-30"],bbox=bbox).items()]
srcs=[rasterio.open(i.assets["data"].href) for i in items]; dem,tr=merge(srcs,bounds=bbox); dem=dem[0].astype("float32")
inv=~tr; 
def elev(lon,lat):
    c,r=inv*(lon,lat); r,c=int(r),int(c)
    return float(dem[r,c]) if 0<=r<dem.shape[0] and 0<=c<dem.shape[1] else float("nan")
def elev_line(lon0,lat0,lon1,lat1,n=200):
    return np.array([elev(lon0+(lon1-lon0)*t, lat0+(lat1-lat0)*t) for t in np.linspace(0,1,n)])
def km(a,b): return math.hypot((a[0]-b[0])*math.cos(math.radians(28))*111.0,(a[1]-b[1])*111.0)
def valley_width(lon,lat,dlon,dlat,rise=150.0,maxkm=3.0):
    """진행 방향(dlon,dlat)에 수직으로 양쪽 걸어가며 바닥보다 rise m 높아지는 지점까지의 거리 합(km)."""
    z0=elev(lon,lat); nx,ny=-dlat,dlon; nrm=math.hypot(nx*math.cos(math.radians(28)),ny) or 1e-9
    w=0.0
    for s in (1,-1):
        for step in np.arange(0.03,maxkm,0.03):
            lo=lon+s*nx/nrm*step/(111.0*math.cos(math.radians(28))); la=lat+s*ny/nrm*step/111.0
            if elev(lo,la)-z0>=rise: w+=step; break
        else: w+=maxkm
    return w
# --- Zone 1: E→A 를 DEM 최급경사(D8) 흐름 경로로 추적 (직선은 능선을 가로질러 무의미했음 — 첫 실행 3 km 지점 표고 5,828 m)
def d8_path(lon0,lat0,lon1,lat1,max_steps=20000):
    c,r=inv*(lon0,lat0); r,c=int(r),int(c); path=[(r,c)]; seen={(r,c)}
    ct,rt=inv*(lon1,lat1); rt,ct=int(rt),int(ct)
    for _ in range(max_steps):
        if math.hypot(r-rt,c-ct)*30 < 400: break
        best=None
        for dr in (-1,0,1):
            for dc in (-1,0,1):
                if dr==dc==0: continue
                rr,cc=r+dr,c+dc
                if not (0<=rr<dem.shape[0] and 0<=cc<dem.shape[1]) or (rr,cc) in seen: continue
                dist=math.hypot(dr,dc); drop=(dem[r,c]-dem[rr,cc])/dist
                # 목표 방향 가중치: 웅덩이 탈출용 (지형 우선, 막히면 A 쪽으로)
                toward=-(math.hypot(rr-rt,cc-ct)-math.hypot(r-rt,c-ct))
                score=drop+0.15*toward
                if best is None or score>best[0]: best=(score,rr,cc)
        if best is None: break
        r,c=best[1],best[2]; path.append((r,c)); seen.add((r,c))
    return path
path=d8_path(E[0],E[1],A[0],A[1]); z1=[]; acc=0.0; prev=None
for k,(r,c) in enumerate(path):
    lon,lat=rasterio.transform.xy(tr,r,c)
    if prev is not None: acc+=math.hypot((lon-prev[0])*math.cos(math.radians(28))*111000,(lat-prev[1])*111000)/1000
    prev=(lon,lat)
    if k%8==0 or k==len(path)-1:  # ≈ 250 m 마다
        nxt=path[min(k+8,len(path)-1)]; lon2,lat2=rasterio.transform.xy(tr,nxt[0],nxt[1])
        z1.append({"km_from_source":round(acc,2),"lon":round(lon,5),"lat":round(lat,5),"elev_m":round(float(dem[r,c]),0),"valley_width_km":round(valley_width(lon,lat,lon2-lon,lat2-lat),2)})
for i in range(1,len(z1)):
    dx=(z1[i]["km_from_source"]-z1[i-1]["km_from_source"])*1000 or 1
    z1[i]["slope_deg"]=round(math.degrees(math.atan((z1[i-1]["elev_m"]-z1[i]["elev_m"])/dx)),1)
z1[0]["slope_deg"]=None
zone1_path=[[round(float(v),5) for v in rasterio.transform.xy(tr,r,c)] for r,c in path[::4]]
narrow=min(z1[3:-1],key=lambda r:r["valley_width_km"]); drop=z1[0]["elev_m"]-z1[-1]["elev_m"]
zone1={"profile":z1,"length_km":z1[-1]["km_from_source"],"drop_m":drop,"mean_slope_deg":round(math.degrees(math.atan(drop/(z1[-1]["km_from_source"]*1000))),1),
       "narrowest":{"km_from_source":narrow["km_from_source"],"valley_width_km":narrow["valley_width_km"],"lon":narrow["lon"],"lat":narrow["lat"]},
       "path_lonlat":zone1_path,"note":"D8 steepest-descent path on GLO-30 from the source estimate toward A (target-weighted pit escape); widths = perpendicular distance to +150 m on both sides; no runout physics"}
# --- Zone 2: per river window parameters
rep=json.loads((ROOT/"artifacts/corridor_s2_candidates/embed_placebo_ext/report.json").read_text()); wins={w["id"]:w for w in rep["windows"]}
man=json.loads((ROOT/"artifacts/corridor_s2_candidates/prepare_v2/windows_manifest.json").read_text())["windows"]
rx,ry=transform("EPSG:4326",UTM,[p[0] for p in route],[p[1] for p in route]); rxy=np.array(list(zip(rx,ry)))
cum=np.concatenate([[0],np.cumsum(np.hypot(np.diff(rxy[:,0]),np.diff(rxy[:,1])))])
rows=[]
for w in man:
    if w.get("kind")!="river": continue
    lon,lat=w["center_lonlat"]; x,y=transform("EPSG:4326",UTM,[lon],[lat]); i=int(np.argmin(np.hypot(rxy[:,0]-x[0],rxy[:,1]-y[0])))
    # 창 안(±1.28 km 경로) 구간
    lo=np.searchsorted(cum,cum[i]-1280); hi=min(len(cum)-1,np.searchsorted(cum,cum[i]+1280))
    L=cum[hi]-cum[lo]; straight=math.hypot(*(rxy[hi]-rxy[lo])); tort=L/straight if straight>0 else None
    zlo,zhi=elev(*route[lo]),elev(*route[hi]); chan_slope=(zlo-zhi)/L if L>0 else None
    d=(route[hi][0]-route[lo][0],route[hi][1]-route[lo][1]); vw=valley_width(lon,lat,d[0],d[1])
    # 기복: 창 2.56 km 안 DEM 표준편차·최대-바닥
    c0,r0=inv*(lon,lat); r0,c0=int(r0),int(c0); s=43  # ≈1.28 km / 30 m
    patch=dem[max(0,r0-s):r0+s, max(0,c0-s):c0+s]; relief=float(np.nanmax(patch)-elev(lon,lat)) if patch.size else None
    ww=wins.get(w["id"],{})
    rows.append({"id":w["id"],"km_from_A":round(cum[i]/1000,1),"channel_slope":round(chan_slope,4) if chan_slope is not None else None,"valley_width_km":round(vw,2),"tortuosity":round(tort,3) if tort else None,
                 "relief_m":round(relief,0) if relief is not None else None,"candidate_frac":ww.get("candidate_frac_pooled3"),"observable":ww.get("event_valid_frac"),"status":ww.get("status")})
judged=[r for r in rows if r["status"]=="ranked" and r["candidate_frac"] is not None]
corr={}
for k in ("channel_slope","valley_width_km","tortuosity","relief_m","km_from_A"):
    xs=[(r[k],r["candidate_frac"]) for r in judged if r[k] is not None]
    if len(xs)>8: rho,p=spearmanr([a for a,_ in xs],[b for _,b in xs]); corr[k]={"spearman":round(float(rho),3),"p":round(float(p),4),"n":len(xs)}
out={"schema":"corridor-geomorph-v1","dem":"Copernicus DEM GLO-30 (Planetary Computer)","zone1_source_to_impact":zone1,"zone2_windows":rows,"zone2_correlation_with_candidate_frac_pooled3":corr,
     "claim_boundary":"exploratory correlation on ~40 judged windows; no causal or predictive claim; no runout physics"}
(OUT/"report.json").write_text(json.dumps(out,indent=1))
print("zone1", {k:zone1[k] for k in ("length_km","drop_m","mean_slope_deg","narrowest")}); print("zone2 n judged",len(judged)); print(json.dumps(corr,indent=1))
