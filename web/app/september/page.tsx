'use client';
/* eslint-disable @next/next/no-img-element -- sealed research rasters are served without image transformation */
// 2장 · 2026년 9월 24~29일 몬순 홍수. 1장(/map)과 **같은 전체 화면 지도 레이아웃**이되 별도 페이지·별도 지도 인스턴스다.
// 다른 재난, 다른 자(레이더 3v1 + 고전 새-물 + SCL 물), 다른 지역(테라이 5지점 + 발원 회랑 재관측). 숫자는 /data/september.json 에서만.
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
const SAT_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

type Lead = { id: string; site: string; rank: number; fused_frac: number; source: string; radar_frac: number | null; optical_frac: number | null; radar_new_water: number | null; scl_water_delta: number | null; center_lonlat: [number, number]; gfm_flood_frac?: number | null };
type Site = { name: string; name_ko: string; news: string; news_ko: string; windows: number; verdict: string; reading: string; reading_ko: string; top: Lead[]; gfm?: { n: number; gfm_mean: number; gfm_max: number; windows_gfm_gt1pct: number; spearman_fused: number | null; spearman_new_water: number | null } | null };
type September = {
  event: { name: string; name_ko: string; window: [string, string]; reported: string; reported_ko: string; relation_to_chapter1: string };
  method: { contract: string; yardsticks: string[]; fusion: string; claim_boundary: string };
  source_corridor: { measurement_id: string; windows: number; threshold: number; flag_mean: number; top: { id: string; rank: number; frac: number; center_lonlat: [number, number]; snow_frac_0928: number | null }[]; unosat_source_touching_top6: number; reading: string; reading_ko: string };
  optical_readability: { date: string; scene_cloud_pct: number; window_readable_median_pct: number; windows_ge80: number }[];
  flood_sites: Record<string, Site>;
  fusion: { measurement_id: string; coverage: { radar_only: number; optical_only: number; both: number }; agreement_saptari: { n: number; spearman_radar_vs_optical: number; top5_overlap: number } | null; headline: string; headline_ko: string; figure: string };
  fused_top: Lead[];
  scenes: { id: string; sensor: string; acquired_at: string; state: string; detail: string }[];
  bounds: [number, number, number, number]; download: string; change_tokens: string; change_token_rule: string; ribbon?: string | null;
  river?: { segments: number; observed: number; reading: string; reading_ko: string; per_river: Record<string, { km: number; segments: number; observed: number; frac_mean: number | null; nw_mean: number | null; top_window: string | null; top_frac: number | null }> } | null;
  frames: { kind: string; delta: string; s2_sites: string[]; s2_dates: Record<string, [string, string]> };
  monsoon_status: { as_of: string; text: string; text_ko: string }; ledger: string[];
  gfm?: { measurement_id: string; yardstick: string; headline: string; headline_ko: string } | null;
};
type Lightbox = { title: string; sub: string; id: string; site: string; orbits: number[]; single?: string };
type CompareRiver = { river: string; name: string; name_ko: string; reaches: number; f24: number; f26: number; hot24: number; hot26: number; nw24: number; nw26: number; gfm24_pos: number; gfm26_pos: number };
type Compare = { contract: string; dates: Record<'2024' | '2026', { base: string[]; post: string; event: string; threshold: number }>; rivers: CompareRiver[]; reaches: number; headline: string; headline_ko: string; caveat: string; caveat_ko: string };
type View = 'now' | 'swipe' | 'diff';
// ── 쉬운 화면(기본) ── 숫자 대신 사람 말: 크게 변함 / 조금 / 평소 / 못 봄
type Level = 'big' | 'some' | 'normal' | 'unseen' | 'far';
type S2Meta = { pre: string; post: string } | null;
type Trend = 'recede' | 'hold' | 'grow' | null;
type Place = { name: string; name_ko: string; desc?: string; desc_ko?: string; lonlat: [number, number]; lv26: Level; lv24: Level; ev?: 'sep' | 'oct'; lv1011?: Level; big1011?: number; obs1011?: number; s2b?: S2Meta; lv1003?: Level; trend?: Trend; s2?: S2Meta; trend_counts?: Record<string, number>; focus_lonlat?: [number, number]; focus_window?: string; focus_river?: string; rivers?: string[]; rivers_ko?: string[]; big26?: number; obs26?: number; big24?: number; obs24?: number; gfm_agree?: number; nearest_big?: { km: number; lonlat: [number, number]; river: string; river_ko: string; window: string } | null };
type Answer = { title: string; title_ko: string; why?: string; why_ko?: string; lv26: Level; lv24: Level; ev?: 'sep' | 'oct'; lv1011?: Level; count1011?: [string, string]; s2b?: S2Meta; window?: string; river?: string; has24: boolean; gfm: 'agree' | 'disagree' | 'none'; nearest_big?: Place['nearest_big']; count26?: [string, string]; count24?: [string, string]; lv1003?: Level; trend?: Trend; s2?: S2Meta; trend_counts?: Record<string, number> };
const TREND_TEXT: Record<'recede' | 'hold' | 'grow', [string, string]> = { recede: ['10월 3일 레이더에선 변화가 줄었습니다 — 빠지는 중', 'Radar on 3 Oct shows less change — receding'], hold: ['10월 3일 레이더에서도 그대로입니다', 'Radar on 3 Oct shows the same — still changed'], grow: ['10월 3일 레이더에선 변화가 더 커졌습니다', 'Radar on 3 Oct shows more change'] };
const LV_COLOR: Record<Level, string> = { big: '#d7301f', some: '#f59e42', normal: '#9db8cc', unseen: '#a3a3a3', far: '#a3a3a3' };
const LV_TEXT: Record<Level, [string, string]> = {
  big: ['강이 평소보다 크게 변했습니다', 'The river changed far more than usual'],
  some: ['강이 평소보다 조금 더 변했습니다', 'The river changed a little more than usual'],
  normal: ['평소 수준입니다', 'About as usual'],
  unseen: ['위성이 이 구간을 읽지 못했습니다', 'The satellite could not read this stretch'],
  far: ['강 회랑에서 멀어 위성 판정 범위 밖입니다', 'Too far from the mapped rivers to judge'],
};
const LV_SHORT: Record<Level, [string, string]> = { big: ['크게 변함', 'changed a lot'], some: ['조금 변함', 'changed a little'], normal: ['평소 수준', 'as usual'], unseen: ['못 봄', 'not seen'], far: ['범위 밖', 'out of range'] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lvExpr = (prop: string): any => ['match', ['get', prop], 'big', LV_COLOR.big, 'some', LV_COLOR.some, 'normal', LV_COLOR.normal, LV_COLOR.unseen];
// 1장과 같은 변화 계급 — 두 해에 같은 색을 써야 범례 하나로 공정하게 읽힌다
const CLASS_COLORS = ['#7fb5c9', '#ffd666', '#ff983d', '#ec5238', '#ba185c'] as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const classExpr = (prop: string): any => ['step', ['coalesce', ['get', prop], 0], CLASS_COLORS[0], 0.005, CLASS_COLORS[1], 0.02, CLASS_COLORS[2], 0.05, CLASS_COLORS[3], 0.08, CLASS_COLORS[4]];
// 차이(2026−2024): 두 색 + 회색 중립. 2024 = 파랑, 2026 = 주황 (덤벨과 같은 정체성 색)
const DIFF_COLORS = ['#2a78d6', '#8fbbea', '#d9d6cf', '#f4a77f', '#eb6834'] as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const diffExpr: any = ['step', ['get', 'd'], DIFF_COLORS[0], -0.05, DIFF_COLORS[1], -0.01, DIFF_COLORS[2], 0.01, DIFF_COLORS[3], 0.05, DIFF_COLORS[4]];
const Y24 = '#2a78d6', Y26 = '#eb6834';

const SITE_ORDER = ['susta', 'devghat', 'saptari', 'butwal', 'dharapani'] as const;
const VERDICT: Record<string, { ko: string; en: string; cls: string }> = {
  'clear signal': { ko: '뚜렷', en: 'CLEAR', cls: 'v-clear' }, weak: { ko: '약함', en: 'WEAK', cls: 'v-weak' },
  'no signal': { ko: '신호 없음', en: 'NO SIGNAL', cls: 'v-none' }, 'classical only': { ko: '고전 자만', en: 'CLASSICAL ONLY', cls: 'v-classical' },
};
const postLabel = (site: string, orbits: number[]) => site === 'saptari' ? '28 SEP · orbit 12' : orbits.length === 1 && orbits[0] === 158 ? '26 SEP · orbit 158' : '29 SEP · orbit 19';
const pct = (x: number | null | undefined, d = 1) => x == null ? '—' : `${(100 * x).toFixed(d)}%`;
const mono = (iso: string) => `${iso.slice(8, 10)} ${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(iso.slice(5, 7)) - 1]}`;
const FR = '/data/september/frames';

export default function SeptemberPage() {
  const [sept, setSept] = useState<September | null>(null);
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [ko, setKo] = useState(true);
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
  const [lbTab, setLbTab] = useState<'radar' | 'delta' | 's2' | 'y24'>('radar');
  const [swipe, setSwipe] = useState(50);
  const [showTokens, setShowTokens] = useState(true);
  const [showWindows, setShowWindows] = useState(true);
  const [showRibbon, setShowRibbon] = useState(true);
  const [satellite, setSatellite] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [eoOpen, setEoOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [cmp, setCmp] = useState<Compare | null>(null);
  const [expert, setExpert] = useState(false);          // 기본은 쉬운 화면
  const [year, setYear] = useState<'2026' | '2024' | '1011'>('2026');   // '1011' = 10월 11일 부디 간다키(다른 사건·다른 강, 같은 방법)
  const [places, setPlaces] = useState<Place[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(false);
  const [cardSwipe, setCardSwipe] = useState(50);
  const [headOpen, setHeadOpen] = useState(true);
  const [photo, setPhoto] = useState<'radar' | 'a85' | 's2'>('radar');
  const expertRef = useRef(false); const yearRef = useRef<'2026' | '2024' | '1011'>('2026'); const fitYearRef = useRef<string>('2026');
  const [octHead, setOctHead] = useState<{ ko: string; en: string } | null>(null);
  const pickReachRef = useRef<(pr: Record<string, unknown>) => void>(() => {});   // 지도 클릭 핸들러가 최신 함수를 보게
  const [view, setView] = useState<View>('now');
  const [split, setSplit] = useState(60);   // 바그마티 오른쪽에서 시작: 처음엔 두 강 모두 2024, 왼쪽으로 끌면 바그마티→나라야니 순으로 2026 이 드러난다
  const SPLIT_MAX = 72;                    // 오른쪽 레일(380px) 뒤로 숨지 않게              // 스와이프 손잡이 위치(%)
  const mapNodeB = useRef<HTMLDivElement>(null);
  const mapBRef = useRef<MapLibreMap | null>(null);
  const viewRef = useRef<View>('now');
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const orbitsOf = useCallback((id: string): number[] => { const f = geo?.features.find((g) => String(g.properties?.id) === id); const o = f?.properties?.radar_orbits; return Array.isArray(o) ? o as number[] : []; }, [geo]);

  useEffect(() => {
    document.title = 'Chapter 2 · 24–29 Sep monsoon floods · Nepal AI Twin';
    document.body.classList.add('sept-body');
    try { const m = document.cookie.match(/(?:^|; )lang=(ko|en)/); if (m) setKo(m[1] === 'ko'); else if (!navigator.language.toLowerCase().startsWith('ko')) setKo(false); } catch { /* noop */ }  // eslint-disable-line react-hooks/set-state-in-effect
    fetch('/data/september.json').then((r) => r.json() as Promise<September>).then(setSept).catch(() => undefined);
    try { if (new URLSearchParams(window.location.search).get('ev') === '1011') { setYear('1011'); } } catch { /* noop */ }
    fetch('/data/september-simple-summary.json').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.oct?.headline_ko) setOctHead({ ko: j.oct.headline_ko, en: j.oct.headline }); }).catch(() => undefined);
    fetch('/data/september-places.json').then((r) => (r.ok ? r.json() as Promise<Place[]> : [])).then(setPlaces).catch(() => undefined);
    fetch('/data/september-compare.json').then((r) => (r.ok ? r.json() as Promise<Compare> : null)).then(setCmp).catch(() => undefined);
    fetch('/data/september-windows.geojson').then((r) => r.json() as Promise<FeatureCollection>).then(setGeo).catch(() => undefined);
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); }; window.addEventListener('keydown', h);
    return () => { window.removeEventListener('keydown', h); document.body.classList.remove('sept-body'); };
  }, []);
  const chooseLang = (isKo: boolean) => { setKo(isKo); try { document.cookie = `lang=${isKo ? 'ko' : 'en'};path=/;max-age=31536000`; } catch { /* noop */ } };

  const openWindow = useCallback((id: string, site: string, orbits: number[]) => {
    const name = site === 'source' ? (ko ? '발원 회랑' : 'Source corridor') : (ko ? sept?.flood_sites[site]?.name_ko : sept?.flood_sites[site]?.name) ?? site;
    const f = geo?.features.find((g) => String(g.properties?.id) === id)?.properties as Record<string, unknown> | undefined;
    const frac = typeof f?.fused_frac === 'number' ? f.fused_frac : null; const nw = typeof f?.radar_new_water === 'number' ? f.radar_new_water : null; const snow = typeof f?.snow_frac_0928 === 'number' ? f.snow_frac_0928 : null;
    const sub = site === 'source'
      ? `${frac == null ? (ko ? '채점 안 됨' : 'not ranked') : pct(frac) + (ko ? ' 토큰이 평시 p99 초과 (9/29 vs 8/24·9/5·9/17)' : ' of tokens beyond the ordinary p99 (29 Sep vs 24 Aug·5 Sep·17 Sep)')}${snow != null ? ` · 9/28 SCL ${ko ? '눈' : 'snow'} ${pct(snow, 0)}` : ''}`
      : `${frac == null ? (ko ? '관측 불가' : 'unobservable') : pct(frac) + (ko ? ' 결합 깃발' : ' fused flag')}${nw != null ? ` · ${ko ? '고전 새-물' : 'classical new-water'} ${pct(nw)}` : ''}${orbits.length ? ` · orbit ${orbits.join('+')}` : ''}`;
    setSwipe(50); setLbTab(viewRef.current !== 'now' && /^(narayani|tinau|narayaniu|narayanix|tinaux|raptix|bagmatix)_/.test(id) ? 'y24' : 'radar'); setLightbox({ title: `${name} · ${id}`, sub, id, site, orbits });
  }, [ko, sept, geo]);
  const openRef = useRef(openWindow); useEffect(() => { openRef.current = openWindow; }, [openWindow]);

  // 지도: 전체 화면, 이 페이지 전용 인스턴스
  useEffect(() => {
    if (!mapNode.current || mapRef.current || !geo || !sept) return;
    const map = new MapLibreMap({ container: mapNode.current, style: styleUrl ?? fallbackStyle, center: [85.2, 27.4], zoom: 7.2, minZoom: 5, maxBounds: [[76.0, 19.0], [94.0, 35.0]], attributionControl: false });
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    const attach = () => {
      if (map.getSource('sept')) return;
      // MapTiler outdoor 는 산악에서만 음영이 살고 테라이·인도 평야는 평평한 연두로 비어 보인다(사용자 지적). 전역 음영기복을 라벨 아래 깔아 질감을 맞춘다.
      const firstSymbol = map.getStyle()?.layers?.find((l) => l.type === 'symbol')?.id;
      map.addSource('hillshade-global', { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 15, attribution: 'Hillshade © Esri' });
      map.addLayer({ id: 'hillshade-global', type: 'raster', source: 'hillshade-global', paint: { 'raster-opacity': 0.42, 'raster-contrast': 0.15 } }, firstSymbol);
      map.addSource('satellite', { type: 'raster', tiles: [SAT_TILES], tileSize: 256, attribution: 'Esri World Imagery' });
      map.addLayer({ id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' }, paint: { 'raster-saturation': -0.2 } }, firstSymbol);
      map.addSource('sept', { type: 'geojson', data: geo });
      map.addSource('tokens', { type: 'geojson', data: sept.change_tokens });
      if (sept.ribbon) map.addSource('ribbon', { type: 'geojson', data: sept.ribbon });
      map.addLayer({ id: 'sept-fill', type: 'fill', source: 'sept', paint: { 'fill-color': '#000', 'fill-opacity': 0.001 } });   // 클릭 히트용
      map.addLayer({ id: 'sept-line', type: 'line', source: 'sept', paint: { 'line-color': ['case', ['>=', ['coalesce', ['get', 'fused_frac'], 0], 0.05], '#eb6834', ['!', ['has', 'fused_frac']], '#9a9a9a', '#5f7a74'], 'line-width': ['case', ['>=', ['coalesce', ['get', 'fused_frac'], 0], 0.05], 2.2, 0.7], 'line-opacity': 0.9 } });
      // 변화 토큰(40 m): 1장의 강 리본처럼 — 새 물은 파랑, 문턱 초과는 주황→자홍(초과 배수)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokColor: any = ['case', ['>=', ['get', 'nw'], 0.5], '#2a78d6', ['step', ['get', 'x'], '#f0a070', 1.3, '#eb6834', 1.8, '#c8414b', 2.5, '#b8306f']];
      map.addLayer({ id: 'tokens-fill', type: 'fill', source: 'tokens', paint: { 'fill-color': tokColor, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.75, 12, 0.6] } });
      if (sept.ribbon) {
        // 강 리본: 1장과 같은 계급(0.5 / 2 / 5 / 8 %). 관측 불가 구간은 점선 회색으로 남긴다 — 지우지 않는다.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ribColor: any = ['case', ['!', ['get', 'observed']], '#9a9a9a', ['step', ['coalesce', ['get', 'frac'], 0], '#7fb5c9', 0.005, '#ffd666', 0.02, '#ff983d', 0.05, '#ec5238', 0.08, '#ba185c']];
        map.addLayer({ id: 'ribbon-casing', type: 'line', source: 'ribbon', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 5, 12, 16], 'line-opacity': 0.9 } });
        // line-dasharray 는 데이터 기반 표현식을 받지 않는다(MapLibre) → 관측/미관측을 두 레이어로 나눈다
        map.addLayer({ id: 'ribbon-unobs', type: 'line', source: 'ribbon', filter: ['!', ['get', 'observed']], layout: { 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': '#8d8d8d', 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2.2, 12, 7], 'line-opacity': 0.8, 'line-dasharray': [1.4, 1.6] } });
        map.addLayer({ id: 'ribbon', type: 'line', source: 'ribbon', filter: ['get', 'observed'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ribColor, 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 4, 12, 12], 'line-opacity': 0.95 } });
        map.addLayer({ id: 'ribbon-hit', type: 'line', source: 'ribbon', paint: { 'line-color': '#000', 'line-opacity': 0.001, 'line-width': 18 } });
        map.on('click', 'ribbon-hit', (e) => { const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (!pr || !pr.window) return; const w = String(pr.window); const site = String(pr.river); openRef.current(w, site, site === 'river_koshi' ? [12] : [19]); });
        map.on('mouseenter', 'ribbon-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'ribbon-hit', () => { map.getCanvas().style.cursor = ''; });
      }
      // 쉬운 화면 리본: 굵고 평이한 네 색. 못 본 구간은 점선 회색.
      // 종이색 한 겹: 배경 지도를 눌러 리본만 튀게(Upshot/Guardian 식). 자세히 보기에선 걷는다.
      map.addLayer({ id: 'wash', type: 'background', paint: { 'background-color': '#f6f5f1', 'background-opacity': 0.55 } });
      map.addSource('simple', { type: 'geojson', data: '/data/september-simple.geojson' });
      map.addLayer({ id: 'simple-casing', type: 'line', source: 'simple', filter: ['==', ['get', 'ev'], 'sep'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 6, 9, 9, 13, 20] } });
      map.addLayer({ id: 'simple-unseen', type: 'line', source: 'simple', filter: ['all', ['==', ['get', 'ev'], 'sep'], ['==', ['get', 'lv26'], 'unseen']], layout: { 'line-cap': 'butt' }, paint: { 'line-color': LV_COLOR.unseen, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 13, 7], 'line-dasharray': [1.2, 1.4] } });
      map.addLayer({ id: 'simple-line', type: 'line', source: 'simple', filter: ['all', ['==', ['get', 'ev'], 'sep'], ['!=', ['get', 'lv26'], 'unseen']], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': lvExpr('lv26'), 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 3.5, 9, 6, 13, 15] } });
      map.addLayer({ id: 'simple-hit', type: 'line', source: 'simple', filter: ['==', ['get', 'ev'], 'sep'], paint: { 'line-color': '#000', 'line-opacity': 0.001, 'line-width': 24 } });
      map.addSource('rlabels', { type: 'geojson', data: '/data/september-river-labels.geojson' });
      map.addLayer({ id: 'rlabels', type: 'symbol', source: 'rlabels', filter: ['==', ['get', 'year'], '2026'],
        layout: { 'text-field': ['get', 'ko'], 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 6, 12, 9, 15], 'text-anchor': 'left', 'text-offset': [0.9, 0], 'text-max-width': 14, 'text-allow-overlap': false, 'symbol-sort-key': ['match', ['get', 'lv'], 'big', 0, 'some', 1, 2] },
        paint: { 'text-color': lvExpr('lv'), 'text-halo-color': '#f6f5f1', 'text-halo-width': 2.2 } });
      map.addLayer({ id: 'rlabels-dot', type: 'circle', source: 'rlabels', filter: ['==', ['get', 'year'], '2026'], paint: { 'circle-radius': 4.5, 'circle-color': lvExpr('lv'), 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });
      map.on('click', 'simple-hit', (e) => { const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (pr) pickReachRef.current(pr); });
      map.on('mouseenter', 'simple-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'simple-hit', () => { map.getCanvas().style.cursor = ''; });
      // 두 해 비교 리본(M108, 같은 2v1 계약). A 지도: 스와이프 왼쪽 = 2024, 차이 모드 = 2026−2024.
      map.addSource('cmp', { type: 'geojson', data: '/data/september-compare-ribbon.geojson' });
      map.addLayer({ id: 'cmp-casing', type: 'line', source: 'cmp', layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 6, 12, 17] } });
      map.addLayer({ id: 'cmp-24', type: 'line', source: 'cmp', layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': classExpr('f24'), 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 4, 12, 12] } });
      map.addLayer({ id: 'cmp-diff', type: 'line', source: 'cmp', layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': diffExpr, 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 4, 12, 12] } });
      map.addLayer({ id: 'cmp-hit', type: 'line', source: 'cmp', layout: { visibility: 'none' }, paint: { 'line-color': '#000', 'line-opacity': 0.001, 'line-width': 20 } });
      map.on('click', 'cmp-hit', (e) => { const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (pr?.window) openRef.current(String(pr.window), String(pr.river), [19]); });
      map.on('mouseenter', 'cmp-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'cmp-hit', () => { map.getCanvas().style.cursor = ''; });
      map.addLayer({ id: 'sept-rank', type: 'symbol', source: 'sept', filter: ['all', ['==', ['get', 'kind'], 'flood_site'], ['<=', ['coalesce', ['get', 'rank'], 999], 6]],
        layout: { 'text-field': ['concat', '#', ['to-string', ['get', 'rank']]], 'text-size': 12, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-offset': [0, -1.1] }, paint: { 'text-color': '#16151a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
      map.on('click', 'sept-fill', (e) => { const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (!pr) return;
        const orbits = (() => { try { return JSON.parse(String(pr.radar_orbits ?? '[]')) as number[]; } catch { return []; } })();
        openRef.current(String(pr.id), String(pr.site), orbits); });
      map.on('mouseenter', 'sept-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'sept-fill', () => { map.getCanvas().style.cursor = ''; });
      map.resize(); const narrow = window.innerWidth < 900; const b: [number, number, number, number] = expertRef.current ? sept.bounds : [83.4, 26.4, 87.2, 27.9];
      map.fitBounds(new LngLatBounds([b[0], b[1]], [b[2], b[3]]), { padding: expertRef.current ? { top: 90, right: 370, bottom: 150, left: 350 } : narrow ? { top: 300, right: 16, bottom: 24, left: 16 } : { top: 80, right: 40, bottom: 40, left: 400 }, duration: 0 });
      setMapReady(true);
    };
    map.on('load', attach); map.on('style.load', attach);
    map.once('load', () => map.resize());
    const ro = new ResizeObserver(() => map.resize()); ro.observe(mapNode.current);
    map.on('error', (ev) => { const msg = String((ev as { error?: { message?: string } }).error?.message ?? ''); if (styleUrl && /style|403|Forbidden|Failed to fetch/i.test(msg)) map.setStyle(fallbackStyle); });
    mapRef.current = map;
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __m: MapLibreMap }).__m = map;
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, sept]);
  useEffect(() => { const m = mapRef.current; if (!m || !mapReady || viewRef.current !== 'now' || !expertRef.current) return; if (m.getLayer('tokens-fill')) m.setLayoutProperty('tokens-fill', 'visibility', showTokens ? 'visible' : 'none'); }, [showTokens, mapReady]);
  useEffect(() => { const m = mapRef.current; if (!m || !mapReady || viewRef.current !== 'now' || !expertRef.current) return; for (const id of ['sept-line', 'sept-rank']) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', showWindows ? 'visible' : 'none'); }, [showWindows, mapReady]);
  useEffect(() => { const m = mapRef.current; if (!m || !mapReady || viewRef.current !== 'now' || !expertRef.current) return; for (const id of ['ribbon-casing', 'ribbon-unobs', 'ribbon', 'ribbon-hit']) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', showRibbon ? 'visible' : 'none'); }, [showRibbon, mapReady]);
  useEffect(() => { const m = mapRef.current; if (!m || !mapReady) return; if (m.getLayer('satellite')) m.setLayoutProperty('satellite', 'visibility', satellite ? 'visible' : 'none'); }, [satellite, mapReady]);

  // 쉬운 화면 ↔ 자세히: 쉬운 화면에선 쉬운 리본만 보이고 나머지는 전부 숨긴다
  useEffect(() => {
    expertRef.current = expert; yearRef.current = year;
    const m = mapRef.current; if (!m || !mapReady) return;
    const prop = year === '2024' ? 'lv24' : year === '1011' ? 'lv1011' : 'lv26'; const ev = year === '1011' ? 'oct' : 'sep';
    for (const id of ['simple-casing', 'simple-line', 'simple-unseen', 'simple-hit']) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', expert ? 'none' : 'visible');
    if (m.getLayer('simple-line')) { m.setPaintProperty('simple-line', 'line-color', lvExpr(prop)); m.setFilter('simple-line', ['all', ['==', ['get', 'ev'], ev], ['!=', ['get', prop], 'unseen']]); }
    if (m.getLayer('simple-unseen')) m.setFilter('simple-unseen', ['all', ['==', ['get', 'ev'], ev], ['==', ['get', prop], 'unseen']]);
    for (const id of ['simple-casing', 'simple-hit']) if (m.getLayer(id)) m.setFilter(id, ['==', ['get', 'ev'], ev]);
    // 탭을 바꾸면 그 사건의 강이 다 보이게
    if (fitYearRef.current !== year && !expert) { fitYearRef.current = year; const narrow = window.innerWidth < 900; const b: [number, number, number, number] = year === '1011' ? [84.55, 27.72, 85.15, 28.56] : [83.4, 26.4, 87.2, 27.9];
      m.fitBounds(new LngLatBounds([b[0], b[1]], [b[2], b[3]]), { padding: narrow ? { top: 300, right: 16, bottom: 24, left: 16 } : { top: 80, right: 40, bottom: 40, left: 400 }, duration: 600 }); }
    for (const id of ['rlabels', 'rlabels-dot']) if (m.getLayer(id)) { m.setFilter(id, ['==', ['get', 'year'], year]); m.setLayoutProperty(id, 'visibility', expert ? 'none' : 'visible'); }
    if (m.getLayer('rlabels')) m.setLayoutProperty('rlabels', 'text-field', ['get', ko ? 'ko' : 'en']);
    if (m.getLayer('wash')) m.setLayoutProperty('wash', 'visibility', expert ? 'none' : 'visible');
    if (!expert) for (const id of ['ribbon-casing', 'ribbon-unobs', 'ribbon', 'ribbon-hit', 'tokens-fill', 'sept-line', 'sept-rank', 'cmp-casing', 'cmp-24', 'cmp-diff', 'cmp-hit']) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', 'none');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expert, year, mapReady, ko]);
  useEffect(() => { document.body.classList.toggle('sept-scroll', !expert); return () => document.body.classList.remove('sept-scroll'); }, [expert]);
  // 보기 모드: 비교 중엔 토큰·창·기본 리본을 숨기고 비교 리본만 — 한 장면에 한 이야기
  useEffect(() => {
    viewRef.current = view;
    const m = mapRef.current; if (!m || !mapReady || !expert) return;
    const vis = (id: string, on: boolean) => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
    const now = view === 'now';
    for (const id of ['ribbon-casing', 'ribbon-unobs', 'ribbon', 'ribbon-hit']) vis(id, now && showRibbon);
    vis('tokens-fill', now && showTokens); for (const id of ['sept-line', 'sept-rank']) vis(id, now && showWindows);
    vis('cmp-casing', !now); vis('cmp-hit', !now); vis('cmp-24', view === 'swipe'); vis('cmp-diff', view === 'diff');
    if (!now) { const b: [number, number, number, number] = [83.6, 26.6, 86.2, 28.0]; m.fitBounds(new LngLatBounds([b[0], b[1]], [b[2], b[3]]), { padding: { top: 120, right: 380, bottom: 40, left: 40 }, duration: 800 }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, mapReady, expert]);
  // 스와이프용 B 지도(2026 리본): 첫 사용 때 만들고, A 의 카메라를 그대로 따라간다
  useEffect(() => {
    if (view !== 'swipe' || mapBRef.current || !mapNodeB.current || !mapRef.current) return;
    const a = mapRef.current;
    const b = new MapLibreMap({ container: mapNodeB.current, style: styleUrl ?? fallbackStyle, center: a.getCenter(), zoom: a.getZoom(), interactive: false, attributionControl: false });
    b.on('load', () => {
      const firstSymbol = b.getStyle()?.layers?.find((l) => l.type === 'symbol')?.id;
      b.addSource('hillshade-global', { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 15 });
      b.addLayer({ id: 'hillshade-global', type: 'raster', source: 'hillshade-global', paint: { 'raster-opacity': 0.42, 'raster-contrast': 0.15 } }, firstSymbol);
      b.addSource('cmp', { type: 'geojson', data: '/data/september-compare-ribbon.geojson' });
      b.addLayer({ id: 'cmp-casing', type: 'line', source: 'cmp', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 6, 12, 17] } });
      b.addLayer({ id: 'cmp-26', type: 'line', source: 'cmp', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': classExpr('f26'), 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 4, 12, 12] } });
      b.jumpTo({ center: a.getCenter(), zoom: a.getZoom(), bearing: a.getBearing(), pitch: a.getPitch() });
    });
    const sync = () => b.jumpTo({ center: a.getCenter(), zoom: a.getZoom(), bearing: a.getBearing(), pitch: a.getPitch() });
    a.on('move', sync);
    const ro = new ResizeObserver(() => b.resize()); ro.observe(mapNodeB.current);
    b.on('error', (ev) => console.error('[mapB]', String((ev as { error?: { message?: string } }).error?.message ?? ev)));
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __mB: MapLibreMap }).__mB = b;
    mapBRef.current = b;
  }, [view]);
  const startDrag = (e: React.PointerEvent) => {
    const move = (ev: PointerEvent) => setSplit(Math.max(4, Math.min(SPLIT_MAX, (ev.clientX / window.innerWidth) * 100)));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); e.preventDefault();
  };

  const fly = (c: [number, number], zoom = 11.3) => mapRef.current?.flyTo({ center: c, zoom, duration: 900 });
  const pickReach = useCallback((pr: Record<string, unknown>) => {
    const g = typeof pr.gfm26 === 'number' ? pr.gfm26 : null; const lv26 = String(pr.lv26) as Level;
    setCardSwipe(50); setPhoto('radar');
    setAnswer({ title: `${String(pr.name)} · ${Number(pr.km).toFixed(0)} km`, title_ko: `${String(pr.name_ko)} · ${Number(pr.km).toFixed(0)} km 지점`, lv26, lv24: String(pr.lv24) as Level, window: pr.window ? String(pr.window) : undefined, river: String(pr.river),
      has24: pr.has24 === true || pr.has24 === 'true', gfm: g == null || lv26 === 'unseen' ? 'none' : g > 0.01 ? 'agree' : 'disagree',
      lv1003: (pr.lv1003 ? String(pr.lv1003) : 'unseen') as Level, trend: (pr.trend ? String(pr.trend) : null) as Trend, s2: typeof pr.s2 === 'string' ? JSON.parse(pr.s2) as S2Meta : (pr.s2 as S2Meta) ?? null,
      ev: pr.ev === 'oct' ? 'oct' : 'sep', lv1011: (pr.lv1011 ? String(pr.lv1011) : 'unseen') as Level, s2b: typeof pr.s2b === 'string' ? JSON.parse(pr.s2b) as S2Meta : (pr.s2b as S2Meta) ?? null });
  }, []);
  useEffect(() => { pickReachRef.current = pickReach; }, [pickReach]);
  const pickPlace = (p: Place) => {
    setQuery(p.name); setCardSwipe(50); setPhoto('radar');
    fly(p.focus_lonlat ?? p.lonlat, (p.ev === 'oct' ? p.lv1011 : p.lv26) === 'far' ? 9 : 11.2);
    const cnt = (big?: number, obs?: number): [string, string] | undefined => obs ? [`반경 8 km 안 강 구간 ${obs}곳 중 ${big}곳이 크게 변함`, `${big} of ${obs} river stretches within 8 km changed a lot`] : undefined;
    setPicked(true);
    setAnswer({ title: p.name, title_ko: p.name_ko, why: p.desc, why_ko: p.desc_ko, lv26: p.lv26, lv24: p.lv24, window: p.focus_window, river: p.focus_river, has24: (p.obs24 ?? 0) > 0,
      gfm: p.lv26 === 'far' || p.lv26 === 'unseen' ? 'none' : (p.gfm_agree ?? 0) > 0 ? 'agree' : p.lv26 === 'big' ? 'disagree' : 'none', nearest_big: p.lv26 === 'big' ? null : p.nearest_big, count26: cnt(p.big26, p.obs26), count24: cnt(p.big24, p.obs24), lv1003: p.lv1003, trend: p.trend ?? null, s2: p.s2 ?? null, trend_counts: p.trend_counts,
      ev: p.ev ?? 'sep', lv1011: p.lv1011 ?? 'far', count1011: cnt(p.big1011, p.obs1011), s2b: p.s2b ?? null });
  };
  const matches = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return [] as Place[]; return places.filter((p) => (p.ev ?? 'sep') === (year === '1011' ? 'oct' : 'sep')).filter((p) => p.name.toLowerCase().includes(q) || p.name_ko.includes(query.trim())).slice(0, 6); }, [query, places, year]);
  const leads = useMemo(() => (sept?.fused_top ?? []).filter((f) => f.fused_frac >= 0.05), [sept]);
  const sites = useMemo(() => SITE_ORDER.map((k) => [k, sept?.flood_sites[k]] as const).filter((x) => x[1]) as [string, Site][], [sept]);
  const hasS2 = (site: string) => !!sept?.frames.s2_sites.includes(site);
  const cmpWin = (id: string) => /^(narayani|tinau|narayaniu|narayanix|tinaux|raptix|bagmatix)_/.test(id);

  return (
    <><main className={`sept-shell ${expert ? '' : 'scrolly'}`}>
      <div ref={mapNode} className="sept-stage" />
      <div ref={mapNodeB} className="sept-stage b" style={{ visibility: view === 'swipe' ? 'visible' : 'hidden', clipPath: `inset(0 0 0 ${split}%)` }} aria-hidden />
      {view === 'swipe' && <>
        <div className="swipe-handle" style={{ left: `${split}%` }} onPointerDown={startDrag} role="slider" aria-label="2024 / 2026" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(split)} tabIndex={0}
             onKeyDown={(e) => { if (e.key === 'ArrowLeft') setSplit((v) => Math.max(4, v - 4)); if (e.key === 'ArrowRight') setSplit((v) => Math.min(SPLIT_MAX, v + 4)); }}><span>⇄</span></div>
        <div className="swipe-year left" style={{ right: `calc(${100 - split}% + 14px)` }}><b style={{ color: Y24 }}>2024</b><small>{cmp?.dates['2024'].event} · post {cmp?.dates['2024'].post.slice(5)}</small></div>
        <div className="swipe-year right" style={{ left: `calc(${split}% + 14px)` }}><b style={{ color: Y26 }}>2026</b><small>{cmp?.dates['2026'].event} · post {cmp?.dates['2026'].post.slice(5)}</small></div>
      </>}

      {!expert && (
        <header className="sept-topbar simple">
          <div className="brand"><Link href="/" className="brand-link">Nepal <b>AI Twin</b></Link><small>{ko ? '2026년 9월 홍수 · 위성으로 본 강' : 'SEPTEMBER 2026 FLOODS · THE RIVERS FROM ORBIT'}</small></div>
          <div className="links">
            <button onClick={() => { setExpert(true); setAnswer(null); }}>{ko ? '분석 화면' : 'ANALYSIS VIEW'}</button>
            <button className={!ko ? 'is-active' : ''} onClick={() => chooseLang(false)}>EN</button><button className={ko ? 'is-active' : ''} onClick={() => chooseLang(true)}>한국어</button>
            <Link href="/" className="nav-link">{ko ? '홈' : 'HOME'}</Link>
          </div>
        </header>
      )}
      {!expert && (
        <section className={`simple-head ${headOpen ? '' : 'is-closed'}`}>
          <button className="head-toggle" onClick={() => setHeadOpen((v) => !v)} aria-expanded={headOpen}>{headOpen ? (ko ? '접기' : 'HIDE') : (ko ? '설명' : 'ABOUT')}</button>
          <p className="kicker"><span className={year === '2026' ? 'on' : ''} onClick={() => setYear('2026')} role="tab" aria-selected={year === '2026'}>{ko ? '2026년 9월' : 'September 2026'}</span><span className={year === '2024' ? 'on' : ''} onClick={() => setYear('2024')} role="tab" aria-selected={year === '2024'}>{ko ? '2024년 9월' : 'September 2024'}</span><span className={year === '1011' ? 'on new' : 'new'} onClick={() => { setYear('1011'); setAnswer(null); setQuery(''); }} role="tab" aria-selected={year === '1011'}>{ko ? '10월 11일 · 새 홍수' : '11 Oct · new flood'}</span></p>
          <h1>{year === '1011'
            ? (octHead ? (ko ? octHead.ko : octHead.en) : (ko ? <>부디 간다키강, <em>산사태 댐이 터진 날</em> 아침의 위성</> : <>The Budhi Gandaki, <em>the morning the landslide dam burst</em></>))
            : year === '2026'
            ? (ko ? <>나라야니강이 <em>인도 국경 너머까지</em> 넓어졌습니다</> : <>The Narayani widened <em>all the way into India</em></>)
            : (ko ? <>2024년엔 <em>바그마티강</em>이 넓어졌습니다</> : <>In 2024 it was the <em>Bagmati</em> that widened</>)}</h1>
          <p className="dek">{year === '1011'
            ? (ko ? '10월 11일 새벽 고르카 춤쳇 위 산사태가 강을 막았다 터졌습니다. 레이더 위성은 그날 아침 6시 3분, 홍수파가 하류에 닿기 전에 지나갔습니다. 빨간 구간은 춤쳇의 산사태 하나뿐이고 하류는 아직 평소 수준입니다. 홍수 뒤 모습은 10월 23일 다음 통과에서 잽니다.' : 'Before dawn on 11 Oct a landslide above Chumchet, Gorkha, dammed the river and the dam burst. The radar satellite passed at 06:03, before the flood wave reached downstream. The only red stretch is the Chumchet landslide itself; downstream is still as usual. The next pass on 23 Oct will measure the aftermath.')
            : year === '2026'
            ? (ko ? '9월 24~29일 비가 그친 뒤 위성 레이더로 본 강. 빨간 구간이 평소 몬순보다 크게 변한 곳이고, 하늘색은 평소 수준입니다. 바그마티·코시는 조용했습니다.' : 'The rivers seen by satellite radar after the 24–29 Sep rain. Red stretches changed far more than in an ordinary monsoon; light blue is as usual. The Bagmati and Koshi were quiet.')
            : (ko ? '같은 방법으로 본 2024년 9월 홍수. 그해에는 바그마티강 52구간 중 34곳이 크게 변했고, 나라야니는 평소 수준이었습니다.' : 'The September 2024 flood measured the same way. That year 34 of 52 Bagmati stretches changed a lot and the Narayani stayed as usual.')}</p>
          <div className="picker">
            <label>{ko ? '장소를 골라 보세요. 뉴스에 나온 마을과 강가 도시입니다.' : 'Pick a place. These are the villages and river towns from the news.'}</label>
            <select value={query} onChange={(e) => { const p = places.find((x) => x.name === e.target.value); if (p) pickPlace(p); else { setQuery(''); setAnswer(null); } }} aria-label="choose place">
              <option value="">{ko ? '장소 고르기…' : 'Choose a place…'}</option>
              {places.filter((p) => (p.ev ?? 'sep') === (year === '1011' ? 'oct' : 'sep')).map((p) => { const L = year === '1011' ? (p.lv1011 ?? 'far') : year === '2024' ? p.lv24 : p.lv26; return <option key={p.name} value={p.name}>{(ko ? p.name_ko : p.name) + ' — ' + (ko ? LV_SHORT[L][0] : LV_SHORT[L][1])}</option>; })}
            </select>
          </div>
          <small>{ko ? '피해 지도가 아닙니다. 같은 곳의 평소 몬순 변화와 견주어 "평소보다 많이 변한 곳"을 보여줍니다. 강을 누르면 전후 사진이 열립니다.' : 'Not a damage map. It shows where the river changed more than in an ordinary monsoon at the same place. Tap a river for before/after.'}</small>
          <a className="readmore" href="#report">{ko ? '아래로 내려 무엇을 어떻게 쟀는지 읽기 ↓' : 'Scroll down to read what was measured and how ↓'}</a>
        </section>
      )}
      {!expert && answer && (
        <section className="answer-card" aria-live="polite">
          <button className="x" onClick={() => setAnswer(null)} aria-label="close">×</button>
          <p className="where">{ko ? answer.title_ko : answer.title}</p>
          {(ko ? answer.why_ko : answer.why) && <p className="why">{ko ? answer.why_ko : answer.why}</p>}
          {(() => { const L = answer.ev === 'oct' ? (answer.lv1011 ?? 'unseen') : year === '2024' ? answer.lv24 : answer.lv26; return <h2><i style={{ background: LV_COLOR[L] }} />{ko ? LV_TEXT[L][0] : LV_TEXT[L][1]}</h2>; })()}
          <p className="when">{answer.ev === 'oct' ? (ko ? '2026년 10월 11일 06:03 레이더 · 산사태 댐 붕괴 직후' : 'Radar 11 Oct 2026, 06:03 · right after the dam burst') : year === '2024' ? (ko ? '2024년 10월 2일 레이더 · 9월 27~28일 홍수 뒤' : 'Radar 2 Oct 2024 · after the 27–28 Sep flood') : (ko ? '2026년 9월 29일 레이더 · 9월 24~29일 비 뒤' : 'Radar 29 Sep 2026 · after the 24–29 Sep rain')}</p>
          {(() => { const c = answer.ev === 'oct' ? answer.count1011 : year === '2024' ? answer.count24 : answer.count26; return c ? <p className="count">{ko ? c[0] : c[1]}</p> : null; })()}
          {answer.ev !== 'oct' && year === '2026' && answer.gfm === 'agree' && <p className="chip ok">✓ {ko ? '유럽 코페르니쿠스 홍수 지도도 같은 곳을 물에 잠긴 곳으로 봤습니다' : 'The EU Copernicus flood map also marks this as flooded'}</p>}
          {answer.ev !== 'oct' && year === '2026' && answer.gfm === 'disagree' && answer.lv26 === 'big' && <p className="chip warn">{ko ? '코페르니쿠스 홍수 지도는 여기를 잠긴 곳으로 보지 않았습니다 — 물이 덮였다기보다 강 모양이 바뀌었을 수 있습니다' : 'Copernicus does not mark this as flooded — more likely the channel changed shape than land went under water'}</p>}
          {answer.ev !== 'oct' && year === '2026' && answer.trend && answer.lv26 !== 'normal' && <p className={`trend ${answer.trend}`}>{ko ? TREND_TEXT[answer.trend][0] : TREND_TEXT[answer.trend][1]}{answer.trend_counts && (answer.trend_counts.recede || 0) + (answer.trend_counts.hold || 0) > 1 && <small> · {ko ? `주변 구간: 그대로 ${answer.trend_counts.hold ?? 0}, 줄어듦 ${answer.trend_counts.recede ?? 0}` : `nearby: same ${answer.trend_counts.hold ?? 0}, less ${answer.trend_counts.recede ?? 0}`}</small>}</p>}
          {answer.ev === 'oct' && answer.window && answer.s2b && <div className="photo-seg" role="tablist">
            <button role="tab" aria-selected={photo === 'radar'} className={photo === 'radar' ? 'is-active' : ''} onClick={() => setPhoto('radar')}>{ko ? '레이더 10/11' : 'RADAR 11 OCT'}</button>
            <button role="tab" aria-selected={photo === 's2'} className={photo === 's2' ? 'is-active' : ''} onClick={() => setPhoto('s2')}>{ko ? '실제 색 사진' : 'TRUE COLOUR'}</button>
          </div>}
          {answer.ev !== 'oct' && year === '2026' && answer.window && (answer.lv1003 !== 'unseen' || answer.s2) && <div className="photo-seg" role="tablist">
            <button role="tab" aria-selected={photo === 'radar'} className={photo === 'radar' ? 'is-active' : ''} onClick={() => setPhoto('radar')}>{ko ? '레이더 9/29' : 'RADAR 29 SEP'}</button>
            {answer.lv1003 !== 'unseen' && <button role="tab" aria-selected={photo === 'a85'} className={photo === 'a85' ? 'is-active' : ''} onClick={() => setPhoto('a85')}>{ko ? '레이더 10/3' : 'RADAR 3 OCT'}</button>}
            {answer.s2 && <button role="tab" aria-selected={photo === 's2'} className={photo === 's2' ? 'is-active' : ''} onClick={() => setPhoto('s2')}>{ko ? '실제 색 사진' : 'TRUE COLOUR'}</button>}
          </div>}
          {answer.window && (() => { const suf = answer.ev === 'oct' ? (photo === 's2' ? '_s2' : '_b19') : year === '2024' && answer.has24 ? '_y24' : photo === 'a85' ? '_a85' : photo === 's2' ? '_s2' : ''; return (
            <div className="card-swipe story-swipe" style={{ ['--swipe' as string]: `${cardSwipe}%` }}>
              <img src={`${FR}/${answer.window}${suf}_post.jpg`} alt="after" />
              <div className="swipe-clip"><img src={`${FR}/${answer.window}${suf}_pre.jpg`} alt="before" /></div>
              <div className="swipe-bar" /><span className="swipe-label pre">{ko ? (answer.ev === 'oct' ? '전' : '비 전') : 'BEFORE'}</span><span className="swipe-label post">{ko ? (answer.ev === 'oct' ? '후' : '비 후') : 'AFTER'}</span>
              <input type="range" min={0} max={100} value={cardSwipe} aria-label="before / after" onChange={(e) => setCardSwipe(Number(e.target.value))} />
            </div>); })()}
          {answer.window && <p className="cap">{answer.ev === 'oct'
            ? (photo === 's2' && answer.s2b
              ? (ko ? `Sentinel-2 실제 색(2.56 km). 전 ${answer.s2b.pre.slice(5).replace('-', '/')} → 후 ${answer.s2b.post.slice(5).replace('-', '/')} 10:42. 구름은 흰색.` : `Sentinel-2 true colour (2.56 km). Before ${answer.s2b.pre} → after ${answer.s2b.post} 10:42. Clouds are white.`)
              : (ko ? '위성 레이더, 10월 11일 06:03. 전 = 9/5·9/17·9/29 중앙값. 짙은 보라·검정이 물, 노랑이 마른 땅.' : 'Satellite radar, 11 Oct 06:03. Before = median of 5, 17 and 29 Sep. Dark purple/black is water, yellow is dry ground.'))
            : photo === 's2' && year === '2026' && answer.s2
            ? (ko ? `Sentinel-2 실제 색(2.56 km). 비 전 ${answer.s2.pre.slice(5).replace('-', '/')} → 비 후 ${answer.s2.post.slice(5).replace('-', '/')}. 구름은 흰색.` : `Sentinel-2 true colour (2.56 km). Before ${answer.s2.pre} → after ${answer.s2.post}. Clouds are white.`)
            : photo === 'a85' && year === '2026'
            ? (ko ? '위성 레이더, 10월 3일(다른 궤도). 비 전 = 8/28·9/9·9/21 중앙값. 짙은 보라·검정이 물.' : 'Satellite radar, 3 Oct (a different orbit). Before = median of 28 Aug, 9 and 21 Sep. Dark purple/black is water.')
            : (ko ? '위성 레이더 사진(2.56 km). 짙은 보라·검정이 물, 초록이 숲·논, 노랑이 마른 땅. 손잡이를 끌어 비교하세요.' : 'Satellite radar (2.56 km). Dark purple/black is water, green is forest and fields, yellow is dry ground. Drag to compare.')}</p>}
          {answer.ev !== 'oct' && <p className="other">{year === '2026'
            ? <>{ko ? '2024년 9월 홍수 때는: ' : 'In the Sep 2024 flood: '}<b style={{ color: answer.lv24 === 'big' ? LV_COLOR.big : undefined }}>{ko ? LV_SHORT[answer.lv24][0] : LV_SHORT[answer.lv24][1]}</b>{answer.lv24 === 'unseen' && (ko ? ' (같은 궤도 자료 없음)' : ' (no matching pass)')}</>
            : <>{ko ? '2026년 9월에는: ' : 'In Sep 2026: '}<b style={{ color: answer.lv26 === 'big' ? LV_COLOR.big : undefined }}>{ko ? LV_SHORT[answer.lv26][0] : LV_SHORT[answer.lv26][1]}</b></>}</p>}
          {answer.ev !== 'oct' && year === '2026' && answer.nearest_big && <button className="go" onClick={() => { fly(answer.nearest_big!.lonlat, 11.5); }}>{ko ? `가장 가까운 큰 변화: ${answer.nearest_big.river_ko} · ${answer.nearest_big.km} km →` : `Nearest big change: ${answer.nearest_big.river} · ${answer.nearest_big.km} km →`}</button>}
        </section>
      )}
      {expert && <header className="sept-topbar">
        <div className="brand"><Link href="/" className="brand-link">Nepal <b>AI Twin</b></Link><small>{ko ? '2장 · 9월 24~29일 몬순 홍수' : 'CHAPTER 2 · 24–29 SEP MONSOON FLOODS'}</small></div>
        <div className="viewseg" role="tablist" aria-label="View">
          {(['now', 'swipe', 'diff'] as const).map((v) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'is-active' : ''} disabled={v !== 'now' && !cmp} onClick={() => setView(v)}>{v === 'now' ? (ko ? '2026 지도' : '2026 MAP') : v === 'swipe' ? (ko ? '2024 ⇄ 2026' : '2024 ⇄ 2026') : (ko ? '두 해 차이' : 'DIFFERENCE')}</button>)}
        </div>
        <div className="toggles" style={{ visibility: view === 'now' ? 'visible' : 'hidden' }}>
          <button className={showRibbon ? 'is-active' : ''} onClick={() => setShowRibbon((v) => !v)} disabled={!sept?.ribbon} title={ko ? '강을 2.56 km 구간으로 잘라 그 구간을 담은 창의 변화로 색칠 (1장과 같은 계급)' : 'River cut into 2.56 km reaches, coloured by the change in the window that holds each reach (same classes as chapter 1)'}>{ko ? '강 리본' : 'RIVER RIBBON'}</button>
          <button className={showTokens ? 'is-active' : ''} onClick={() => setShowTokens((v) => !v)} title={sept?.change_token_rule}>{ko ? '변화 토큰 40 m' : 'CHANGE TOKENS 40 m'}</button>
          <button className={showWindows ? 'is-active' : ''} onClick={() => setShowWindows((v) => !v)}>{ko ? `창 ${geo?.features.length ?? ''}` : `WINDOWS ${geo?.features.length ?? ''}`}</button>
          <button className={satellite ? 'is-active' : ''} onClick={() => setSatellite((v) => !v)}>{ko ? '위성 배경' : 'SATELLITE'}</button>
        </div>
        <div className="links">
          <button className={!ko ? 'is-active' : ''} onClick={() => chooseLang(false)}>EN</button><button className={ko ? 'is-active' : ''} onClick={() => chooseLang(true)}>한국어</button>
          <button onClick={() => { setExpert(false); setView('now'); }}>{ko ? '← 쉽게 보기' : '← SIMPLE VIEW'}</button>
          <a href="/map" className="nav-link">{ko ? '← 1장 (8월 26일)' : '← CHAPTER 1 (26 AUG)'}</a>
        </div>
      </header>}

      <button style={{ display: view === 'now' && expert ? undefined : 'none' }} className={`rail-toggle left ${leftOpen ? 'open' : ''}`} onClick={() => setLeftOpen((v) => !v)}>⟩ {ko ? '판별' : 'VERDICTS'}</button>
      <button style={{ display: expert ? undefined : 'none' }} className={`rail-toggle right ${rightOpen ? 'open' : ''}`} onClick={() => setRightOpen((v) => !v)}>{ko ? '먼저 볼 창' : 'LEADS'} ⟨</button>

      {expert && view === 'now' && leftOpen && sept && (
        <aside className="sept-rail left">
          <button className="rail-close" onClick={() => setLeftOpen(false)} aria-label="close">⟨</button>
          <p className="eyebrow">{ko ? '무엇을 보고 있나' : 'WHAT YOU ARE LOOKING AT'}</p>
          <h1>{ko ? <>몬순 막바지 호우, <em>뉴스가 지목한 다섯 곳</em></> : <>Late-monsoon rains: <em>five places the news named</em></>}</h1>
          <p className="sub">{ko ? sept.event.reported_ko : sept.event.reported}</p>
          <div className="funnel small">
            <div><b>{sites.length}</b><span>{ko ? '지점' : 'sites'}</span></div><i>→</i>
            <div><b>{sites.reduce((a, [, s]) => a + s.windows, 0)}</b><span>{ko ? '레이더 창' : 'radar windows'}</span></div><i>→</i>
            <div className="lead"><b>{sites.filter(([, s]) => s.verdict === 'clear signal').length}</b><span>{ko ? '뚜렷' : 'clear'}</span></div><i>·</i>
            <div className="zero"><b>{sept.source_corridor.windows}</b><span>{ko ? '발원지 → 눈' : 'source → snow'}</span></div>
          </div>
          <p className="claim">{ko ? '임베딩 깃발과 고전 새-물 비율, 두 레이더 궤도, 광학 SCL 물 변화를 함께 읽은 "먼저 볼 곳"입니다. 피해·수심·가구 수가 아닙니다.' : 'A reading order from embedding flags, a classical new-water fraction, a second radar orbit and Sentinel-2 SCL water change read together. Not damage, depth or household counts.'}</p>
          {sept.gfm && <p className="claim gfm"><b>{ko ? '외부 자 · Copernicus GFM' : 'External yardstick · Copernicus GFM'}</b> — {ko ? sept.gfm.headline_ko : sept.gfm.headline}</p>}
          {sites.map(([k, s]) => (
            <article key={k} className={`sept-site ${VERDICT[s.verdict]?.cls ?? ''}`}>
              <header><strong>{ko ? s.name_ko : s.name}</strong><em>{ko ? VERDICT[s.verdict]?.ko : VERDICT[s.verdict]?.en}</em></header>
              <small>{ko ? s.news_ko : s.news}</small>
              <p>{ko ? s.reading_ko : s.reading}</p>
              {s.gfm && <small className="gfm-line">{ko ? `Copernicus GFM(같은 통과): 홍수 >1% 창 ${s.gfm.windows_gfm_gt1pct}/${s.gfm.n} · 최대 ${pct(s.gfm.gfm_max, 1)}` : `Copernicus GFM (same pass): ${s.gfm.windows_gfm_gt1pct}/${s.gfm.n} windows >1% flood · max ${pct(s.gfm.gfm_max, 1)}`}{s.gfm.spearman_new_water != null ? ` · ρ(${ko ? '새-물' : 'new-water'}) ${s.gfm.spearman_new_water >= 0 ? '+' : ''}${s.gfm.spearman_new_water.toFixed(2)}` : ''}</small>}
              {s.top[0] && <button onClick={() => fly(s.top[0].center_lonlat, 11.6)}>◎ {ko ? `창 ${s.windows}개로 이동` : `GO TO ${s.windows} WINDOWS`}</button>}
            </article>
          ))}
          <article className="sept-site v-source">
            <header><strong>{ko ? '발원 회랑 (8월 26일 자리)' : 'Source corridor (the 26 Aug site)'}</strong><em>{sept.source_corridor.measurement_id}</em></header>
            <small>{ko ? `56창 · 9월 29일 · 상위 창이 8월 발원 폴리곤에 닿음 ${sept.source_corridor.unosat_source_touching_top6}/6` : `56 windows · 29 Sep · top windows touching the August source polygons ${sept.source_corridor.unosat_source_touching_top6}/6`}</small>
            <p>{ko ? sept.source_corridor.reading_ko : sept.source_corridor.reading}</p>
            <button onClick={() => fly([85.52, 28.28], 10.4)}>◎ {ko ? '발원 회랑으로' : 'GO TO THE CORRIDOR'}</button>
          </article>
          <div className="legend">
            {sept.ribbon && <>
              <p className="eyebrow">{ko ? '강 리본 · 구간을 담은 창의 문턱 초과 토큰 비율' : 'RIVER RIBBON · share of tokens beyond the ordinary range in the reach’s window'}</p>
              <ul className="sept-legend"><li><i style={{ background: '#7fb5c9' }} />&lt;0.5%</li><li><i style={{ background: '#ffd666' }} />0.5–2</li><li><i style={{ background: '#ff983d' }} />2–5</li><li><i style={{ background: '#ec5238' }} />5–8</li><li><i style={{ background: '#ba185c' }} />≥8%</li><li><i style={{ background: 'repeating-linear-gradient(90deg,#9a9a9a 0 3px,transparent 3px 6px)' }} />{ko ? '관측 불가' : 'unobservable'}</li></ul>
              {sept.river && <small>{ko ? sept.river.reading_ko : sept.river.reading}</small>}
            </>}
            <p className="eyebrow">{ko ? '변화 토큰 (40 m)' : 'CHANGE TOKENS (40 m)'}</p>
            <ul className="sept-legend col"><li><i style={{ background: '#2a78d6' }} />{ko ? '새 물 (픽셀 50% 이상 물로 바뀜)' : 'new water (≥50% of pixels turned water-like)'}</li><li><i style={{ background: '#f0a070' }} />{ko ? 'Δz 문턱 1.0~1.3배' : 'Δz 1.0–1.3× the ordinary p99'}</li><li><i style={{ background: '#eb6834' }} />1.3–1.8×</li><li><i style={{ background: '#c8414b' }} />1.8–2.5×</li><li><i style={{ background: '#b8306f' }} />≥ 2.5×</li></ul>
            <p className="eyebrow">{ko ? '창 테두리' : 'WINDOW OUTLINES'}</p>
            <ul className="sept-legend col"><li><i style={{ background: 'transparent', border: '2px solid #eb6834' }} />{ko ? '결합 깃발 5% 이상' : 'fused flag ≥ 5%'}</li><li><i style={{ background: 'transparent', border: '1px solid #5f7a74' }} />{ko ? '채점됨' : 'ranked'}</li><li><i style={{ background: 'transparent', border: '1px solid #9a9a9a' }} />{ko ? '관측 불가' : 'unobservable'}</li></ul>
            <small>{sept.change_token_rule}</small>
          </div>
          <button className="eo-toggle" onClick={() => setEoOpen((v) => !v)} aria-expanded={eoOpen}>{ko ? 'EO로 어떻게 읽고, 어떻게 갱신하나' : 'How to read this as EO, and how it updates'} {eoOpen ? '▴' : '▾'}</button>
          {eoOpen && <div className="eo-body">
            <div><h3>{ko ? '보는 것' : 'What it sees'}</h3><p>{ko ? '2.56 km 창 = 40 m 토큰 64×64. 사후 한 장의 임베딩이 사전 세 장(36·24·12일 전)의 기억에서 얼마나 멀어졌는지를 재고, 같은 창의 평시 쌍 p99를 문턱으로 씁니다. 큰 강의 강폭 확대(수스타: 사주 침수)가 이 자가 보는 것이고, C-밴드는 수면에서 어둡게 돌아오니 새 물은 VV 하락으로도 겹쳐 보입니다.' : 'A 2.56 km window is 64×64 tokens of 40 m. We measure how far the post-pass embedding sits from the memory of three earlier passes (36, 24, 12 days before) and threshold at the window’s own ordinary-pair p99. A widened river (Susta: submerged sandbars) is what this sees; C-band returns dark from water, so new water also shows as a VV drop.'}</p></div>
            <div><h3>{ko ? '못 보는 것' : 'What it cannot see'}</h3><p>{ko ? '둑 안 수위 상승(데브갓), 가옥 몇 채(부트왈), 도로변 사면(다라파니)은 40 m·12일 아래 규모. 사행 하천(코시)은 하도 이동이 평시라 몬순 3장 귀무가 23%까지 올라 침수를 못 가립니다. 발원 회랑의 가장 큰 "변화"는 9월 28일 신설 눈이었습니다.' : 'A river rising inside its banks (Devghat), a few houses (Butwal) and road-side slips (Dharapani) are below 40 m and 12 days. On the braided Koshi channel migration is ordinary, so the three-pass monsoon null rises to 23% and cannot separate a flood. At the source the largest “change” on 28 Sep was fresh snow.'}</p></div>
            <div><h3>{ko ? '어떻게 갱신되나' : 'How it updates'}</h3><p>{ko ? 'Sentinel-1 은 궤도마다 12일, 세 궤도(19·121·158, 삽타리 12)가 지나 나흘에 한 번꼴로 새 사후 관측이 생깁니다. RTC 는 촬영 다음 날 도착. 새 날짜가 오면 같은 계약에 날짜만 12일 밀고 평시 쌍·문턱은 고정합니다. 광학은 창 SCL 판독 50% 이상인 날만. 서부 세 곳의 첫 맑은 사후 광학은 10월 중순 몬순 철수 뒤입니다.' : 'Sentinel-1 revisits every 12 days per orbit; three orbits (19, 121, 158; 12 at Saptari) give a new post pass about every four days, terrain-corrected the day after. Each new date re-runs the same contract shifted 12 days with placebo and threshold fixed. Optical only on days with ≥50% per-window SCL readability; the first clear post-flood pass for the western sites waits for the mid-October withdrawal.'}</p></div>
            <div><h3>{ko ? '다음에 바꿀 것' : 'What to change next'}</h3><p>{ko ? '(1) 침수 판별엔 건기 기준선 또는 창 안 토큰 단위 검정. (2) 결합은 max 대신 일치(min·곱). (3) 젖은 지표·눈 같은 지역 공통 이동을 빼는 공간 귀무.' : '(1) A dry-season baseline or within-window token test for floods. (2) Agreement (min/product) instead of max-fusion. (3) A spatial null to remove region-wide shifts (wet surfaces, snow).'}</p></div>
            <p className="note">{ko ? '주장 경계: ' : 'Claim boundary: '}{sept.method.claim_boundary}. {ko ? '장부 ' : 'Ledger '}{sept.ledger.join(', ')}. {ko ? sept.monsoon_status.text_ko : sept.monsoon_status.text}</p>
          </div>}
          <p className="foot">{ko ? '독립 개인 연구 데모 · Ai2·ESA/Copernicus 와 제휴·보증 관계 없음 · S1 RTC (Planetary Computer) · S2 L2A · OlmoEarth v1 Base, frozen' : 'Independent personal research demo · not affiliated with or endorsed by Ai2 or ESA/Copernicus · S1 RTC (Planetary Computer) · S2 L2A · OlmoEarth v1 Base, frozen'} · <a href="https://github.com/DDanggle/eo-rasuwa" target="_blank" rel="noreferrer">GitHub ↗</a></p>
        </aside>
      )}

      {expert && view !== 'now' && cmp && (
        <aside className="sept-rail right cmp">
          <div className="panel-heading"><span>2</span><div><p>{ko ? '두 해 · 같은 창 · 같은 계약' : 'TWO YEARS · SAME WINDOWS · SAME CONTRACT'}</p><strong>{ko ? '어느 강이 넓어졌나' : 'Which rivers widened'}</strong></div></div>
          <p className="lede">{ko ? cmp.headline_ko : cmp.headline}</p>
          {view === 'swipe' && <p className="hint">{ko ? '⇄ 지도 위 손잡이를 왼쪽으로 끌면 2026 이 드러납니다.' : '⇄ Drag the handle on the map left to reveal 2026.'}</p>}
          <Dumbbell rows={cmp.rivers} ko={ko} />
          {view === 'swipe' ? (
            <div className="legend">
              <p className="eyebrow">{ko ? '리본 · 두 해 같은 계급 (1장과 동일)' : 'RIBBON · same classes both years (as chapter 1)'}</p>
              <ul className="sept-legend">{['<0.5', '0.5–2', '2–5', '5–8', '≥8%'].map((t, i) => <li key={t}><i style={{ background: CLASS_COLORS[i] }} />{t}</li>)}</ul>
              <small>{ko ? '구간을 담은 2.56 km 창에서 평시 범위를 넘은 40 m 토큰 비율. 손잡이를 끌어 같은 강의 2024·2026을 겹쳐 보세요.' : 'Share of 40 m tokens beyond the ordinary range in the 2.56 km window holding each reach. Drag the handle to lay 2024 over 2026 on the same river.'}</small>
            </div>
          ) : (
            <div className="legend">
              <p className="eyebrow">{ko ? '차이 · 2026 − 2024 (%p)' : 'DIFFERENCE · 2026 − 2024 (pp)'}</p>
              <ul className="sept-legend">{[[ko ? '2024 더 큼 ≥5' : '2024 ≥5 more', 0], ['1–5', 1], [ko ? '비슷 ±1' : 'similar ±1', 2], ['1–5', 3], [ko ? '2026 더 큼 ≥5' : '2026 ≥5 more', 4]].map(([t, i]) => <li key={String(i)}><i style={{ background: DIFF_COLORS[i as number] }} />{t}</li>)}</ul>
              <small>{ko ? '파랑 = 2024년에 더 크게 변한 구간, 주황 = 2026년에 더 크게 변한 구간, 회색 = 두 해 비슷.' : 'Blue = reaches that changed more in 2024, orange = more in 2026, grey = similar.'}</small>
            </div>
          )}
          <dl className="cmp-dates">
            {(['2024', '2026'] as const).map((y) => <div key={y}><dt style={{ color: y === '2024' ? Y24 : Y26 }}>{y}</dt><dd>{ko ? '기준' : 'base'} {cmp.dates[y].base.map((d) => d.slice(5)).join(' · ')} → {ko ? '사후' : 'post'} {cmp.dates[y].post.slice(5)} · {ko ? '문턱' : 'threshold'} {cmp.dates[y].threshold.toFixed(3)}</dd></div>)}
          </dl>
          <p className="note">{ko ? cmp.caveat_ko : cmp.caveat}</p>
          <p className="note">{ko ? '리본 구간을 누르면 그 창의 2024·2026 레이더 전후를 비교할 수 있습니다. 코시(궤도 12)는 2024년 대응 통과가 없어 빠졌습니다.' : 'Tap a reach to compare that window’s 2024 and 2026 radar before/after. The Koshi (orbit 12) has no matching 2024 pass and is left out.'}</p>
        </aside>
      )}
      {expert && view === 'now' && rightOpen && sept && (
        <aside className="sept-rail right">
          <button className="rail-close" onClick={() => setRightOpen(false)} aria-label="close">⟩</button>
          <div className="panel-heading"><span>{leads.length}</span><div><p>{ko ? '먼저 볼 창 · 9월 24~29일' : 'WINDOWS TO LOOK AT FIRST · 24–29 SEP'}</p><strong>{ko ? '결합 깃발 5% 이상' : 'Fused flag ≥ 5%'}</strong></div></div>
          <p className="muted">{ko ? '프레임: 레이더 가색(R=VV, G=VH, B=VV−VH). 물은 짙은 보라·검정, 식생 초록, 밝은 지표 노랑. 손잡이를 끌어 전후를 비교하세요.' : 'Frames: radar false colour (R=VV, G=VH, B=VV−VH). Water is dark purple/black, vegetation green, bright ground yellow. Drag the handle to compare.'}</p>
          {leads.map((f) => { const s = sept.flood_sites[f.site]; const orbits = orbitsOf(f.id); return (
            <article key={f.id} className="cand-card">
              <header><b>#{f.rank}</b><strong>{ko ? s?.name_ko : s?.name}</strong><small>{f.id.toUpperCase()} · {f.source === 'both' ? (ko ? '레이더+광학' : 'RADAR + OPTICAL') : f.source.toUpperCase()}{orbits.length ? ` · ORBIT ${orbits.join('+')}` : ''}</small></header>
              <div className="cand-strip" role="button" tabIndex={0} onClick={() => openWindow(f.id, f.site, orbits)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}>
                <figure><img src={`${FR}/${f.id}_pre.jpg`} alt="before" loading="lazy" /><figcaption>PRE · S1</figcaption></figure>
                <figure><img src={`${FR}/${f.id}_post.jpg`} alt="after" loading="lazy" /><figcaption>{postLabel(f.site, orbits).slice(0, 6)}</figcaption></figure>
                <figure className="over"><img src={`${FR}/${f.id}_post.jpg`} alt="" loading="lazy" /><img className="ov" src={`${FR}/${f.id}_delta.png`} alt="AI change field" loading="lazy" /><figcaption>AI Δ</figcaption></figure>
                <span className="strip-hint" aria-hidden="true">⤢ {ko ? '비교' : 'COMPARE'}</span>
              </div>
              <footer><span>{pct(f.fused_frac)} {ko ? '결합' : 'fused'}{f.radar_new_water != null ? ` · ${ko ? '새-물' : 'new-water'} ${pct(f.radar_new_water)}` : ''}{f.scl_water_delta != null ? ` · SCL ${ko ? '물' : 'water'} ${f.scl_water_delta >= 0 ? '+' : ''}${(100 * f.scl_water_delta).toFixed(0)}pp` : ''}{f.gfm_flood_frac != null ? ` · GFM ${pct(f.gfm_flood_frac, 1)}` : ''}</span><button onClick={() => fly(f.center_lonlat, 12.4)}>◎ {ko ? '지도' : 'MAP'}</button></footer>
            </article>); })}
          <figure className="sept-figure">
            <img src={sept.fusion.figure} alt="What fusion changed" loading="lazy" onClick={() => setLightbox({ title: ko ? '결합(M102)이 바꾼 것과 안 바꾼 것' : 'What fusion (M102) did and did not change', sub: ko ? sept.fusion.headline_ko : sept.fusion.headline, id: '', site: '', orbits: [], single: sept.fusion.figure })} />
            <figcaption>{ko ? sept.fusion.headline_ko : sept.fusion.headline}</figcaption>
          </figure>
          <div className="dl"><a className="btn" href={sept.download} download>{ko ? `창 ${geo?.features.length ?? ''}개 GeoJSON` : `${geo?.features.length ?? ''} WINDOWS (GEOJSON)`}</a><a className="btn" href={sept.change_tokens} download>{ko ? '변화 토큰 GeoJSON' : 'CHANGE TOKENS (GEOJSON)'}</a></div>
        </aside>
      )}

      {expert && view === 'now' && sept && <section className="sept-timeline">
        <p className="eyebrow">{ko ? '쓴 장면 · 레이더는 구름을 뚫고, 광학은 삽타리에서만 열렸다' : 'SCENES USED · radar sees through cloud; optical opened only at Saptari'}</p>
        <ol>{sept.scenes.map((s) => <li key={s.id} className={s.state} title={s.detail}><b>{mono(s.acquired_at)}</b><small>{s.sensor.replace('Sentinel-', 'S').replace(' (orbit', ' ·').replace(')', '')}</small><em>{s.state.toUpperCase()}</em></li>)}</ol>
      </section>}

      {lightbox && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={lightbox.title} onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <div className="lb-panel">
            <header><div><strong>{lightbox.title}</strong><small>{lightbox.sub}</small></div><button aria-label="close" onClick={() => setLightbox(null)}>×</button></header>
            {lightbox.single ? <div className="lb-single"><img src={lightbox.single} alt="" /></div> : (<>
              {lbTab === 'radar' && (
                <div className="story-swipe lb-swipe" style={{ ['--swipe' as string]: `${swipe}%` }}>
                  <img src={`${FR}/${lightbox.id}_post.jpg`} alt="after" />
                  <div className="swipe-clip"><img src={`${FR}/${lightbox.id}_pre.jpg`} alt="before" /></div>
                  <div className="swipe-bar" /><span className="swipe-label pre">{ko ? 'PRE · 기준 3장 중앙값 · S1 가색' : 'PRE · median of 3 base passes · S1 false colour'}</span><span className="swipe-label post">POST · {postLabel(lightbox.site, lightbox.orbits)}</span>
                  <input type="range" min={0} max={100} value={swipe} aria-label="Compare before and after" onChange={(e) => setSwipe(Number(e.target.value))} />
                </div>)}
              {lbTab === 'delta' && (
                <div className="lb-single over"><img src={`${FR}/${lightbox.id}_post.jpg`} alt="after" /><img className="ov" src={`${FR}/${lightbox.id}_delta.png`} alt="AI change field" /><span className="lb-zoom-hint">{ko ? 'AI 변화장 · 주황→자홍 = 평시 p99 초과, 흰 선 = 문턱 윤곽' : 'AI change field · orange→magenta = beyond the ordinary p99 · white line = the threshold'}</span></div>)}
              {lbTab === 'y24' && (
                <div className="story-swipe lb-swipe" style={{ ['--swipe' as string]: `${swipe}%` }}>
                  <img src={`${FR}/${lightbox.id}_y24_post.jpg`} alt="after 2024" />
                  <div className="swipe-clip"><img src={`${FR}/${lightbox.id}_y24_pre.jpg`} alt="before 2024" /></div>
                  <img className="ov-full" src={`${FR}/${lightbox.id}_y24_delta.png`} alt="" style={{ clipPath: `inset(0 0 0 ${swipe}%)` }} />
                  <div className="swipe-bar" /><span className="swipe-label pre">PRE 2024 · {cmp?.dates['2024'].base.map((d) => d.slice(5)).join('·')}</span><span className="swipe-label post">POST 2024 · {cmp?.dates['2024'].post.slice(5)} + AI Δ</span>
                  <input type="range" min={0} max={100} value={swipe} aria-label="Compare 2024 before and after" onChange={(e) => setSwipe(Number(e.target.value))} />
                </div>)}
              {lbTab === 's2' && hasS2(lightbox.site) && (
                <div className="story-swipe lb-swipe" style={{ ['--swipe' as string]: `${swipe}%` }}>
                  <img src={`${FR}/${lightbox.id}_s2post.jpg`} alt="after optical" />
                  <div className="swipe-clip"><img src={`${FR}/${lightbox.id}_s2pre.jpg`} alt="before optical" /></div>
                  <div className="swipe-bar" /><span className="swipe-label pre">PRE · {sept?.frames.s2_dates[lightbox.site]?.[0].slice(5)} · S2</span><span className="swipe-label post">POST · {sept?.frames.s2_dates[lightbox.site]?.[1].slice(5)} · S2</span>
                  <input type="range" min={0} max={100} value={swipe} aria-label="Compare before and after" onChange={(e) => setSwipe(Number(e.target.value))} />
                </div>)}
              <div className="lb-tabs">
                <button className={lbTab === 'radar' ? 'is-active' : ''} onClick={() => setLbTab('radar')}>{ko ? '레이더 전 ⇄ 후' : 'RADAR BEFORE ⇄ AFTER'}</button>
                <button className={lbTab === 'delta' ? 'is-active' : ''} onClick={() => setLbTab('delta')}>{ko ? 'AI 변화장' : 'AI CHANGE FIELD'}</button>
                {cmpWin(lightbox.id) && <button className={lbTab === 'y24' ? 'is-active' : ''} onClick={() => setLbTab('y24')} style={{ borderColor: Y24 }}>{ko ? '2024 전 ⇄ 후' : '2024 BEFORE ⇄ AFTER'}</button>}
                {hasS2(lightbox.site) && <button className={lbTab === 's2' ? 'is-active' : ''} onClick={() => setLbTab('s2')}>{ko ? '광학 전 ⇄ 후' : 'OPTICAL BEFORE ⇄ AFTER'}</button>}
                <span>{ko ? '손잡이를 끌어 비교 · ESC 닫기' : 'drag the handle · ESC closes'}</span>
              </div>
            </>)}
          </div>
        </div>
      )}
    </main>
    {!expert && <SeptReport ko={ko} year={year} cmp={cmp} />}
    </>
  );
}


// 강별 덤벨: 평시 범위를 넘은 구간 수(≥5% 창) — 2024 파랑 점, 2026 주황 점. 막대 대신 점 두 개라 '어느 해에 켜졌나'가 한눈에 갈린다.
function Dumbbell({ rows, ko }: { rows: CompareRiver[]; ko: boolean }) {
  const W = 316, row = 34, left = 108, right = 34, top = 22, maxN = Math.max(...rows.map((r) => r.reaches));
  const X = (v: number) => left + (v / maxN) * (W - left - right);
  const H = top + rows.length * row + 8;
  return (
    <figure className="dumbbell">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ko ? '강별 평시 범위를 넘은 구간 수, 2024 대 2026' : 'Reaches beyond their ordinary range per river, 2024 vs 2026'}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => { const v = Math.round(t * maxN); return <g key={t}><line x1={X(v)} x2={X(v)} y1={top - 6} y2={H - 6} stroke="var(--line, #e3e0d8)" strokeWidth="1" /><text x={X(v)} y={top - 9} fontSize="8.5" textAnchor="middle" fill="var(--muted)" fontFamily="var(--font-geist-mono)">{v}</text></g>; })}
        {rows.map((r, i) => { const y = top + i * row + row / 2; const a = X(r.hot24), b = X(r.hot26); return (
          <g key={r.river}>
            <title>{`${ko ? r.name_ko : r.name}: 2024 ${r.hot24}/${r.reaches} · 2026 ${r.hot26}/${r.reaches} · GFM ${r.gfm24_pos}/${r.gfm26_pos}`}</title>
            <text x={left - 8} y={y - 3} fontSize="10.5" textAnchor="end" fill="var(--ink)">{ko ? r.name_ko : r.name}</text>
            <text x={left - 8} y={y + 9} fontSize="8.5" textAnchor="end" fill="var(--muted)" fontFamily="var(--font-geist-mono)">{r.reaches} {ko ? '구간' : 'reaches'}</text>
            <line x1={Math.min(a, b)} x2={Math.max(a, b)} y1={y} y2={y} stroke="#b9b5ab" strokeWidth="2" />
            <circle cx={a} cy={y} r="5.5" fill={Y24} stroke="#fff" strokeWidth="1.5" />
            <circle cx={b} cy={y} r="5.5" fill={Y26} stroke="#fff" strokeWidth="1.5" />
            {r.hot24 !== r.hot26 && <text x={Math.max(a, b) + 9} y={y + 3.5} fontSize="9" fill="var(--muted)" fontFamily="var(--font-geist-mono)">{r.hot24}→{r.hot26}</text>}
          </g>); })}
      </svg>
      <figcaption><i style={{ background: Y24 }} />2024 <i style={{ background: Y26 }} />2026 · {ko ? '평시 범위를 넘은(≥5%) 구간 수' : 'reaches beyond the ordinary range (≥5%)'}</figcaption>
    </figure>
  );
}


// 지도 아래 보고서 — 숫자는 장부(M103~M110)에서 옮겨 적은 것, 문장은 사람 말로.
function SeptReport({ ko, year, cmp }: { ko: boolean; year: '2026' | '2024' | '1011'; cmp: Compare | null }) {
  const K = ko;
  return (
    <article className="sept-report" id="report">
      <div className="rep-inner">
        <p className="kicker">{K ? '보고서 · 무엇을 어떻게 쟀나' : 'REPORT · what was measured, and how'}</p>
        <h2>{K ? '위성 레이더로 강이 "평소보다 얼마나" 변했는지 잰다' : 'Measuring how much more than usual a river changed, from satellite radar'}</h2>
        <p>{K ? '유럽 Sentinel-1 위성은 같은 궤도로 12일마다 같은 곳을 레이더로 찍습니다. 구름과 밤에 상관없이 찍히므로 몬순에도 빠지지 않습니다. 강을 2.56 km 구간으로 잘라, 각 구간을 홍수 전 세 번(36·24·12일 전)과 홍수 뒤 한 번 찍은 사진을 범용 지구 임베딩 모델(Ai2 OlmoEarth v1 Base, 추가 학습 없음)에 넣고 "전과 후가 얼마나 다른가"를 숫자로 뽑습니다.' : 'The European Sentinel-1 satellite images the same place by radar every 12 days on the same orbit, through cloud and at night, so the monsoon never hides it. We cut each river into 2.56 km stretches, feed three pre-flood passes (36, 24 and 12 days before) and one post-flood pass into a general Earth-embedding model (Ai2 OlmoEarth v1 Base, no extra training) and read out how different "after" is from "before".'}</p>
        <p>{K ? '그 숫자만으로는 "많다"가 무엇인지 알 수 없습니다. 그래서 같은 구간을 홍수가 없던 7~8월에도 똑같이 재서 "평소 몬순에도 이만큼은 변한다"는 기준선을 만듭니다. 기준선의 상위 1%를 넘은 40 m 격자가 구간의 5% 이상이면 "크게 변함", 2~5%면 "조금 변함", 그 아래면 "평소 수준"입니다. 평소에는 정의상 1%만 넘습니다.' : 'A number alone does not say what "a lot" means. So the same stretches are measured the same way in July and August, when there was no flood, to get a baseline of how much an ordinary monsoon moves them. If more than 5% of a stretch\u2019s 40 m cells exceed the top 1% of that baseline, the stretch "changed a lot"; 2 to 5% is "a little"; below that, "as usual". By construction only 1% exceeds it in an ordinary fortnight.'}</p>

        <h3>{K ? '2026년 9월 24~29일 비' : 'The rain of 24–29 September 2026'}</h3>
        <p>{K ? '9월 29일 레이더(궤도 19)로 다섯 강 268구간을 쟀습니다. 크게 변한 구간 55곳은 전부 나라야니 수계입니다. 데브갓 아래 사행 구간(22구간 중 18)과 수스타를 지나 인도 비하르의 간다크(33구간 중 28)까지 이어집니다. 바그마티·코시·동라프티·티나우는 크게 변한 구간이 0곳입니다. 유럽 코페르니쿠스의 운영 홍수 지도(GFM)와 대 보면, 우리가 "크게 변함"으로 둔 구간의 90~98%는 GFM도 물에 잠겼다고 봅니다. 놓친 쪽은 주로 바그마티의 얕은 저지대 범람입니다. 임베딩은 강의 모양이 바뀐 것은 잘 보고, 얕게 넓게 퍼진 물은 잘 못 봅니다.' : 'The 29 September radar pass (orbit 19) measured 268 stretches on five rivers. All 55 stretches that changed a lot are on the Narayani system: the braided reach below Devghat (18 of 22) and on past Susta into the Gandak in Bihar (28 of 33). The Bagmati, Koshi, East Rapti and Tinau had none. Against the EU Copernicus operational flood map (GFM), 90 to 98% of the stretches we mark as changed a lot are also flooded in GFM; what we miss is mostly shallow lowland flooding on the Bagmati. The embedding sees a river changing shape well, and shallow sheets of water poorly.'}</p>
        <p>{K ? '10월 3일 다른 궤도(85)로 다시 봤을 때 상류 나라야니는 9곳 중 8곳이 여전히 "크게 변함"이었습니다. 물이 빠지는 것이 아니라 강의 모양이 바뀐 것과 맞는 결과입니다. 같은 날 Sentinel-2 실제 색 사진에서는 9월 21일에 드러나 있던 모래톱이 물에 잠겨 있습니다.' : 'Seen again on 3 October from another orbit (85), the upper Narayani was still "changed a lot" in 8 of 9 stretches. That fits a river that changed shape, not water that is draining. The same-day Sentinel-2 true-colour frames show sandbars exposed on 21 September now under water.'}</p>

        <h3>{K ? '2024년 9월과 견주면' : 'Compared with September 2024'}</h3>
        <p>{cmp ? (K ? cmp.headline_ko : cmp.headline) : ''}</p>
        <p className="caveat">{cmp ? (K ? cmp.caveat_ko : cmp.caveat) : ''}</p>

        <h3>{K ? '2026년 10월 11일 부디 간다키' : 'The Budhi Gandaki, 11 October 2026'}</h3>
        <p>{K ? '고르카 춤쳇 위에서 새벽 4시 22분 산사태가 샤르 콜라를 막았고, 6시쯤 터져 부디 간다키로 홍수가 내려갔습니다. 레이더 위성은 6시 3분에 지나갔습니다. 홍수파가 아루갓에 닿은 6시 30분보다 앞섭니다. 그래서 37구간 가운데 크게 변한 곳은 춤쳇 구간 하나뿐이고, 하류는 아직 평소 수준입니다. 위성이 본 것은 산사태와 댐이지 홍수가 아닙니다. 4시간 반 뒤 Sentinel-2 사진에는 하류 자갓까지 진흙이 덮인 강이 보입니다. 홍수 뒤 모습은 10월 23일 같은 궤도가 다시 지날 때 잽니다.' : 'At 04:22 a landslide above Chumchet, Gorkha, dammed the Shyar Khola; around 06:00 it burst and the flood ran down the Budhi Gandaki. The radar satellite passed at 06:03, before the wave reached Arughat at 06:30. So of 37 stretches only the Chumchet one changed a lot and downstream was still as usual: the satellite saw the landslide and the dam, not the flood. Sentinel-2 frames four and a half hours later show a mud-covered river down to Jagat. The aftermath will be measured when the same orbit passes again on 23 October.'}</p>

        <h3>{K ? '기준선을 자리마다 다르게 둘 수 있을까 — 좌표 사전지식 시험' : 'Could the baseline vary by place? A test with a coordinate prior'}</h3>
        <p>{K ? '"평소 변화"의 기준은 지금 모든 구간을 한 통에 넣은 상위 1%입니다. 산악과 평야가 같은 잣대를 받습니다. 그래서 위성 사진 없이 위경도만으로 그 자리의 기후·지형·토지피복을 담아 주는 좌표 임베딩(MIND, Corley·Klemmer 외 2026)으로 구간별 "평소 흔들림"을 예측해 봤습니다. 2026년 궤도 19의 231구간, 같은 플라시보 날짜, 공개 가중치 그대로입니다.' : 'The baseline for "ordinary change" is one pooled top-1% across all stretches, so mountains and plains share a ruler. We tested whether a coordinate embedding that encodes climate, terrain and land cover from latitude and longitude alone (MIND, Corley, Klemmer et al. 2026) could predict each stretch\u2019s ordinary wobble. 231 stretches from the 2026 orbit-19 passes, same placebo dates, released weights as is.'}</p>
        <p>{K ? '결과는 논문이 경고한 그대로였습니다. 구간을 무작위로 섞어 가리면 임베딩이 평소 흔들림의 약 60%를 설명합니다. 그러나 강 하나를 통째로 가리고 나머지로 맞추면 설명력이 사라지고, 가장 거친 64차원만 위경도 2차식 수준(R² 0.25 대 0.23)으로 남습니다. 그 예측으로 구간별 문턱을 만들어 쓰면 코페르니쿠스 지도와의 일치(CSI)가 0.60에서 0.51로 오히려 낮아집니다. 그래서 이 지도는 전역 기준선을 그대로 씁니다. 좌표 사전지식은 같은 강 안에서 못 본 구간을 메우는 데에는 후보로 남깁니다.' : 'The outcome was what the paper warns about. With stretches hidden at random, the embedding explains about 60% of the ordinary wobble. Hide a whole river and fit on the rest, and the skill vanishes; only the coarsest 64 dimensions survive, at the level of a quadratic in latitude and longitude (R² 0.25 vs 0.23). Using those predictions as per-stretch thresholds lowers agreement with the Copernicus map (CSI 0.60 to 0.51). So this map keeps the single pooled baseline, and keeps the coordinate prior as a candidate only for filling unseen stretches within the same river.'}</p>
        <h3>{K ? '상용 위성 비서와 무엇이 다른가' : 'How this differs from commercial satellite assistants'}</h3>
        <p>{K ? '2026년 들어 위성 회사들이 임베딩으로 영상을 검색하는 채팅형 도구를 공개했습니다(예: Planet의 agentic AI, 3 m 광학·일일). 그런 도구는 "이것과 비슷한 곳, 달라진 곳"을 빨리 찾아 주지만, 몬순 구름이 낀 날은 사진이 없고, "달라졌다"의 문턱을 사용자가 정하며, 그 문턱이 평소에 얼마나 자주 울리는지는 알려주지 않습니다. 이 지도는 구름을 뚫는 레이더를 쓰고, 문턱을 홍수 없던 7~8월 같은 간격으로 잰 값에서 가져와 "평소에는 1%만 넘는다"가 정의상 보장되며, 코페르니쿠스 운영 지도와의 일치를 숫자로 적어 둡니다. 대신 12일에 한 번만 지나므로 10월 11일처럼 홍수파보다 위성이 먼저 지나갈 수 있습니다. 그 빈자리는 일일 광학 영상이 메울 수 있고, 두 도구는 경쟁이 아니라 보완입니다.' : 'In 2026 satellite companies released chat-style tools that search imagery with embeddings (for example Planet\'s agentic AI, 3 m optical, daily). They find "places like this" and "places that changed" quickly, but there is no picture on a cloudy monsoon day, the user sets the change threshold, and the tool does not say how often that threshold fires in ordinary times. This map uses cloud-piercing radar, takes its threshold from the same stretches measured in flood-free July and August so that "only 1% exceeds it in ordinary times" holds by definition, and records its agreement with the Copernicus operational map as a number. The price is a pass only every 12 days, so on 11 October the satellite crossed before the flood wave did. Daily optical imagery can fill that gap; the two tools complement rather than compete.'}</p>
        <h3>{K ? '이 지도가 말하지 않는 것' : 'What this map does not say'}</h3>
        <ul>
          <li>{K ? '피해를 확정하지 않습니다. 현장 정답은 0개이고, "크게 변함"은 사람이 먼저 볼 곳을 좁히는 표시입니다.' : 'It does not confirm damage. There are zero field labels; "changed a lot" marks where people should look first.'}</li>
          <li>{K ? '2.56 km 구간의 평균이지 강폭이 아닙니다. 구간 안 어디가 변했는지는 구간을 눌러 전후 사진으로 보세요.' : 'Each value is a 2.56 km average, not a channel width. Tap a stretch to see where inside it the change is.'}</li>
          <li>{K ? '얕게 넓게 퍼진 물은 놓칠 수 있습니다. 2024년 바그마티가 그 예이며, 그래서 코페르니쿠스 지도를 옆에 둡니다.' : 'Shallow, wide sheets of water can be missed; the 2024 Bagmati is the example, which is why the Copernicus map sits alongside.'}</li>
          <li>{K ? '다른 궤도에서 찍은 날은 각도가 달라 절대값을 비교하지 않고 등급만 비교합니다.' : 'Passes from a different orbit have a different viewing angle, so only the class is compared, never the raw value.'}</li>
        </ul>
        <p className="sources">{K ? '자료: ESA Copernicus Sentinel-1 RTC·Sentinel-2 L2A(Microsoft Planetary Computer), Copernicus GFM, OpenStreetMap 하천선. 모델: Ai2 OlmoEarth v1 Base(동결). 측정 장부 M103~M111. 궤도·날짜·문턱값은 내려받는 GeoJSON에 들어 있습니다.' : 'Data: ESA Copernicus Sentinel-1 RTC and Sentinel-2 L2A (Microsoft Planetary Computer), Copernicus GFM, OpenStreetMap river lines. Model: Ai2 OlmoEarth v1 Base, frozen. Measurement ledger M103–M111. Orbits, dates and thresholds are in the downloadable GeoJSON.'}</p>
        <p className="sources">{year === '1011' ? (K ? '지금 보는 탭: 10월 11일.' : 'Current tab: 11 October.') : ''}</p>
      </div>
    </article>
  );
}
