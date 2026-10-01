'use client';
/* eslint-disable @next/next/no-img-element -- sealed research rasters are served without image transformation */
// 2장 · 2026년 9월 24~29일 몬순 홍수. 1장(/map, 8월 26일 빙하 붕괴 돌발홍수)과 **일부러 분리**한 페이지다.
// 다른 재난, 다른 자(레이더 3v1 + 고전 새-물 + SCL 물), 다른 지역(테라이 5지점 + 발원 회랑 재관측).
// 숫자는 전부 /data/september.json(장부 M99~M102 에서 스크립트로 생성)에서만 읽는다. scenario.json 은 건드리지 않는다.
import { AttributionControl, LngLatBounds, Map as MapLibreMap, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl('/maplibre-gl-worker.mjs');
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const styleUrl = MAPTILER_KEY ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}` : null;
const fallbackStyle = {
  version: 8 as const,
  sources: { hillshade: { type: 'raster' as const, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 16, attribution: 'Hillshade © Esri' },
             labels: { type: 'raster' as const, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 16, attribution: '© Esri' } },
  layers: [{ id: 'bg', type: 'background' as const, paint: { 'background-color': '#eef0ec' } }, { id: 'hillshade', type: 'raster' as const, source: 'hillshade', paint: { 'raster-opacity': 0.55 } }, { id: 'labels', type: 'raster' as const, source: 'labels' }],
};

type Lead = { id: string; site: string; rank: number; fused_frac: number; source: string; radar_frac: number | null; optical_frac: number | null; radar_new_water: number | null; scl_water_delta: number | null; center_lonlat: [number, number] };
type Site = { name: string; name_ko: string; news: string; news_ko: string; windows: number; verdict: string; reading: string; reading_ko: string; top: Lead[] };
type September = {
  event: { name: string; name_ko: string; window: [string, string]; reported: string; reported_ko: string; relation_to_chapter1: string };
  method: { contract: string; yardsticks: string[]; fusion: string; claim_boundary: string };
  source_corridor: { measurement_id: string; windows: number; threshold: number; flag_mean: number; top: { id: string; rank: number; frac: number; center_lonlat: [number, number]; snow_frac_0928: number | null }[]; unosat_source_touching_top6: number; reading: string; reading_ko: string };
  optical_readability: { date: string; scene_cloud_pct: number; window_readable_median_pct: number; windows_ge80: number }[];
  flood_sites: Record<string, Site>;
  fusion: { measurement_id: string; coverage: { radar_only: number; optical_only: number; both: number }; agreement_saptari: { n: number; spearman_radar_vs_optical: number; top5_overlap: number } | null; headline: string; headline_ko: string; figure: string };
  fused_top: Lead[];
  scenes: { id: string; sensor: string; acquired_at: string; state: string; detail: string }[];
  bounds: [number, number, number, number]; download: string;
  monsoon_status: { as_of: string; text: string; text_ko: string }; ledger: string[];
};
type Lightbox = { title: string; sub: string; before: string; after: string; beforeLabel: string; afterLabel: string; delta?: string; single?: boolean };

const SITE_ORDER = ['susta', 'devghat', 'saptari', 'butwal', 'dharapani'] as const;
const VERDICT: Record<string, { ko: string; en: string; cls: string }> = {
  'clear signal': { ko: '뚜렷', en: 'CLEAR SIGNAL', cls: 'v-clear' }, weak: { ko: '약함', en: 'WEAK', cls: 'v-weak' },
  'no signal': { ko: '신호 없음', en: 'NO SIGNAL', cls: 'v-none' }, 'classical only': { ko: '고전 자만', en: 'CLASSICAL ONLY', cls: 'v-classical' },
};
const postLabel = (site: string, orbits: number[]) => site === 'saptari' ? '28 SEP · S1 orbit 12' : orbits.length === 1 && orbits[0] === 158 ? '26 SEP · S1 orbit 158' : '29 SEP · S1 orbit 19';
const pct = (x: number | null | undefined, d = 1) => x == null ? '—' : `${(100 * x).toFixed(d)}%`;
const mono = (iso: string) => `${iso.slice(8, 10)} ${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(iso.slice(5, 7)) - 1]}`;

export default function SeptemberPage() {
  const [sept, setSept] = useState<September | null>(null);
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [ko, setKo] = useState(true);
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
  const [swipe, setSwipe] = useState(50);
  const [showDelta, setShowDelta] = useState(false);
  const [eoOpen, setEoOpen] = useState(false);
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const orbitsOf = useCallback((id: string): number[] => { const f = geo?.features.find((g) => String(g.properties?.id) === id); const o = f?.properties?.radar_orbits; return Array.isArray(o) ? o as number[] : []; }, [geo]);

  useEffect(() => {
    document.title = 'Chapter 2 · 24–29 Sep monsoon floods · Nepal AI Twin';
    try { const m = document.cookie.match(/(?:^|; )lang=(ko|en)/); if (m) setKo(m[1] === 'ko'); else if (!navigator.language.toLowerCase().startsWith('ko')) setKo(false); } catch { /* noop */ }  // eslint-disable-line react-hooks/set-state-in-effect
    fetch('/data/september.json').then((r) => r.json() as Promise<September>).then(setSept).catch(() => undefined);
    fetch('/data/september-windows.geojson').then((r) => r.json() as Promise<FeatureCollection>).then(setGeo).catch(() => undefined);
  }, []);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  const chooseLang = (isKo: boolean) => { setKo(isKo); try { document.cookie = `lang=${isKo ? 'ko' : 'en'};path=/;max-age=31536000`; } catch { /* noop */ } };

  const openWindow = useCallback((id: string, site: string, frac: number | null, nw: number | null, snow: number | null, orbits: number[]) => {
    const name = site === 'source' ? (ko ? '발원 회랑' : 'source corridor') : (ko ? sept?.flood_sites[site]?.name_ko : sept?.flood_sites[site]?.name) ?? site;
    const sub = site === 'source'
      ? `${frac == null ? (ko ? '채점 안 됨' : 'not ranked') : pct(frac) + (ko ? ' 토큰이 평시 p99 초과 (9/29 vs 8/24·9/5·9/17)' : ' of tokens beyond the ordinary p99 (29 Sep vs 24 Aug·5 Sep·17 Sep)')}${snow != null ? ` · 9/28 SCL ${ko ? '눈' : 'snow'} ${pct(snow, 0)}` : ''}`
      : `${frac == null ? (ko ? '관측 불가' : 'unobservable') : pct(frac) + (ko ? ' 결합 깃발' : ' fused flag')}${nw != null ? ` · ${ko ? '고전 새-물' : 'classical new-water'} ${pct(nw)}` : ''}${orbits.length ? ` · orbit ${orbits.join('+')}` : ''}`;
    setSwipe(50); setShowDelta(false);
    setLightbox({ title: `${name} · ${id}`, sub, before: `/data/september/frames/${id}_pre.jpg`, after: `/data/september/frames/${id}_post.jpg`, beforeLabel: ko ? 'PRE · 기준 3장 중앙값 · S1 VV' : 'PRE · base median of 3 passes · S1 VV', afterLabel: `POST · ${postLabel(site, orbits)}`, delta: `/data/september/frames/${id}_delta.png` });
  }, [ko, sept]);

  // 지도: 이 페이지 전용 인스턴스. 1장 지도의 maxBounds·장면·회랑 로직을 끌고 오지 않는다.
  useEffect(() => {
    if (!mapNode.current || mapRef.current || !geo || !sept) return;
    const map = new MapLibreMap({ container: mapNode.current, style: styleUrl ?? fallbackStyle, center: [85.2, 27.4], zoom: 7.2, minZoom: 6, maxBounds: [[80.5, 25.0], [90.0, 30.5]], attributionControl: false });
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    const attach = () => {
      if (map.getSource('sept')) return;
      map.addSource('sept', { type: 'geojson', data: geo });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const color: any = ['case', ['!', ['has', 'fused_frac']], '#9a9a9a', ['step', ['coalesce', ['get', 'fused_frac'], 0], '#c9d6e6', 0.01, '#7fb0e6', 0.05, '#eb6834', 0.10, '#b8306f']];
      map.addLayer({ id: 'sept-fill', type: 'fill', source: 'sept', paint: { 'fill-color': color, 'fill-opacity': ['case', ['==', ['get', 'kind'], 'source_corridor'], 0.5, 0.65] } });
      map.addLayer({ id: 'sept-line', type: 'line', source: 'sept', paint: { 'line-color': ['case', ['>=', ['coalesce', ['get', 'fused_frac'], 0], 0.05], '#eb6834', '#5f7a74'], 'line-width': ['case', ['>=', ['coalesce', ['get', 'fused_frac'], 0], 0.05], 2.2, 0.6] } });
      map.addLayer({ id: 'sept-rank', type: 'symbol', source: 'sept', filter: ['all', ['==', ['get', 'kind'], 'flood_site'], ['<=', ['coalesce', ['get', 'rank'], 999], 6]],
        layout: { 'text-field': ['concat', '#', ['to-string', ['get', 'rank']]], 'text-size': 12, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-offset': [0, -1.1] }, paint: { 'text-color': '#16151a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
      map.on('click', 'sept-fill', (e) => { const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (!pr) return;
        const orbits = (() => { try { return JSON.parse(String(pr.radar_orbits ?? '[]')) as number[]; } catch { return []; } })();
        openWindow(String(pr.id), String(pr.site), typeof pr.fused_frac === 'number' ? pr.fused_frac : null, typeof pr.radar_new_water === 'number' ? pr.radar_new_water : null, typeof pr.snow_frac_0928 === 'number' ? pr.snow_frac_0928 : null, orbits); });
      map.on('mouseenter', 'sept-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'sept-fill', () => { map.getCanvas().style.cursor = ''; });
      const b = sept.bounds; map.fitBounds(new LngLatBounds([b[0], b[1]], [b[2], b[3]]), { padding: { top: 40, right: 40, bottom: 40, left: 40 }, duration: 0 });
    };
    map.on('load', attach); map.on('style.load', attach);
    map.once('load', () => map.resize());  // 레이아웃 뒤 실제 크기로 다시 잰다
    const ro = new ResizeObserver(() => map.resize()); ro.observe(mapNode.current);
    map.on('error', (ev) => { const msg = String((ev as { error?: { message?: string } }).error?.message ?? ''); if (styleUrl && /style|403|Forbidden|Failed to fetch/i.test(msg)) map.setStyle(fallbackStyle); });
    mapRef.current = map;
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __m: MapLibreMap }).__m = map;
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, sept]);
  // openWindow 가 언어에 따라 바뀌므로 최신 함수를 핸들러가 보도록 ref 로 연결
  const openRef = useRef(openWindow); useEffect(() => { openRef.current = openWindow; }, [openWindow]);

  const fly = (c: [number, number], zoom = 11.3) => mapRef.current?.flyTo({ center: c, zoom, duration: 900 });
  const leads = useMemo(() => (sept?.fused_top ?? []).filter((f) => f.fused_frac >= 0.05), [sept]);
  const sites = useMemo(() => SITE_ORDER.map((k) => [k, sept?.flood_sites[k]] as const).filter((x) => x[1]) as [string, Site][], [sept]);

  return (
    <main className="sept-page">
      <nav className="sept-nav">
        <span className="brand">Nepal <b>AI Twin</b> · {ko ? '2장 · 9월 24~29일 몬순 홍수' : 'Chapter 2 · 24–29 Sep monsoon floods'}</span>
        <div>
          <button className={!ko ? 'is-active' : ''} onClick={() => chooseLang(false)}>EN</button><button className={ko ? 'is-active' : ''} onClick={() => chooseLang(true)}>한국어</button>
          <Link href="/" className="nav-link">{ko ? '첫 화면' : 'HOME'}</Link><a href="/map" className="nav-link">{ko ? '← 1장 지도 (8월 26일)' : '← CHAPTER 1 MAP (26 AUG)'}</a>
        </div>
      </nav>

      <header className="sept-head">
        <p className="kicker">{ko ? '같은 모델 · 같은 계약 · 다른 재난 — 1장과 섞지 않기 위해 따로 둔 페이지' : 'SAME MODEL · SAME CONTRACT · DIFFERENT DISASTER — kept apart from chapter 1 on purpose'}</p>
        <h1>{ko ? <>몬순 막바지 호우, <em>뉴스가 지목한 다섯 곳</em>을 위성으로 다시 보다</> : <>The late-monsoon rains: <em>five places the news named</em>, re-read from orbit</>}</h1>
        <p className="sub">{sept ? (ko ? sept.event.reported_ko : sept.event.reported) : '…'} · {ko ? '2026년 9월 24~29일' : '24–29 Sep 2026'}</p>
        {sept && <div className="funnel small" role="img" aria-label="5 sites, 125 windows, 1 clear signal, 56 source windows">
          <div><b>{sites.length}</b><span>{ko ? '뉴스 지점' : 'news sites'}</span></div><i>→</i>
          <div><b>{sites.reduce((a, [, s]) => a + s.windows, 0)}</b><span>{ko ? '레이더 창 (2.56 km)' : 'radar windows (2.56 km)'}</span></div><i>→</i>
          <div className="lead"><b>{sites.filter(([, s]) => s.verdict === 'clear signal').length}</b><span>{ko ? '뚜렷한 신호' : 'clear signal'}</span></div><i>·</i>
          <div className="zero"><b>{sept.source_corridor.windows}</b><span>{ko ? '발원지 재관측 → 눈' : 'source re-observed → snow'}</span></div>
        </div>}
      </header>

      <section className="sept-grid">
        <aside className="sept-col">
          <h2>{ko ? '지점별 판별' : 'Verdict by site'}</h2>
          <p className="muted">{ko ? '임베딩 깃발(자기 평시 p99 초과 토큰 비율)과 고전 새-물 비율, 두 레이더 궤도 복제, 광학 SCL 물 변화를 함께 읽었습니다.' : 'Embedding flags (share of tokens beyond each sensor’s own ordinary p99), a classical new-water fraction, a second radar orbit, and Sentinel-2 SCL water change, read together.'}</p>
          {sites.map(([k, s]) => (
            <article key={k} className={`sept-site ${VERDICT[s.verdict]?.cls ?? ''}`}>
              <header><strong>{ko ? s.name_ko : s.name}</strong><em>{ko ? VERDICT[s.verdict]?.ko : VERDICT[s.verdict]?.en}</em></header>
              <small>{ko ? s.news_ko : s.news}</small>
              <p>{ko ? s.reading_ko : s.reading}</p>
              {s.top[0] && <button onClick={() => fly(s.top[0].center_lonlat)}>◎ {ko ? `창 ${s.windows}개 보기` : `SHOW ${s.windows} WINDOWS`}</button>}
            </article>
          ))}
          {sept && <article className="sept-site v-source">
            <header><strong>{ko ? '발원 회랑 (8월 26일 자리)' : 'Source corridor (the 26 Aug site)'}</strong><em>{sept.source_corridor.measurement_id}</em></header>
            <small>{ko ? `56창 · 9월 29일 · 상위 창이 8월 발원 폴리곤에 닿음: ${sept.source_corridor.unosat_source_touching_top6}/6` : `56 windows · 29 Sep · top windows touching the August source polygons: ${sept.source_corridor.unosat_source_touching_top6}/6`}</small>
            <p>{ko ? sept.source_corridor.reading_ko : sept.source_corridor.reading}</p>
            <button onClick={() => fly([85.52, 28.28], 10.2)}>◎ {ko ? '발원 회랑 보기' : 'SHOW THE CORRIDOR'}</button>
          </article>}
        </aside>

        <div className="sept-map-wrap">
          <div ref={mapNode} className="sept-map" />
          <div className="sept-legend-card">
            <b>{ko ? '결합 깃발 비율' : 'Fused flag'}</b>
            <ul className="sept-legend"><li><i style={{ background: '#c9d6e6' }} />&lt; 1% {ko ? '(귀무)' : '(null)'}</li><li><i style={{ background: '#7fb0e6' }} />1–5%</li><li><i style={{ background: '#eb6834' }} />5–10%</li><li><i style={{ background: '#b8306f' }} />≥ 10%</li><li><i style={{ background: '#9a9a9a' }} />{ko ? '관측 불가' : 'unobservable'}</li></ul>
            <small>{ko ? '40 m 토큰 중 그 센서 자신의 평시 p99를 넘은 비율. 창을 누르면 레이더 전후와 AI 변화장이 열립니다. 피해가 아니라 먼저 볼 곳의 순서입니다.' : 'Share of 40 m tokens beyond that sensor’s own ordinary p99. Tap a window for the radar before/after and the AI change field. A reading order, not damage.'}</small>
          </div>
        </div>

        <aside className="sept-col">
          <h2>{ko ? `먼저 볼 창 ${leads.length}개` : `${leads.length} windows to look at first`}</h2>
          <p className="muted">{ko ? '결합 깃발 5% 이상(귀무의 5배). 두 궤도가 모두 읽은 창은 평균값입니다.' : 'Fused flag ≥ 5% (five times the null). Windows read by two orbits show the mean.'}</p>
          {leads.map((f) => { const s = sept!.flood_sites[f.site]; const orbits = orbitsOf(f.id); return (
            <article key={f.id} className="cand-card">
              <header><b>#{f.rank}</b><strong>{ko ? s?.name_ko : s?.name}</strong><small>{f.id.toUpperCase()} · {f.source === 'both' ? (ko ? '레이더+광학' : 'RADAR + OPTICAL') : f.source.toUpperCase()}{orbits.length ? ` · ORBIT ${orbits.join('+')}` : ''}</small></header>
              <div className="cand-strip" role="button" tabIndex={0} onClick={() => openWindow(f.id, f.site, f.fused_frac, f.radar_new_water, null, orbits)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}>
                <figure><img src={`/data/september/frames/${f.id}_pre.jpg`} alt="before" loading="lazy" /><figcaption>PRE · S1</figcaption></figure>
                <figure><img src={`/data/september/frames/${f.id}_post.jpg`} alt="after" loading="lazy" /><figcaption>{postLabel(f.site, orbits).slice(0, 6)}</figcaption></figure>
                <figure><img src={`/data/september/frames/${f.id}_delta.png`} alt="AI change field" loading="lazy" style={{ backgroundImage: `url(/data/september/frames/${f.id}_post.jpg)`, backgroundSize: 'cover' }} /><figcaption>AI Δ</figcaption></figure>
                <span className="strip-hint" aria-hidden="true">⤢ {ko ? '비교' : 'COMPARE'}</span>
              </div>
              <footer><span>{pct(f.fused_frac)} {ko ? '결합' : 'fused'}{f.radar_new_water != null ? ` · ${ko ? '새-물' : 'new-water'} ${pct(f.radar_new_water)}` : ''}{f.scl_water_delta != null ? ` · SCL ${ko ? '물' : 'water'} ${f.scl_water_delta >= 0 ? '+' : ''}${(100 * f.scl_water_delta).toFixed(0)}pp` : ''}</span><button onClick={() => fly(f.center_lonlat, 12.2)}>◎ {ko ? '지도' : 'MAP'}</button></footer>
            </article>); })}
          {sept && <figure className="sept-figure">
            <img src={sept.fusion.figure} alt="What fusion changed" loading="lazy" onClick={() => { setLightbox({ title: ko ? '결합(M102)이 바꾼 것과 안 바꾼 것' : 'What fusion (M102) did and did not change', sub: ko ? sept.fusion.headline_ko : sept.fusion.headline, before: sept.fusion.figure, after: sept.fusion.figure, beforeLabel: '', afterLabel: '', single: true }); }} />
            <figcaption>{ko ? sept.fusion.headline_ko : sept.fusion.headline}</figcaption>
          </figure>}
          {sept && <a className="btn" href={sept.download} download>{ko ? '9월 창 181개 GeoJSON 내려받기' : 'DOWNLOAD 181 SEPTEMBER WINDOWS (GEOJSON)'}</a>}
        </aside>
      </section>

      {sept && <section className="sept-scenes">
        <p className="kicker">{ko ? '쓴 장면 · 레이더는 구름을 뚫고, 광학은 삽타리에서만 열렸다' : 'SCENES USED · radar sees through the cloud; optical opened only at Saptari'}</p>
        <ol>{sept.scenes.map((s) => <li key={s.id} className={s.state}><b>{mono(s.acquired_at)}</b><small>{s.sensor.replace('Sentinel-', 'S')}</small><span>{s.detail}</span></li>)}</ol>
        <p className="muted">{ko ? `광학 판독(발원 회랑 56창): ` : 'Optical readability at the source corridor (56 windows): '}{sept.optical_readability.map((o) => `${o.date.slice(5)} ${ko ? '장면구름' : 'scene cloud'} ${o.scene_cloud_pct}% → ${ko ? '창 판독 중앙값' : 'window median'} ${o.window_readable_median_pct}% (≥80%: ${o.windows_ge80}/56)`).join(' · ')}. {ko ? '장면 헤더의 구름값은 창이 보이는지 말해주지 않습니다.' : 'The scene-level cloud figure does not tell you whether a window is readable.'}</p>
      </section>}

      <section className="sept-eo">
        <button className="eo-toggle" onClick={() => setEoOpen((v) => !v)} aria-expanded={eoOpen}>{ko ? 'EO로 어떻게 읽고, 어떻게 계속 갱신하나' : 'How to read this as Earth observation, and how it keeps updating'} {eoOpen ? '▴' : '▾'}</button>
        {eoOpen && <div className="eo-body">
          <div>
            <h3>{ko ? '보는 것' : 'What the yardstick sees'}</h3>
            <p>{ko ? '2.56 km 창 안 40 m 토큰의 임베딩이 사전 3장(36·24·12일 전)의 기억과 얼마나 다른지를 재고, 같은 창의 평시 쌍 p99를 문턱으로 씁니다. 큰 강의 강폭 확대(수스타: 하도 안 사주 침수)는 이 자가 봅니다. C-밴드 레이더는 수면에서 어둡게 돌아오므로 새 수면은 VV 하락으로도 겹쳐 보입니다(고전 새-물 비율).' : 'Each 2.56 km window is 64×64 tokens of 40 m. We measure how far the embedding of the post pass sits from the memory of three earlier passes (36, 24, 12 days before), and threshold at the same window’s ordinary-pair p99. A widened river (Susta: sandbars submerged in the Narayani channel) is exactly what this sees. C-band radar returns dark from open water, so new water also shows as a VV drop — the classical new-water fraction.'}</p>
          </div>
          <div>
            <h3>{ko ? '못 보는 것' : 'What it cannot see'}</h3>
            <p>{ko ? '둑 안에서 수위만 오른 강(데브갓 9.23 m), 가옥 몇 채(부트왈), 도로변 사면(다라파니)은 40 m 토큰과 12일 주기 아래 규모입니다. 사행 하천(코시)은 하도가 옮겨 다니는 것이 평시라서 몬순 3장 기준 귀무가 23%까지 올라가 침수와 평시를 가르지 못합니다. 발원 회랑에서는 9월 28일 신설 눈이 가장 큰 "변화"로 읽혔습니다. 맞게 읽은 것이지만 재난 추적자가 원하는 변화는 아닙니다.' : 'A river rising inside its banks (Devghat, 9.23 m), a few houses (Butwal) and road-side slope failures (Dharapani) are below a 40 m token and a 12-day cadence. On a braided river (the Koshi) channel migration is the ordinary state, so a three-pass monsoon null rises to 23% and cannot separate a flood from normal. At the source corridor the largest “change” on 28 Sep was fresh snow above 4,500 m — read correctly, but not what a disaster tracker wants.'}</p>
          </div>
          <div>
            <h3>{ko ? '어떻게 갱신되나' : 'How it updates'}</h3>
            <p>{ko ? 'Sentinel-1 은 궤도마다 12일, 이 지역을 세 궤도(19·121·158, 삽타리는 12)가 지나므로 나흘에 한 번꼴로 새 사후 관측이 생깁니다. 지형보정(RTC) 산출물은 촬영 다음 날 올라옵니다. 새 날짜가 오면 같은 계약에 날짜만 12일 밀어 다시 돌리고, 평시 쌍과 문턱은 고정합니다. 광학은 5일 주기지만 창 단위 SCL 판독이 50%를 넘는 날만 씁니다. 수스타·데브갓·부트왈의 첫 맑은 사후 광학은 10월 중순 몬순 철수 뒤를 기다립니다.' : 'Sentinel-1 revisits every 12 days per orbit; three orbits (19, 121, 158; orbit 12 at Saptari) cover the sites, so a new post pass lands about every four days, and the terrain-corrected product arrives the day after acquisition. Each new date re-runs the same contract shifted by 12 days with the placebo pair and threshold held fixed. Sentinel-2 revisits every five days but is used only when the per-window SCL readability exceeds 50%; the first clear post-flood optical pass for Susta, Devghat and Butwal waits for the monsoon to withdraw in mid-October.'}</p>
          </div>
          <div>
            <h3>{ko ? '다음에 바꿀 것' : 'What to change next'}</h3>
            <p>{ko ? '(1) 침수 판별에는 건기 기준선 또는 창 안 토큰 단위 검정이 필요합니다. 몬순 3장 기준은 사행 하천에서 실패했습니다. (2) 결합 규칙 max 는 두 센서가 어긋날 때 시끄러운 쪽을 올립니다. 일치(min 또는 곱) 규칙을 시험합니다. (3) 지역 공통 이동(젖은 지표·눈)을 빼려면 같은 날짜의 대조 창으로 공간 귀무를 넣어야 합니다.' : '(1) Flood discrimination needs a dry-season baseline or a within-window token test; the three-pass monsoon null failed on the braided river. (2) Max-fusion promotes the noisier sensor when the two disagree; test an agreement rule (min or product). (3) To remove the region-wide shift (wet surfaces, snow), add a spatial null from same-date control windows.'}</p>
          </div>
          {sept && <p className="muted">{ko ? '주장 경계: ' : 'Claim boundary: '}{sept.method.claim_boundary}. {ko ? '장부: ' : 'Ledger: '}{sept.ledger.join(', ')}. {ko ? '몬순: ' : 'Monsoon: '}{ko ? sept.monsoon_status.text_ko : sept.monsoon_status.text}</p>}
        </div>}
      </section>

      <footer className="sept-foot">
        <p>{ko ? '독립 개인 연구 데모 · Ai2·ESA/Copernicus 와 제휴·보증 관계가 없습니다 · 레이더 Sentinel-1 RTC(Planetary Computer), 광학 Sentinel-2 L2A · 모델 OlmoEarth v1 Base, frozen' : 'Independent personal research demo · not affiliated with or endorsed by Ai2 or ESA/Copernicus · Sentinel-1 RTC (Planetary Computer) and Sentinel-2 L2A · OlmoEarth v1 Base, frozen'}</p>
        <p><a href="/map">{ko ? '← 1장: 8월 26일 돌발홍수 지도' : '← Chapter 1: the 26 Aug flash-flood map'}</a> · <Link href="/">{ko ? '첫 화면' : 'Home'}</Link> · <a href="https://github.com/DDanggle/eo-rasuwa" target="_blank" rel="noreferrer">GitHub ↗</a></p>
      </footer>

      {lightbox && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={lightbox.title} onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <div className="lb-panel">
            <header><div><strong>{lightbox.title}</strong><small>{lightbox.sub}</small></div><button aria-label="close" onClick={() => setLightbox(null)}>×</button></header>
            {lightbox.single ? <div className="lb-single"><img src={lightbox.before} alt="" /></div> : (
              <>
                {!showDelta ? (
                  <div className="story-swipe lb-swipe" style={{ ['--swipe' as string]: `${swipe}%` }}>
                    <img src={lightbox.after} alt="after" />
                    <div className="swipe-clip"><img src={lightbox.before} alt="before" /></div>
                    <div className="swipe-bar" /><span className="swipe-label pre">{lightbox.beforeLabel}</span><span className="swipe-label post">{lightbox.afterLabel}</span>
                    <input type="range" min={0} max={100} value={swipe} aria-label="Compare before and after" onChange={(e) => setSwipe(Number(e.target.value))} />
                  </div>
                ) : (
                  <div className="lb-single"><img src={lightbox.delta} alt="AI change field" style={{ backgroundImage: `url(${lightbox.after})`, backgroundSize: 'cover' }} /><span className="lb-zoom-hint">{ko ? 'AI 변화장 · 주황 = 평시 p99 초과' : 'AI change field · orange = beyond the ordinary p99'}</span></div>
                )}
                <div className="lb-tabs"><button className={!showDelta ? 'is-active' : ''} onClick={() => setShowDelta(false)}>{ko ? '전 ⇄ 후' : 'BEFORE ⇄ AFTER'}</button><button className={showDelta ? 'is-active' : ''} onClick={() => setShowDelta(true)}>{ko ? 'AI 변화장' : 'AI CHANGE FIELD'}</button><span>{ko ? '손잡이를 끌어 비교 · ESC 닫기' : 'drag the handle · ESC closes'}</span></div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
