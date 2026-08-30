'use client';
import { ReviewNotes } from '../review-notes';

import { AttributionControl, LngLatBounds, Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

type SceneRecord = {
  id: string;
  sensor: string;
  acquired_at: string;
  state: string;
  image: string;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  source_sha256: string;
};

type ScenarioPoint = {
  id: string;
  display_label: string;
  map_label: string;
  stage: number;
  marker_color: string;
  in_event_chain: boolean;
  name: string;
  coordinates: [number, number];
  role: string;
  place: string;
  source?: string;
  source_url?: string;
  evidence_level?: string;
  story?: string;
  story_ko?: string;
  nearest_window?: string | null;
  nearest_window_km?: number;
  distance_from_a_km: number;
};

type ScheduledScene = {
  id?: string;
  sensor: string;
  acquired_at: string;
  state: string;
  detail?: string | null;
  evidence_uri?: string | null;
};

type IncidentUpdate = {
  occurred_at_utc: string;
  status: string;
  relation: string;
  title: string;
  summary: string;
  source: string;
  source_url: string;
};

type TransferRow = { region: string; auroc: number; placebo_auroc: number; patches: number };
type SusceptibilityRow = { region: string; olmo_auroc: number; raw_auroc: number; verdict: string };
type AiRunRecord = {
  id: string;
  state: 'EXECUTED' | 'MEASURED' | 'MEASURED_PILOT' | 'NEGATIVE_RESULT' | 'WAITING_INPUT' | 'NOT_RUN' | 'SUPERSEDED';
  model: string;
  input: string;
  output: string;
  allows: string;
  forbids: string;
  artifact_sha256: string | Record<string, string> | null;
};
type ResearchBlock = {
  integration_disclaimer: string;
  nepal_embedding: { status: string; baseline: string; placebo_count: number; claim: string };
  ai_run_ledger: AiRunRecord[];
  confirmatory_transfer: {
    status: string; regions: number; wins_reuse_vs_raw_strong: number; strong_wins: number;
    reuse_region_macro: number; raw_strong_region_macro: number; absolute_gap: number;
    relative_gain_pct: number; non_win_regions: string[]; claim_boundary: string | string[];
  };
  historical_event_delta_pilot: { rows: TransferRow[]; contract: string; claim_boundary: string };
  pre_event_susceptibility_probe: { rows: SusceptibilityRow[]; overall: string; claim_boundary: string };
  physics: { current: string; proposed_primary: string; independent_check: string; downstream_hydraulics: string; coupling_rule: string };
  evaluation_arms: { id: string; label: string }[];
  evaluation_metrics: Record<string, string>;
};

type LiveObservation = {
  sensor: string;
  acquired_at: string;
  catalog_status: string;
  product_name: string | null;
  publication_utc: string | null;
  cloud_cover_tile_pct: number | null;
  materialization_status: string;
  coverage_status?: string | null;
  operational_anchor_count?: number | null;
  operational_anchor_covering_product_count?: number | null;
  selection_preflight_valid: boolean;
  materialization_seal_valid: boolean;
  period_readiness: { sentinel1?: number; sentinel2_l2a?: number };
  olmo_ready: boolean;
  claim_boundary: string;
};

type CurrentDecision = {
  status: 'candidate_ready' | 'not_detected' | 'embed_ready' | 'hold' | 'wait_observation';
  action: string;
  reason: string;
  next_gate: string;
  allowed_claim: string;
};

type Scenario = {
  generated_at: string;
  event: { name: string; occurred_at: string; cause_status: string; evidence_status: string };
  points: ScenarioPoint[];
  scene_records: SceneRecord[];
  scheduled_scenes: ScheduledScene[];
  live_observation: LiveObservation | null;
  olmoearth: { input_contract: string; anchors: number; embedding_status: string; post_event_delta: string | Record<string, unknown> };
  decision: CurrentDecision;
  ops_log?: { event_id?: string; time_utc: string; source: string; type: string; priority: 'green' | 'orange' | 'blue'; summary: string }[];
  incident_updates: IncidentUpdate[];
  research: ResearchBlock;
  downstream_visual: {
    purpose: string;
    records: { label: string; acquired_at: string; item_id: string; mgrs_tile: string; tile_cloud_pct: number; image: string; image_sha256: string }[];
  };
  simulation: { route_points: number; mapped_route_km_from_border?: number; reported_total_travel_km?: number;
    reported_reach_source?: string; trace_endpoint?: { name: string; coordinates: [number, number] };
    trace_endpoint_boundary?: string; claim: string; scientific_upgrade?: string };
  corridor_contract?: {
    expected_windows: number; expected_layers_per_window: number; contract: string; stage: string; next_step: string;
    baseline: { complete_windows: number; partial_windows: string[]; missing_windows: string[]; completed_layers: number; total_layers: number; materialization_sealed: boolean; embedded_windows: number; embedding_sealed: boolean; updated_at_utc: string | null };
    s1_live: { complete_windows: number; partial_windows: string[]; missing_windows: string[]; completed_layers: number; total_layers: number; materialization_sealed: boolean; embedded_windows: number; embedding_sealed: boolean; updated_at_utc: string | null };
    placebo_b?: { complete_windows: number; partial_windows: string[]; missing_windows: string[]; completed_layers: number; total_layers: number; materialization_sealed: boolean; embedded_windows: number; embedding_sealed: boolean; updated_at_utc: string | null };
    claim_boundary: string;
  };
  input_contract_audit?: { status: string; defect: string; official_contract: string; official_source: string; superseded_results: string[]; claim_boundary: string } | null;
  corridor_sealed?: {
    schema: string; model: string; status: string; windows: number; max_exceedance: number; windows_with_any_exceedance: number;
    comparison: { event: string; ordinary: string; threshold: string; ordinary_transition_count: number };
    input_contract: Record<string, string>; claim: string; limitations: string[]; report_sha256: string; visual_legend: string;
    top: { id: string; rank: number; name: string; kind: string; center_lonlat: [number, number]; coordinates: [number, number][];
      event_mean: number; placebo_mean: number; placebo_p99: number; frac_above_local_placebo_p99: number;
      mean_ratio_event_to_placebo: number; s2_only_rank?: number | null; pre_image: string; post_image: string; delta_image: string }[];
    geojson: FeatureCollection;
  } | null;
  headline?: { sealed_candidates: number | null; sealed_total: number | null; sealed_not_detected: string[]; live_mode?: string; placebo_n?: number; corridor_ranked: number | null; corridor_windows?: number; corridor_top: string[]; matched?: { n_pairs: number; candidates: string[]; ranks: Record<string, string>; token?: Record<string, { event_frac: number | null; placebo_max: number; rank: number | null; candidate: boolean }>; token_candidates?: string[] } };
  review?: { funnel: { scanned: number; observable: number; leads: number }; threshold: number | null; leads: { id: string; rank: number; place: string; kind: string; candidate_token_frac: number; observable: number; center_lonlat: [number, number] }[]; reobserve: { id: string; place: string; candidate_token_frac: number; observable: number; center_lonlat: [number, number] }[] } | null;
  geomorph?: { zone1: { length_km: number; drop_m: number; mean_slope_deg: number; narrowest: { km_from_source: number; valley_width_km: number; lon: number; lat: number }; profile: { km: number; elev: number; width_km: number; slope_deg: number | null }[]; path_lonlat: [number, number][]; note: string }; zone2: { correlations: Record<string, { spearman: number; p: number; n: number }>; n_windows: number; rows: { id: string; km_from_A: number; valley_width_km: number; relief_m: number | null; channel_slope: number | null; candidate_frac: number | null }[] }; zone_bounds: Record<string, [number, number, number, number]>; claim_boundary: string } | null;
  placebo_extended?: { threshold_pooled3: number; threshold_each: Record<string, number>; spearman_vs_single_pair: number | null; ranked_windows: number; top: { id: string; rank: number; frac_pooled3: number | null; frac_p1: number | null; frac_local3: number | null; observable: number }[] } | null;
  lake_search?: { aoi_center: [number, number]; half_km: number; s2_clear_frac: number; new_water_km2: number; s1_drop_px?: number; candidate_basis?: string; components_top5: { px: number; km2: number; center_lonlat: [number, number] }[]; images: { ndwi_pre: string; ndwi_post: string; candidates: string } } | null;
  presto_control?: { schema?: string; rows: { region: string; patches: number; presto_s2: number; presto_s1s2: number; olmo_s2: number | null; gap_s2: number | null }[]; regions: number; olmo_ahead_by_003: number; presto_above_chance_060: number } | null;
  downstream_profile?: { id: string; km_to_G: number; candidate_token_frac: number | null; observable: number | null; rank: number | null }[];
  radar_value?: { rows: { region: string; patches: number; s2_only: number; s1s2: number; fusion_gain: number; s1_only_ai: number; s1_classical: number }[]; regions: number; s1_only_usable: number; s1_ai_beats_classical: number; fusion_wins_at_003: number; fusion_positive: number } | null;
  ai_vs_classical?: { rows: { region: string; patches: number; classical_best: number; ai: number | null; gain: number | null }[]; regions: number; ahead: number; wins_at_005: number; pre_registered_margin: number; corridor?: { spearman: number; top10_overlap: number; reported_hits: { ai: number; classical: number } } | null } | null;
  candidates?: { schema: string; claim: string; threshold_placebo_p99: number | null; placebo_tokens: number; windows: number;
    top10: { id: string; rank: number; center_lonlat: [number, number]; candidate_token_frac: number; valid_event_frac: number; place?: string; distance_from_a_km?: number; kind?: string }[];
    hillslope_top?: { id: string; rank: number; center_lonlat: [number, number]; candidate_token_frac: number; valid_event_frac: number; place?: string; distance_from_a_km?: number; kind?: string }[];
    judged_by_kind?: Record<string, number>; unobservable_by_kind?: Record<string, number>;
    report_sha256: string; geojson: FeatureCollection;
    retrieval?: { query_windows: string[]; threshold: number; top10: { id: string; rank: number; similar_token_frac: number; place?: string; center_lonlat?: [number, number]; delta_rank?: number | null }[] } | null } | null;
};

type Hydrography = {
  type: 'FeatureCollection';
  features: Feature[];
  simulation_route: [number, number][];
};

type FlowExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  clear_route: () => void;
  set_route_point: (index: number, lon: number, lat: number) => void;
  reset: (seed: number) => void;
  step: (dt: number, speed: number) => void;
  particles_ptr: () => number;
  particle_count: () => number;
  abi_version: () => number;
};

// 타임라인 항목은 scenario.json에서 파생한다. 이전 버전은 이 목록을 하드코딩해서
// 실제 장면 8개 중 6개만 보였고 07-23의 센서를 잘못 표기했다.
type TimelineItem = {
  id: string;
  kind: 'scene' | 'event' | 'scheduled';
  date: string;      // "03 JUL"
  iso: string;       // 정렬용
  sensor: string;    // "S2" | "S1" | "EVENT"
  state: string;     // READY | IMPACT | PENDING | PLANNED
  selectable: boolean;
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]}`;
};
const shortSensor = (sensor: string) => (sensor.includes('-2') || sensor.startsWith('S2') ? 'S2' : sensor.includes('-1') || sensor.startsWith('S1') ? 'S1' : sensor.toUpperCase());
const kstStamp = (iso: string | null) => iso
  ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).toUpperCase()
  : '—';

// 배경 지도 — 2026-08-28.
//
// 왜 OSM 직결을 못 쓰는가: tile.openstreetmap.org 는 앱 직접 사용을 금지함. 실측하면 모든
// 줌의 타일이 동일한 6,933 B로 오고 헤더에 `x-blocked: Access denied` / `x-totp: INVALID`가
// 붙음. **http 200으로 오는 것이 함정**이라 로그에 오류가 남지 않고 지도만 검게 남았음.
//
// 왜 벡터 대신 raster 인가: 이전 시도는 CARTO Dark Matter 벡터(93레이어) + 클라이언트
// 음영기복(raster-dem 디코딩)이었고 화면이 심하게 버벅였음. raster는 사전 렌더라 레이어가
// 2장이면 끝이고 GPU 부담이 훨씬 작음.
//
// 네팔 랑탕 z12 실측 (전부 200, 해시 상이 — 차단 함정 없음):
//   CARTO dark_all        5.2 KB   가장 가벼움. 앱 톤(#10241e)과 맞음
//   Esri World_Hillshade 24.3 KB   사전 렌더 음영기복 — 산악 입체감
//   Esri World_Imagery   11.7 KB   위성영상. EO 연구 맥락에 주제적으로 맞음
//   MapTiler outdoor-v2    403     키의 허용 도메인 설정이 맞아야 열림
//
// 배포 화면의 성립을 API key에 맡기지 않는다. 외부 raster는 지명/음영 context를 더할 뿐이고,
// 실제 선택 S2 장면은 별도 DOM backdrop으로 항상 렌더한다.

const lightRasterStyle = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    hillshade: {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 16,
      attribution: 'Hillshade © Esri',
    },
    // CARTO 무료 raster는 2026-08 현재 "API KEY REQUIRED" 워터마크 타일을 반환함(실측).
    // 키 없이 쓸 수 있는 Esri 참조 라벨로 교체함.
    labels: {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Labels © Esri',
    },
    // 3D 지형 — AWS 공개 Terrarium DEM (키 불필요). 이전에 버벅였던 것은 93레이어 벡터
    // 스타일 + 클라이언트 음영기복 디코딩 조합이었음. raster 2장 + terrain 은 부담이 다름.
    terrainDem: {
      type: 'raster-dem' as const,
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      encoding: 'terrarium' as const,
      maxzoom: 14,
      attribution: 'DEM: Mapzen/AWS Terrain Tiles',
    },
  },
  layers: [
    { id: 'map-background', type: 'background' as const, paint: { 'background-color': 'rgba(16, 36, 30, 0.18)' } },
    { id: 'hillshade', type: 'raster' as const, source: 'hillshade',
      paint: { 'raster-opacity': 0.85, 'raster-saturation': -0.6 } },
    { id: 'labels', type: 'raster' as const, source: 'labels',
      paint: { 'raster-opacity': 0.55 } },
  ],
};

// MapTiler 벡터 — 2026-08-28 사용자가 origin 제한을 고쳐 키가 열림 (localhost origin → 200 실측).
// 키가 없거나 스타일 로드가 실패하면 Esri raster 폴백으로 자동 강등함 (성립을 키에 맡기지 않음).
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const maptilerStyleUrl = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`
  : null;
const basemapStyle = lightRasterStyle;
// 3D 지형 시점 — S2 장면(image source)은 terrain 위에 드레이프되므로 pitch 와 정합함.
const TERRAIN_PITCH = 52;
// MapTiler 스타일에는 우리 DEM 소스가 없으므로 3D 전환 시 동적으로 주입함.
const TERRAIN_DEM_SPEC = {
  type: 'raster-dem' as const,
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  tileSize: 256,
  encoding: 'terrarium' as const,
  maxzoom: 14,
  attribution: 'DEM: Mapzen/AWS Terrain Tiles',
};

