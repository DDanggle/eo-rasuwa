#!/usr/bin/env python3
"""언색호(D) 수색 — 모델 없이 관측만: S2 NDWI 신규 수체(사건 후 >0.2, 사건 전 <0.0) ∩ S1 RTC VV 후방산란 급감(≥3 dB) → 창 단위 후보.
D 수색 구역(28.285N 85.48E) 중심 ±5 km, 20 m 격자. 출력: 후보 픽셀 수·면적, 연결 성분 상위 5 (중심·면적), PNG 3장(pre NDWI / post NDWI / 교집합)."""
import json, numpy as np, rasterio, pystac_client, planetary_computer as pc
from rasterio.windows import from_bounds
from rasterio.warp import transform
from PIL import Image
from scipy import ndimage
from nepal_paths import ARTIFACT_ROOT, WEB_DATA_ROOT
OUT=ARTIFACT_ROOT/"lake_search_d"; OUT.mkdir(parents=True,exist_ok=True); IMG=WEB_DATA_ROOT/"story"; IMG.mkdir(parents=True,exist_ok=True)
LON,LAT=85.48,28.285; HALF=5000; UTM="EPSG:32645"; SIZE=500
x,y=transform("EPSG:4326",UTM,[LON],[LAT]); B=[x[0]-HALF,y[0]-HALF,x[0]+HALF,y[0]+HALF]
cat=pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
def s2(date):
    it=list(cat.search(collections=["sentinel-2-l2a"],intersects={"type":"Point","coordinates":[LON,LAT]},datetime=f"{date}T00:00:00Z/{date}T23:59:59Z").items())
    if not it: return None
    it=pc.sign(it[0]); out={}
    for b in ("B03","B08","B02","B11"):
        with rasterio.open(it.assets[b].href) as ds: out[b]=ds.read(1,window=from_bounds(*B,transform=ds.transform),out_shape=(SIZE,SIZE),boundless=True,fill_value=0).astype("float32")
    with rasterio.open(it.assets["SCL"].href) as ds: out["SCL"]=ds.read(1,window=from_bounds(*B,transform=ds.transform),out_shape=(SIZE,SIZE),boundless=True,fill_value=0)
    return out, it.id
def s1(d0,d1):
    its=list(cat.search(collections=["sentinel-1-rtc"],intersects={"type":"Point","coordinates":[LON,LAT]},datetime=f"{d0}/{d1}").items())
    res=[]
    for it in its:
        it=pc.sign(it)
        with rasterio.open(it.assets["vv"].href) as ds: vv=ds.read(1,window=from_bounds(*B,transform=ds.transform),out_shape=(SIZE,SIZE),boundless=True,fill_value=0).astype("float32")
        res.append((it.datetime.date().isoformat(), it.id, 10*np.log10(np.clip(vv,1e-4,None)), it.properties.get("sat:relative_orbit"), it.properties.get("sat:orbit_state")))
    return sorted(res)
pre,pre_id=s2("2026-08-12"); post,post_id=s2("2026-08-27")
ndwi=lambda o:(o["B03"]-o["B08"])/(o["B03"]+o["B08"]+1e-6)
clear=lambda o: np.isin(o["SCL"],[4,5,6,7,11])
n_pre,n_post=ndwi(pre),ndwi(post); ok=clear(pre)&clear(post)
new_water=(n_post>0.2)&(n_pre<0.0)&ok
s1_all=s1("2026-07-20","2026-08-25"); s1_post=s1("2026-08-26","2026-08-31")
# 같은 상대궤도끼리만 비교 (다른 궤도는 산악 레이오버·그림자 차이가 '급감'으로 잡힘 — 첫 실행에서 AOI 21%가 급감으로 나온 원인)
post_orbit=s1_post[-1][3] if s1_post else None
s1_list=[r for r in s1_all if r[3]==post_orbit]
rep={"aoi_center":[LON,LAT],"half_km":5,"s2_pre":pre_id,"s2_post":post_id,"s2_clear_frac":float(ok.mean()),"new_water_px":int(new_water.sum()),"new_water_km2":float(new_water.sum()*0.0004),
     "s1_pre_same_orbit":[(d,o,s) for d,_,_,o,s in s1_list],"s1_post":[(d,o,s) for d,_,_,o,s in s1_post],"s1_all_orbits":sorted({(o,s) for _,_,_,o,s in s1_all})}
drop=None
if s1_list and s1_post:
    vv0=np.median(np.stack([v for _,_,v,_,_ in s1_list]),0); vv1=s1_post[-1][2]; drop=(vv0-vv1)>=3.0
    rep["s1_drop_px"]=int(drop.sum()); both=new_water&drop; rep["both_px"]=int(both.sum()); rep["both_km2"]=float(both.sum()*0.0004)
    cand=both if both.any() else drop  # 광학이 구름이면 레이더 급감만으로 후보 성분을 나열(물/젖은 토사 구분 불가 — 후보일 뿐)
    rep["candidate_basis"]="ndwi_and_s1" if both.any() else "s1_drop_only_optical_unavailable"
else:
    cand=new_water; rep["note"]="no S1 RTC pair in window → optical-only"
lab,n=ndimage.label(cand); comps=[]
for i in range(1,n+1):
    m=lab==i; a=int(m.sum())
    if a<5: continue
    cy,cx=ndimage.center_of_mass(m); X=B[0]+cx/SIZE*(B[2]-B[0]); Y=B[3]-cy/SIZE*(B[3]-B[1]); lon,lat=transform(UTM,"EPSG:4326",[X],[Y])
    comps.append({"px":a,"km2":a*0.0004,"center_lonlat":[round(lon[0],5),round(lat[0],5)]})
comps.sort(key=lambda c:-c["px"]); rep["components_top5"]=comps[:5]; rep["components_total"]=len(comps)
def png(a,name,vmin=-0.5,vmax=0.5):
    im=np.clip((a-vmin)/(vmax-vmin),0,1); Image.fromarray((im*255).astype("uint8")).save(IMG/name)
png(n_pre,"lake_ndwi_pre0812.png"); png(n_post,"lake_ndwi_post0827.png")
rgb=np.zeros((SIZE,SIZE,3),"uint8"); rgb[...,:]=np.clip(post["B02"]/3000*255,0,255)[...,None]; rgb[new_water]=[40,120,255]; 
if drop is not None: rgb[drop&~new_water]=[255,180,60]; rgb[new_water&drop]=[255,40,40]
Image.fromarray(rgb).save(IMG/"lake_candidates.png")
(OUT/"report.json").write_text(json.dumps(rep,indent=1)); print(json.dumps(rep,indent=1))