setWorkerUrl('/maplibre-gl-worker.mjs');

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function Home() {
  const mapNode = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const initialCorridorFitRef = useRef(false);
  const flowSpeedRef = useRef(0.034);
  const flowPlayingRef = useRef(true);
  const wasmRef = useRef<FlowExports | null>(null);
  // 첫 화면은 사건 전체다. style reload가 전체 회랑을 다시 A/B 2.56 km
  // 장면으로 덮어쓰지 못하게, 사용자의 scene-focus 의도를 별도로 기억한다.
  const userSelectedSceneRef = useRef(false);
  const railsRef = useRef({ left: true, right: true });

  const [mapReady, setMapReady] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  // WebGL2가 없는 브라우저에서 MapLibre 생성자가 던지는 예외가 앱 전체를 죽이던
  // 결함의 방어. 'unsupported'면 지도 대신 정적 장면 이미지로 강등 표시한다.
  const [mapStatus, setMapStatus] = useState<'init' | 'ready' | 'unsupported'>('init');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [hydrography, setHydrography] = useState<Hydrography | null>(null);
  // 데이터 로드와 WASM은 별개 채널이다. 이전 버전은 scenario fetch 실패를
  // wasmStatus='failed'로 표시해 "시뮬레이션이 죽었다"는 오보를 냈다.
  const [dataStatus, setDataStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [wasmStatus, setWasmStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  // 2D(수직 정사영 — 판독·비교용) / 3D(지형 드레이프 — 회랑 실감용) 전환.
  const [viewDim, setViewDim] = useState<'2d' | '3d'>('2d');
  const [zone, setZone] = useState<0 | 1 | 2>(0);  // 0 overview · 1 source→impact · 2 impact→downstream
  const zoneRef = useRef<0 | 1 | 2>(0);
  // SSR과 첫 client render는 반드시 같은 값이어야 한다. window.hash를 state initializer에서
  // 읽으면 /#story 직링크에서 hydration mismatch가 난다(2026-08-29 브라우저 QA 실측).
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyLang, setStoryLang] = useState<'en' | 'ko'>('en');
  // 큰 비교 뷰어(라이트박스): 어떤 작은 사진이든 클릭하면 전·후 슬라이더로 크게 봄.
  type Lightbox = { title: string; sub?: string; before: string; after: string; beforeLabel: string; afterLabel: string; extra?: { src: string; label: string }[] };
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
  const [lbSwipe, setLbSwipe] = useState(50);
  const [lbExtra, setLbExtra] = useState<number | null>(null);
  const openLightbox = useCallback((lb: Lightbox) => { setLbSwipe(50); setLbExtra(null); setLightbox(lb); }, []);
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);
  // 팝업(HTML 문자열) 안의 썸네일 클릭 → 라이트박스 (이벤트 위임)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('.pp-thumbs') as HTMLElement | null;
      if (!el) return;
      const win = el.dataset.win; const name = el.dataset.name ?? ''; const place = el.dataset.place ?? '';
      if (el.dataset.ptc) {
        openLightbox({ title: name, sub: `${place} · negative-control window, 114 km from Rasuwagadhi`, before: '/data/candidates/ptC_pre.png', after: '/data/candidates/ptC_post.png', beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27 (cloud)' });
        return;
      }
      const cand = el.dataset.cand;
      if (cand) {
        openLightbox({ title: name, sub: `${place} · scan window ${cand}`, before: `/data/candidates/${cand}_pre.png`, after: `/data/candidates/${cand}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27',
                       extra: [{ src: `/data/candidates/${cand}_delta.png`, label: 'AI change tokens (orange) on 08-27' }, ...(win === 'rasuwagadhi' ? [{ src: '/data/story/planet/ps_rasuwagadhi_0828.png', label: 'PlanetScope 3.8 m · 08-28 · © Planet Labs PBC CC-BY-NC-4.0' }] : [])] });
        return;
      }
      if (!win) return;
      const extra = win === 'rasuwagadhi' ? [{ src: '/data/story/planet/ps_rasuwagadhi_0828.png', label: 'PlanetScope 3.8 m · 08-28' }] : [];
      openLightbox({ title: name, sub: place, before: `/data/story/anchors/${win}_pre.png`, after: `/data/story/anchors/${win}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra });
    };
    document.addEventListener('click', h); return () => document.removeEventListener('click', h);
  }, [openLightbox]);
  const [swipe, setSwipe] = useState(52);
  const viewDimRef = useRef<'2d' | '3d'>('2d');
  const [selectedPoint, setSelectedPoint] = useState('E');
  const [overlayOpacity, setOverlayOpacity] = useState(0.78);
  const [showAnchors, setShowAnchors] = useState(true);
  const [flowPlaying, setFlowPlaying] = useState(true);
  const [visibleParticles, setVisibleParticles] = useState<number | null>(null);
  const visibleLogRef = useRef(0);
  const [flowSpeed, setFlowSpeed] = useState(0.034);
  const [candidateScope, setCandidateScope] = useState<'all' | 'river' | 'hillslope'>('all');
  const [satTiles, setSatTiles] = useState(false);
  const [candView, setCandView] = useState<{ id: string; rank?: number; place?: string; mode: 'pre' | 'post' | 'delta' } | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);  // 2026-08-30: 패널 하나로 — 포인트는 지도 위 라벨로 충분
  const [rightOpen, setRightOpen] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const syncStoryHash = () => setStoryOpen(window.location.hash === '#story');
    // Defer the client-only hash read so the first hydrated tree remains identical to SSR.
    const frame = window.requestAnimationFrame(syncStoryHash);
    window.addEventListener('hashchange', syncStoryHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', syncStoryHash);
    };
  }, []);

  useEffect(() => { railsRef.current = { left: leftOpen, right: rightOpen }; }, [leftOpen, rightOpen]);

  // 좁은 화면에서는 패널을 기본으로 접는다 (지도가 주인공).
  // rAF로 페인트 뒤에 미룬다 — effect 내 동기 setState는 연쇄 렌더를 유발한다(lint).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (window.innerWidth < 1100) { setLeftOpen(false); setRightOpen(false); }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/data/scenario.json').then((r) => { if (!r.ok) throw new Error(`scenario ${r.status}`); return r.json() as Promise<Scenario>; }),
      fetch('/data/hydrography.geojson').then((r) => { if (!r.ok) throw new Error(`hydrography ${r.status}`); return r.json() as Promise<Hydrography>; }),
    ]).then(([nextScenario, nextHydrography]) => {
      if (cancelled) return;
      setScenario(nextScenario);
      setHydrography(nextHydrography);
      setDataStatus('ready');
      // 초기 장면 = 최신 **광학(S2)**. 최신 전체로 하면 S1 레이더(평균 밝기 35/255,
      // 사실상 검은 이미지)가 화면을 덮어 "지도가 안 나온다"로 보인다 — 실제 발생한 문제.
      const ready = [...nextScenario.scene_records].sort((a, b) => a.acquired_at.localeCompare(b.acquired_at));
      const latestOptical = [...ready].reverse().find((s) => shortSensor(s.sensor) === 'S2');
      setActiveSceneId((current) => current ?? latestOptical?.id ?? ready[ready.length - 1]?.id ?? null);
    }).catch(() => { if (!cancelled) setDataStatus('failed'); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  // ── 타임라인: 전부 scenario.json에서 파생 ──
  const timeline = useMemo<TimelineItem[]>(() => {
    if (!scenario) return [];
    const items: TimelineItem[] = scenario.scene_records.map((s) => ({
      id: s.id, kind: 'scene', iso: s.acquired_at, date: shortDate(s.acquired_at),
      sensor: shortSensor(s.sensor),
      state: s.state === 'live_partial' ? 'LIVE·PART' : s.state === 'live_ready' ? 'LIVE' : 'READY',
      selectable: true,
    }));
    items.push({
      id: 'event', kind: 'event', iso: scenario.event.occurred_at,
      date: shortDate(scenario.event.occurred_at), sensor: 'EVENT', state: 'IMPACT', selectable: false,
    });
    scenario.scheduled_scenes.forEach((s, i) => items.push({
      id: `scheduled-${i}`, kind: 'scheduled', iso: s.acquired_at, date: shortDate(s.acquired_at),
      sensor: shortSensor(s.sensor),
      state: s.state === 'missed_coverage' ? 'MISSED' : s.state === 'planned' ? 'PLANNED' : s.state === 'catalog_published_cloudy' ? 'CATALOG' : 'PENDING',
      selectable: false,
    }));
    return items.sort((a, b) => a.iso.localeCompare(b.iso));
  }, [scenario]);

  const points = useMemo(() => scenario?.points ?? [], [scenario]);
  const researchPoints = useMemo<FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature', properties: {
        id: p.id, name: p.name, display_label: p.display_label, map_label: p.map_label, stage: p.stage,
        marker_color: p.marker_color, in_event_chain: p.in_event_chain,
      },
      geometry: { type: 'Point', coordinates: p.coordinates },
    })),
  }), [points]);

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    // 생성 전에 능력을 직접 조사한다 — MapLibre v6은 supported()가 없다.
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    // 진단 — 화면을 볼 수 없을 때 한 번의 새로고침으로 원인을 가리기 위한 로그.
    const box = mapNode.current.getBoundingClientRect();
    const cs = getComputedStyle(mapNode.current);
    console.log('[diag] container layout | client =', mapNode.current.clientWidth + 'x' + mapNode.current.clientHeight,
                '| rect =', Math.round(box.width) + 'x' + Math.round(box.height),
                '| position =', cs.position, '| inset =', cs.inset,
                '| maplibreCss =', !!Array.from(document.styleSheets).find((sh) => {
                  try { return Array.from(sh.cssRules).some((r) => (r as CSSStyleRule).selectorText?.includes('maplibregl-canvas')); }
                  catch { return false; }
                }));
    console.log('[diag] webgl2 =', !!gl,
                '| container =', Math.round(box.width) + 'x' + Math.round(box.height),
                '| style = local-scene-backdrop + lightRasterStyle');
    if (!gl) { console.error('[diag] WebGL2 미지원 → 지도를 만들지 않고 종료함'); queueMicrotask(() => setMapStatus('unsupported')); return; }
    // CSS 시트 순서와 무관하게 컨테이너 크기를 보장한다 (인라인 = 최우선).
    // 실측: maplibre-gl.css 의 .maplibregl-map { position:relative } 가 로드 순서에 따라
    // .map-stage { position:absolute; inset:0 } 를 덮어 clientHeight 가 0 이 됐음.
    Object.assign(mapNode.current.style, {
      position: 'absolute', top: '0', right: '0', bottom: '0', left: '0',
      width: '100%', height: '100%',
    });
    try {
      const map = new MapLibreMap({
        container: mapNode.current,
        style: maptilerStyleUrl ?? basemapStyle,
        // 첫 인상은 A/B 한 점이 아니라 E→F 전체 사건 사슬이다. 이후 사용자가
        // SATELLITE FRAME/타임라인을 고를 때만 2.56 km 장면으로 들어간다.
        center: [85.27, 28.06],
        zoom: 8.95,
        pitch: 0,
        bearing: 0,
        maxPitch: 72,
        // 서비스 범위를 네팔·티베트 국경 회랑으로 잠금 — Trishuli 하류(Galchhi)에서
        // Kyirong(티베트) 상류까지. 언색호 lake_watch 회랑(국경 북쪽 ~20km)을 포함함.
        maxBounds: [[83.2, 26.6], [87.8, 29.8]],
        minZoom: 7,
        attributionControl: false,
      });
      map.addControl(new NavigationControl({ showCompass: true }), 'bottom-right');
      map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
      // styledata는 style 객체가 붙기 전에도 한 번 발생할 수 있다. 그 시점의 getStyle()은
      // 화면에는 무해하지만 MapLibre 경고를 남기므로 완성된 style에서만 진단한다.
      map.on('styledata', () => {
        if (!map.isStyleLoaded()) return;
        console.log('[diag] styledata — 레이어', map.getStyle()?.layers?.length ?? 0, '개');
      });
      map.on('style.load', () => setStyleRevision((revision) => revision + 1));
      // MapTiler 스타일이 죽으면(403/네트워크) Esri raster 로 강등 — 화면 성립을 키에 맡기지 않음.
      let fellBack = false;
      map.on('error', (e) => {
        const msg = String((e as { error?: { message?: string } }).error?.message ?? '');
        if (!fellBack && maptilerStyleUrl && /style|403|Forbidden|Failed to fetch/i.test(msg)) {
          fellBack = true;
          console.warn('[diag] MapTiler 스타일 실패 → Esri 폴백:', msg);
          map.setStyle(basemapStyle as unknown as Parameters<typeof map.setStyle>[0]);
        }
      });
      map.on('load', () => {
        // 초기 캔버스가 컨테이너보다 작게 잡히는 버그(실측 1440x300 vs 1440x813) 방지.
        map.resize();
        // WebGL 3D 지형 — Terrarium DEM. 기본은 2D(판독·비교 좌표계), 3D는 토글로 켬.
        if (viewDimRef.current === '3d') {
          try {
            if (!map.getSource('terrainDem')) map.addSource('terrainDem', TERRAIN_DEM_SPEC);
            map.setTerrain({ source: 'terrainDem', exaggeration: 1.3 });
          }
          catch (e) { console.warn('[diag] terrain 활성화 실패 — 평면 유지', e); }
        }
        // 진단: MapLibre가 실제로 무엇을 재는지 — private이지만 원인 확정용.
        const anyMap = map as unknown as { _container?: HTMLElement; _containerDimensions?: () => [number, number] };
        console.log('[diag] maplibre 내부 | sameContainer =', anyMap._container === mapNode.current,
                    '| _containerDimensions =', JSON.stringify(anyMap._containerDimensions?.()),
                    '| container.clientWH =', (anyMap._container?.clientWidth ?? -1) + 'x' + (anyMap._container?.clientHeight ?? -1));
        const b = map.getCanvas();
        console.log('[diag] load 완료 | canvas =', b.width + 'x' + b.height,
                    '| 소스 =', Object.keys(map.getStyle()?.sources ?? {}).join(','));
        setMapReady(true); setMapStatus('ready');
      });
      let tileCount = 0;
      map.on('data', (e) => {
        // e.tile 이 있으면 타일 한 장이 실제로 도착한 것이다.
        if ((e as { tile?: unknown }).tile) {
          tileCount += 1;
          if (tileCount <= 3) console.log('[diag] tile 도착:', (e as { sourceId?: string }).sourceId);
        }
      });
      map.on('idle', () => {
        const c = map.getCanvas();
        const host = mapNode.current;
        console.log('[diag] idle | 타일', tileCount, '장 | canvas =', c.width + 'x' + c.height,
                    '| 레이어', map.getStyle()?.layers?.length ?? 0,
                    '| container =', (host?.clientWidth ?? -1) + 'x' + (host?.clientHeight ?? -1),
                    '| window =', window.innerWidth + 'x' + window.innerHeight, '| dpr =', window.devicePixelRatio,
                    '| has ai-candidate-fill =', !!map.getLayer('ai-candidate-fill'), '| scan-center-dot =', !!map.getLayer('scan-center-dot'));
        // 자가치유: 창은 충분히 큰데 지도 컨테이너가 납작하면(예: 145px) 스타일을 다시 강제하고 resize
        if (host && window.innerHeight > 500 && host.clientHeight < 300) {
          console.warn('[diag] map container collapsed (', host.clientHeight, 'px) → forcing layout');
          Object.assign(host.style, { position: 'absolute', top: '0', right: '0', bottom: '0', left: '0', width: '100%', height: '100%', minHeight: '60vh' });
          map.resize();
        }
      });
      // 외부 context tile 실패는 진단만 남긴다. 실제 S2 backdrop과 로컬 evidence layer는 독립이다.
      map.on('error', (e) => {
        const msg = e?.error?.message ?? String(e);
        console.error('[map] error:', msg);
      });
      mapRef.current = map;
      // 컨테이너가 나중에 커지면 MapLibre는 스스로 캔버스를 늘리지 않는다.
      // 실측: container 1440x813 인데 canvas 1440x300 이라 지도가 얇은 띠로만 그려졌다.
      // 주의: 조건 없이 resize()를 호출하면 ResizeObserver가 자기 자신을 다시 깨워
      // 무한 루프가 된다(실측: headless Chrome이 5분간 종료되지 않았음).
      // 컨테이너 크기가 **실제로** 바뀐 경우에만 한 번 호출한다.
      let lastW = 0, lastH = 0;
      const ro = new ResizeObserver((entries) => {
        const r = entries[0]?.contentRect;
        if (!r) return;
        const w = Math.round(r.width), h = Math.round(r.height);
        if (w === lastW && h === lastH) return;
        lastW = w; lastH = h;
        if (w === 0 || h === 0) return;
        map.resize();
        const c = map.getCanvas();
        console.log('[diag] resize', w + 'x' + h, '→ canvas =', c.width + 'x' + c.height);
      });
      ro.observe(mapNode.current);
      return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
    } catch {
      queueMicrotask(() => setMapStatus('unsupported'));
      return;
    }
  }, []);

  // 연구 지점 레이어 — points가 데이터에서 오므로 로드 후에 붙인다.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || points.length === 0) return;
    // 벡터 스타일은 'load' 직후에도 isStyleLoaded()가 false일 수 있음 → idle에 한 번 더 시도 (2026-08-29 실측: 강·점·장면이 영영 안 붙던 원인)
    if (!map.isStyleLoaded()) { map.once('idle', () => setStyleRevision((r) => r + 1)); return; }
    if (!map.getSource('research-points')) {
      map.addSource('research-points', { type: 'geojson', data: researchPoints });
      map.addLayer({
        id: 'point-halo', type: 'circle', source: 'research-points',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'id'], 'E'], 21, ['==', ['get', 'id'], 'A'], 18, 12],
          'circle-color': ['get', 'marker_color'],
          'circle-opacity': ['case', ['==', ['get', 'id'], 'C'], 0.08, 0.2], 'circle-stroke-width': 1,
          'circle-stroke-color': ['get', 'marker_color'],
        },
      });
      map.addLayer({
        id: 'point-core', type: 'circle', source: 'research-points',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'id'], 'E'], 7, ['==', ['get', 'id'], 'A'], 6, 4.5],
          'circle-color': ['get', 'marker_color'],
          'circle-stroke-width': 2, 'circle-stroke-color': '#081411',
        },
      });
      map.addLayer({
        id: 'point-label', type: 'symbol', source: 'research-points',
        layout: {
          'text-field': ['get', 'map_label'], 'text-size': 11,
          // E/D와 A/B는 수백 m 이내라 같은 anchor를 쓰면 모바일에서 한 덩어리로 겹친다.
          // 점 자체는 유지하되 서로 반대 방향으로 라벨을 밀어 사건 순서를 읽을 수 있게 한다.
          'text-offset': ['match', ['get', 'id'],
            'E', ['literal', [1.15, 0]], 'D', ['literal', [-1.15, 0]],
            'A', ['literal', [0, 1.8]], 'B', ['literal', [0, -1.8]],
            'G', ['literal', [0, 1.8]], ['literal', [0, 1.55]]],
          'text-anchor': ['match', ['get', 'id'],
            'E', 'left', 'D', 'right', 'A', 'top', 'B', 'bottom', 'top'],
          'text-font': ['Noto Sans Regular'], 'text-allow-overlap': true,
        },
        paint: {
          'text-color': ['get', 'marker_color'], 'text-halo-color': '#071713', 'text-halo-width': 1.4,
        },
      });
    }
    const onPointClick = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (!id) return;
      setSelectedPoint(String(id));
      const pt = points.find((x) => x.id === String(id));
      if (pt) {
        // 점별 실측 위성 창 — A/B는 rasuwagadhi 앵커 창, D/E는 발원 수색 창.
        // C(원거리 참조)는 물질화 창이 없어 썸네일 없음.
        const win = ({ A: 'rasuwagadhi', B: 'rasuwagadhi', D: 'source', E: 'source', F: 'bidur' } as Record<string, string>)[pt.id];
        const cw = pt.nearest_window ?? null;
        const thumbs = cw
          ? `<div class="pp-thumbs" data-cand="${cw}" data-name="${pt.name}" data-place="${pt.place}" data-win="${win ?? ''}" title="Click to compare large">`
            + `<figure><img src="/data/candidates/${cw}_pre.png" alt="pre"/><figcaption>PRE 08-12</figcaption></figure>`
            + `<figure><img src="/data/candidates/${cw}_post.png" alt="post"/><figcaption>POST 08-27</figcaption></figure>`
            + `<figure><img src="/data/candidates/${cw}_delta.png" alt="AI change"/><figcaption>AI Δ · win ${cw}</figcaption></figure>`
            + (win === 'rasuwagadhi' ? `<figure><img src="/data/story/planet/ps_rasuwagadhi_0828.png" alt="PlanetScope 28 Aug"/><figcaption>PLANETSCOPE 3.8 m · 08-28<br/><a href="https://source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26" target="_blank" rel="noopener">© Planet Labs PBC · CC-BY-NC-4.0</a></figcaption></figure>` : '')
            + `</div><p class="pp-hint">▲ nearest scan window ${cw} (${pt.nearest_window_km} km)${pt.id === 'G' ? ' · AI change cells 6.7% here vs 25% at Dalphedi; 27 Aug is hazy, so read as weak signal, not absence' : ''} · click to open the large slider</p>`
          : pt.id === 'D' && scenario?.lake_search
          ? `<div class="pp-thumbs" data-lake="1" title="Click to compare large">`
            + `<figure><img src="${scenario.lake_search.images.ndwi_pre}" alt="NDWI pre"/><figcaption>NDWI 08-12</figcaption></figure>`
            + `<figure><img src="${scenario.lake_search.images.ndwi_post}" alt="NDWI post"/><figcaption>NDWI 08-27 (${Math.round(100 * scenario.lake_search.s2_clear_frac)}% clear)</figcaption></figure>`
            + `<figure><img src="${scenario.lake_search.images.candidates}" alt="radar drop candidates"/><figcaption>S1 ≥3 dB drop · same orbit</figcaption></figure>`
            + `</div><p class="pp-hint">▲ lake search ±5 km: optical too cloudy to confirm water; radar drops cluster in the Lhende valley (largest ${scenario.lake_search.components_top5[0] ? scenario.lake_search.components_top5[0].km2.toFixed(2) + ' km² at ' + scenario.lake_search.components_top5[0].center_lonlat[1].toFixed(3) + 'N ' + scenario.lake_search.components_top5[0].center_lonlat[0].toFixed(3) + 'E' : '—'}) — search targets, not a lake outline</p>`
          : pt.id === 'C'
          ? `<div class="pp-thumbs" data-cand="x001" data-name="${pt.name}" data-place="${pt.place}" title="Click to compare large">`
            + `<figure><img src="/data/candidates/x001_pre.png" alt="pre"/><figcaption>PRE 08-12</figcaption></figure>`
            + `<figure><img src="/data/candidates/x001_post.png" alt="post"/><figcaption>POST 08-27 (84% clear)</figcaption></figure>`
            + `<figure><img src="/data/candidates/x001_delta.png" alt="AI change"/><figcaption>AI Δ · 3.6% tokens</figcaption></figure>`
            + `</div><p class="pp-hint">▲ control: AI change 0.129 ≈ ordinary fortnight 0.125 — what "no change" looks like · click to open the large slider</p>`
          : win
          ? `<div class="pp-thumbs" data-win="${win}" data-name="${pt.name}" data-place="${pt.place}" title="Click to compare large">`
            + `<figure><img src="/data/story/anchors/${win}_pre.png" alt="pre"/><figcaption>PRE 08-12</figcaption></figure>`
            + `<figure><img src="/data/story/anchors/${win}_post.png" alt="post"/><figcaption>POST 08-27</figcaption></figure>`
            + (win === 'rasuwagadhi' ? `<figure><img src="/data/story/planet/ps_rasuwagadhi_0828.png" alt="PlanetScope 28 Aug"/><figcaption>PLANETSCOPE 3.8 m · 08-28<br/><a href="https://source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26" target="_blank" rel="noopener">© Planet Labs PBC · CC-BY-NC-4.0 · source.coop</a></figcaption></figure>` : '')
            + `</div><p class="pp-hint">▲ click any frame to open the large before/after slider</p>`
          : '';
        new Popup({ closeButton: true, maxWidth: '400px', className: 'story-popup' })
          .setLngLat(pt.coordinates)
          .setHTML(`<p class="pp-eyebrow" style="color:${pt.marker_color}">${pt.display_label}${pt.id === 'C' ? ' · OUTSIDE EVENT CHAIN' : ''}</p>`
            + `<h3>${pt.name}</h3><p class="pp-place">${pt.place}</p>`
            + thumbs
            + (pt.story ? `<p class="pp-story">${pt.story}</p>` : '')
            + `<p class="pp-src">coordinate source: ${pt.source_url ? `<a href="${pt.source_url}" target="_blank" rel="noreferrer">${pt.source ?? 'source'} ↗</a>` : (pt.source ?? '').replace('user coordinate + OSM Nominatim reverse lookup', 'user-specified point · place name from OSM reverse geocoding')}</p>`)
          .addTo(map);
      }
    };
    const onPointEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const onPointLeave = () => { map.getCanvas().style.cursor = ''; };
    map.on('click', 'point-core', onPointClick);
    map.on('mouseenter', 'point-core', onPointEnter);
    map.on('mouseleave', 'point-core', onPointLeave);
    return () => {
      map.off('click', 'point-core', onPointClick);
      map.off('mouseenter', 'point-core', onPointEnter);
      map.off('mouseleave', 'point-core', onPointLeave);
    };
  }, [mapReady, points, researchPoints, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !hydrography || map.getSource('hydrography')) return;
    // 벡터 스타일은 'load' 직후에도 isStyleLoaded()가 false일 수 있음 → idle에 한 번 더 시도 (2026-08-29 실측: 강·점·장면이 영영 안 붙던 원인)
    if (!map.isStyleLoaded()) { map.once('idle', () => setStyleRevision((r) => r + 1)); return; }
    const before = map.getLayer('point-halo') ? 'point-halo' : undefined;
    map.addSource('hydrography', { type: 'geojson', data: hydrography as FeatureCollection });
    map.addLayer({ id: 'river-casing', type: 'line', source: 'hydrography', paint: { 'line-color': '#06100e', 'line-width': 8, 'line-opacity': 0.82 } }, before);
    map.addLayer({ id: 'river-route', type: 'line', source: 'hydrography', paint: { 'line-color': '#0f5fd7', 'line-width': 2.4, 'line-opacity': 0.9 } }, before);
    // 파란 실선 = OSM 하천, 빨간 점선 = USGS 잠정 이동 보고를 따라 검사 중인 회랑.
    // 빨간 선은 침수 폭이나 최종 퇴적 경계를 뜻하지 않는다.
    map.addLayer({ id: 'reported-reach', type: 'line', source: 'hydrography', paint: {
      'line-color': '#d9363e', 'line-width': 2.6, 'line-opacity': 0.82,
      'line-dasharray': [2.4, 1.4], 'line-offset': 4,
    } }, before);
  }, [hydrography, mapReady, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    // 2026-08-30 헤드리스 재현: MapTiler 스타일에서 isStyleLoaded()가 idle 이후에도 계속 false(스프라이트 404 등)라
    // 재시도만 반복하고 레이어를 영영 안 붙였음. 스타일 객체와 레이어 목록만 있으면 진행하고, 실패는 catch 에서 기록.
    if (!map.getStyle()?.layers?.length) {
      console.log('[diag] candidates: style object not ready → retry on idle');
      map.once('idle', () => setStyleRevision((r) => r + 1));
      return;
    }
    fetch('/data/olmo-input-anchors.geojson').then((r) => r.json() as Promise<FeatureCollection>).then((anchors) => {
      // 벡터 스타일은 'load' 직후에도 isStyleLoaded()가 false일 수 있음 → idle에 한 번 더 시도
      if (!map.getStyle()?.layers?.length) { map.once('idle', () => setStyleRevision((r) => r + 1)); return; }
      const before = map.getLayer('point-halo') ? 'point-halo' : undefined;
      // 2026-08-30 결함 수정: 예전엔 olmo-anchors 가 이미 있으면 여기서 return 해서, scenario 가 늦게 도착한
      // 뒤의 재실행에서 후보 사각형·청록 점·검색 윤곽이 영영 추가되지 않았음 (사용자 "청록색이 안 보여").
      if (!map.getSource('olmo-anchors')) {
        map.addSource('olmo-anchors', { type: 'geojson', data: anchors });
        map.addLayer({ id: 'olmo-anchor-fill', type: 'fill', source: 'olmo-anchors', paint: { 'fill-color': '#5fffd7', 'fill-opacity': 0.045 } }, before);
      }
      // Contract-correct canonical OLMo result: vivid orange and O-ranks.
      // This is separate from the amber S2-only discovery scan below.
      if (scenario?.corridor_sealed?.geojson && !map.getSource('olmo-canonical')) {
        map.addSource('olmo-canonical', { type: 'geojson', data: scenario.corridor_sealed.geojson });
        map.addLayer({ id: 'olmo-canonical-fill', type: 'fill', source: 'olmo-canonical',
          paint: { 'fill-color': '#ff6a21', 'fill-opacity': ['interpolate', ['linear'], ['coalesce', ['get', 'exceedance'], 0], 0, 0.02, 0.001, 0.15, 0.0042, 0.48] } }, before);
        map.addLayer({ id: 'olmo-canonical-line', type: 'line', source: 'olmo-canonical',
          paint: { 'line-color': '#ff5a1f', 'line-width': ['case', ['<=', ['get', 'rank'], 6], 3.2, 1.1], 'line-opacity': ['case', ['<=', ['get', 'rank'], 6], 0.98, 0.38] } }, before);
        try { map.addLayer({ id: 'olmo-canonical-rank', type: 'symbol', source: 'olmo-canonical', filter: ['<=', ['get', 'rank'], 6],
          layout: { 'text-field': ['concat', 'O', ['to-string', ['get', 'rank']]], 'text-size': 15,
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true },
          paint: { 'text-color': '#ff5a1f', 'text-halo-color': '#fffaf3', 'text-halo-width': 2.5 } }); }
        catch (e) { console.warn('[diag] canonical OLMo labels skipped', e); }
        map.on('click', 'olmo-canonical-fill', (e) => {
          const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (!pr) return;
          const id = String(pr.id); const row = scenario.corridor_sealed?.top.find((item) => item.id === id);
          if (row) {
            openLightbox({ title: `O${row.rank} · ${row.name}`, sub: `${(100 * row.frac_above_local_placebo_p99).toFixed(2)}% tokens above this location's single ordinary-transition p99 · screening, not damage`, before: row.pre_image, after: row.post_image, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra: [{ src: row.delta_image, label: 'OLMo Δ intensity; yellow-white = above local placebo p99' }] });
          }
        });
        map.on('mouseenter', 'olmo-canonical-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'olmo-canonical-fill', () => { map.getCanvas().style.cursor = ''; });
      }
      // AI 후보 창 (S2-only, 미봉인) — 후보 토큰 비율로 채움 농도.
      if (scenario?.candidates?.geojson && !map.getSource('ai-candidates')) {
        map.addSource('ai-candidates', { type: 'geojson', data: scenario.candidates.geojson });
        // 모든 스캔 창 중심: 작은 청록 점 (위성이 찍힌 모든 자리)
        map.addSource('scan-centers', { type: 'geojson', data: { type: 'FeatureCollection', features: scenario.candidates.geojson.features.map((f) => ({ type: 'Feature', properties: f.properties, geometry: { type: 'Point', coordinates: (f.properties?.center_lonlat as [number, number]) } })) } });
        map.addLayer({ id: 'scan-center-dot', type: 'circle', source: 'scan-centers',
          paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2.2, 12, 4, 15, 7], 'circle-color': '#19d3b0', 'circle-stroke-color': '#fffefb', 'circle-stroke-width': 1.5, 'circle-opacity': 0.95 } });
        map.addLayer({ id: 'ai-candidate-fill', type: 'fill', source: 'ai-candidates',
          filter: ['==', ['get', 'status'], 'ranked'],  // 2026-08-30: 판정된 창만 채움 — 구름 창은 청록 점만 남겨 회랑이 벽이 되지 않게
          paint: { 'fill-color': ['case', ['==', ['get', 'kind'], 'hillslope'], '#7b3fbf', '#d99a24'],
                   'fill-opacity': ['interpolate', ['linear'], ['coalesce', ['get', 'candidate_token_frac'], 0], 0, 0.0, 0.05, 0.14, 0.2, 0.38, 0.5, 0.55] } }, before);
        try { map.addLayer({ id: 'ai-candidate-rank', type: 'symbol', source: 'ai-candidates',
          filter: ['all', ['has', 'rank'], ['<=', ['get', 'rank'], 6]],  // 2026-08-30: 100개 전부 번호를 찍으니 회랑이 벽이 됨 → 상위 6개만
          layout: { 'text-field': ['concat', '#', ['to-string', ['get', 'rank']]], 'text-size': ['case', ['<=', ['get', 'rank'], 6], 15, 11],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-allow-overlap': true, 'text-anchor': 'center' },
          paint: { 'text-color': ['case', ['<=', ['get', 'rank'], 6], '#b77708', '#7a4a2e'], 'text-halo-color': '#fffefb', 'text-halo-width': 2 } }); }
        catch (e) { console.warn('[diag] candidate rank labels skipped', e); }
        const simIds = (scenario?.candidates?.retrieval?.top10 ?? []).map((r) => r.id);
        if (simIds.length) {
          map.addLayer({ id: 'ai-similar-line', type: 'line', source: 'ai-candidates', filter: ['in', ['get', 'id'], ['literal', simIds]],
            paint: { 'line-color': '#2a78d6', 'line-width': 2.2, 'line-dasharray': [1.5, 1.2], 'line-opacity': 0.9 } }, before);
        }
        map.on('click', 'ai-candidate-fill', (e) => {
          const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (!pr) return;
          const id = String(pr.id); const rank = pr.rank ? `#${pr.rank}` : 'not judged (cloud/snow)';
          if (satTiles) {  // 위성 타일 모드: 클릭 즉시 큰 전·후 슬라이더
            openLightbox({ title: `Scan window ${id} · ${rank}`, sub: `${pr.kind === 'hillslope' ? 'off-river hillslope' : String(pr.kind ?? 'river')} · ${typeof pr.candidate_token_frac === 'number' ? (100 * (pr.candidate_token_frac as number)).toFixed(0) + '% candidate tokens tokens' : 'not judged'}`, before: `/data/candidates/${id}_pre.png`, after: `/data/candidates/${id}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra: [{ src: `/data/candidates/${id}_delta.png`, label: 'AI change tokens (orange) on 08-27' }] });
            return;
          }
          const kindLabel = pr.kind === 'hillslope' ? 'OFF-RIVER HILLSLOPE' : pr.kind === 'lhende' ? 'LHENDE UPSTREAM' : 'RIVER';
          const frac = typeof pr.candidate_token_frac === 'number' ? `${(100 * (pr.candidate_token_frac as number)).toFixed(0)}% candidate tokens tokens` : 'not judged';
          const vis = typeof pr.valid_event_frac === 'number' ? `${(100 * (pr.valid_event_frac as number)).toFixed(0)}% observable` : '';
          new Popup({ closeButton: true, maxWidth: '420px', className: 'story-popup' }).setLngLat(e.lngLat)
            .setHTML(`<p class="pp-eyebrow">${kindLabel} · ${rank}</p><h3>Scan window ${id}</h3><p class="pp-place">${frac} · ${vis}</p>`
              + `<div class="pp-thumbs" data-cand="${id}" data-name="Scan window ${id}" data-place="${kindLabel} · ${rank}" title="Click to compare large">`
              + `<figure><img src="/data/candidates/${id}_pre.png" alt="pre"/><figcaption>PRE 08-12</figcaption></figure>`
              + `<figure><img src="/data/candidates/${id}_post.png" alt="post"/><figcaption>POST 08-27</figcaption></figure>`
              + `<figure><img src="/data/candidates/${id}_delta.png" alt="AI change"/><figcaption>AI Δ</figcaption></figure></div>`
              + `<p class="pp-hint">▲ click to open the large slider · orange = changed more than any ordinary fortnight · grey = cloud/snow</p>`).addTo(map);
        });
        map.on('click', 'scan-center-dot', (e) => {
          const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (!pr) return;
          const id = String(pr.id);
          if (satTiles) {
            openLightbox({ title: `Scan window ${id}`, sub: pr.rank ? `rank #${pr.rank}` : 'not judged (cloud/snow)', before: `/data/candidates/${id}_pre.png`, after: `/data/candidates/${id}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra: [{ src: `/data/candidates/${id}_delta.png`, label: 'AI change tokens (orange) on 08-27' }] });
            return;
          }
          new Popup({ closeButton: true, maxWidth: '420px', className: 'story-popup' }).setLngLat(e.lngLat)
            .setHTML(`<p class="pp-eyebrow">SCAN WINDOW · ${pr.rank ? '#' + pr.rank : 'not judged'}</p><h3>${id}</h3>`
              + `<div class="pp-thumbs" data-cand="${id}" data-name="Scan window ${id}" data-place="" title="Click to compare large">`
              + `<figure><img src="/data/candidates/${id}_pre.png" alt="pre"/><figcaption>PRE 08-12</figcaption></figure>`
              + `<figure><img src="/data/candidates/${id}_post.png" alt="post"/><figcaption>POST 08-27</figcaption></figure>`
              + `<figure><img src="/data/candidates/${id}_delta.png" alt="AI change"/><figcaption>AI Δ</figcaption></figure></div>`
              + `<p class="pp-hint">▲ click to open the large slider</p>`).addTo(map);
        });
        map.on('mouseenter', 'scan-center-dot', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'scan-center-dot', () => { map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', 'ai-candidate-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'ai-candidate-fill', () => { map.getCanvas().style.cursor = ''; });
        if (map.getLayer('scan-center-dot')) map.moveLayer('scan-center-dot');
        console.log('[diag] candidate layers attached | windows =', scenario.candidates.geojson.features.length, '| layers =', (map.getStyle()?.layers ?? []).map((l) => l.id).filter((id) => /scan|ai-|olmo|river|point/.test(id)).join(','));
        map.addLayer({ id: 'ai-candidate-line', type: 'line', source: 'ai-candidates',
          paint: { 'line-color': ['case', ['==', ['get', 'kind'], 'hillslope'], '#7b3fbf', '#d99a24'], 'line-width': ['case', ['<=', ['coalesce', ['get', 'rank'], 99], 5], 2, 0.6], 'line-opacity': ['case', ['==', ['get', 'status'], 'ranked'], 0.8, 0.25] } }, before);
        if (map.getLayer('scan-center-dot')) map.moveLayer('scan-center-dot');
      }
      if (!map.getLayer('olmo-anchor-line')) map.addLayer({ id: 'olmo-anchor-line', type: 'line', source: 'olmo-anchors', paint: { 'line-color': '#b7ffe9', 'line-width': 1, 'line-opacity': 0.52, 'line-dasharray': [3, 2] } }, before);
    }).catch((e) => console.error('[diag] candidates effect failed (this is why the boxes/cyan dots were missing):', e));
  }, [mapReady, styleRevision, scenario?.candidates?.geojson, scenario?.candidates?.retrieval?.top10, scenario?.corridor_sealed, satTiles, openLightbox]);

  // 두 구역 모드(2026-08-30): 1 = 빙하 발원→충격(렌데 계곡·산사면 격자), 2 = 충격→하류(강 창). 레이어 필터 + 카메라.
  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady) return;
    const kinds = zone === 1 ? ['lhende', 'hillslope'] : zone === 2 ? ['river'] : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kindFilter: any = kinds ? ['in', ['get', 'kind'], ['literal', kinds]] : null;
    const apply = () => {
      if (map.getLayer('ai-candidate-fill')) map.setFilter('ai-candidate-fill', kindFilter ? ['all', ['==', ['get', 'status'], 'ranked'], kindFilter] : ['==', ['get', 'status'], 'ranked']);
      if (map.getLayer('scan-center-dot')) map.setFilter('scan-center-dot', kindFilter);
      if (map.getLayer('ai-candidate-rank')) map.setFilter('ai-candidate-rank', kindFilter ? ['all', ['has', 'rank'], ['<=', ['get', 'rank'], 6], kindFilter] : ['all', ['has', 'rank'], ['<=', ['get', 'rank'], 6]]);
      for (const id of ['olmo-canonical-fill', 'olmo-canonical-line', 'olmo-canonical-rank']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', zone === 1 ? 'none' : 'visible');
      const b = zone !== 0 ? scenario?.geomorph?.zone_bounds?.[String(zone)] : null;
      zoneRef.current = zone;  // 장면 효과가 구역 카메라를 덮어쓰지 않게(아래 fitScene 가드)
      if (b) map.fitBounds(new LngLatBounds([b[0], b[1]], [b[2], b[3]]), { padding: scenePadding(), duration: prefersReducedMotion() ? 0 : 900, pitch: 0, bearing: 0, maxZoom: 12.5 });
      else if (zone === 0 && scenario) fitCorridor();
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__map = map;
    if (map.getLayer('ai-candidate-fill')) apply(); else map.once('idle', apply);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, mapReady, styleRevision]);

  // fitBounds 패딩은 실제로 열려 있는 패널에 맞춘다.
  // 이전 버전은 패널이 항상 보인다고 가정한 고정 패딩을 썼다.
  const scenePadding = useCallback(() => {
    const wide = window.innerWidth > 1100;
    const { left, right } = railsRef.current;
    return {
      top: 96,
      bottom: window.innerWidth > 720 ? 158 : 190,
      left: wide && left ? 372 : 24,
      right: wide && right ? 372 : 24,
    };
  }, []);

  const fitScene = useCallback((scene: SceneRecord, duration = 900) => {
    const map = mapRef.current;
    if (!map) return;
    if (zoneRef.current !== 0) return;  // 구역 모드: 장면 맞춤 금지
    const [topLeft, , bottomRight] = scene.coordinates;
    map.fitBounds(
      new LngLatBounds([topLeft[0], bottomRight[1]], [bottomRight[0], topLeft[1]]),
      { padding: scenePadding(), maxZoom: 15.1, pitch: viewDimRef.current === '3d' ? TERRAIN_PITCH : 0, bearing: viewDimRef.current === '3d' ? -18 : 0, duration: prefersReducedMotion() ? 0 : duration },
    );
  }, [scenePadding]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !scenario || !activeSceneId) return;
    // 벡터 스타일은 'load' 직후에도 isStyleLoaded()가 false일 수 있음 → idle에 한 번 더 시도 (2026-08-29 실측: 강·점·장면이 영영 안 붙던 원인)
    if (!map.isStyleLoaded()) { map.once('idle', () => setStyleRevision((r) => r + 1)); return; }
    const scene = scenario.scene_records.find((item) => item.id === activeSceneId);
    if (!scene) return;
    if (map.getLayer('satellite-scene')) map.removeLayer('satellite-scene');
    if (map.getSource('satellite-scene')) map.removeSource('satellite-scene');
    const before = map.getLayer('point-halo') ? 'point-halo' : undefined;
    map.addSource('satellite-scene', { type: 'image', url: scene.image, coordinates: scene.coordinates });
    map.addLayer({ id: 'satellite-scene', type: 'raster', source: 'satellite-scene', paint: { 'raster-opacity': overlayOpacity, 'raster-fade-duration': 120, 'raster-saturation': 0.12, 'raster-contrast': 0.08, 'raster-resampling': 'nearest' } }, before);
    if (!userSelectedSceneRef.current) {
      // 첫 화면은 단일 A/B 위성창이 아니라 SOURCE→DOWNSTREAM 사건 전체를 보여준다.
      // 단 **최초 1회만**: 이 효과는 styleRevision 등으로 재실행되는데, 그때마다 fitBounds 하면
      // GO/확대 뒤 화면이 원위치로 튀는 결함이 생김 (2026-08-29 사용자 보고).
      if (!initialCorridorFitRef.current && zoneRef.current === 0) {  // 구역 모드 중엔 최초 회랑 맞춤도 금지 (2026-08-30 헤드리스 추적)
        initialCorridorFitRef.current = true;
        map.fitBounds(new LngLatBounds([84.96, 27.77], [85.55, 28.36]), {
          padding: scenePadding(), maxZoom: 10.8, duration: 0,
        });
      }
    } else if (zoneRef.current === 0) {
      fitScene(scene, 700);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSceneId, mapReady, scenario, fitScene, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !map.getLayer('satellite-scene')) return;
    map.setPaintProperty('satellite-scene', 'raster-opacity', overlayOpacity);
  }, [mapReady, overlayOpacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !map.getLayer('olmo-anchor-fill')) return;
    map.setLayoutProperty('olmo-anchor-fill', 'visibility', showAnchors ? 'visible' : 'none');
    map.setLayoutProperty('olmo-anchor-line', 'visibility', showAnchors ? 'visible' : 'none');
  }, [mapReady, showAnchors]);

  useEffect(() => { flowPlayingRef.current = flowPlaying; }, [flowPlaying]);
  useEffect(() => { flowSpeedRef.current = flowSpeed; }, [flowSpeed]);

  useEffect(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!mapReady || !map || !canvas || !hydrography) return;
    let cancelled = false;
    let animationFrame = 0;
    let lastTime = performance.now();

    const start = async () => {
      try {
        const response = await fetch('/wasm/nepal_flow.wasm');
        const instantiated = await WebAssembly.instantiateStreaming(response, {});
        const wasm = instantiated.instance.exports as FlowExports;
        wasmRef.current = wasm;
        if (wasm.abi_version() !== 1) throw new Error('Unexpected WASM ABI');
        wasm.clear_route();
        hydrography.simulation_route.forEach(([lon, lat], index) => wasm.set_route_point(index, lon, lat));
        wasm.reset(20260826);
        setWasmStatus('ready');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');

        const draw = (now: number) => {
          if (cancelled) return;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const width = canvas.clientWidth;
          const height = canvas.clientHeight;
          if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
          }
          context.setTransform(dpr, 0, 0, dpr, 0, 0);
          context.clearRect(0, 0, width, height);
          const dt = Math.min((now - lastTime) / 1000, 0.05);
          lastTime = now;
          if (flowPlayingRef.current) wasm.step(dt, flowSpeedRef.current);
          const count = wasm.particle_count();
          const values = new Float32Array(wasm.memory.buffer, wasm.particles_ptr(), count * 3);
          // 2026-08-29: 'lighter'(가산) + 민트색은 어두운 지도 전제였음. 밝은 종이 톤·MapTiler
          // 배경에서는 흰색으로 사라져 "애니메이션이 없다"로 보였음. 밝은 배경에서 보이는
          // 진한 색 + 일반 합성으로 바꾸고, 흰 테두리로 위성 장면 위에서도 분리되게 함.
          context.globalCompositeOperation = 'source-over';
          context.shadowColor = 'rgba(255, 255, 255, 0.9)';
          context.shadowBlur = 3;
          let onScreen = 0;
          for (let index = 0; index < count; index += 1) {
            const screen = map.project([values[index * 3], values[index * 3 + 1]]);
            if (screen.x < 0 || screen.y < 0 || screen.x > width || screen.y > height) continue;
            onScreen += 1;
            context.globalAlpha = 0.35 + values[index * 3 + 2] * 0.65;
            context.fillStyle = index % 7 === 0 ? '#eb6834' : '#0f5fd7';
            context.beginPath();
            context.arc(screen.x, screen.y, index % 7 === 0 ? 2.6 : 1.9, 0, Math.PI * 2);
            context.fill();
          }
          context.globalAlpha = 1;
          context.shadowBlur = 0;
          if ((visibleLogRef.current += 1) % 60 === 1) {
            setVisibleParticles(onScreen);
            if (visibleLogRef.current === 1) console.log('[diag] flow first frame | particles =', count, '| on-screen =', onScreen, '| canvas =', width + 'x' + height);
          }
          animationFrame = requestAnimationFrame(draw);
        };
        animationFrame = requestAnimationFrame(draw);
      } catch {
        setWasmStatus('failed');
      }
    };
    start();
    return () => { cancelled = true; wasmRef.current = null; cancelAnimationFrame(animationFrame); };
  }, [hydrography, mapReady]);

  const liveDelta = useMemo(() => {
    const ped = scenario?.olmoearth?.post_event_delta;
    return typeof ped === 'object' && ped && (ped as Record<string, unknown>).live_mode ? (ped as Record<string, unknown>) : null;
  }, [scenario]);
  // GO TO MAP: 후보 창의 위성 사진(전/후/AI Δ)을 지도 위에 실제 좌표로 깔아 보여줌.
  const showCandidate = useCallback((id: string, mode: 'pre' | 'post' | 'delta', meta?: { rank?: number; place?: string; center?: [number, number] }) => {
    const map = mapRef.current; const fc = scenario?.candidates?.geojson;
    if (!map || !fc) return;
    const f = fc.features.find((x) => x.properties?.id === id);
    if (!f || f.geometry.type !== 'Polygon') return;
    const ring = f.geometry.coordinates[0] as [number, number][];  // SW, SE, NE, NW, SW
    const coords: [[number, number], [number, number], [number, number], [number, number]] = [ring[3], ring[2], ring[1], ring[0]];
    if (map.getLayer('cand-scene')) map.removeLayer('cand-scene');
    if (map.getSource('cand-scene')) map.removeSource('cand-scene');
    map.addSource('cand-scene', { type: 'image', url: `/data/candidates/${id}_${mode}.png`, coordinates: coords });
    const before = map.getLayer('ai-candidate-fill') ? 'ai-candidate-fill' : (map.getLayer('point-halo') ? 'point-halo' : undefined);
    map.addLayer({ id: 'cand-scene', type: 'raster', source: 'cand-scene', paint: { 'raster-opacity': 1, 'raster-fade-duration': 120 } }, before);
    const center = meta?.center ?? (f.properties?.center_lonlat as [number, number] | undefined);
    if (center) map.flyTo({ center, zoom: 14.2, pitch: 0, bearing: 0, duration: 900 });
    setCandView({ id, mode, rank: meta?.rank, place: meta?.place });
  }, [scenario]);
  const clearCandidate = useCallback(() => {
    const map = mapRef.current; if (map?.getLayer('cand-scene')) map.removeLayer('cand-scene'); if (map?.getSource('cand-scene')) map.removeSource('cand-scene'); setCandView(null);
  }, []);

  // 위성 타일 토글: 모든 스캔 창의 08-27 128px 썸네일을 실제 좌표에 드레이프
  useEffect(() => {
    const map = mapRef.current; const fc = scenario?.candidates?.geojson;
    if (!mapReady || !map || !fc) return;
    const ids = fc.features.map((f) => String(f.properties?.id));
    if (!satTiles) {
      ids.forEach((id) => { if (map.getLayer(`tile-${id}`)) map.removeLayer(`tile-${id}`); if (map.getSource(`tile-${id}`)) map.removeSource(`tile-${id}`); });
      return;
    }
    const before = map.getLayer('ai-candidate-fill') ? 'ai-candidate-fill' : undefined;
    fc.features.forEach((f) => {
      const id = String(f.properties?.id); if (map.getSource(`tile-${id}`) || f.geometry.type !== 'Polygon') return;
      const ring = f.geometry.coordinates[0] as [number, number][];
      map.addSource(`tile-${id}`, { type: 'image', url: `/data/candidates/thumbs/${id}_post128.png`, coordinates: [ring[3], ring[2], ring[1], ring[0]] });
      map.addLayer({ id: `tile-${id}`, type: 'raster', source: `tile-${id}`, paint: { 'raster-opacity': 0.92, 'raster-fade-duration': 0 } }, before);
    });
  }, [satTiles, mapReady, scenario]);

  const activeScene = scenario?.scene_records.find((item) => item.id === activeSceneId) ?? null;
  const latestOpticalScene = useMemo(() => {
    const optical = scenario?.scene_records.filter((scene) => shortSensor(scene.sensor) === 'S2') ?? [];
    return [...optical].sort((a, b) => b.acquired_at.localeCompare(a.acquired_at))[0] ?? null;
  }, [scenario]);
  const setDimension = (dim: '2d' | '3d') => {
    setViewDim(dim); viewDimRef.current = dim;
    const map = mapRef.current;
    if (!map) return;
    try {
      if (dim === '3d') {
        if (!map.getSource('terrainDem')) map.addSource('terrainDem', TERRAIN_DEM_SPEC);
        map.setTerrain({ source: 'terrainDem', exaggeration: 1.3 });
        map.easeTo({ pitch: TERRAIN_PITCH, bearing: -18, duration: prefersReducedMotion() ? 0 : 800 });
      } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, bearing: 0, duration: prefersReducedMotion() ? 0 : 800 });
      }
    } catch (e) { console.warn('[diag] terrain 전환 실패', e); }
  };

  const backdropScene = activeScene && shortSensor(activeScene.sensor) === 'S2' ? activeScene : latestOpticalScene;
  const missedCoverage = scenario?.scheduled_scenes.find((scene) => scene.state === 'missed_coverage') ?? null;
  const nextScheduled = scenario?.scheduled_scenes.find((scene) => scene.state !== 'missed_coverage') ?? null;
  const nextRadar = scenario?.scheduled_scenes.find((scene) => scene.state !== 'missed_coverage' && shortSensor(scene.sensor) === 'S1') ?? null;
  const liveObservation = scenario?.live_observation ?? null;
  const decision = scenario?.decision ?? null;
  const transfer = scenario?.research.confirmatory_transfer ?? null;
  const livePeriodText = liveObservation
    ? `S1 ${liveObservation.period_readiness?.sentinel1 ?? '?'}⁄4 · S2 ${liveObservation.period_readiness?.sentinel2_l2a ?? '?'}⁄4`
    : '—';
  const liveReadinessLabel = !liveObservation
    ? 'NO LIVE OBSERVATION'
    : liveObservation.olmo_ready
      ? 'OLMo INPUT SEALED'
      : liveObservation.materialization_status === 'partial_cube_contract_failed'
        ? 'PIXELS READY · CUBE INCOMPLETE'
        : liveObservation.materialization_status === 'blocked_provider_selection'
          ? 'OFFICIAL 5/5 · PROVIDER INDEX WAIT'
        : liveObservation.materialization_status === 'selected_not_materialized'
          ? 'SCENE SELECTED · MATERIALIZE WAIT'
          : 'INPUT CONTRACT BLOCKED';
  const selectedCard = points.find((item) => item.id === selectedPoint) ?? points[0] ?? null;
  const eventPoints = points.filter((point) => point.in_event_chain);
  const controlPoints = points.filter((point) => !point.in_event_chain);
  const bidurPre = scenario?.downstream_visual.records.find((record) => record.label === 'pre') ?? null;
  const bidurPost = scenario?.downstream_visual.records.find((record) => record.label === 'post') ?? null;
  const providerSyncBlocked = liveObservation?.materialization_status === 'blocked_provider_selection';
  const corridorContract = scenario?.corridor_contract ?? null;
  const canonicalTop = scenario?.corridor_sealed?.top[0] ?? null;
  // 2026-08-30: 카드 순서는 첫 화면과 같은 리드(평시 3쌍 문턱, 관측 가능성 ≥ 40%, 마을 중복 제거). OFF-RIVER 는 재관측 대상.
  const leadRows = (scenario?.review?.leads ?? []).map((l) => ({ id: l.id, rank: l.rank, place: l.place, kind: l.kind, center_lonlat: l.center_lonlat, candidate_token_frac: l.candidate_token_frac, valid_event_frac: l.observable, distance_from_a_km: undefined as number | undefined }));
  const reobserveRows = (scenario?.review?.reobserve ?? []).map((l, i) => ({ id: l.id, rank: i + 1, place: l.place, kind: 'hillslope', center_lonlat: l.center_lonlat, candidate_token_frac: l.candidate_token_frac, valid_event_frac: l.observable, distance_from_a_km: undefined as number | undefined }));
  const candidateRows = !scenario?.candidates ? []
    : candidateScope === 'hillslope'
      ? (reobserveRows.length ? reobserveRows : (scenario.candidates.hillslope_top ?? []))
      : candidateScope === 'river'
        ? (leadRows.length ? leadRows.filter((c) => c.kind === 'river') : scenario.candidates.top10.filter((candidate) => candidate.kind !== 'hillslope'))
        : (leadRows.length ? leadRows : scenario.candidates.top10);

  const focusPoint = (id: string) => {
    setSelectedPoint(id);
    const card = points.find((item) => item.id === id);
    if (!card) return;
    mapRef.current?.flyTo({
      center: card.coordinates, zoom: id === 'C' ? 10.5 : id === 'F' ? 13.2 : id === 'G' ? 12.2 : 14,
      pitch: viewDimRef.current === '3d' ? TERRAIN_PITCH : 0, bearing: viewDimRef.current === '3d' ? -18 : 0,
      duration: prefersReducedMotion() ? 0 : 1100,
    });
  };

  const fitCorridor = () => {
    userSelectedSceneRef.current = false;
    if (zoneRef.current !== 0) return;  // 구역 모드: 회랑 맞춤 금지
    mapRef.current?.fitBounds(new LngLatBounds([84.96, 27.77], [85.55, 28.36]), {
      padding: scenePadding(), pitch: viewDimRef.current === '3d' ? TERRAIN_PITCH : 0, bearing: viewDimRef.current === '3d' ? -18 : 0, duration: prefersReducedMotion() ? 0 : 1100,
    });
  };
  const replayEventChain = () => {
    wasmRef.current?.reset(20260826);
    setFlowPlaying(true);
    fitCorridor();
  };

  // 타임라인 키보드 탐색: ←/→ 로 READY 장면 사이 이동.
  // River corridor 미니 도식 — 검증된 OSM centerline(78점)을 그대로 축소해 그림.
  // 앵커 4곳(라수와가디→티무레→샤브루베시→둔체)을 실좌표로 route에 투영함.
  const corridorSketch = useMemo(() => {
    const route = hydrography?.simulation_route;
    if (!route || route.length < 2) return null;
    const lons = route.map((p) => p[0]); const lats = route.map((p) => p[1]);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const W = 260, H = 84, PAD = 8;
    const sx = (lon: number) => PAD + ((lon - minLon) / (maxLon - minLon || 1)) * (W - 2 * PAD);
    const sy = (lat: number) => PAD + ((maxLat - lat) / (maxLat - minLat || 1)) * (H - 2 * PAD);
    const path = route.map((pt, i) => `${i === 0 ? 'M' : 'L'}${sx(pt[0]).toFixed(1)},${sy(pt[1]).toFixed(1)}`).join(' ');
    const anchors: { name: string; lon: number; lat: number }[] = [
      { name: 'Rasuwagadhi', lon: 85.378, lat: 28.276 },
      { name: 'Timure', lon: 85.363, lat: 28.235 },
      { name: 'Syabrubesi', lon: 85.347, lat: 28.164 },
      { name: 'Dhunche', lon: 85.296, lat: 28.102 },
      { name: 'Trishuli Bazar', lon: 85.1357, lat: 27.9162 },
      { name: 'Galchhi · trace end', lon: 84.9883, lat: 27.8055 },
    ];
    // route 위 최근접점에 스냅해 앵커가 강 선 위에 앉게 함
    const dots = anchors.map((a) => {
      let best = route[0]; let bd = Infinity;
      for (const pt of route) {
        const d = (pt[0] - a.lon) ** 2 + (pt[1] - a.lat) ** 2;
        if (d < bd) { bd = d; best = pt; }
      }
      return { name: a.name, x: sx(best[0]), y: sy(best[1]) };
    });
    return { W, H, path, dots };
  }, [hydrography]);

  // STORY 오버레이 — Snow Fall식 스크롤리텔링: IntersectionObserver로 섹션 표시,
  // 진행 바는 스크롤 비율. prefers-reduced-motion 이면 항상 표시 상태로 시작함.
  const storyRef = useRef<HTMLDivElement>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  useEffect(() => {
    if (!storyOpen) return;
    const root = storyRef.current;
    if (!root) return;
    const reduced = prefersReducedMotion();
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.story-step'));
    if (reduced) { sections.forEach((s) => s.classList.add('in-view')); }
    const io = reduced ? null : new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in-view'); });
    }, { root, threshold: 0.25 });
    if (io) sections.forEach((s) => io.observe(s));
    const onScroll = () => {
      const max = root.scrollHeight - root.clientHeight;
      setStoryProgress(max > 0 ? Math.min(1, root.scrollTop / max) : 0);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setStoryOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { io?.disconnect(); root.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKey); };
  }, [storyOpen]);

  const sceneById = useCallback((id: string) => scenario?.scene_records.find((s) => s.id === id) ?? null, [scenario]);

  const readyIds = useMemo(() => timeline.filter((t) => t.selectable).map((t) => t.id), [timeline]);
  const onTimelineKey = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    if (!activeSceneId || readyIds.length === 0) return;
    const at = readyIds.indexOf(activeSceneId);
    const next = event.key === 'ArrowRight' ? Math.min(at + 1, readyIds.length - 1) : Math.max(at - 1, 0);
    userSelectedSceneRef.current = true;
    setActiveSceneId(readyIds[next]);
  };

  return (
    <main className="app-shell">
      {/* 장면은 지도 안의 지리참조 레이어('satellite-scene' image source)로만 그린다.
          이전의 DOM 고정 backdrop은 ① 드래그해도 움직이지 않고 ② WASM flow(지도 좌표)와
          어긋나며 ③ 지도 캔버스와 basemap을 가렸다. WebGL2가 없을 때만 정적 이미지로
          내려간다(아래 map-fallback). */}
      <div className="key-strip" role="note">
        <b>{zone === 0 ? 'KEY' : zone === 1 ? 'ZONE 1' : 'ZONE 2'}</b>
        <span>{zone === 0
          ? (scenario?.review?.leads?.length ? `${scenario.review.funnel.scanned} windows scanned · ${scenario.review.funnel.observable} observable · ${scenario.review.funnel.leads} to inspect first: ${scenario.review.leads.slice(0, 3).map((c) => c.place.split(',')[0]).join(' · ')} … Ranked by how far each place moved from its own ordinary change in OlmoEarth's representation. Nothing here is confirmed damage.` : 'Where to look first, ranked by OlmoEarth change. Nothing here is confirmed damage.')
          : zone === 1
          ? (scenario?.geomorph ? `Glacier source to the border: ${scenario.geomorph.zone1.length_km} km of gorge, ${scenario.geomorph.zone1.drop_m.toFixed(0)} m of drop; the valley pinches to ${scenario.geomorph.zone1.narrowest.valley_width_km} km at km ${scenario.geomorph.zone1.narrowest.km_from_source}. The hillslope grid around the source is cloud-limited; Salê is its only judged off-river candidate.` : 'Glacier source to the border.')
          : (scenario?.geomorph ? `Border to Galchhi: ${scenario.geomorph.zone2.n_windows} judged river windows. Wider valley floors carry more change (ρ ${scenario.geomorph.zone2.correlations.valley_width_km?.spearman.toFixed(2)}); confined, high-relief reaches carry less (ρ ${scenario.geomorph.zone2.correlations.relief_m?.spearman.toFixed(2)}). Look first at Dalphedi and the Bidur reach.` : 'Border to Galchhi.')}</span>
      </div>
      <div ref={mapNode} className="map-stage" aria-label="Rasuwagadhi satellite and simulation map" />
      {scenario?.candidates && mapStatus === 'ready' && (
        <div className="map-legend" aria-label="Map legend">
          <span><i className="sw orange" />contract-correct sealed S1+S2 OLMo screening</span>
          <span><i className="sw amber" />S2-only optical discovery scan</span>
          <span><i className="sw purple" />off-river hillslope window</span>
          <span><i className="sw blue" />same kind of change as the top candidates (embedding search)</span>
          <span><i className="sw grey" />cloud/snow · not judged</span>
          <span><i className="sw teal" />A–G inspection points · click any box or point for before/after</span>
        </div>
      )}
      {candView && (
        <div className="cand-chip" role="status">
          <b>{candView.rank ? `#${candView.rank}` : candView.id}</b><span>{candView.place ?? ''}</span>
          <div className="cand-chip-modes">
            {(['pre', 'post', 'delta'] as const).map((m) => <button key={m} className={candView.mode === m ? 'is-active' : ''} onClick={() => showCandidate(candView.id, m, candView)}>{m === 'pre' ? 'PRE 08-12' : m === 'post' ? 'POST 08-27' : 'AI Δ'}</button>)}
          </div>
          <button className="cand-chip-close x-icon" onClick={clearCandidate} aria-label="Remove overlay"></button>
        </div>
      )}
      {mapStatus !== 'unsupported' && <canvas ref={canvasRef} className="flow-canvas" aria-hidden="true" />}
      <div className="terrain-wash" aria-hidden="true" />
      {mapStatus === 'unsupported' && (
        <div className="map-fallback">
          {backdropScene && <Image src={backdropScene.image} alt="" fill unoptimized className="map-fallback-img" />}
          <div className="map-fallback-note" role="status">
            <strong>Interactive map unavailable — WebGL2 is off in this browser.</strong>
            <span>Showing the selected scene as a static image. Timeline and panels still work.
            Enable hardware acceleration (chrome://settings/system) or try another browser for the full map.</span>
          </div>
        </div>
      )}

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><span /></div>
          <div><p className="eyebrow">AI2 / PLANETARY INTELLIGENCE PROTOTYPE</p><h1>OLMoEarth <span>Live Twin</span></h1></div>
        </div>
        <div className="map-mode-switch zone-switch" role="group" aria-label="Zone">
          <button className={zone === 0 ? 'is-active' : ''} onClick={() => setZone(0)} disabled={mapStatus !== 'ready'}>WHOLE CHAIN</button>
          <button className={zone === 1 ? 'is-active' : ''} onClick={() => setZone(1)} disabled={mapStatus !== 'ready'}>1 · SOURCE → IMPACT</button>
          <button className={zone === 2 ? 'is-active' : ''} onClick={() => setZone(2)} disabled={mapStatus !== 'ready'}>2 · IMPACT → DOWNSTREAM</button>
        </div>
        <button className={`sat-tiles-toggle ${satTiles ? 'is-active' : ''}`} onClick={() => setSatTiles((v) => !v)} title="Drape every scan window's 27 Aug Sentinel-2 thumbnail on the map">{satTiles ? 'SATELLITE TILES ON' : 'SATELLITE TILES'}</button>
        <div className="map-mode-switch dim-switch" role="group" aria-label="View dimension">
          <button className={viewDim === '2d' ? 'is-active' : ''} onClick={() => setDimension('2d')} disabled={mapStatus !== 'ready'}>2D</button>
          <button className={viewDim === '3d' ? 'is-active' : ''} onClick={() => setDimension('3d')} disabled={mapStatus !== 'ready'}>3D</button>
        </div>
        <a className="story-launch back-home" href="/">100 → 6</a>
        <button className="story-launch" onClick={() => setStoryOpen(true)}>METHODS &amp; STORY</button>
        <div className="event-status"><span className="live-dot" /><div><strong>RASUWA · NEPAL</strong><small>{scenario ? `${shortDate(scenario.event.occurred_at)} 2026 · INVESTIGATION` : 'LOADING'}</small></div></div>
      </header>

      {dataStatus === 'failed' && (
        <div className="data-error" role="alert">
          <strong>Snapshot data failed to load.</strong>
          <span>scenario.json / hydrography.geojson could not be fetched.</span>
          <button onClick={() => { setDataStatus('loading'); setReloadKey((k) => k + 1); }}>Retry</button>
        </div>
      )}

      <button
        className={`rail-toggle left ${leftOpen ? 'open' : ''}`}
        aria-expanded={leftOpen}
        aria-label={leftOpen ? 'Hide area panel' : 'Show area panel'}
        onClick={() => setLeftOpen((v) => !v)}
      >{leftOpen ? '⟨' : '⟩'}<em>AOI</em></button>

      <button
        className={`rail-toggle right ${rightOpen ? 'open' : ''}`}
        aria-expanded={rightOpen}
        aria-label={rightOpen ? 'Hide evidence panel' : 'Show evidence panel'}
        onClick={() => setRightOpen((v) => !v)}
      ><em>EVIDENCE</em>{rightOpen ? '⟩' : '⟨'}</button>

      {leftOpen && (
      <aside className="left-rail glass-panel">
        {zone === 1 && scenario?.geomorph && (() => { const pr = scenario.geomorph.zone1.profile; const W = 300, H = 110; const kmMax = pr[pr.length - 1].km; const eMin = Math.min(...pr.map((r) => r.elev)), eMax = Math.max(...pr.map((r) => r.elev)); const X = (k: number) => 8 + (k / kmMax) * (W - 16); const Y = (e: number) => 8 + (1 - (e - eMin) / (eMax - eMin)) * (H - 30); const nw = scenario.geomorph.zone1.narrowest; return (
          <div className="zone-card">
            <span className="ops-title">ZONE 1 · SOURCE → IMPACT · terrain profile (Copernicus DEM 30 m)</span>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Elevation profile from the source estimate to the border impact">
              <path d={pr.map((r, i) => `${i ? 'L' : 'M'}${X(r.km).toFixed(1)},${Y(r.elev).toFixed(1)}`).join(' ')} fill="none" stroke="var(--ink)" strokeWidth="1.4" />
              {pr.map((r) => <rect key={r.km} x={X(r.km) - 1} y={H - 18} width="2" height={Math.min(14, r.width_km * 5)} fill="var(--blue)" opacity="0.7" />)}
              <line x1={X(nw.km_from_source)} x2={X(nw.km_from_source)} y1="6" y2={H - 18} stroke="var(--orange)" strokeDasharray="2 2" />
              <text x="8" y={H - 4} fontSize="7" fontFamily="var(--font-geist-mono)" fill="var(--muted)">{eMax.toFixed(0)} m → {eMin.toFixed(0)} m · {kmMax} km · bars = valley width · dashed = narrowest {nw.valley_width_km} km</text>
            </svg>
            <p>{`A ${scenario.geomorph.zone1.length_km} km channel path with ${scenario.geomorph.zone1.drop_m.toFixed(0)} m of fall (mean ${scenario.geomorph.zone1.mean_slope_deg}°). The first 15 km is a steep gorge; at km ${nw.km_from_source} the valley narrows to ${nw.valley_width_km} km before the last drop to the border. A pinch like that concentrates flow — a qualitative reading; no runout physics was computed.`}</p>
          </div>); })()}
        {zone === 2 && scenario?.geomorph && (
          <div className="zone-card">
            <span className="ops-title">ZONE 2 · IMPACT → DOWNSTREAM · valley shape vs AI change ({scenario.geomorph.zone2.n_windows} windows)</span>
            <table className="ai-vs-table"><thead><tr><th>parameter</th><th>ρ</th><th>p</th></tr></thead><tbody>
              {(['valley_width_km', 'relief_m', 'channel_slope', 'tortuosity', 'km_from_A'] as const).map((k) => { const c = scenario.geomorph!.zone2.correlations[k]; return c ? <tr key={k} className={c.p < 0.05 ? 'win' : ''}><td>{k.replace(/_/g, ' ')}</td><td>{c.spearman >= 0 ? '+' : ''}{c.spearman.toFixed(2)}</td><td>{c.p.toFixed(3)}</td></tr> : null; })}
            </tbody></table>
            <p>Change concentrates where the valley floor is wide and relief is low — floodplain deposition rather than hillslope failure. Exploratory (n ≈ 40, one event); not a hazard model.</p>
          </div>
        )}
        <div className="panel-heading"><span>01</span><div><p>EVENT ANATOMY</p><strong>Source → downstream</strong></div></div>
        <div className="coordinate-list">
          {eventPoints.map((point) => (
            <button key={point.id} style={{ '--point-color': point.marker_color } as CSSProperties} className={selectedPoint === point.id ? 'coordinate active' : 'coordinate'} onClick={() => focusPoint(point.id)}>
              <span>{point.stage}</span>
              <div>
                <em className="point-role">{point.display_label}</em><strong>{point.name}</strong><small>{point.coordinates[1].toFixed(6)}, {point.coordinates[0].toFixed(6)}</small>
                {selectedPoint === point.id && point.story && <p className="point-story">{point.story}</p>}
              </div>
              <em>{point.id}</em>
            </button>
          ))}
          {points.length === 0 && <p className="rail-empty">{dataStatus === 'loading' ? 'Loading points…' : 'No points in snapshot.'}</p>}
        </div>
        {controlPoints.length > 0 && <div className="control-group"><span>OUTSIDE THE EVENT CHAIN</span>{controlPoints.map((point) => (
          <button key={point.id} style={{ '--point-color': point.marker_color } as CSSProperties} className={selectedPoint === point.id ? 'coordinate control active' : 'coordinate control'} onClick={() => focusPoint(point.id)}>
            <span>Ø</span><div><em className="point-role">{point.display_label}</em><strong>{point.name}</strong><small>~{point.distance_from_a_km.toFixed(0)} km away · placebo only</small>{selectedPoint === point.id && point.story && <p className="point-story">{point.story}</p>}</div><em>{point.id}</em>
          </button>
        ))}</div>}
        {selectedCard && (
          <div className="selected-place">
            <span>{selectedCard.id === 'A' ? 'REFERENCE IMPACT WINDOW' : `${selectedCard.distance_from_a_km.toFixed(2)} km FROM IMPACT A`}</span>
            <strong>{selectedCard.place}</strong>
          </div>
        )}
        <div className="layer-controls">
          <label htmlFor="overlay-opacity"><span>Satellite overlay</span><b>{Math.round(overlayOpacity * 100)}%</b></label>
          <input id="overlay-opacity" type="range" min="0" max="1" step="0.02" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} />
          <button className={showAnchors ? 'toggle active' : 'toggle'} onClick={() => setShowAnchors((value) => !value)} aria-pressed={showAnchors}><i /> OLMo input windows</button>
        </div>
        {/* River corridor 도식 — 강 모양과 앵커 순서를 지도 줌과 무관하게 항상 보여줌.
            선은 검증된 OSM centerline 그대로이고 개형/모식도가 아님. */}
        {corridorSketch && (
          <div className="corridor-sketch">
            <span className="ops-title">RIVER CORRIDOR · Bhote Koshi → Trishuli → Galchhi</span>
            <svg viewBox={`0 0 ${corridorSketch.W} ${corridorSketch.H}`} role="img"
                 aria-label="Bhote Koshi to Trishuli corridor from the source area through Rasuwagadhi to the current Galchhi trace endpoint">
              <path d={corridorSketch.path} fill="none" stroke="var(--blue)" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
              {corridorSketch.dots.map((d, i) => (
                <g key={d.name}>
                  <circle cx={d.x} cy={d.y} r="3.4"
                          fill={i === 0 ? 'var(--orange)' : 'var(--surface)'}
                          stroke={i === 0 ? 'var(--orange)' : 'var(--blue)'} strokeWidth="1.6" />
                  <text x={d.x + 7} y={d.y + 3.5} fontSize="8.5"
                        fontFamily="var(--font-geist-mono)" fill="var(--muted)">{d.name}</text>
                </g>
              ))}
              <text x={corridorSketch.W - 8} y={corridorSketch.H - 6} textAnchor="end"
                    fontSize="8" fontFamily="var(--font-geist-mono)" fill="var(--muted)">▼ downstream</text>
            </svg>
          </div>
        )}
        <div className="map-legend-inline">
          <span><i className="blue" />Mapped river centerline</span>
          <span><i className="red" />Preliminary reported reach corridor</span>
          <span><i className="white" />OLMo input 2.56 km</span>
          <span><i className="amber" />Unverified / pending</span>
        </div>
      </aside>
      )}

      {rightOpen && (
      <aside className="right-rail glass-panel">
        <div className="panel-heading"><span>6</span><div><p>REVIEW LEADS</p><strong>Where to look first</strong></div></div>
        {scenario?.candidates && (
            <div className="candidate-cards">
              
              <div className="candidate-scopes" role="group" aria-label="Filter AI candidate windows">
                {(['all', 'river', 'hillslope'] as const).map((scope) => <button key={scope} className={candidateScope === scope ? 'is-active' : ''} onClick={() => setCandidateScope(scope)}>{scope === 'all' ? '6 LEADS' : scope === 'river' ? 'RIVER' : 'RE-OBSERVE'}</button>)}
              </div>
              {candidateRows.slice(0, 6).map((c) => (
                <article key={c.id} className="cand-card">
                  <header><b>#{c.rank}</b><strong>{c.place || `${c.center_lonlat[1].toFixed(3)}, ${c.center_lonlat[0].toFixed(3)}`}</strong><small>{c.kind === 'hillslope' ? 'OFF-RIVER HILLSLOPE · ' : c.kind === 'lhende' ? 'LHENDE UPSTREAM · ' : ''}{c.distance_from_a_km != null ? `${c.distance_from_a_km.toFixed(1)} km from border` : ''}</small></header>
                  <div className="cand-strip" role="button" tabIndex={0}
                       onClick={() => openLightbox({ title: `#${c.rank} · ${c.place || c.id}`, sub: `${(c.candidate_token_frac * 100).toFixed(0)}% of judged tokens above placebo p99 · ${(c.valid_event_frac * 100).toFixed(0)}% observable`, before: `/data/candidates/${c.id}_pre.png`, after: `/data/candidates/${c.id}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra: [{ src: `/data/candidates/${c.id}_delta.png`, label: 'AI change tokens (orange) on 08-27' }] })}
                       onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLElement).click(); }}>
                    <figure><img src={`/data/candidates/${c.id}_pre.png`} alt="before" loading="lazy" /><figcaption>PRE 08-12</figcaption></figure>
                    <figure><img src={`/data/candidates/${c.id}_post.png`} alt="after" loading="lazy" /><figcaption>POST 08-27</figcaption></figure>
                    <figure><img src={`/data/candidates/${c.id}_delta.png`} alt="AI change tokens" loading="lazy" /><figcaption>AI Δ</figcaption></figure>
                  </div>
                  <footer><span>{(c.candidate_token_frac * 100).toFixed(0)}% candidate tokens · {(c.valid_event_frac * 100).toFixed(0)}% visible</span>
                    <button onClick={() => showCandidate(c.id, 'post', { rank: c.rank, place: c.place, center: c.center_lonlat })}>GO TO MAP</button></footer>
                </article>
              ))}
              {scenario.candidates.hillslope_top && scenario.candidates.hillslope_top.length > 0 && (
                <div className="retrieval-box hillslope-box">
                  <p className="cand-help"><b>OFF-RIVER · hillslope grid around the source</b> — 49 windows ±7.7 km around Langtang Lirung; most are cloud/snow and not judged. Ranked ones below (low observability — treat as leads only).</p>
                  <ol>
                    {scenario.candidates.hillslope_top.map((r) => (
                      <li key={r.id}><b>{r.rank}</b><span>{r.place || r.id}</span><em>{(r.candidate_token_frac * 100).toFixed(0)}% candidate tokens · {(r.valid_event_frac * 100).toFixed(0)}% visible</em>
                        <button onClick={() => showCandidate(r.id, 'post', { rank: r.rank, place: r.place, center: r.center_lonlat })}>GO</button></li>
                    ))}
                  </ol>
                </div>
              )}
              {scenario.candidates.retrieval && (
                <div className="retrieval-box">
                  <p className="cand-help"><b>SEARCH · same kind of change</b> — query = change vectors of #{scenario.candidates.retrieval.query_windows.join(', #')} candidate tokens; every window&apos;s tokens scored by cosine to that query, threshold = placebo p99.</p>
                  <ol>
                    {scenario.candidates.retrieval.top10.slice(0, 8).map((r) => (
                      <li key={r.id}><b>{r.rank}</b><span>{r.place || r.id}</span><em>{(r.similar_token_frac * 100).toFixed(0)}% similar{r.delta_rank ? ` · Δ rank #${r.delta_rank}` : ''}</em>
                        {r.center_lonlat && <button onClick={() => showCandidate(r.id, 'post', { rank: r.rank, place: r.place, center: r.center_lonlat! })}>GO</button>}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        {decision && (
          <div className={`decision-card compact ${decision.status}`} role="status">
            <span>LIVE NEPAL GATE · NOT THE WHOLE MODEL</span>
            <strong>{decision.action}</strong>
            <p>{decision.reason}</p>
            <small><b>NEXT GATE</b>{decision.next_gate}</small>
            <em>{decision.allowed_claim}</em>
          </div>
        )}
        <div className="compare-strip">
          <div className="scene-preview">
            {activeScene ? <Image src={activeScene.image} alt={`${activeScene.sensor} pre-event observation`} fill unoptimized sizes="150px" /> : <span className="loading-grid" />}
            <span>{activeScene && scenario && activeScene.acquired_at >= scenario.event.occurred_at ? 'POST' : 'PRE'} · {activeScene?.acquired_at.slice(0, 10) ?? (dataStatus === 'loading' ? 'LOADING' : '—')}</span>
          </div>
          <div className="compare-arrow" aria-hidden="true">→</div>
          {canonicalTop ? (
            <div className="scene-preview delta-preview zoomable" role="button" tabIndex={0} title="Click: large view"
                 onClick={() => openLightbox({ title: `O${canonicalTop.rank} · ${canonicalTop.name}`, sub: `${(100 * canonicalTop.frac_above_local_placebo_p99).toFixed(2)}% above local placebo p99 · screening only`, before: canonicalTop.pre_image, after: canonicalTop.post_image, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra: [{ src: canonicalTop.delta_image, label: 'OLMo Δ intensity' }] })}>
              <img src={canonicalTop.post_image} alt="" className="delta-base" />
              <img src={canonicalTop.delta_image} alt="Contract-correct OLMoEarth delta heatmap" className="delta-heat" />
              <span>O{canonicalTop.rank} · SEALED · SCREENING</span>
            </div>
          ) : (
            <div className="scene-preview pending-preview">
              <span className="waiting-cross" />
              <span>POST · {liveObservation?.catalog_status === 'published' ? 'CATALOG / CUBE WAIT' : nextScheduled ? `${shortSensor(nextScheduled.sensor)} ${nextScheduled.acquired_at.slice(5, 10)}` : 'PENDING'}</span>
            </div>
          )}
        </div>
        {scenario?.ai_vs_classical && (
          <div className="ai-vs-card">
            <p className="eyebrow">AI vs NO-AI · same data, same labels, same metric</p>
            <strong>OLMoEarth Δz beats classical band-change in {scenario.ai_vs_classical.ahead}/{scenario.ai_vs_classical.regions} past disasters · {scenario.ai_vs_classical.wins_at_005}/{scenario.ai_vs_classical.regions} above the pre-registered +{scenario.ai_vs_classical.pre_registered_margin} AUROC margin</strong>
            <table className="ai-vs-table"><thead><tr><th>region</th><th>no-AI</th><th>AI</th><th>Δ</th></tr></thead><tbody>
              {scenario.ai_vs_classical.rows.map((r) => <tr key={r.region} className={(r.gain ?? 0) >= 0.05 ? 'win' : ''}><td>{r.region}</td><td>{r.classical_best.toFixed(2)}</td><td>{r.ai?.toFixed(2) ?? '—'}</td><td>{r.gain != null ? (r.gain >= 0 ? '+' : '') + r.gain.toFixed(2) : '—'}</td></tr>)}
            </tbody></table>
            <small>AUROC = probability a landslide token outranks a non-landslide token. no-AI = best of normalized band difference and |ΔNDVI|+|ΔNBR|, identical patches and pre/post scene choice (label-blind). Labels used for scoring only.{scenario.ai_vs_classical.corridor ? ` Nepal corridor (no labels): top-10 reported-place hits AI ${scenario.ai_vs_classical.corridor.reported_hits.ai} vs no-AI ${scenario.ai_vs_classical.corridor.reported_hits.classical}.` : ''}</small>
          </div>
        )}
        {scenario?.placebo_extended && (
          <div className="ai-vs-card">
            <p className="eyebrow">ORDINARY RANGE · three placebo fortnights instead of one</p>
            <strong>Threshold {scenario.placebo_extended.threshold_pooled3.toFixed(3)} (single pair {scenario.placebo_extended.threshold_each.P1?.toFixed(3)}) · candidate shares roughly halve · ranking holds (Spearman {scenario.placebo_extended.spearman_vs_single_pair?.toFixed(2) ?? '—'})</strong>
            <table className="ai-vs-table"><thead><tr><th>window</th><th>3-pair</th><th>1-pair</th><th>local</th></tr></thead><tbody>
              {scenario.placebo_extended.top.map((r) => <tr key={r.id}><td>#{r.rank} {r.id}</td><td>{r.frac_pooled3 != null ? (100 * r.frac_pooled3).toFixed(1) + '%' : '—'}</td><td>{r.frac_p1 != null ? (100 * r.frac_p1).toFixed(1) + '%' : '—'}</td><td>{r.frac_local3 != null ? (100 * r.frac_local3).toFixed(1) + '%' : '—'}</td></tr>)}
            </tbody></table>
            <small>The June→July pair (monsoon onset) has the widest ordinary variability (p99 {scenario.placebo_extended.threshold_each.P2?.toFixed(3)}); it was missing from the single-pair threshold. Read the percentages as threshold-dependent and the order as the stable part.</small>
          </div>
        )}
        {scenario?.presto_control && (
          <div className="ai-vs-card">
            <p className="eyebrow">SECOND MODEL · Presto pixel time-series FM, same patches, dates and labels</p>
            <strong>OLMoEarth leads Presto by ≥ +0.03 AUROC in {scenario.presto_control.olmo_ahead_by_003}/{scenario.presto_control.regions} regions · Presto alone above 0.60 in {scenario.presto_control.presto_above_chance_060}/{scenario.presto_control.regions}</strong>
            <table className="ai-vs-table"><thead><tr><th>region</th><th>Presto S2</th><th>OLMo S2</th><th>Δ</th></tr></thead><tbody>
              {scenario.presto_control.rows.map((r) => <tr key={r.region} className={(r.gap_s2 ?? 0) >= 0.03 ? 'win' : ''}><td>{r.region}</td><td>{r.presto_s2.toFixed(2)}</td><td>{r.olmo_s2?.toFixed(2) ?? '—'}</td><td>{r.gap_s2 != null ? (r.gap_s2 >= 0 ? '+' : '') + r.gap_s2.toFixed(2) : '—'}</td></tr>)}
            </tbody></table>
            <small>Presto embeds each 10 m pixel's time series (128-d) with no spatial context; its 4×4 mean is compared on the same 40 m token grid. This separates "any foundation-model embedding delta works" from "OLMoEarth's spatial representation works". Presto is used outside its native 12-month contract (four dates per side, real months passed), so its number is a lower bound for Presto, not a verdict on Presto.</small>
          </div>
        )}
        {scenario?.radar_value && (
          <div className="ai-vs-card">
            <p className="eyebrow">RADAR THROUGH CLOUD · Sentinel-1 only, no optical</p>
            <strong>Radar-only OLMoEarth Δz localizes landslides (AUROC ≥ 0.70) in {scenario.radar_value.s1_only_usable}/{scenario.radar_value.regions} past disasters · beats classical radar log-ratio in {scenario.radar_value.s1_ai_beats_classical}/{scenario.radar_value.regions} · adding radar to clear optical helps in {scenario.radar_value.fusion_positive}/{scenario.radar_value.regions} but never by ≥ +0.03</strong>
            <table className="ai-vs-table"><thead><tr><th>region</th><th>S1 classical</th><th>S1 AI</th><th>S2 AI</th><th>S1+S2</th></tr></thead><tbody>
              {scenario.radar_value.rows.map((r) => <tr key={r.region} className={r.s1_only_ai >= 0.7 ? 'win' : ''}><td>{r.region}</td><td>{r.s1_classical.toFixed(2)}</td><td>{r.s1_only_ai.toFixed(2)}</td><td>{r.s2_only.toFixed(2)}</td><td>{r.s1s2.toFixed(2)}</td></tr>)}
            </tbody></table>
            <small>Same patches, dates and labels as the table above; S1 ascending in dB, four scenes per side. Radar is not a universal cloud-piercer under this 40 m contract — it works for some events (Hokkaido, Hiroshima) and sits at chance for others. Nepal's corridor radar screen (post dB fix) found nothing above variability; whether that is the event type or the contract is open.</small>
          </div>
        )}
        <div className="olmo-outcomes">
          <article className="ready"><span>OLMo CANONICAL CORRIDOR</span><strong>{scenario?.corridor_sealed ? '81 RASTERS SEALED' : 'PENDING'}</strong><small>placebo + baseline + live · 27 windows each · 768×64×64</small></article>
          <article className="win"><span>TRANSFER EVIDENCE</span><strong>{transfer ? `${transfer.wins_reuse_vs_raw_strong}/${transfer.regions} REGIONS WON` : 'LOADING'}</strong><small>{transfer ? `region-macro ${transfer.reuse_region_macro.toFixed(3)} vs ${transfer.raw_strong_region_macro.toFixed(3)} · +${transfer.absolute_gap.toFixed(3)}` : 'confirmatory summary'}</small></article>
          <article className={scenario?.corridor_sealed ? 'ready' : 'wait'}><span>NEPAL LIVE CHANGE</span><strong>{scenario?.corridor_sealed ? 'SCREENING COMPLETE · NO CALIBRATED DETECTION' : 'WAITING'}</strong><small>{scenario?.corridor_sealed ? `top local-p99 exceedance ${(100 * scenario.corridor_sealed.max_exceedance).toFixed(2)}% · one ordinary transition only` : `${livePeriodText} · baseline value remains usable`}</small></article>
        </div>
        {corridorContract && (
          <div className="corridor-progress" role="status">
            <header><span>SEALED CORRIDOR · 27 WINDOWS</span><b>{corridorContract.stage.replace(/_/g, ' ').toUpperCase()}</b></header>
            {([['PLACEBO', corridorContract.placebo_b], ['BASELINE', corridorContract.baseline], ['LIVE', corridorContract.s1_live]] as const).filter((entry) => entry[1]).map(([label, mode]) => {
              if (!mode) return null;
              const pct = Math.round(100 * mode.completed_layers / mode.total_layers);
              return <div className="corridor-progress-row" key={label}>
                <span>{label}</span><i><u style={{ width: `${pct}%` }} /></i>
                <strong>{mode.complete_windows}/{corridorContract.expected_windows}</strong><small>{pct}% · {mode.partial_windows.length} partial</small>
              </div>;
            })}
            <p>{corridorContract.next_step}</p><em>{corridorContract.claim_boundary}</em>
          </div>
        )}
        <div className="field-review-links">
          <span>FIELD / OFFICIAL REVIEW · OPENS SEPARATELY</span>
          <a href="https://www.usgs.gov/media/images/2026-nepal-debris-avalanche-and-flash-flood-map" target="_blank" rel="noreferrer">USGS extent map ↗</a>
          <a href="https://www.unosat.org/products/" target="_blank" rel="noreferrer">UNOSAT Rasuwa / Nuwakot products ↗</a>
          <a href="https://source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26" target="_blank" rel="noreferrer">Planet crisis imagery ↗</a>
        </div>
        {/* O/E/P/H 4-layer 계약 — 설계 문서의 관측/증거/물리/공식 분리를 UI에 명시함.
            P·H는 아직 산출물이 없으므로 회색 placeholder로 정직하게 표시함. */}
        <div className="layer-contract">
          <span>LAYER CONTRACT</span>
          <div className="layer-contract-row on"><b>O</b><span>Observation — S1 VV/VH · S2 12-band · masks</span><em>ACTIVE</em></div>
          <div className={`layer-contract-row ${scenario?.corridor_sealed ? 'on' : 'off'}`}><b>E</b><span>OLMo evidence — 768-d embedding · matched-location Δz screening</span><em>{scenario?.corridor_sealed ? 'ACTIVE' : 'PENDING'}</em></div>
          <div className="layer-contract-row off"><b>P</b><span>Physics — r.avaflow ensemble · D-Claw check</span><em>DESIGNED</em></div>
          <div className="layer-contract-row off"><b>H</b><span>Human/official — Charter · CEMS · USGS review</span><em>EXTERNAL</em></div>
        </div>
        <div className="flow-control">
          <button onClick={replayEventChain} aria-label="Replay the event-chain corridor animation">REPLAY CHAIN</button>
          <div>
            <label htmlFor="flow-speed"><span>{flowPlaying ? 'ROUTE PLAYING' : 'ROUTE PAUSED'}{visibleParticles != null ? ` · ${visibleParticles} ON SCREEN` : wasmStatus === 'ready' ? ' · 0 ON SCREEN' : ` · ${wasmStatus.toUpperCase()}`}</span><b>{(flowSpeed / 0.034).toFixed(1)}×</b></label>
            <input id="flow-speed" type="range" min="0.012" max="0.09" step="0.002" value={flowSpeed} onChange={(event) => setFlowSpeed(Number(event.target.value))} />
          </div>
        </div>
        <button className="flow-pause" onClick={() => setFlowPlaying((value) => !value)}>{flowPlaying ? 'PAUSE PARTICLES' : 'RESUME PARTICLES'}</button>
        <div className="truth-box"><span>CLAIM BOUNDARY</span><p>Particles follow the mapped OSM Bhote Koshi→Trishuli→Galchhi centerline. Blue is river geometry; the offset red dash is a preliminary reach-inspection corridor informed by USGS&apos;s ≈100 km report. Neither shows flood width, depth, arrival time, nor a confirmed terminal deposit.</p></div>
        <ReviewNotes candidateIds={(scenario?.review?.leads ?? []).map((l) => l.id)} />
      </aside>
      )}

      <section className="timeline glass-panel" aria-label="Satellite acquisition timeline" onKeyDown={onTimelineKey}>
        <div className="timeline-title">
          <span>03</span>
          <div>
            <p>SCENE TIMELINE · ←/→</p>
            <strong>
              {activeScene
                ? `${shortDate(activeScene.acquired_at)} · ${shortSensor(activeScene.sensor)} · ON MAP${shortSensor(activeScene.sensor) === 'S1' ? ' · RADAR IS DARK BY NATURE' : ''}`
                : dataStatus === 'loading' ? 'LOADING SNAPSHOT' : 'NO SCENE SELECTED'}
            </strong>
          </div>
        </div>
        <div className="scene-track">
          {timeline.map((scene) => scene.selectable ? (
            <button
              key={scene.id}
              className={scene.id === activeSceneId ? 'scene active' : 'scene'}
              onClick={() => { userSelectedSceneRef.current = true; setActiveSceneId(scene.id); }}
              aria-pressed={scene.id === activeSceneId}
            >
              <span className={`scene-node ${scene.state.toLowerCase()}`} /><strong>{scene.date}</strong><small>{scene.sensor}</small><em>{scene.state}</em>
            </button>
          ) : (
            <div
              key={scene.id}
              className={`scene static ${scene.kind}`}
              title={scene.kind === 'event' ? scenario?.event.name : 'Not yet acquirable — cannot be shown on the map'}
            >
              <span className={`scene-node ${scene.state.toLowerCase()}`} /><strong>{scene.date}</strong><small>{scene.sensor}</small><em>{scene.state}</em>
            </div>
          ))}
          {timeline.length === 0 && <p className="rail-empty">{dataStatus === 'failed' ? 'Timeline unavailable.' : 'Loading acquisitions…'}</p>}
        </div>
      </section>

      {storyOpen && (() => {
        const ko = storyLang === 'ko';
        return (
        <div className="story-overlay" ref={storyRef} role="dialog" aria-label="How to read this service">
          <div className="story-progress" style={{ width: `${storyProgress * 100}%` }} />
          <div className="story-lang" role="group" aria-label="Story language">
            <button className={!ko ? 'is-active' : ''} onClick={() => setStoryLang('en')}>EN</button>
            <button className={ko ? 'is-active' : ''} onClick={() => setStoryLang('ko')}>한국어</button>
          </div>
          <button className="story-close x-icon" onClick={() => setStoryOpen(false)} aria-label="Close story"></button>

          <section className="story-hero story-step">
            <p className="story-dateline">RASUWA, NEPAL · 26 AUG 2026 · {ko ? '갱신' : 'UPDATED'} {scenario ? kstStamp(scenario.generated_at) : '—'} KST</p>
            <h1>{ko ? '산이 무너진 지 사흘, 위성은 무엇을 봤고 무엇을 보지 못했나' : 'Three days of satellites over a valley that stopped looking like itself'}</h1>
            <p className="story-lede">{ko
              ? '8월 26일 아침, 네팔 라수와 군 랑탕 리룽 북사면에서 바위와 얼음이 함께 무너졌다. 토사와 물은 렌데 계곡을 타고 국경 마을 라수와가디를 덮친 뒤 트리슐리 강을 따라 70km 넘게 내려갔다. 이 페이지는 그 며칠 동안 유럽우주국의 무료 위성 두 대(광학 센티넬-2, 레이더 센티넬-1)가 이 계곡을 어떻게 찍었는지, 학습을 멈춘 인공지능 모델 하나가 그 관측으로 무엇을 계산했는지, 그리고 무엇을 계산하지 못했는지를 기록한다. 원인은 아직 조사 중이다(rock–ice avalanche 추정).'
              : 'On the morning of 26 August, rock and ice gave way on the north face of Langtang Lirung in Rasuwa district. Debris and water ran down the Lhende valley into the border town of Rasuwagadhi, then more than 70 km down the Trishuli. This page records what two free ESA satellites — optical Sentinel-2 and radar Sentinel-1 — captured over those days, what one frozen AI model computed from that, and what it could not. The cause is still under investigation (suspected rock–ice avalanche).'}</p>
            <div className="hero-answer"><span>{ko ? '현재 판정' : 'WHERE THE EVIDENCE STANDS'}</span><strong>{scenario?.decision ? `${scenario.decision.action}${scenario.decision.reason ? ' — ' + scenario.decision.reason : ''}` : '—'}</strong></div>
          </section>

          <section className="story-section story-step story-wide">
            <p className="story-kicker">01 · {ko ? '사건 구조' : 'THE CHAIN OF PLACES'}</p>
            <h2>{ko ? '무너진 곳과 덮친 곳은 20km 떨어져 있다' : 'The collapse and the impact are twenty kilometres apart'}</h2>
            <div className="event-chain-cards">{eventPoints.map((point) => <article key={point.id} style={{ '--point-color': point.marker_color } as CSSProperties}><b>{point.stage}</b><span>{point.display_label}</span><strong>{point.name}</strong><small>{point.id} · {point.distance_from_a_km.toFixed(1)} km from impact A</small><p>{ko ? point.story_ko : point.story}</p></article>)}</div>
            <div className="control-explainer"><b>C · {ko ? '대조 창' : 'CONTROL WINDOW'}</b><p>{ko ? controlPoints[0]?.story_ko : controlPoints[0]?.story}</p></div>
            <p className="story-caption">{ko ? 'E는 발원 추정점, D는 언색호 수색구역, A·B는 국경의 충격 창, F는 비두르 관측 창, G는 지도 추적이 끝나는 갈치(Galchhi)다. G는 재해의 종점이 아니라 이 지도가 강을 따라간 끝이다. C는 사건 밖의 대조 창으로, 같은 방법을 사건이 없는 곳에 적용하면 어떤 값이 나오는지 보여준다. 이 점들은 사람이 골랐다. 인공지능이 고른 후보는 지도의 사각형이다.' : 'E is the source estimate; D the search zone for the reported barrier lake; A and B the impact windows at the border; F the Bidur observation; G is Galchhi, where the map trace ends — not where the disaster ended. C is a control window outside the event: the same method applied where nothing happened. People chose these points. The squares on the map are what the AI proposed.'}</p>
          </section>

          <section className="story-section story-step story-wide">
            <p className="story-kicker">02 · {ko ? '위성이 본 것' : 'WHAT THE SATELLITES SAW'}</p>
            <h2>{ko ? '국경의 회색 띠는 47km 아래에서도 이어졌다' : 'The grey band at the border continues 47 km downstream'}</h2>
            <div className="evidence-pairs">
              <article><header><span>A · IMPACT</span><strong>Rasuwagadhi</strong></header>{sceneById('s2-2026-08-12') && sceneById('s2-2026-08-27') && <div className="story-swipe compact" style={{ ['--swipe' as string]: `${swipe}%` }}><img src={sceneById('s2-2026-08-27')!.image} alt="Rasuwagadhi Sentinel-2 post-event" /><div className="swipe-clip"><img src={sceneById('s2-2026-08-12')!.image} alt="Rasuwagadhi Sentinel-2 pre-event" /></div><div className="swipe-bar" /><span className="swipe-label pre">08-12</span><span className="swipe-label post">08-27</span><input type="range" min={0} max={100} value={swipe} aria-label="Compare Rasuwagadhi before and after" onChange={(e) => setSwipe(Number(e.target.value))} /></div>}<p>{ko ? '센티넬-2, 8월 12일과 27일. 손잡이를 끌면 사건 전후가 바뀐다.' : 'Sentinel-2, 12 and 27 August. Drag the handle.'}</p></article>
              <article><header><span>F · DOWNSTREAM</span><strong>Bidur / Trishuli</strong></header><div className="fixed-pair zoomable" role="button" tabIndex={0} onClick={() => bidurPre && bidurPost && openLightbox({ title: 'F · Bidur / Trishuli', sub: 'Sentinel-2 · 2.56 km · tile 45RUL', before: bidurPre.image, after: bidurPost.image, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27' })}>{bidurPre && <figure><img src={bidurPre.image} alt="Bidur Sentinel-2 before event" /><figcaption>PRE · 08-12</figcaption></figure>}{bidurPost && <figure><img src={bidurPost.image} alt="Bidur Sentinel-2 after event" /><figcaption>POST · 08-27</figcaption></figure>}<span className="zoom-hint">⤢ enlarge</span></div><p>{ko ? '국경에서 47km 아래. 원래 카탈로그에는 없던 옆 타일(45RUL)에서 찾은 창이다.' : '47 km below the border, recovered from the adjacent tile 45RUL that the original catalog missed.'}</p></article>
            </div>
            <div className="distance-matrix">
              {['source', 'rasuwagadhi', 'timure', 'syabrubesi', 'dhunche', 'bidur'].map((name, i) => <div key={name}><b>{i + 1}</b><span>{name === 'source' ? 'SOURCE · Langtang Lirung' : name.toUpperCase()}</span><figure><img src={`/data/story/anchors/${name}_pre.png`} alt={`${name} before`} /></figure><i>→</i><figure><img src={`/data/story/anchors/${name}_post.png`} alt={`${name} after`} /></figure></div>)}
            </div>
            <figure className="story-figure zoomable" role="button" tabIndex={0} onClick={() => openLightbox({ title: 'Rasuwagadhi · PlanetScope 3.8 m · 28 Aug', sub: '© Planet Labs PBC · CC-BY-NC-4.0 · Planet Disaster Data on source.coop (planet/disasterdata/nepal-flash-flood-2026-08-26) · reference only, not AI input', before: '/data/story/anchors/rasuwagadhi_post.png', after: '/data/story/planet/ps_rasuwagadhi_0828.png', beforeLabel: 'SENTINEL-2 10 m · 08-27', afterLabel: 'PLANETSCOPE 3.8 m · 08-28' })}>
              <img src="/data/story/planet/ps_rasuwagadhi_0828.png" alt="PlanetScope 3.8 m view of Rasuwagadhi on 28 August 2026" /><span className="zoom-hint">⤢ compare with Sentinel-2</span>
              <figcaption className="story-caption">{ko
                ? '같은 합류부를 상업위성 플래닛스코프가 8월 28일 아침 3.8m 해상도로 찍은 것. 센티넬(10m)보다 2.6배 세밀해 토사 판과 그 안의 물길, 끊긴 도로가 그대로 보인다. 플래닛은 이번 재난에 한해 비상업 조건(CC-BY-NC-4.0)으로 공개했다. 참고용이며 인공지능 입력에는 쓰지 않았다 — 밴드와 해상도가 모델의 입력 규격과 다르기 때문이다. © Planet Labs PBC · source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26 · 20260828_045744_48_2544.'
                : 'The same confluence from a commercial PlanetScope satellite on the morning of 28 August at 3.8 m — 2.6× finer than Sentinel-2. The debris sheet, the channel threading through it and the severed road are visible directly. Planet released this imagery for the disaster under a non-commercial licence (CC-BY-NC-4.0). Reference only; it was not fed to the AI, whose input contract (bands, resolution) differs. © Planet Labs PBC · source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26 · item 20260828_045744_48_2544.'}</figcaption>
            </figure>
            <div className="story-spectra zoomable" role="button" tabIndex={0} onClick={() => openLightbox({ title: 'Rasuwagadhi · 27 Aug · true colour vs SWIR', sub: 'SWIR B12·B8A·B04: vegetation green, wet sediment pink-brown, water deep blue', before: '/data/story/spec_true_post0827.png', after: '/data/story/spec_swir_post0827.png', beforeLabel: 'TRUE COLOUR', afterLabel: 'SWIR', extra: [{ src: '/data/story/spec_ndwi_post0827.png', label: 'NDWI water index' }, { src: '/data/story/spec_swir_pre0812.png', label: 'SWIR · pre-event 08-12' }] })}>
              <figure><img src="/data/story/spec_true_post0827.png" alt="True colour, Rasuwagadhi, 27 August" /><figcaption>{ko ? '트루컬러 · 08-27' : 'TRUE COLOUR · 08-27'}</figcaption></figure>
              <figure><img src="/data/story/spec_swir_post0827.png" alt="SWIR composite B12/B8A/B04, 27 August" /><figcaption>{ko ? 'SWIR 합성 · 08-27' : 'SWIR B12·B8A·B04 · 08-27'}</figcaption></figure>
              <figure><img src="/data/story/spec_ndwi_post0827.png" alt="NDWI water index, 27 August" /><figcaption>{ko ? 'NDWI 물 지수 · 08-27' : 'NDWI WATER INDEX · 08-27'}</figcaption></figure>
              <figure><img src="/data/story/spec_swir_pre0812.png" alt="SWIR composite before the event, 12 August" /><figcaption>{ko ? 'SWIR 합성 · 사건 전 08-12' : 'SWIR · PRE-EVENT 08-12'}</figcaption></figure>
            </div>
            <p>{ko
              ? '같은 창을 세 가지 눈으로 다시 그렸다. 트루컬러는 사람 눈이고, 단파적외(SWIR) 합성은 식생을 초록, 젖은 퇴적물을 분홍빛 갈색, 물을 짙은 청색으로 갈라 보여준다. 토사 판 안에 아직 물이 흐르는 자리는 SWIR과 NDWI에서만 분명하다. 인공지능 모델이 12개 밴드를 전부 입력받는 이유가 이것이다. 사람 눈에 같아 보이는 픽셀이 스펙트럼에서는 다르다.'
              : 'The same window drawn three ways. True colour is what the eye sees; the shortwave-infrared composite separates vegetation (green), wet sediment (pink-brown) and water (deep blue). Where water still runs inside the debris sheet is only clear in SWIR and NDWI. This is why the model ingests all twelve bands: pixels that look alike to the eye differ in spectrum.'}</p>
            <p className="story-caption">{ko ? '모든 비교는 센티넬-2, 8월 12일→27일. 넓어진 회색 띠는 토사가 지나간 자리로 보이지만 이 페이지는 그것을 “피해”라고 부르지 않는다. 사람이 확인하기 전까지는 “변화 후보”다. 발원지와 둔체는 구름과 눈에 가려 읽기 어렵다.' : 'Every pair is Sentinel-2, 12→27 August. The widened grey band looks like the path of the debris, but this page does not call it damage. Until someone checks on the ground it is a candidate change. The source and Dhunche stay hidden under cloud and snow.'}</p>
          </section>

          <section className="story-section story-step story-wide">
            <p className="story-kicker">03 · {ko ? '인공지능이 계산한 것' : 'WHAT THE AI COMPUTED'}</p>
            <h2>{ko ? '모델은 “어디가 평소와 다른가”만 답한다' : 'The model answers one question: where is this place unlike its own past'}</h2>
            <p>{ko
              ? '쓰인 모델은 앨런인공지능연구소(Ai2)가 공개한 올모어스(OlmoEarth) v1 Base다. 위성 시계열을 읽어 40m 격자마다 768개의 숫자를 내놓는다. 이 프로젝트는 그 모델을 다시 학습시키지 않았다. 대신 사건 전 관측으로 만든 숫자와 사건 후 관측으로 만든 숫자의 거리를 재고, 같은 자리의 평소 2주 간격 거리(플라시보)와 비교했다. 평소보다 크게 벌어진 격자만 “후보”로 남긴다.'
              : 'The model is OlmoEarth v1 Base, released by the Allen Institute for AI. It reads a satellite time series and returns 768 numbers for every 40 m cell. Nothing here retrains it. Instead we measure the distance between the numbers computed before the event and after it, and compare that with the same cell\'s ordinary fortnight-to-fortnight distance (a placebo). Only cells that moved more than their ordinary range are kept as candidates.'}</p>
            {scenario?.ai_vs_classical && (
              <div className="story-table-wrap">
                <p className="story-caption">{ko ? '같은 자료·같은 라벨·같은 지표에서 인공지능과 고전 변화탐지를 비교했다(Sen12-Landslides, 9개 과거 재해). AUROC는 산사태 격자가 비산사태 격자보다 높은 점수를 받을 확률이다.' : 'AI against classical change detection on the same data, labels and metric (Sen12-Landslides, nine past disasters). AUROC is the probability that a landslide cell outranks a non-landslide cell.'}</p>
                <table className="story-table"><thead><tr><th>{ko ? '지역' : 'region'}</th><th>{ko ? '고전' : 'classical'}</th><th>OlmoEarth</th><th>Δ</th></tr></thead><tbody>
                  {scenario.ai_vs_classical.rows.map((r) => <tr key={r.region}><td>{r.region}</td><td>{r.classical_best.toFixed(2)}</td><td>{r.ai?.toFixed(2) ?? '—'}</td><td>{r.gain != null ? (r.gain >= 0 ? '+' : '') + r.gain.toFixed(2) : '—'}</td></tr>)}
                </tbody></table>
                <p className="story-caption">{ko ? `${scenario.ai_vs_classical.ahead}/${scenario.ai_vs_classical.regions} 지역에서 앞섰고 ${scenario.ai_vs_classical.wins_at_005}/${scenario.ai_vs_classical.regions}은 사전에 정한 +0.05 이상이다.` : `Ahead in ${scenario.ai_vs_classical.ahead} of ${scenario.ai_vs_classical.regions}; ${scenario.ai_vs_classical.wins_at_005} of ${scenario.ai_vs_classical.regions} clear the pre-registered +0.05 margin.`}</p>
              </div>
            )}
            {scenario?.presto_control && (
              <div className="story-table-wrap">
                <h3>{ko ? '다른 모델이어도 되는가' : 'Would any model do'}</h3>
                <p>{ko ? `같은 패치·같은 날짜·같은 라벨에 두 번째 공개 모델(Presto, 픽셀 시계열 모델)을 넣어 봤다. 올모어스가 +0.03 이상 앞선 지역은 ${scenario.presto_control.olmo_ahead_by_003}/${scenario.presto_control.regions}, Presto 혼자 0.60을 넘긴 지역은 ${scenario.presto_control.presto_above_chance_060}/${scenario.presto_control.regions}다. Presto는 본래 12개월 시계열용이라 네 시점만 주는 이 계약은 Presto에게 불리하다. 그래서 이 표는 “Presto가 못한다”가 아니라 “픽셀만 보는 표현으로는 같은 조건에서 이 차이가 안 나온다”는 뜻이다.` : `A second public model (Presto, a pixel time-series model) was given the same patches, dates and labels. OlmoEarth leads by ≥ +0.03 in ${scenario.presto_control.olmo_ahead_by_003} of ${scenario.presto_control.regions} regions; Presto alone clears 0.60 in ${scenario.presto_control.presto_above_chance_060} of ${scenario.presto_control.regions}. Presto is built for twelve-month sequences, so four dates per side is a contract that works against it. Read the table as "a pixel-only representation does not reproduce this separation under the same conditions", not as a verdict on Presto.`}</p>
                <table className="story-table"><thead><tr><th>{ko ? '지역' : 'region'}</th><th>Presto</th><th>OlmoEarth</th><th>Δ</th></tr></thead><tbody>
                  {scenario.presto_control.rows.map((r) => <tr key={r.region}><td>{r.region}</td><td>{r.presto_s2.toFixed(2)}</td><td>{r.olmo_s2?.toFixed(2) ?? '—'}</td><td>{r.gap_s2 != null ? (r.gap_s2 >= 0 ? '+' : '') + r.gap_s2.toFixed(2) : '—'}</td></tr>)}
                </tbody></table>
              </div>
            )}
            {scenario?.radar_value && (
              <div className="story-table-wrap">
                <h3>{ko ? '레이더만으로도 신호가 있는가' : 'Is there a signal in radar alone'}</h3>
                <p>{ko
                  ? '몬순의 히말라야에서 광학 위성은 확률 싸움이다. 8월 27일 대조 후보 네 곳의 구름 없는 비율은 84%, 35%, 15%, 0%였다. 그래서 레이더(센티넬-1)만으로 같은 일이 되는지 과거 재해 7곳에서 쟀다. 결과는 반반이다. 홋카이도와 히로시마에서는 레이더만으로도 산사태 자리가 잡혔고(AUROC 0.77, 0.73) 모델 없는 레이더 변화량보다 나았다. 나머지 다섯 곳은 우연 수준이었다. 광학이 맑을 때 레이더를 보태면 7곳 모두 조금 오르지만 어느 곳도 +0.03을 넘지 못했다. 한 가지 경계: 이 실험의 시점은 광학이 맑은 날을 기준으로 골랐다. 그러니 “레이더가 구름을 뚫었다”는 확증이 아니라 “광학 없이도 표현에 신호가 있다”는 가능성 확인이다. 구름 낀 날만 따로 모아 다시 재는 실험(M79)이 다음이다.'
                  : 'Optical satellites in a monsoon Himalaya are a matter of odds: on 27 August the four control candidates were 84%, 35%, 15% and 0% cloud-free. So we measured whether radar (Sentinel-1) alone could do the same job across seven past disasters. The answer is split. In Hokkaido and Hiroshima radar alone located the landslides (AUROC 0.77 and 0.73) and beat the model-free radar change ratio. The other five sat at chance. Adding radar to clear optical helped in all seven, but never by more than +0.03. One boundary: the dates in this test were chosen for clear optical scenes, so this is not proof that radar sees through cloud — only that the representation carries a signal without optical pixels. The next experiment (M79) re-runs it on cloudy dates only.'}</p>
                <table className="story-table"><thead><tr><th>{ko ? '지역' : 'region'}</th><th>{ko ? '레이더 고전' : 'radar classical'}</th><th>{ko ? '레이더 AI' : 'radar AI'}</th><th>{ko ? '광학 AI' : 'optical AI'}</th><th>{ko ? '둘 다' : 'both'}</th></tr></thead><tbody>
                  {scenario.radar_value.rows.map((r) => <tr key={r.region}><td>{r.region}</td><td>{r.s1_classical.toFixed(2)}</td><td>{r.s1_only_ai.toFixed(2)}</td><td>{r.s2_only.toFixed(2)}</td><td>{r.s1s2.toFixed(2)}</td></tr>)}
                </tbody></table>
              </div>
            )}
            <h3>{ko ? '네팔에서는' : 'In Nepal'}</h3>
            {scenario?.placebo_extended && <p>{ko ? `“평소 범위”를 2주 한 쌍이 아니라 세 쌍(5월 중순→7월 초까지)으로 넓혀 다시 재봤다. 몬순이 시작되는 6→7월이 평소 변동이 가장 커서 문턱은 ${scenario.placebo_extended.threshold_each.P1?.toFixed(3)}에서 ${scenario.placebo_extended.threshold_pooled3.toFixed(3)}으로 올라갔고, 후보 격자 비율은 대략 절반이 됐다. 그러나 순서는 그대로다(순위 상관 ${scenario.placebo_extended.spearman_vs_single_pair?.toFixed(2)}). 이 페이지가 퍼센트보다 순위를 앞세우는 이유다.` : `We then widened the "ordinary range" from one fortnight pair to three (mid-May to early July). The June→July pair, when the monsoon arrives, is the noisiest, so the threshold rose from ${scenario.placebo_extended.threshold_each.P1?.toFixed(3)} to ${scenario.placebo_extended.threshold_pooled3.toFixed(3)} and the flagged share roughly halved. The order did not move (rank correlation ${scenario.placebo_extended.spearman_vs_single_pair?.toFixed(2)}). That is why this page leads with order, not percentages.`}</p>}
            <p>{ko
              ? '강을 따라 2.56km 창 100개를 자동으로 잘라 같은 계산을 했다. 구름으로 판정 불가한 창을 빼면 47개가 남았고, 상위는 달페디(Dalphedi, 국경에서 6km)와 비두르 부근이다. 강 밖 산사면으로 격자를 넓혀 찾은 살레(Salê) 창도 후보에 올랐다. 사건이 없는 타디 콜라(Tadi Khola) 대조 창에서는 사건 전후 거리 0.129, 평소 거리 0.125로 사실상 같았고 후보 격자는 3.6%였다. 회랑 1위 창의 25%와 견주면 “아무 일 없음”이 어떻게 보이는지 알 수 있다.'
              : 'Along the river we cut 100 windows of 2.56 km automatically and ran the same computation. Removing windows that cloud made unjudgeable leaves 47; the top are Dalphedi (6 km from the border) and the Bidur reach. Widening the grid onto hillslopes away from the river added Salê. In the Tadi Khola control window, where nothing happened, the before/after distance was 0.129 against an ordinary 0.125 — practically equal — and 3.6% of cells were flagged, against 25% in the top corridor window. That is what "no change" looks like under the same recipe.'}</p>
            {scenario?.downstream_profile && scenario.downstream_profile.length > 0 && (
              <div className="story-table-wrap">
                <h3>{ko ? '추적 끝(G, 갈치) 쪽으로 갈수록' : 'Toward the end of the trace (G, Galchhi)'}</h3>
                <p>{ko ? '국경에서 멀어질수록 표시된 격자 비율은 줄어든다. 갈치 창은 6.7%, 그 위 두 창은 3–4%로 사건 없는 대조 창(3.6%)에 가깝다. 다만 이 구간의 8월 27일 영상은 옅은 구름에 덮여 있어 “변화가 적다”는 약한 읽기이지, 아무 일도 없었다는 증거는 아니다.' : 'The farther from the border, the smaller the flagged share. The Galchhi window is at 6.7%; two windows upstream sit at 3–4%, close to the no-event control (3.6%). But the 27 August image over this stretch is hazy, so "little change" is a weak reading, not proof that nothing happened.'}</p>
                <table className="story-table"><thead><tr><th>{ko ? '창' : 'window'}</th><th>{ko ? 'G까지 km' : 'km to G'}</th><th>{ko ? '표시 격자' : 'flagged cells'}</th><th>{ko ? '관측 가능' : 'observable'}</th><th>{ko ? '순위/100' : 'rank of 100'}</th></tr></thead><tbody>
                  {scenario.downstream_profile.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.km_to_G.toFixed(1)}</td><td>{r.candidate_token_frac != null ? (100 * r.candidate_token_frac).toFixed(1) + '%' : '—'}</td><td>{r.observable != null ? Math.round(100 * r.observable) + '%' : '—'}</td><td>{r.rank ?? '—'}</td></tr>)}
                </tbody></table>
              </div>
            )}
            <p className="story-caption">{ko ? '이 화면 자체는 인공지능이 아니다. 지도와 타임라인은 사람이 만든 화면이고, 인공지능이 계산한 것은 서버에 봉인된 파일들이다. 화면은 그 파일을 읽어 보여줄 뿐이다.' : 'The interface is not the AI. The map and timeline are hand-built; what the model computed lives in sealed files on a server. The page reads those files and shows them.'}</p>
          </section>

          {scenario?.geomorph && (
          <section className="story-section story-step story-wide">
            <p className="story-kicker">04 · {ko ? '지형' : 'THE TERRAIN'}</p>
            <h2>{ko ? '두 개의 구역: 협곡이 밀어내고, 넓은 바닥이 받는다' : 'Two zones: the gorge pushes, the wide floor receives'}</h2>
            <p>{ko
              ? `발원지에서 국경까지(1구역)는 ${scenario.geomorph.zone1.length_km} km의 하도이고 낙차는 ${scenario.geomorph.zone1.drop_m.toFixed(0)} m다. 처음 15 km는 가파른 협곡이고, ${scenario.geomorph.zone1.narrowest.km_from_source} km 지점에서 계곡 폭이 ${scenario.geomorph.zone1.narrowest.valley_width_km} km까지 좁아진 뒤 국경으로 떨어진다. 좁아진 곳은 흐름을 모은다 — 정성적 읽기이고, 유속을 계산하지는 않았다.`
              : `From the source to the border (Zone 1) the channel runs ${scenario.geomorph.zone1.length_km} km and falls ${scenario.geomorph.zone1.drop_m.toFixed(0)} m. The first 15 km is a steep gorge; at km ${scenario.geomorph.zone1.narrowest.km_from_source} the valley pinches to ${scenario.geomorph.zone1.narrowest.valley_width_km} km before the final drop to the border. A pinch concentrates flow — a qualitative reading; no runout physics was computed.`}</p>
            <p>{ko
              ? `국경 아래(2구역)에서는 강 창 ${scenario.geomorph.zone2.n_windows}개의 계곡 형태를 DEM으로 재고 AI 후보 비율과 견줬다. 계곡 바닥이 넓을수록 변화가 많고(순위 상관 ${scenario.geomorph.zone2.correlations.valley_width_km?.spearman.toFixed(2)}, p ${scenario.geomorph.zone2.correlations.valley_width_km?.p.toFixed(2)}), 기복이 큰 협착 구간은 적다(${scenario.geomorph.zone2.correlations.relief_m?.spearman.toFixed(2)}). 하도 경사·굴곡도는 관계가 없었다. 이 사건의 변화는 사면이 무너진 것이 아니라 넓은 바닥에 토사가 깔린 것이다 — 위성사진에서 사면 흉터가 안 보이는 이유와 같다. 사건 하나, 창 40개의 탐색 결과이며 위험 예측 모형이 아니다.`
              : `Below the border (Zone 2) we measured the valley shape of ${scenario.geomorph.zone2.n_windows} river windows from the DEM and compared it with the AI candidate share. Wider valley floors carry more change (rank correlation ${scenario.geomorph.zone2.correlations.valley_width_km?.spearman.toFixed(2)}, p ${scenario.geomorph.zone2.correlations.valley_width_km?.p.toFixed(2)}); confined, high-relief reaches carry less (${scenario.geomorph.zone2.correlations.relief_m?.spearman.toFixed(2)}). Channel slope and sinuosity did not matter. The change in this event is sediment laid across wide floors, not slopes giving way — the same reason the imagery shows no fresh scars. One event, forty windows: exploratory, not a hazard model.`}</p>
          </section>
          )}
          <section className="story-section story-step story-wide">
            <p className="story-kicker">05 · {ko ? '틀렸던 것' : 'WHAT WE GOT WRONG'}</p>
            <h2>{ko ? '레이더 단위 하나가 결과 둘을 뒤집었다' : 'One unit error in the radar input overturned two results'}</h2>
            <p>{ko
              ? '처음 발표한 회랑 결과에서는 라수와가디의 40m 격자 9.8%가 평소 범위를 넘었다고 썼다. 뒤늦게 확인하니 레이더 입력이 선형 강도였고, 모델의 정규화는 데시벨(dB)을 기대한다. 잘못된 단위로 들어간 레이더 채널이 거리를 부풀렸다. 데시벨로 바꿔 다시 계산하자 5개 앵커와 회랑 27창 모두에서 사건 전후 거리가 평소 범위 안으로 들어왔다. 레이더만 따로 봐도 마찬가지였다(회랑 사건 평균 0.03, 평소 0.06). 그래서 그 결과와 그에 딸린 후보(렌데, 레이더 24번 창)는 철회했다.'
              : 'The first corridor result said 9.8% of the 40 m cells at Rasuwagadhi exceeded their ordinary range. It turned out the radar input was linear intensity, while the model\'s normalisation expects decibels. A radar channel in the wrong unit inflated every distance. Recomputed in dB, the before/after distance fell back inside the ordinary range at all five anchors and all 27 corridor windows — and the radar-only view agreed (corridor event mean 0.03 against an ordinary 0.06). That result and the candidates built on it (Lhende, radar window 24) were withdrawn.'}</p>
            <p>{ko
              ? '남은 근거는 광학 쪽이다. 광학만으로 잰 100창 후보와, 과거 재해에서 인공지능이 고전 기법을 앞선 기록, 그리고 대조 창의 “변화 없음”. 이 페이지가 “탐지”가 아니라 “검토 후보”라는 말을 고집하는 이유가 여기 있다.'
              : 'What remains is optical: the 100-window candidate list, the record of the model beating classical methods on past disasters, and the control window\'s "no change". This is why the page insists on "review candidate" rather than "detection".'}</p>
          </section>

          <section className="story-section story-step story-wide">
            <p className="story-kicker">07 · {ko ? '연구자에게' : 'FOR RESEARCHERS'}</p>
            <h2>{ko ? '재현에 필요한 것 전부' : 'Everything needed to reproduce this'}</h2>
            <div className="research-list">
              <div><b>{ko ? '모델' : 'Model'}</b><span>OlmoEarth v1 Base (Ai2), frozen, patch 4, 768-d tokens at 40 m. Optical scan: Sentinel-2 L2A, 12 bands, 256 px × 2.56 km windows. Sealed contract: Sentinel-1 RTC in dB + Sentinel-2, 4 periods × 14 d.</span></div>
              <div><b>{ko ? '변화 점수' : 'Change score'}</b><span>Δz = 1 − cos(z_before, z_after) per token; before = mean over three baseline dates (3 Jul, 23 Jul, 7 Aug), after = 27 Aug. Ordinary range = p99 of the same statistic over placebo pairs (three pairs, 19 May → 3 Jul; pooled p99 {scenario?.placebo_extended?.threshold_pooled3.toFixed(3) ?? '0.317'}). Tokens brighter than B02 &gt; 2600 in the base mean or target are excluded; windows with &lt; 20% valid tokens are not judged.</span></div>
              <div><b>{ko ? '검증' : 'Validation'}</b><span>Sen12-Landslides: AI vs classical 9/9 (M73); Presto control 6/7 (M79); radar-only 2/7, fusion gain &lt; +0.03 everywhere (M78, M80). Nepal controls: Tadi Khola 1.3%, pre-registered p009 1.0% vs Dalphedi 13.3% under the pooled threshold (M77, M81, M82).</span></div>
              <div><b>{ko ? '철회' : 'Retracted'}</b><span>Rasuwagadhi 9.8% token exceedance and the Lhende / radar-window-24 candidates: Sentinel-1 fed as linear intensity where the model expects dB (M75/M76).</span></div>
              <div><b>{ko ? '코드·장부' : 'Code and ledger'}</b><span>github: DDanggle/eo_olmo_earth_project — code/corridor_s2_candidates_*.py, corridor_placebo_extended.py, corridor_geomorph.py, sen12_*.py; MEASURED_FINDINGS.md M66–M84; artifacts/*/report.json with SHA-256. Public bundle: nepal-live-twin.</span></div>
              <div><b>{ko ? '열린 질문' : 'Open questions'}</b><span>{ko ? '독립 피해 경계(USGS/UNOSAT)로 후보 정밀도@k; 다른 사건(Gorkha 2015)에서 계곡 폭–변화 상관 재현; 흐린 장면에서의 레이더 단독 성능; 두 번째 광학 FM(Prithvi/Clay) 같은 계약.' : 'Candidate precision@k against an independent extent map (USGS/UNOSAT); does valley width → change replicate on another event (Gorkha 2015); radar-only under real cloud; a second optical FM (Prithvi/Clay) under the same contract.'}</span></div>
            </div>
          </section>

          <section className="story-section story-step story-boundary">
            <p className="story-kicker">06 · {ko ? '다음 관문과 출처' : 'NEXT GATE AND SOURCES'}</p>
            <h2>{ko ? '더 넓은 평시 기준과 독립된 피해 경계가 필요하다' : 'A deeper ordinary baseline and an independent event extent'}</h2>
            <p>{ko ? '지금의 “평소 범위”는 2주 전이 한 쌍뿐이다. 평시 쌍을 늘리면 문턱이 안정되고, USGS·UNOSAT가 낼 피해 경계와 겹쳐 보면 후보가 얼마나 맞았는지 처음으로 셀 수 있다. 그 전까지 이 페이지의 후보는 사람이 볼 순서를 정하는 목록이다.' : 'The current "ordinary range" rests on a single pair of fortnights. More ordinary pairs will steady the threshold, and an extent map from USGS or UNOSAT will let us count, for the first time, how many candidates were right. Until then the candidates here are an order in which people should look.'}</p>
            <div className="story-schedule">{(scenario?.scheduled_scenes ?? []).map((scene) => <div key={scene.id ?? scene.acquired_at} className={scene.state === 'missed_coverage' ? 'missed' : ''}><b>{shortSensor(scene.sensor)}</b><span>{kstStamp(scene.acquired_at)} KST</span><em>{scene.state.replace(/_/g, ' ').toUpperCase()}</em></div>)}</div>
            <div className="story-sources"><a href="https://www.usgs.gov/programs/landslide-hazards/science/2026-nepal-debris-avalanche-and-flash-flood" target="_blank" rel="noreferrer">USGS event assessment ↗</a><a href="https://www.who.int/nepal/emergencies/2026-rasuwa-flash-floods" target="_blank" rel="noreferrer">WHO health response ↗</a><a href="https://allenai.org/blog/olmoearth-embeddings" target="_blank" rel="noreferrer">Ai2 OlmoEarth ↗</a><a href="https://planetarycomputer.microsoft.com/docs/quickstarts/using-the-data-api/" target="_blank" rel="noreferrer">Planetary Computer STAC ↗</a><a href="https://source.coop/planet/disasterdata" target="_blank" rel="noreferrer">Planet Disaster Data ↗</a><a href="https://mapping.emergency.copernicus.eu/activations/EMSR927/" target="_blank" rel="noreferrer">CEMS EMSR927 ↗</a></div>
            <p className="story-outro">{scenario?.research.integration_disclaimer}</p>
          </section>
        </div>
        );
      })()}

      {lightbox && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={lightbox.title} onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <div className="lb-panel">
            <header><div><strong>{lightbox.title}</strong>{lightbox.sub && <small>{lightbox.sub}</small>}</div><button className="lb-close x-icon" onClick={() => setLightbox(null)} aria-label="Close"></button></header>
            {lbExtra === null ? (
              <div className="story-swipe lb-swipe" style={{ ['--swipe' as string]: `${lbSwipe}%` }}>
                <img src={lightbox.after} alt={lightbox.afterLabel} />
                <div className="swipe-clip"><img src={lightbox.before} alt={lightbox.beforeLabel} /></div>
                <div className="swipe-bar" /><span className="swipe-label pre">{lightbox.beforeLabel}</span><span className="swipe-label post">{lightbox.afterLabel}</span>
                <input type="range" min={0} max={100} value={lbSwipe} aria-label="Compare" onChange={(e) => setLbSwipe(Number(e.target.value))} />
              </div>
            ) : (
              <div className="lb-single"><img src={lightbox.extra![lbExtra].src} alt={lightbox.extra![lbExtra].label} /><span className="swipe-label post">{lightbox.extra![lbExtra].label}</span></div>
            )}
            <footer>
              <button className={lbExtra === null ? 'is-active' : ''} onClick={() => setLbExtra(null)}>BEFORE ⇄ AFTER</button>
              {(lightbox.extra ?? []).map((x, i) => <button key={x.src} className={lbExtra === i ? 'is-active' : ''} onClick={() => setLbExtra(i)}>{x.label}</button>)}
              <span className="lb-tip">drag the handle · ESC closes</span>
            </footer>
          </div>
        </div>
      )}

      <div className="provenance-stamp">DATA SNAPSHOT {scenario?.generated_at.slice(0, 16).replace('T', ' ') ?? '—'} UTC · OSM ODbL · ESA COPERNICUS · PLANET DISASTER DATA (CC-BY-NC-4.0)</div>
    </main>
  );
}
