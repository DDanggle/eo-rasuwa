'use client';
/* eslint-disable @next/next/no-img-element -- scientific raster tiles must be served byte-for-byte from the sealed public bundle */
import { ReviewNotes } from '../review-notes';

import { AttributionControl, LngLatBounds, Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import Image from 'next/image';
import Link from 'next/link';
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
  review?: { funnel: { scanned: number; observable: number; leads: number; confirmed_damage_labels?: number }; threshold: number | null; leads: { id: string; rank: number; place: string; kind: string; candidate_token_frac: number; observable: number; center_lonlat: [number, number] }[]; reobserve: { id: string; place: string; candidate_token_frac: number; observable: number; center_lonlat: [number, number] }[]; download?: string; all_observable_download?: string } | null;
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
// Planet Disaster Data 프레임(3.8 m, 08-28). 창/지점이 프레임 중심 ±2 km 안이면 비교 탭으로 노출.
const PLANET_FRAMES: Record<string, { src: string; lonlat: [number, number] }> = {
  rasuwagadhi: { src: '/data/story/planet/ps_rasuwagadhi_0828.png', lonlat: [85.378, 28.276] },
  timure: { src: '/data/story/planet/ps_timure_0828.png', lonlat: [85.363, 28.235] },
  syabrubesi: { src: '/data/story/planet/ps_syabrubesi_0828.png', lonlat: [85.347, 28.164] },
};
// 사건 사슬 한 줄 요약 — 카드 문단 대신 스크롤로 하나씩 읽히는 문장.
const CHAIN_LINE_EN: Record<string, string> = {
  E: 'The collapse began on Langtang Lirung — a best-estimate source point from public data',
  D: 'Debris reportedly dammed the river and formed a lake; the purple dot marks a rough search area',
  A: 'The flow reached the border bridge and its infrastructure — the centre of the before/after record',
  B: 'The checkpoint next door anchors how many people and assets were exposed',
  F: '47 km downstream, the river still changed width and colour',
  G: 'The mapped trace stops at 73.7 km; the flow itself almost certainly went further',
};
const CHAIN_LINE_KO: Record<string, string> = {
  E: '랑탕 리룽에서 빙하와 암반이 무너지며 시작됐다',
  D: '토사가 물길을 막아 호수가 생겼다는 보고가 뒤따랐다',
  A: '흘러내린 흐름이 국경의 다리와 시설을 덮쳤다',
  B: '바로 옆 검문소는 사람과 시설의 노출을 가늠하는 기준점이 됐다',
  F: '47km 하류에서도 강의 폭과 색이 달라졌다',
  G: '추적은 73.7km 지점에서 멈췄지만 흐름은 더 내려갔을 것이다',
};
const PLANET_LABEL = 'PlanetScope 3.8 m · 08-28 · © Planet Labs PBC CC-BY-NC-4.0';
const planetFigure = (key: string | null): string => key && PLANET_FRAMES[key]
  ? `<figure><img src="${PLANET_FRAMES[key].src}" alt="PlanetScope 28 Aug"/><figcaption>PLANETSCOPE 3.8 m · 08-28<br/><a href="https://source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26" target="_blank" rel="noopener">© Planet Labs PBC · CC-BY-NC-4.0 · source.coop</a></figcaption></figure>` : '';

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

function MapExperience({ storyDefault = false }: { storyDefault?: boolean }) {
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
  const focusDoneRef = useRef(false);
  const prevZoneRef = useRef<0 | 1 | 2>(0);
  // SSR과 첫 client render는 반드시 같은 값이어야 한다. window.hash를 state initializer에서
  // 읽으면 /#story 직링크에서 hydration mismatch가 난다(2026-08-29 브라우저 QA 실측).
  const [storyOpen, setStoryOpen] = useState(storyDefault);
  const [storyLang, setStoryLang] = useState<'en' | 'ko'>('ko');
  useEffect(() => {  // 언어: middleware가 IP 국가로 심은 lang 쿠키 → 없으면 브라우저 언어
    try {
      const m = document.cookie.match(/(?:^|; )lang=(ko|en)/);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 하이드레이션 후 1회 언어 동기화
      if (m) setStoryLang(m[1] as 'en' | 'ko');
       
      else if (!navigator.language.toLowerCase().startsWith('ko')) setStoryLang('en');
    } catch { /* noop */ }
  }, []);
  const chooseStoryLang = (lang: 'en' | 'ko') => { setStoryLang(lang); try { document.cookie = `lang=${lang};path=/;max-age=31536000`; } catch { /* noop */ } };
  // 큰 비교 뷰어(라이트박스): 어떤 작은 사진이든 클릭하면 전·후 슬라이더로 크게 봄.
  type Lightbox = { title: string; sub?: string; before: string; after: string; beforeLabel: string; afterLabel: string; extra?: { src: string; label: string }[]; leadIndex?: number };
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
  // 창별 PlanetScope 크롭 (97/100 창, 08-28 우선·08-26 폴백). CC-BY-NC-4.0 © Planet Labs PBC.
  const planetWinsRef = useRef<Record<string, { file: string; datetime: string }>>({});
  useEffect(() => {
    fetch('/data/planet/windows_manifest.json').then((r) => r.ok ? r.json() : null)
      .then((m) => { if (m?.windows) planetWinsRef.current = m.windows; }).catch(() => {});
  }, []);
  const [lbSwipe, setLbSwipe] = useState(50);
  // PlanetScope 3.8 m 프레임 검수용 확대: 클릭 지점을 중심으로 2.6배. 다시 클릭하면 해제.
  const [lbZoom, setLbZoom] = useState<{ x: number; y: number } | null>(null);
  const [lbExtra, setLbExtra] = useState<number | null>(null);
  // 발견성: 지도 도형이 클릭 가능함을 알리는 일회성 힌트 (localStorage로 재방문 시 생략)
  const [tapHint, setTapHint] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 1회 힌트 노출 판단
      if (!localStorage.getItem('map-hint-seen')) setTapHint(true);
    } catch { /* noop */ }
  }, []);
  const dismissTapHint = useCallback(() => {
    setTapHint(false);
    try { localStorage.setItem('map-hint-seen', '1'); } catch { /* noop */ }
  }, []);
  const openLightbox = useCallback((lb: Lightbox) => { setLbSwipe(50); setLbExtra(null); setLbZoom(null); setLightbox(lb); dismissTapHint(); }, [dismissTapHint]);
  // 리드 스테퍼: 라이트박스가 리드 컨텍스트(leadIndex)로 열리면 PREV/NEXT·←/→로 6곳을 왕복 없이 순회
  const openLeadRef = useRef<(index: number) => void>(() => {});
  const openWindowPopupRef = useRef<(id: string) => void>(() => {});
  const leadIndexByIdRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (lightbox.leadIndex != null && e.key === 'ArrowLeft') openLeadRef.current(lightbox.leadIndex - 1);
      if (lightbox.leadIndex != null && e.key === 'ArrowRight') openLeadRef.current(lightbox.leadIndex + 1);
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);
  // 팝업(HTML 문자열) 안의 썸네일 클릭 → 라이트박스 (이벤트 위임)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('.pp-thumbs') as HTMLElement | null;
      if (!el) return;
      const win = el.dataset.win; const name = el.dataset.name ?? ''; const place = el.dataset.place ?? '';
      const planetFile = el.dataset.planetfile || null; const planetDate = el.dataset.planetdate || '';
      if (el.dataset.ptc) {
        openLightbox({ title: name, sub: `${place} · negative-control window, 114 km from Rasuwagadhi`, before: '/data/candidates/ptC_pre.png', after: '/data/candidates/ptC_post.png', beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27 (cloud)' });
        return;
      }
      const cand = el.dataset.cand;
      if (cand != null && leadIndexByIdRef.current[cand] != null) { openLeadRef.current(leadIndexByIdRef.current[cand]); return; }
      if (cand) {
        openLightbox({ title: name, sub: `${place} · scan window ${cand}`, before: `/data/candidates/${cand}_pre.png`, after: `/data/candidates/${cand}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27',
                       extra: [{ src: `/data/candidates/${cand}_delta.png`, label: 'AI change tokens (orange) on 08-27' }, ...(planetFile ? [{ src: planetFile, label: `PlanetScope 3.8 m · ${planetDate} · © Planet Labs PBC CC-BY-NC-4.0` }] : win && PLANET_FRAMES[win] ? [{ src: PLANET_FRAMES[win].src, label: PLANET_LABEL }] : [])] });
        return;
      }
      if (!win) return;
      const extra = win && PLANET_FRAMES[win] ? [{ src: PLANET_FRAMES[win].src, label: PLANET_LABEL }] : [];
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
  const [candidateScope, setCandidateScope] = useState<'all' | 'hillslope'>('all');
  // 우측 레일 2탭 (2026-09-01 UX): 기본은 리드 6장만, 검증 블록 전체는 EVIDENCE 탭 뒤로.
  const [railTab, setRailTab] = useState<'leads' | 'evidence'>('leads');
  const [satTiles, setSatTiles] = useState(false);
  const [candView, setCandView] = useState<{ id: string; rank?: number; place?: string; mode: 'pre' | 'post' | 'delta' } | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);  // 2026-08-30: 패널 하나로 — 포인트는 지도 위 라벨로 충분
  const [rightOpen, setRightOpen] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Map camera helpers are declared before effects that capture them. This is
  // important with the React compiler: a callback referenced before its
  // declaration can otherwise freeze an older closure during a style reload.
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

  const fitCorridor = useCallback(() => {
    userSelectedSceneRef.current = false;
    if (zoneRef.current !== 0) return;
    mapRef.current?.fitBounds(new LngLatBounds([84.96, 27.77], [85.55, 28.36]), {
      padding: scenePadding(),
      pitch: viewDimRef.current === '3d' ? TERRAIN_PITCH : 0,
      bearing: viewDimRef.current === '3d' ? -18 : 0,
      duration: prefersReducedMotion() ? 0 : 1100,
    });
  }, [scenePadding]);

  // GO TO MAP: 후보 창의 위성 사진(전/후/AI Δ)을 지도 위에 실제 좌표로 깔아 보여줌.
  const showCandidate = useCallback((id: string, mode: 'pre' | 'post' | 'delta', meta?: { rank?: number; place?: string; center?: [number, number] }) => {
    const map = mapRef.current;
    const fc = scenario?.candidates?.geojson;
    if (!map || !fc) return;
    const feature = fc.features.find((item) => item.properties?.id === id);
    if (!feature || feature.geometry.type !== 'Polygon') return;
    const ring = feature.geometry.coordinates[0] as [number, number][]; // SW, SE, NE, NW, SW
    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [ring[3], ring[2], ring[1], ring[0]];
    if (map.getLayer('cand-scene')) map.removeLayer('cand-scene');
    if (map.getSource('cand-scene')) map.removeSource('cand-scene');
    map.addSource('cand-scene', { type: 'image', url: `/data/candidates/${id}_${mode}.png`, coordinates });
    const before = map.getLayer('ai-candidate-fill') ? 'ai-candidate-fill' : (map.getLayer('point-halo') ? 'point-halo' : undefined);
    map.addLayer({ id: 'cand-scene', type: 'raster', source: 'cand-scene', paint: { 'raster-opacity': 1, 'raster-fade-duration': 120 } }, before);
    const center = meta?.center ?? (feature.properties?.center_lonlat as [number, number] | undefined);
    if (center) map.flyTo({ center, zoom: 14.2, pitch: 0, bearing: 0, duration: prefersReducedMotion() ? 0 : 900 });
    // GO TO MAP 한 번으로 이동+팝업까지: 카메라가 멈추면 해당 창의 상세 팝업을 바로 연다 (2026-09-01, 심플 원칙)
    map.once('moveend', () => openWindowPopupRef.current(id));
    setCandView({ id, mode, rank: meta?.rank, place: meta?.place });
  }, [scenario]);

  const clearCandidate = useCallback(() => {
    const map = mapRef.current;
    if (map?.getLayer('cand-scene')) map.removeLayer('cand-scene');
    if (map?.getSource('cand-scene')) map.removeSource('cand-scene');
    setCandView(null);
  }, []);

  useEffect(() => {
    const syncStoryHash = () => { if (!storyDefault) setStoryOpen(window.location.hash === '#story'); };
    // Defer the client-only hash read so the first hydrated tree remains identical to SSR.
    const frame = window.requestAnimationFrame(syncStoryHash);
    window.addEventListener('hashchange', syncStoryHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', syncStoryHash);
    };
  }, [storyDefault]);

  useEffect(() => { railsRef.current = { left: leftOpen, right: rightOpen }; }, [leftOpen, rightOpen]);

  // 좁은 화면에서는 패널을 기본으로 접는다 (지도가 주인공).
  // rAF로 페인트 뒤에 미룬다 — effect 내 동기 setState는 연쇄 렌더를 유발한다(lint).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (window.innerWidth < 1100) { setLeftOpen(false); }  // 2026-08-30: 리드 패널(우측)은 어느 폭에서도 유지
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
        // The handler above already converts a rejected MapTiler style into the
        // key-free Esri raster style. Do not report that expected recovery as a
        // second uncaught-looking error in production diagnostics.
        if (maptilerStyleUrl && /style|403|Forbidden|Failed to fetch/i.test(msg)) return;
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
      const oe = event.originalEvent as MouseEvent & { _popupHandled?: boolean };
      if (oe._popupHandled) return; oe._popupHandled = true;
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
            + planetFigure(win ?? null)
            + `</div><p class="pp-hint">▲ nearest scan window ${cw} (${pt.nearest_window_km} km)${pt.id === 'G' ? ' · pooled-baseline change cells 3.1% here vs 13.3% at Dalphedi; read as a lower-priority review signal, not absence' : ''} · click to open the large slider</p>`
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
            + `<figure><img src="/data/candidates/x001_delta.png" alt="AI change"/><figcaption>AI Δ · 1.3% pooled-threshold tokens</figcaption></figure>`
            + `</div><p class="pp-hint">▲ control: AI change 0.129 ≈ ordinary fortnight 0.125 — what "no change" looks like · click to open the large slider</p>`
          : win
          ? `<div class="pp-thumbs" data-win="${win}" data-name="${pt.name}" data-place="${pt.place}" title="Click to compare large">`
            + `<figure><img src="/data/story/anchors/${win}_pre.png" alt="pre"/><figcaption>PRE 08-12</figcaption></figure>`
            + `<figure><img src="/data/story/anchors/${win}_post.png" alt="post"/><figcaption>POST 08-27</figcaption></figure>`
            + planetFigure(win ?? null)
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
  }, [mapReady, points, researchPoints, scenario?.lake_search, styleRevision]);

  // 빈 지도 클릭 → 타임라인에서 올린 위성 장면 오버레이 해제 (2026-08-31 사용자 요청:
  // 장면을 한 번 올리면 내릴 방법이 없었음). 마커·창 등 상호작용 레이어 클릭은 제외.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const interactive = ['point-core', 'scan-center-dot', 'ai-candidate-fill', 'olmo-canonical-fill'];
    const onMapClick = (event: MapLayerMouseEvent) => {
      const layers = interactive.filter((l) => map.getLayer(l));
      const hits = layers.length ? map.queryRenderedFeatures(event.point, { layers }) : [];
      // 기본 배경 장면(자동 선택)은 유지하고, 사용자가 타임라인에서 직접 올린 장면만 내린다.
      if (hits.length === 0 && userSelectedSceneRef.current) { userSelectedSceneRef.current = false; setActiveSceneId(null); }
    };
    map.on('click', onMapClick);
    return () => { map.off('click', onMapClick); };
  }, [mapReady]);

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
                    'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true },
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
        // 연구 지점(A~G)과 사실상 같은 자리(±300 m)의 스캔 중심점은 표시하지 않는다 —
        // E(SOURCE ESTIMATE) 위에 v050/v075가 겹쳐 클릭 팝업이 중복되던 원인 (2026-08-31 사용자 보고).
        const pointCoords = (scenario.points ?? []).map((pt) => pt.coordinates);
        const nearResearchPoint = (c: [number, number]) => pointCoords.some(([lon, lat]) => Math.abs(lon - c[0]) < 0.003 && Math.abs(lat - c[1]) < 0.003);
        map.addSource('scan-centers', { type: 'geojson', data: { type: 'FeatureCollection', features: scenario.candidates.geojson.features.filter((f) => !nearResearchPoint(f.properties?.center_lonlat as [number, number])).map((f) => ({ type: 'Feature', properties: f.properties, geometry: { type: 'Point', coordinates: (f.properties?.center_lonlat as [number, number]) } })) } });
        map.addLayer({ id: 'scan-center-dot', type: 'circle', source: 'scan-centers',
          paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2.2, 12, 4, 15, 7], 'circle-color': '#19d3b0', 'circle-stroke-color': '#fffefb', 'circle-stroke-width': 1.5, 'circle-opacity': 0.95 } });
        map.addLayer({ id: 'ai-candidate-fill', type: 'fill', source: 'ai-candidates',
          filter: ['in', ['get', 'review_status'], ['literal', ['lead', 'reobserve']]],
          paint: { 'fill-color': ['case', ['==', ['get', 'review_status'], 'reobserve'], '#7b3fbf', '#d99a24'],
                   'fill-opacity': ['interpolate', ['linear'], ['coalesce', ['get', 'candidate_token_frac'], 0], 0, 0.0, 0.05, 0.14, 0.2, 0.38, 0.5, 0.55] } }, before);
        try { map.addLayer({ id: 'ai-candidate-rank', type: 'symbol', source: 'ai-candidates',
          filter: ['==', ['get', 'review_status'], 'lead'],
          layout: { 'text-field': ['concat', '#', ['to-string', ['get', 'review_rank']]], 'text-size': 15,
                    'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true, 'text-anchor': 'center' },
          paint: { 'text-color': '#b77708', 'text-halo-color': '#fffefb', 'text-halo-width': 2 } }); }
        catch (e) { console.warn('[diag] candidate rank labels skipped', e); }
        const simIds = (scenario?.candidates?.retrieval?.top10 ?? []).map((r) => r.id);
        if (simIds.length) {
          map.addLayer({ id: 'ai-similar-line', type: 'line', source: 'ai-candidates', filter: ['in', ['get', 'id'], ['literal', simIds]],
            paint: { 'line-color': '#2a78d6', 'line-width': 2.2, 'line-dasharray': [1.5, 1.2], 'line-opacity': 0.9 } }, before);
        }
        const openWindowPopup = (pr: Record<string, unknown>, lngLat: { lng: number; lat: number }) => {
          const id = String(pr.id); const rank = pr.review_rank ? `review lead #${pr.review_rank}` : pr.review_status === 'reobserve' ? 're-observe (cloud-limited)' : 'screened';
          const pw = planetWinsRef.current[id];
          if (satTiles) {  // 위성 타일 모드: 클릭 즉시 큰 전·후 슬라이더
            openLightbox({ title: `Scan window ${id} · ${rank}`, sub: `${pr.kind === 'hillslope' ? 'off-river hillslope' : String(pr.kind ?? 'river')} · ${typeof pr.candidate_token_frac === 'number' ? (100 * (pr.candidate_token_frac as number)).toFixed(0) + '% changed beyond its ordinary range' : 'not judged'}`, before: `/data/candidates/${id}_pre.png`, after: `/data/candidates/${id}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra: [{ src: `/data/candidates/${id}_delta.png`, label: 'AI change tokens (orange) on 08-27' }, ...(pw ? [{ src: pw.file, label: `PlanetScope 3.8 m · ${pw.datetime.slice(0, 10)} · © Planet Labs PBC CC-BY-NC-4.0` }] : [])] });
            return;
          }
          const kindLabel = pr.kind === 'hillslope' ? 'OFF-RIVER HILLSLOPE' : pr.kind === 'lhende' ? 'LHENDE UPSTREAM' : 'RIVER';
          const frac = typeof pr.candidate_token_frac === 'number' ? `${(100 * (pr.candidate_token_frac as number)).toFixed(0)}% changed beyond its ordinary range` : 'not judged';
          const vis = typeof pr.valid_event_frac === 'number' ? `${(100 * (pr.valid_event_frac as number)).toFixed(0)}% observable` : '';
          new Popup({ closeButton: true, maxWidth: '420px', className: 'story-popup' }).setLngLat(lngLat)
            .setHTML(`<p class="pp-eyebrow">${kindLabel} · ${rank}</p><h3>${pr.place ? String(pr.place) : `Scan window ${id}`}</h3><p class="pp-place">${frac} · ${vis}</p>`
              + `<div class="pp-thumbs" data-cand="${id}" data-name="Scan window ${id}" data-place="${kindLabel} · ${rank}" data-planetfile="${pw?.file ?? ''}" data-planetdate="${pw?.datetime?.slice(0, 10) ?? ''}" title="Click to compare large">`
              + `<figure><img src="/data/candidates/${id}_pre.png" alt="pre"/><figcaption>PRE 08-12</figcaption></figure>`
              + `<figure><img src="/data/candidates/${id}_post.png" alt="post"/><figcaption>POST 08-27</figcaption></figure>`
              + `<figure><img src="/data/candidates/${id}_delta.png" alt="AI change"/><figcaption>AI Δ</figcaption></figure>`
              + (pw ? `<figure><img src="${pw.file}" alt="PlanetScope"/><figcaption>PLANETSCOPE 3.8 m · ${pw.datetime.slice(5, 10)}<br/><a href="https://source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26" target="_blank" rel="noopener">© Planet Labs PBC · CC-BY-NC-4.0</a></figcaption></figure>` : '') + `</div>`
              + `<p class="pp-hint">▲ click to open the large slider · orange = changed more than any ordinary fortnight · grey = cloud/snow</p>`).addTo(map);
        };
        openWindowPopupRef.current = (id: string) => {
          const feat = scenario?.candidates?.geojson.features.find((f) => f.properties?.id === id);
          const c = feat?.properties?.center_lonlat as [number, number] | undefined;
          if (feat && c) openWindowPopup(feat.properties as Record<string, unknown>, { lng: c[0], lat: c[1] });
        };
        map.on('click', 'ai-candidate-fill', (e) => {
          const oe = e.originalEvent as MouseEvent & { _popupHandled?: boolean };
          if (oe._popupHandled) return; oe._popupHandled = true;
          const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (!pr) return;
          openWindowPopup(pr, e.lngLat);
        });
        map.on('click', 'scan-center-dot', (e) => {
          const oe = e.originalEvent as MouseEvent & { _popupHandled?: boolean };
          if (oe._popupHandled) return; oe._popupHandled = true;
          const pr = e.features?.[0]?.properties as Record<string, unknown> | undefined; if (!pr) return;
          const id = String(pr.id);
          const pw = planetWinsRef.current[id];
          if (satTiles) {
            openLightbox({ title: `Scan window ${id}`, sub: pr.review_rank ? `review lead #${pr.review_rank}` : pr.review_status === 'reobserve' ? 're-observe (cloud-limited)' : pr.status === 'ranked' ? 'screened — not in the six review leads' : 'not judged (cloud/snow)', before: `/data/candidates/${id}_pre.png`, after: `/data/candidates/${id}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra: [{ src: `/data/candidates/${id}_delta.png`, label: 'AI change tokens (orange) on 08-27' }, ...(pw ? [{ src: pw.file, label: `PlanetScope 3.8 m · ${pw.datetime.slice(0, 10)} · © Planet Labs PBC CC-BY-NC-4.0` }] : [])] });
            return;
          }
          new Popup({ closeButton: true, maxWidth: '420px', className: 'story-popup' }).setLngLat(e.lngLat)
            .setHTML(`<p class="pp-eyebrow">SCAN WINDOW · ${pr.review_rank ? 'review lead #' + pr.review_rank : pr.review_status === 'reobserve' ? 're-observe' : pr.status === 'ranked' ? 'screened' : 'not judged'}</p><h3>${id}</h3>`
              + `<div class="pp-thumbs" data-cand="${id}" data-name="Scan window ${id}" data-place="" data-planetfile="${pw?.file ?? ''}" data-planetdate="${pw?.datetime?.slice(0, 10) ?? ''}" title="Click to compare large">`
              + `<figure><img src="/data/candidates/${id}_pre.png" alt="pre"/><figcaption>PRE 08-12</figcaption></figure>`
              + `<figure><img src="/data/candidates/${id}_post.png" alt="post"/><figcaption>POST 08-27</figcaption></figure>`
              + `<figure><img src="/data/candidates/${id}_delta.png" alt="AI change"/><figcaption>AI Δ</figcaption></figure>`
              + (pw ? `<figure><img src="${pw.file}" alt="PlanetScope"/><figcaption>PLANETSCOPE 3.8 m · ${pw.datetime.slice(5, 10)}<br/><a href="https://source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26" target="_blank" rel="noopener">© Planet Labs PBC · CC-BY-NC-4.0</a></figcaption></figure>` : '') + `</div>`
              + `<p class="pp-hint">▲ click to open the large slider</p>`).addTo(map);
        });
        map.on('mouseenter', 'scan-center-dot', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'scan-center-dot', () => { map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', 'ai-candidate-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'ai-candidate-fill', () => { map.getCanvas().style.cursor = ''; });
        if (map.getLayer('scan-center-dot')) map.moveLayer('scan-center-dot');
        // /map?focus=v003 — 첫 화면 리드 표의 "지도에서 보기"
        try {
          const focus = new URLSearchParams(window.location.search).get('focus');
          if (focus && !focusDoneRef.current) {
            const lead = scenario.review?.leads.find((l) => l.id === focus) ?? scenario.review?.reobserve.map((r, i) => ({ ...r, rank: i + 1 })).find((l) => l.id === focus);
            const feat = scenario.candidates.geojson.features.find((f) => String(f.properties?.id) === focus);
            const center = (lead?.center_lonlat ?? (feat?.properties?.center_lonlat as [number, number] | undefined));
            if (center) { focusDoneRef.current = true; initialCorridorFitRef.current = true; userSelectedSceneRef.current = true; setTimeout(() => showCandidate(focus, 'post', { rank: lead?.rank, place: lead?.place, center }), 900); }
          }
        } catch { /* ignore */ }
        console.log('[diag] candidate layers attached | windows =', scenario.candidates.geojson.features.length, '| layers =', (map.getStyle()?.layers ?? []).map((l) => l.id).filter((id) => /scan|ai-|olmo|river|point/.test(id)).join(','));
        map.addLayer({ id: 'ai-candidate-line', type: 'line', source: 'ai-candidates',
          paint: { 'line-color': ['case', ['==', ['get', 'review_status'], 'reobserve'], '#7b3fbf', ['==', ['get', 'review_status'], 'lead'], '#d99a24', '#72908a'],
                   'line-width': ['case', ['in', ['get', 'review_status'], ['literal', ['lead', 'reobserve']]], 2.2, 0.6],
                   'line-opacity': ['case', ['in', ['get', 'review_status'], ['literal', ['lead', 'reobserve']]], 0.9, ['==', ['get', 'status'], 'ranked'], 0.18, 0.08] } }, before);
        if (map.getLayer('scan-center-dot')) map.moveLayer('scan-center-dot');
      }
      if (!map.getLayer('olmo-anchor-line')) map.addLayer({ id: 'olmo-anchor-line', type: 'line', source: 'olmo-anchors', paint: { 'line-color': '#b7ffe9', 'line-width': 1, 'line-opacity': 0.52, 'line-dasharray': [3, 2] } }, before);
    }).catch((e) => console.error('[diag] candidates effect failed (this is why the boxes/cyan dots were missing):', e));
  }, [mapReady, styleRevision, scenario, satTiles, openLightbox, showCandidate]);

  // 두 구역 모드(2026-08-30): 1 = 빙하 발원→충격(렌데 계곡·산사면 격자), 2 = 충격→하류(강 창). 레이어 필터 + 카메라.
  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady) return;
    const kinds = zone === 1 ? ['lhende', 'hillslope'] : zone === 2 ? ['river'] : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kindFilter: any = kinds ? ['in', ['get', 'kind'], ['literal', kinds]] : null;
    const apply = () => {
      if (map.getLayer('ai-candidate-fill')) map.setFilter('ai-candidate-fill', kindFilter ? ['all', ['in', ['get', 'review_status'], ['literal', ['lead', 'reobserve']]], kindFilter] : ['in', ['get', 'review_status'], ['literal', ['lead', 'reobserve']]]);
      if (map.getLayer('scan-center-dot')) map.setFilter('scan-center-dot', kindFilter);
      if (map.getLayer('ai-candidate-rank')) map.setFilter('ai-candidate-rank', kindFilter ? ['all', ['==', ['get', 'review_status'], 'lead'], kindFilter] : ['==', ['get', 'review_status'], 'lead']);
      for (const id of ['olmo-canonical-fill', 'olmo-canonical-line', 'olmo-canonical-rank', 'ai-similar-line']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');  // 2026-08-30: 봉인 27창·검색 윤곽은 지도에서 숨김(방법 문서로)
      const b = zone !== 0 ? scenario?.geomorph?.zone_bounds?.[String(zone)] : null;
      zoneRef.current = zone;  // 장면 효과가 구역 카메라를 덮어쓰지 않게(아래 fitScene 가드)
      if (b) map.fitBounds(new LngLatBounds([b[0], b[1]], [b[2], b[3]]), { padding: scenePadding(), duration: prefersReducedMotion() ? 0 : 900, pitch: 0, bearing: 0, maxZoom: 12.5 });
      else if (zone === 0 && scenario && prevZoneRef.current !== 0) fitCorridor();  // 구역이 실제로 0으로 돌아올 때만 (styleRevision 재실행마다 회랑으로 튀던 결함 수정)
      prevZoneRef.current = zone;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__map = map;
    if (map.getLayer('ai-candidate-fill')) apply(); else map.once('idle', apply);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, mapReady, styleRevision]);

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
    if (!mapReady || !map || !scenario) return;
    if (!activeSceneId) {  // 빈 지도 클릭으로 장면을 내렸을 때 오버레이도 함께 제거
      if (map.getLayer('satellite-scene')) map.removeLayer('satellite-scene');
      if (map.getSource('satellite-scene')) map.removeSource('satellite-scene');
      return;
    }
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
  const nextScheduled = scenario?.scheduled_scenes.find((scene) => scene.state !== 'missed_coverage') ?? null;
  const liveObservation = scenario?.live_observation ?? null;
  const decision = scenario?.decision ?? null;
  const transfer = scenario?.research.confirmatory_transfer ?? null;
  const livePeriodText = liveObservation
    ? `S1 ${liveObservation.period_readiness?.sentinel1 ?? '?'}⁄4 · S2 ${liveObservation.period_readiness?.sentinel2_l2a ?? '?'}⁄4`
    : '—';
  const selectedCard = points.find((item) => item.id === selectedPoint) ?? points[0] ?? null;
  const eventPoints = points.filter((point) => point.in_event_chain);
  const controlPoints = points.filter((point) => !point.in_event_chain);
  const bidurPre = scenario?.downstream_visual.records.find((record) => record.label === 'pre') ?? null;
  const bidurPost = scenario?.downstream_visual.records.find((record) => record.label === 'post') ?? null;
  const corridorContract = scenario?.corridor_contract ?? null;
  const canonicalTop = scenario?.corridor_sealed?.top[0] ?? null;
  // 2026-08-30: 카드 순서는 첫 화면과 같은 리드(평시 3쌍 문턱, 관측 가능성 ≥ 40%, 마을 중복 제거). OFF-RIVER 는 재관측 대상.
  const leadRows = (scenario?.review?.leads ?? []).map((l) => ({ id: l.id, rank: l.rank, place: l.place, kind: l.kind, center_lonlat: l.center_lonlat, candidate_token_frac: l.candidate_token_frac, valid_event_frac: l.observable, distance_from_a_km: undefined as number | undefined }));
  const reobserveRows = (scenario?.review?.reobserve ?? []).map((l, i) => ({ id: l.id, rank: i + 1, place: l.place, kind: 'hillslope', center_lonlat: l.center_lonlat, candidate_token_frac: l.candidate_token_frac, valid_event_frac: l.observable, distance_from_a_km: undefined as number | undefined }));
  // 리드 하나를 라이트박스로 — 스테퍼 컨텍스트 포함. 카드·지도 팝업·키보드가 전부 이 함수를 쓴다.
  const openLeadLightbox = useCallback((index: number) => {
    if (!leadRows.length) return;
    const i = ((index % leadRows.length) + leadRows.length) % leadRows.length;
    const c = leadRows[i];
    const pw = planetWinsRef.current[c.id];
    openLightbox({
      title: `#${c.rank} · ${c.place || c.id}`,
      sub: `${(c.candidate_token_frac * 100).toFixed(0)}% changed beyond its ordinary range · ${(c.valid_event_frac * 100).toFixed(0)}% cloud-free`,
      before: `/data/candidates/${c.id}_pre.png`, after: `/data/candidates/${c.id}_post.png`,
      beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27',
      extra: [{ src: `/data/candidates/${c.id}_delta.png`, label: 'AI change cells (orange) on 08-27' },
              ...(pw ? [{ src: pw.file, label: `PlanetScope 3.8 m · ${pw.datetime.slice(0, 10)} · © Planet Labs PBC CC-BY-NC-4.0` }] : [])],
      leadIndex: i,
    });
  }, [leadRows, openLightbox]);
  useEffect(() => {
    openLeadRef.current = openLeadLightbox;
    leadIndexByIdRef.current = Object.fromEntries(leadRows.map((l, i) => [l.id, i]));
  }, [openLeadLightbox, leadRows]);
  const candidateRows = !scenario?.candidates ? []
    : candidateScope === 'hillslope'
      ? reobserveRows
      : leadRows;

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
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.story-step, .chain-row'));
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
          ? (scenario?.review?.leads?.length ? `${scenario.review.funnel.scanned} windows scanned · ${scenario.review.funnel.observable} observable · ${scenario.review.funnel.leads} to inspect first: ${scenario.review.leads.slice(0, 3).map((c) => c.place.split(',')[0]).join(' · ')} … Ranked by the share of 40 m cells whose before/after embedding distance exceeds that place's ordinary 99th percentile. Nothing here is confirmed damage.` : 'Where to look first, ranked by OlmoEarth change. Nothing here is confirmed damage.')
          : zone === 1
          ? (scenario?.geomorph ? `Glacier source to the border: ${scenario.geomorph.zone1.length_km} km of gorge, ${scenario.geomorph.zone1.drop_m.toFixed(0)} m of drop; the valley pinches to ${scenario.geomorph.zone1.narrowest.valley_width_km} km at km ${scenario.geomorph.zone1.narrowest.km_from_source}. The hillslope grid around the source is cloud-limited; Salê is its only judged off-river candidate.` : 'Glacier source to the border.')
          : (scenario?.geomorph ? `Border to Galchhi: ${scenario.geomorph.zone2.n_windows} judged river windows. Wider valley floors carry more change (ρ ${scenario.geomorph.zone2.correlations.valley_width_km?.spearman.toFixed(2)}); confined, high-relief reaches carry less (ρ ${scenario.geomorph.zone2.correlations.relief_m?.spearman.toFixed(2)}). Look first at Dalphedi and the Bidur reach.` : 'Border to Galchhi.')}</span>
      </div>
      <div ref={mapNode} className="map-stage" aria-label="Rasuwagadhi satellite and simulation map" />
      {scenario?.candidates && mapStatus === 'ready' && (
        <div className="map-legend" aria-label="Map legend">
          <span><i className="sw amber" />six review leads · pooled three-pair threshold</span>
          <span><i className="sw purple" />re-observe · strong change, insufficient clear pixels</span>
          <span><i className="sw grey" />thin outline = screened; no fill = not a lead</span>
          <span><i className="sw teal" />100 scanned centers · click any point for before/after</span>
        </div>
      )}
      {candView && (
        <div className={`cand-chip ${rightOpen ? 'rail-open' : ''}`} role="status">
          <b>{candView.rank ? `#${candView.rank}` : candView.id}</b><span>{candView.place ?? ''}</span>
          <div className="cand-chip-modes">
            {(['pre', 'post', 'delta'] as const).map((m) => <button key={m} className={candView.mode === m ? 'is-active' : ''} onClick={() => showCandidate(candView.id, m, candView)}>{m === 'pre' ? 'PRE 08-12' : m === 'post' ? 'POST 08-27' : 'AI Δ'}</button>)}
          </div>
          <button className="cand-chip-close x-icon" onClick={clearCandidate} aria-label="Remove overlay"></button>
        </div>
      )}
      {tapHint && (
        <button className="tap-hint" onClick={dismissTapHint}>
          {'사각형·청록 점을 클릭하면 전후 비교가 열립니다 · Click any rectangle or dot to compare ✕'}
        </button>
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
        <Link className="brand-lockup" href="/" title="Home">
          <div className="brand-mark"><span /></div>
          <div><p className="eyebrow">EVIDENCE MAP · RASUWA 2026</p><h1>Nepal <span>AI Twin</span></h1></div>
        </Link>
        <div className="map-mode-switch zone-switch" role="group" aria-label="Zone">
          <button className={zone === 0 ? 'is-active' : ''} onClick={() => setZone(0)} disabled={mapStatus !== 'ready'}>WHOLE CHAIN</button>
          <button className={zone === 1 ? 'is-active' : ''} onClick={() => setZone(1)} disabled={mapStatus !== 'ready'}>1 · SOURCE → IMPACT</button>
          <button className={zone === 2 ? 'is-active' : ''} onClick={() => setZone(2)} disabled={mapStatus !== 'ready'}>2 · IMPACT → DOWNSTREAM</button>
        </div>
        <button className={`sat-tiles-toggle ${satTiles ? 'is-active' : ''}`} onClick={() => setSatTiles((v) => !v)} title="Drape every scan window's 27 Aug Sentinel-2 thumbnail on the map">{satTiles ? <>SATELLITE TILES ON<em className="toggle-sub">click opens the large comparison</em></> : 'SATELLITE TILES'}</button>
        <div className="map-mode-switch dim-switch" role="group" aria-label="View dimension">
          <button className={viewDim === '2d' ? 'is-active' : ''} onClick={() => setDimension('2d')} disabled={mapStatus !== 'ready'}>2D</button>
          <button className={viewDim === '3d' ? 'is-active' : ''} onClick={() => setDimension('3d')} disabled={mapStatus !== 'ready'}>3D</button>
        </div>
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
      >{leftOpen ? '⟨' : '⟩'}<em>PLACES</em></button>

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
        <div className="rail-tabs" role="tablist" aria-label="Right rail sections">
          <button role="tab" aria-selected={railTab === 'leads'} className={railTab === 'leads' ? 'is-active' : ''} onClick={() => setRailTab('leads')}>LEADS</button>
          <button role="tab" aria-selected={railTab === 'evidence'} className={railTab === 'evidence' ? 'is-active' : ''} onClick={() => setRailTab('evidence')}>EVIDENCE &amp; METHODS</button>
        </div>
        {railTab === 'leads' && scenario?.candidates && (
            <div className="candidate-cards">
              
              <div className="candidate-scopes" role="group" aria-label="Filter AI candidate windows">
                {(['all', 'hillslope'] as const).map((scope) => <button key={scope} className={candidateScope === scope ? 'is-active' : ''} onClick={() => setCandidateScope(scope)}>{scope === 'all' ? '6 LEADS' : 'RE-OBSERVE'}</button>)}
              </div>
              {candidateRows.slice(0, 6).map((c, ci) => (
                <article key={c.id} className="cand-card">
                  <header><b>{candidateScope === 'hillslope' ? `R${c.rank}` : `#${c.rank}`}</b><strong>{c.place || `${c.center_lonlat[1].toFixed(3)}, ${c.center_lonlat[0].toFixed(3)}`}</strong><small>{candidateScope === 'hillslope' ? 'RE-OBSERVE · BELOW 40% CLEAR · ' : c.kind === 'lhende' ? 'LHENDE UPSTREAM · ' : ''}{c.distance_from_a_km != null ? `${c.distance_from_a_km.toFixed(1)} km from border` : ''}</small></header>
                  <div className="cand-strip" role="button" tabIndex={0}
                       onClick={() => { if (candidateScope === 'all') { openLeadLightbox(ci); return; } openLightbox({ title: `#${c.rank} · ${c.place || c.id}`, sub: `${(c.candidate_token_frac * 100).toFixed(0)}% changed beyond its ordinary range · ${(c.valid_event_frac * 100).toFixed(0)}% cloud-free`, before: `/data/candidates/${c.id}_pre.png`, after: `/data/candidates/${c.id}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra: [{ src: `/data/candidates/${c.id}_delta.png`, label: 'AI change cells (orange) on 08-27' }] }); }}
                       onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}>
                    <figure><img src={`/data/candidates/${c.id}_pre.png`} alt="before" loading="lazy" /><figcaption>PRE 08-12</figcaption></figure>
                    <figure><img src={`/data/candidates/${c.id}_post.png`} alt="after" loading="lazy" /><figcaption>POST 08-27</figcaption></figure>
                    <figure><img src={`/data/candidates/${c.id}_delta.png`} alt="AI change tokens" loading="lazy" /><figcaption>AI Δ</figcaption></figure>
                  </div>
                  <footer><span>{(c.candidate_token_frac * 100).toFixed(0)}% changed beyond its ordinary range · {(c.valid_event_frac * 100).toFixed(0)}% cloud-free</span>
                    <button onClick={() => showCandidate(c.id, 'post', { rank: c.rank, place: c.place, center: c.center_lonlat })}>GO TO MAP</button></footer>
                </article>
              ))}
            </div>
          )}
        {railTab === 'evidence' && (<>
              {scenario?.candidates?.retrieval && (
                <details className="retrieval-box">
                  <summary>EXPLORATORY SIMILARITY SEARCH · NOT THE 6-LEAD RANKING</summary>
                  <p className="cand-help"><b>Legacy single-pair retrieval</b> — query = change vectors of #{scenario.candidates.retrieval.query_windows.join(', #')} cells above the earlier single-pair p99. Kept for provenance; its Δ ranks are not used in the pooled-three-pair review list.</p>
                  <ol>
                    {scenario.candidates.retrieval.top10.slice(0, 8).map((r) => (
                      <li key={r.id}><b>{r.rank}</b><span>{r.place || r.id}</span><em>{(r.similar_token_frac * 100).toFixed(0)}% similar{r.delta_rank ? ` · Δ rank #${r.delta_rank}` : ''}</em>
                        {r.center_lonlat && <button onClick={() => showCandidate(r.id, 'post', { rank: r.rank, place: r.place, center: r.center_lonlat! })}>GO</button>}</li>
                    ))}
                  </ol>
                </details>
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
            <small>Diagnostic top six before the 40% observability and place-deduplication review filter. This is not the final six-lead list.</small>
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
            <small>{'Presto embeds each 10 m pixel\'s time series (128-d) with no spatial context; its 4×4 mean is compared on the same 40 m token grid. This separates "any foundation-model embedding delta works" from "OLMoEarth\'s spatial representation works". Presto is used outside its native 12-month contract (four dates per side, real months passed), so its number is a lower bound for Presto, not a verdict on Presto.'}</small>
          </div>
        )}
        {scenario?.radar_value && (
          <div className="ai-vs-card">
            <p className="eyebrow">RADAR THROUGH CLOUD · Sentinel-1 only, no optical</p>
            <strong>Radar-only OLMoEarth Δz localizes landslides (AUROC ≥ 0.70) in {scenario.radar_value.s1_only_usable}/{scenario.radar_value.regions} past disasters · beats classical radar log-ratio in {scenario.radar_value.s1_ai_beats_classical}/{scenario.radar_value.regions} · adding radar to clear optical helps in {scenario.radar_value.fusion_positive}/{scenario.radar_value.regions} but never by ≥ +0.03</strong>
            <table className="ai-vs-table"><thead><tr><th>region</th><th>S1 classical</th><th>S1 AI</th><th>S2 AI</th><th>S1+S2</th></tr></thead><tbody>
              {scenario.radar_value.rows.map((r) => <tr key={r.region} className={r.s1_only_ai >= 0.7 ? 'win' : ''}><td>{r.region}</td><td>{r.s1_classical.toFixed(2)}</td><td>{r.s1_only_ai.toFixed(2)}</td><td>{r.s2_only.toFixed(2)}</td><td>{r.s1s2.toFixed(2)}</td></tr>)}
            </tbody></table>
            <small>{'Same patches, dates and labels as the table above; S1 ascending in dB, four scenes per side. Radar is not a universal cloud-piercer under this 40 m contract — it works for some events (Hokkaido, Hiroshima) and sits at chance for others. Nepal\'s corridor radar screen (post dB fix) found nothing above variability; whether that is the event type or the contract is open.'}</small>
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
          <a href="https://sentinel-asia.org/EO/2026/article20260826NP.html" target="_blank" rel="noreferrer">Sentinel Asia products ↗</a>
          <a href="https://source.coop/planet/disasterdata/nepal-flash-flood-2026-08-26" target="_blank" rel="noreferrer">Planet crisis imagery ↗</a>
        </div>
        {/* O/E/P/H 4-layer 계약 — 설계 문서의 관측/증거/물리/공식 분리를 UI에 명시함.
            P·H는 아직 산출물이 없으므로 회색 placeholder로 정직하게 표시함. */}
        <div className="layer-contract">
          <span>LAYER CONTRACT</span>
          <div className="layer-contract-row on"><b>O</b><span>Observation — S1 VV/VH · S2 12-band · masks</span><em>ACTIVE</em></div>
          <div className={`layer-contract-row ${scenario?.corridor_sealed ? 'on' : 'off'}`}><b>E</b><span>OLMo evidence — 768-d embedding · matched-location Δz screening</span><em>{scenario?.corridor_sealed ? 'ACTIVE' : 'PENDING'}</em></div>
          <div className="layer-contract-row off"><b>P</b><span>Physics — r.avaflow ensemble · D-Claw check</span><em>DESIGNED</em></div>
          <div className="layer-contract-row off"><b>H</b><span>Human/official — USGS · Sentinel Asia · Charter review</span><em>EXTERNAL</em></div>
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
        </>)}
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
        <div className={`story-overlay ${ko ? 'is-ko' : 'is-en'}`} ref={storyRef} role="dialog" aria-modal="true" aria-label="How to read this service">
          <div className="story-progress" style={{ width: `${storyProgress * 100}%` }} />
          <div className="story-lang" role="group" aria-label="Story language">
            <button className={!ko ? 'is-active' : ''} onClick={() => chooseStoryLang('en')}>EN</button>
            <button className={ko ? 'is-active' : ''} onClick={() => chooseStoryLang('ko')}>한국어</button>
          </div>
          <button className="story-close x-icon" onClick={() => { if (storyDefault) window.location.href = '/map'; else setStoryOpen(false); }} aria-label="Close story"></button>

          <section className="story-hero story-step">
            <p className="story-dateline">RASUWA, NEPAL · 26 AUG 2026 · {ko ? '갱신' : 'UPDATED'} {scenario ? kstStamp(scenario.generated_at) : '—'} KST</p>
            <h1>{ko ? <>네팔 산사태 이후,<br />AI가 위성사진 <em>100곳</em>을 훑었다</> : <>After the mountain fell,<br />an AI searched <em>100 places</em> from orbit</>}</h1>
            <p className="story-deck">{ko
              ? '재난 탐지용으로 따로 학습시킨 AI가 아니라, 지구 관측용 범용 AI였다. 사건 전후 위성사진을 비교해 사람이 먼저 확인할 6곳을 추려냈다.'
              : 'This was not a purpose-built disaster detector. A general Earth model compared before and after, and left six places for people to check first.'}</p>
            <div className="story-funnel" role="img" aria-label={ko ? '100곳을 훑어 47곳을 판독했고, 그중 6곳을 우선순위로 남겼다. 피해로 확정한 곳은 아직 없다.' : 'We scanned 100 windows, could read 47, and kept six as priorities. No damage has been confirmed yet.'}>
              <div><b>{scenario?.review?.funnel.scanned ?? 100}</b><span>{ko ? '스캔' : 'scanned'}</span></div><i>→</i>
              <div><b>{scenario?.review?.funnel.observable ?? 47}</b><span>{ko ? '판독 가능' : 'observable'}</span></div><i>→</i>
              <div className="lead"><b>{scenario?.review?.funnel.leads ?? 6}</b><span>{ko ? '먼저 볼 곳' : 'inspect first'}</span></div><i>·</i>
              <div className="zero"><b>0</b><span>{ko ? '확인 라벨' : 'verified labels'}</span></div>
            </div>
            <p className="story-lede">{ko
              ? '8월 26일 랑탕 리룽에서 무너져 내린 바위와 얼음, 물이 렌데 계곡을 타고 국경 마을 라수와가디를 덮친 뒤 트리슐리 강 하류로 흘러갔다. 센티넬-2 위성이 사건 다음 날 계곡을 다시 찍었고, 이 페이지는 그 사진에서 평소와 유난히 달라진 곳을 좁혀 나간 과정을 담았다.'
              : 'On 26 August, rock, ice and meltwater broke loose on Langtang Lirung, swept down the Lhende valley through the border village of Rasuwagadhi, and ran on down the Trishuli. Sentinel-2 imaged the valley the next day; this page follows how that picture was narrowed to the places most unlike their ordinary selves.'}</p>
            <div className="hero-answer"><span>{ko ? '한 줄 결론' : 'THE ANSWER IN ONE LINE'}</span><strong>{ko ? 'AI가 피해를 판정하지는 않았다. 다만 100곳을 전부 살펴야 했던 일이, 근거가 뚜렷한 6곳부터 보는 일로 바뀌었다.' : 'The AI did not judge damage. It turned the job of checking all 100 places into checking six well-evidenced ones first.'}</strong></div>
            <p className="story-disclosure">{ko ? <>모델: <a href="https://huggingface.co/allenai/OlmoEarth-v1-Base" target="_blank" rel="noreferrer">Ai2 OlmoEarth v1 Base</a>, 추가 학습 없음 · 입력: ESA Sentinel-2 · 참고: Sentinel-1, Planet</> : <>Model: <a href="https://huggingface.co/allenai/OlmoEarth-v1-Base" target="_blank" rel="noreferrer">Ai2 OlmoEarth v1 Base</a>, frozen · input: ESA Sentinel-2 · references: Sentinel-1, Planet</>}</p>
          </section>

          <section className="story-section story-step story-wide" id="story-chain">
            <p className="story-kicker">01 · {ko ? '사건 구조' : 'THE CHAIN OF PLACES'}</p>
            <h2>{ko ? '빙하가 무너져 내리며 바위와 녹은 물, 얼음이 뒤섞였고 20km를 흘러내려 마을을 덮쳤다' : 'The glacier gave way; rock, ice and water travelled twenty kilometres to the villages below'}</h2>
            <ol className="event-chain-list">{eventPoints.map((point, i) => <li key={point.id} className="chain-row" style={{ '--point-color': point.marker_color, '--reveal-delay': `${i * 90}ms` } as CSSProperties}><b>{point.stage}</b><div><strong>{point.name}</strong><span>{ko ? (CHAIN_LINE_KO[point.id] ?? point.story_ko) : (CHAIN_LINE_EN[point.id] ?? point.story)}</span></div><em>{point.distance_from_a_km.toFixed(1)} km</em></li>)}</ol>
            <div className="control-explainer"><b>C · {ko ? '비교할 대조 지역' : 'CONTROL WINDOW'}</b><p>{ko ? '사건과 상관없는 조용한 계곡에도 같은 계산을 적용했다. 평소 수준이 어느 정도인지 보여주는 비교 기준이다.' : controlPoints[0]?.story}</p></div>
            <p className="story-caption">{ko ? '여기까지는 사람이 정리한 경로이고, C는 사건과 무관한 비교 대상 지역이다. 반면 AI가 고른 것은 알파벳으로 표시한 지점이 아니라 지도 위 사각형 6곳이다.' : 'Everything above is a chain assembled by people; C is the off-event control. What the AI actually chose are the six rectangles on the map.'}</p>
          </section>

          <section className="story-section story-step story-wide" id="story-satellite">
            <p className="story-kicker">02 · {ko ? '위성이 본 것' : 'WHAT THE SATELLITES SAW'}</p>
            <h2>{ko ? '국경에서 나타난 회색 띠가 47km 하류에서도 이어졌다' : 'The grey band at the border continues 47 km downstream'}</h2>
            <div className="evidence-pairs">
              <article><header><span>A · IMPACT</span><strong>Rasuwagadhi</strong></header>{sceneById('s2-2026-08-12') && sceneById('s2-2026-08-27') && <div className="story-swipe compact" style={{ ['--swipe' as string]: `${swipe}%` }}><img src={sceneById('s2-2026-08-27')!.image} alt="Rasuwagadhi Sentinel-2 post-event" /><div className="swipe-clip"><img src={sceneById('s2-2026-08-12')!.image} alt="Rasuwagadhi Sentinel-2 pre-event" /></div><div className="swipe-bar" /><span className="swipe-label pre">08-12</span><span className="swipe-label post">08-27</span><input type="range" min={0} max={100} value={swipe} aria-label="Compare Rasuwagadhi before and after" onChange={(e) => setSwipe(Number(e.target.value))} /></div>}<p>{ko ? '센티넬-2 위성이 8월 12일과 27일에 찍은 사진이다. 가운데 손잡이를 끌면 사건 전후가 바뀐다.' : 'Sentinel-2, 12 and 27 August. Drag the handle.'}</p></article>
              <article><header><span>F · DOWNSTREAM</span><strong>Bidur / Trishuli</strong></header><div className="fixed-pair zoomable" role="button" tabIndex={0} onClick={() => bidurPre && bidurPost && openLightbox({ title: 'F · Bidur / Trishuli', sub: 'Sentinel-2 · 2.56 km · tile 45RUL', before: bidurPre.image, after: bidurPost.image, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27' })}>{bidurPre && <figure><img src={bidurPre.image} alt="Bidur Sentinel-2 before event" /><figcaption>PRE · 08-12</figcaption></figure>}{bidurPost && <figure><img src={bidurPost.image} alt="Bidur Sentinel-2 after event" /><figcaption>POST · 08-27</figcaption></figure>}<span className="zoom-hint">⤢ enlarge</span></div><p>{ko ? '국경에서 47km 떨어진 하류다. 원래 수집 목록에는 없었지만 옆 구역 사진을 뒤지다 찾아냈다.' : '47 km below the border, recovered from the adjacent tile 45RUL that the original catalog missed.'}</p></article>
            </div>
            <p className="story-takeaway">{ko ? '사건 다음 날 사진에서는 국경 지역과 47km 하류 모두 강 주변의 폭과 색이 달라져 있었다. 상류에서 시작된 흐름이 어디까지 내려갔는지, 위성은 그 궤적을 회색 띠로 이어 보여준다. 다만 위성사진만으로 피해 범위를 확정하기는 어렵다.' : 'In the day-after image the river had changed width and colour both at the border and 47 km downstream — the satellite draws the track of the flow as one grey band. Imagery alone, though, cannot fix the boundary of damage.'}</p>
            <details className="story-details story-gallery-details">
              <summary>{ko ? '추가 위성 증거 보기 · 6개 지점, Planet 3.8m, SWIR·NDWI' : 'See more satellite evidence · six locations, Planet 3.8 m, SWIR and NDWI'}</summary>
            <div className="distance-matrix">
              {['source', 'rasuwagadhi', 'timure', 'syabrubesi', 'dhunche', 'bidur'].map((name, i) => <div key={name} className="zoomable" role="button" tabIndex={0} title={ko ? '클릭하면 크게 비교' : 'Click to compare large'} onClick={() => openLightbox({ title: name === 'source' ? 'Langtang Lirung source' : name.charAt(0).toUpperCase() + name.slice(1), sub: 'Sentinel-2 · 08-12 ⇄ 08-27', before: `/data/story/anchors/${name}_pre.png`, after: `/data/story/anchors/${name}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27' })} onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLElement).click(); }}><b>{i + 1}</b><span>{name === 'source' ? 'SOURCE · Langtang Lirung' : name.toUpperCase()}</span><figure><img src={`/data/story/anchors/${name}_pre.png`} alt={`${name} before`} /></figure><i>→</i><figure><img src={`/data/story/anchors/${name}_post.png`} alt={`${name} after`} /></figure></div>)}
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
            </details>
            <p className="story-caption">{ko ? '모든 비교는 8월 12일과 27일 사진으로 이뤄졌다. 넓어진 회색 띠는 토사가 쓸고 간 자리로 보이지만, 사람이 직접 확인하기 전까지는 변화 후보로만 다뤘다. 발원지와 둔체는 구름과 눈에 가려 판독이 어려웠다.' : 'Every pair compares 12 and 27 August. The widened grey band reads like the wake of debris, but until people confirm it on the ground it is treated as a candidate for change, nothing more. The source area and Dhunche stayed hidden under cloud and snow.'}</p>
          </section>

          <section className="story-section story-step story-wide" id="story-ai">
            <p className="story-kicker">03 · {ko ? 'AI 모델이 계산한 것' : 'WHAT THE AI COMPUTED'}</p>
            <h2>{ko ? 'AI는 평시 상황과 어떻게 달라졌는지만 살펴본다' : 'The AI asks one question: how unlike its ordinary self has this place become'}</h2>
            <p>{ko
              ? 'Ai2에서 만든 OlmoEarth에 최신 위성영상을 적용해, 40m 격자마다 그동안 쌓인 관측을 768개의 숫자로 요약한다. 같은 장소의 사건 전 숫자와 사건 후 숫자가 얼마나 달라졌는지 측정하고, 평소라면 2주 사이에 어떻게 변했는지와 견줬다. 이 재난을 위해 새로 학습시킨 것은 없다. 이미 지구를 배워둔 모델에게 이 계곡의 어제와 오늘을 보여주고, 평소보다 얼마나 낯설어졌는지 물었을 뿐이다. 낯선 격자가 많은 구역부터 사람이 보도록 순서를 매겼다.'
              : 'We fed the newest imagery to OlmoEarth, the open Earth model from Ai2, which distils the observation record into 768 numbers for every 40 m cell. We measured how far each place moved between before and after, and compared that with how far it normally drifts in a fortnight. Nothing was retrained for this disaster: a model that had already learned the Earth was shown the valley of yesterday and today, and asked how unfamiliar it had become. The windows with the most unfamiliar cells went to the top of the queue.'}</p>
            <div className="story-proof-strip">
              <div><b>①</b><strong>{ko ? '같은 장소' : 'Same place'}</strong><span>{ko ? '사건 전 · 사건 후' : 'before · after'}</span></div>
              <i>→</i><div><b>②</b><strong>Δz</strong><span>{ko ? '임베딩 거리 (얼마나 바뀌었는지 측정)' : 'embedding distance — how much it changed'}</span></div>
              <i>→</i><div><b>③</b><strong>{ko ? '평시와 비교' : 'Ordinary baseline'}</strong><span>{ko ? '평시 전이 3개' : 'three transitions'}</span></div>
              <i>→</i><div><b>④</b><strong>{ko ? '검토 순위' : 'Review rank'}</strong><span>{ko ? '피해 판정 아님' : 'not a verdict'}</span></div>
            </div>
            {scenario?.ai_vs_classical && (
              <details className="story-details story-method-details">
                <summary>{ko ? `과거 재해 9곳에서 미리 검증해 봤다 · 고전 변화탐지보다 ${scenario.ai_vs_classical.ahead}/${scenario.ai_vs_classical.regions} 지역에서 앞섬` : `Past-disaster validation · ahead of classical change in ${scenario.ai_vs_classical.ahead}/${scenario.ai_vs_classical.regions} regions`}</summary>
                <p className="story-caption">{ko ? '같은 자료, 같은 라벨, 같은 지표 위에 AI와 고전 변화탐지를 나란히 세웠다. 무대는 Sen12-Landslides에 기록된 과거 재해 9곳이다. 표의 AUROC는 산사태 격자가 비산사태 격자보다 높은 점수를 받을 확률로, 0.5면 동전 던지기이고 1.0이면 완벽한 구분이다.' : 'AI against classical change detection on the same data, labels and metric (Sen12-Landslides, nine past disasters). AUROC is the probability that a landslide cell outranks a non-landslide cell.'}</p>
                <table className="story-table"><thead><tr><th>{ko ? '지역' : 'region'}</th><th>{ko ? '고전' : 'classical'}</th><th>OlmoEarth</th><th>Δ</th></tr></thead><tbody>
                  {scenario.ai_vs_classical.rows.map((r) => <tr key={r.region}><td>{r.region}</td><td>{r.classical_best.toFixed(2)}</td><td>{r.ai?.toFixed(2) ?? '—'}</td><td>{r.gain != null ? (r.gain >= 0 ? '+' : '') + r.gain.toFixed(2) : '—'}</td></tr>)}
                </tbody></table>
                <p className="story-caption">{ko ? `${scenario.ai_vs_classical.ahead}/${scenario.ai_vs_classical.regions} 지역에서 앞섰고 ${scenario.ai_vs_classical.wins_at_005}/${scenario.ai_vs_classical.regions}은 사전에 정한 +0.05 이상이다.` : `Ahead in ${scenario.ai_vs_classical.ahead} of ${scenario.ai_vs_classical.regions}; ${scenario.ai_vs_classical.wins_at_005} of ${scenario.ai_vs_classical.regions} clear the pre-registered +0.05 margin.`}</p>
              </details>
            )}
            {scenario?.presto_control && (
              <details className="story-details story-method-details">
                <summary>{ko ? `다른 AI 모델과도 견줘 봤다 · OlmoEarth가 ${scenario.presto_control.olmo_ahead_by_003}/${scenario.presto_control.regions} 지역에서 +0.03 이상` : `Second-model comparison · OlmoEarth ≥ +0.03 in ${scenario.presto_control.olmo_ahead_by_003}/${scenario.presto_control.regions} regions`}</summary>
                <p>{ko ? `같은 패치·같은 날짜·같은 라벨에 두 번째 공개 모델(Presto, 픽셀 시계열 모델)을 넣어 봤다. 올모어스가 +0.03 이상 앞선 지역은 ${scenario.presto_control.olmo_ahead_by_003}/${scenario.presto_control.regions}, Presto 혼자 0.60을 넘긴 지역은 ${scenario.presto_control.presto_above_chance_060}/${scenario.presto_control.regions}다. Presto는 본래 12개월 시계열용이라 네 시점만 주는 이 계약은 Presto에게 불리하다. 그래서 이 표는 “Presto가 못한다”가 아니라 “픽셀만 보는 표현으로는 같은 조건에서 이 차이가 안 나온다”는 뜻이다.` : `A second public model (Presto, a pixel time-series model) was given the same patches, dates and labels. OlmoEarth leads by ≥ +0.03 in ${scenario.presto_control.olmo_ahead_by_003} of ${scenario.presto_control.regions} regions; Presto alone clears 0.60 in ${scenario.presto_control.presto_above_chance_060} of ${scenario.presto_control.regions}. Presto is built for twelve-month sequences, so four dates per side is a contract that works against it. Read the table as "a pixel-only representation does not reproduce this separation under the same conditions", not as a verdict on Presto.`}</p>
                <table className="story-table"><thead><tr><th>{ko ? '지역' : 'region'}</th><th>Presto</th><th>OlmoEarth</th><th>Δ</th></tr></thead><tbody>
                  {scenario.presto_control.rows.map((r) => <tr key={r.region}><td>{r.region}</td><td>{r.presto_s2.toFixed(2)}</td><td>{r.olmo_s2?.toFixed(2) ?? '—'}</td><td>{r.gap_s2 != null ? (r.gap_s2 >= 0 ? '+' : '') + r.gap_s2.toFixed(2) : '—'}</td></tr>)}
                </tbody></table>
              </details>
            )}
            {scenario?.radar_value && (
              <details className="story-details story-method-details">
                <summary>{ko ? `구름 아래에서는 레이더로도 해봤다 · 강한 신호는 ${scenario.radar_value.s1_only_usable}/${scenario.radar_value.regions} 지역` : `Radar-through-cloud experiment · strong signal in ${scenario.radar_value.s1_only_usable}/${scenario.radar_value.regions} regions`}</summary>
                <p>{ko
                  ? '몬순의 히말라야에서 광학 위성은 확률 싸움이다. 그래서 레이더(센티넬-1)만으로 같은 일이 되는지 과거 재해 7곳에서 쟀다. 홋카이도와 히로시마에서는 레이더만으로도 산사태 라벨을 분리했고(AUROC 0.77, 0.73), 나머지 다섯 곳은 약했다. 흐린 날짜로 다시 고정한 M80에서는 실제로 맑은 비율 10% 장면을 확보한 곳이 홋카이도와 알래스카뿐이었다. 홋카이도 레이더 신호는 0.770으로 유지됐지만 알래스카는 0.497이었다. 즉 구름 아래 가능성은 한 지역에서만 확인됐고 일반화되지 않았다. 광학에 레이더를 더한 이득도 모든 지역에서 +0.03 미만이었다.'
                  : 'Optical satellites in a monsoon Himalaya are a matter of odds, so we tested radar-only OlmoEarth representations across seven past disasters. Radar separated the landslide labels in Hokkaido and Hiroshima (AUROC 0.77 and 0.73) but was weak in the other five. M80 then fixed the post period to cloudy dates; only Hokkaido and Alaska actually supplied scenes near 10% clear. Hokkaido retained a 0.770 radar signal while Alaska sat at 0.497. This is one-region evidence that a radar representation can survive cloud, not a general cloud-piercing claim. Adding radar to optical remained below the +0.03 gain gate everywhere.'}</p>
                <table className="story-table"><thead><tr><th>{ko ? '지역' : 'region'}</th><th>{ko ? '레이더 고전' : 'radar classical'}</th><th>{ko ? '레이더 AI' : 'radar AI'}</th><th>{ko ? '광학 AI' : 'optical AI'}</th><th>{ko ? '둘 다' : 'both'}</th></tr></thead><tbody>
                  {scenario.radar_value.rows.map((r) => <tr key={r.region}><td>{r.region}</td><td>{r.s1_classical.toFixed(2)}</td><td>{r.s1_only_ai.toFixed(2)}</td><td>{r.s2_only.toFixed(2)}</td><td>{r.s1s2.toFixed(2)}</td></tr>)}
                </tbody></table>
              </details>
            )}
            <h3>{ko ? '네팔에서는' : 'In Nepal'}</h3>
            <div className="story-nepal-result">
              {([
                { id: 'v003', num: '13.3%', title: ko ? '달페디(Dalphedi) · 1위' : 'Dalphedi · #1', desc: ko ? '평소 범위를 벗어난 격자가 가장 많았다. 국경에서 강을 따라 6km 아래, 하도가 가장 크게 넓어진 곳이다.' : '40 m cells beyond ordinary range', sub: 'review lead #1' },
                { id: 'x001', num: '1.3%', title: ko ? '타디 콜라(Tadi Khola) · 대조 지역' : 'Tadi Khola · control', desc: ko ? '사건과 무관한 동쪽 계곡. 같은 계산에서 평소와 거의 다르지 않았다 — 이 숫자가 “조용한 상태”의 기준선이다.' : 'near ordinary level outside the event', sub: 'control valley' },
                { id: 'v064', num: '21%', title: ko ? '살레(Salê) · 재관측' : 'Salê · re-observe', desc: ko ? '변화 신호는 있었지만 구름 없이 보인 부분이 21%뿐이었다. 판정을 미루고 다음 관측을 기다리기로 했다.' : 'too little cloud-free evidence', sub: 're-observe' },
              ] as const).map((c) => (
                <article key={c.id} role="button" tabIndex={0} title={ko ? '클릭하면 위성 전후 비교' : 'Click to compare'}
                  onClick={() => { const pw = planetWinsRef.current[c.id]; openLightbox({ title: c.title, sub: `${c.sub} · scan window ${c.id}`, before: `/data/candidates/${c.id}_pre.png`, after: `/data/candidates/${c.id}_post.png`, beforeLabel: 'PRE · 08-12', afterLabel: 'POST · 08-27', extra: [{ src: `/data/candidates/${c.id}_delta.png`, label: 'AI change tokens (orange) on 08-27' }, ...(pw ? [{ src: pw.file, label: `PlanetScope 3.8 m · ${pw.datetime.slice(0, 10)} · © Planet Labs PBC CC-BY-NC-4.0` }] : [])] }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLElement).click(); }}>
                  <b>{c.num}</b><strong>{c.title}</strong><span>{c.desc}</span>
                </article>
              ))}
            </div>
            <p className="story-takeaway">{ko ? 'AI가 건넨 것은 정답이 아니라 순서다. 사람의 시간을 어디에 먼저 쓸지 — 변화 신호가 커도 구름에 가려 잘 보이지 않는 곳은 뒤로 미뤘다.' : 'What the AI handed over is not six answers but an order — where human time should go first. Even a strong signal was pushed back when cloud hid too much of the window.'}</p>
            <details className="story-details">
              <summary>{ko ? '6곳은 AI가 어떻게 골랐을까' : 'See how the six were selected and how the lower river scored'}</summary>
            {scenario?.placebo_extended && <p>{ko ? `“평소 범위”를 2주 한 쌍이 아니라 세 쌍(5월 중순→7월 초까지)으로 넓혀 다시 재봤다. 몬순이 시작되는 6→7월이 평소 변동이 가장 커서 문턱은 ${scenario.placebo_extended.threshold_each.P1?.toFixed(3)}에서 ${scenario.placebo_extended.threshold_pooled3.toFixed(3)}으로 올라갔고, 후보 격자 비율은 대략 절반이 됐다. 그러나 순서는 그대로다(순위 상관 ${scenario.placebo_extended.spearman_vs_single_pair?.toFixed(2)}). 이 페이지가 퍼센트보다 순위를 앞세우는 이유다.` : `We then widened the "ordinary range" from one fortnight pair to three (mid-May to early July). The June→July pair, when the monsoon arrives, is the noisiest, so the threshold rose from ${scenario.placebo_extended.threshold_each.P1?.toFixed(3)} to ${scenario.placebo_extended.threshold_pooled3.toFixed(3)} and the flagged share roughly halved. The order did not move (rank correlation ${scenario.placebo_extended.spearman_vs_single_pair?.toFixed(2)}). That is why this page leads with order, not percentages.`}</p>}
            <p>{ko
              ? '강 회랑·주변 산사면·렌데 상류에 2.56km 창 100개를 놓고 같은 계산을 했다. 사건 후 구름과 눈 때문에 47개만 판독할 수 있었고, 세 개의 평시쌍으로 보정한 뒤 관측 가능성 40% 이상·같은 마을 중복 제거 규칙을 통과한 6곳을 우선 검토 리드로 남겼다. 1위 달페디는 13.3%였고, 사건이 보고되지 않은 타디 콜라 대조 창은 사건 거리 0.129와 평시 0.125가 거의 같으며 초과 비율도 1.3%였다. 강 밖 살레는 신호가 11.9%지만 관측 가능성이 21%뿐이라 리드가 아니라 재관측 목록이다.'
              : 'We placed 100 windows across the river corridor, nearby hillslopes and the upstream Lhende valley. Cloud and snow left 47 observable. After calibrating against three ordinary transitions, six passed the pre-declared review rule: at least 40% observable and one lead per place. Dalphedi ranks first at 13.3%. The no-reported-event Tadi Khola control has nearly equal event and ordinary distances (0.129 vs 0.125) and only 1.3% exceedance. Off-river Salê carries an 11.9% signal but only 21% observable, so it is held for re-observation rather than promoted as a lead.'}</p>
            {scenario?.downstream_profile && scenario.downstream_profile.length > 0 && (
              <div className="story-table-wrap">
                <h3>{ko ? '추적 끝(G, 갈치) 쪽으로 갈수록' : 'Toward the end of the trace (G, Galchhi)'}</h3>
                <p>{ko ? '세 개 평시쌍 문턱으로 다시 계산하면 갈치 창은 3.1%, 바로 위 두 창은 4.5%와 4.2%다. 1위 달페디 13.3%보다 낮아 검토 우선순위가 뒤로 간다. 이것은 “하류에 영향이 없었다”는 결론이 아니라, 이 해상도·관측일·임베딩 계약에서 상대적으로 덜 이례적이었다는 뜻이다.' : 'Under the pooled three-transition threshold, the Galchhi window is 3.1% and the next two upstream are 4.5% and 4.2%, below Dalphedi at 13.3%. That lowers their review priority; it does not establish that downstream areas were unaffected. It only says they were less unusual under this resolution, acquisition date and embedding contract.'}</p>
                <table className="story-table"><thead><tr><th>{ko ? '창' : 'window'}</th><th>{ko ? 'G까지 km' : 'km to G'}</th><th>{ko ? '표시 격자' : 'flagged cells'}</th><th>{ko ? '관측 가능' : 'observable'}</th><th>{ko ? '순위/100' : 'rank of 100'}</th></tr></thead><tbody>
                  {scenario.downstream_profile.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.km_to_G.toFixed(1)}</td><td>{r.candidate_token_frac != null ? (100 * r.candidate_token_frac).toFixed(1) + '%' : '—'}</td><td>{r.observable != null ? Math.round(100 * r.observable) + '%' : '—'}</td><td>{r.rank ?? '—'}</td></tr>)}
                </tbody></table>
              </div>
            )}
            </details>
            <p className="story-caption">{ko ? '덧붙여 두자면, 이 화면 자체는 사람이 만들었다. AI가 계산한 것은 파일로 봉인돼 있고, 지도와 타임라인은 그 파일을 읽어서 보여줄 뿐이다.' : 'One footnote: this screen itself is human-made. What the model computed is sealed in files; the map and timeline merely read them.'}</p>
          </section>

          {scenario?.geomorph && (
          <section className="story-section story-step story-wide">
            <p className="story-kicker">04 · {ko ? '지형' : 'THE TERRAIN'}</p>
            <h2>{ko ? '강물이 좁은 협곡을 빠져나와 넓은 계곡을 만나는 곳마다 흔적이 크게 남았다' : 'Wherever the river left its narrow gorge for a wide valley floor, it left its mark'}</h2>
            <div className="story-zone-summary">
              <article><b>{ko ? '상류 협곡' : 'UPPER GORGE'}</b><strong>{scenario.geomorph.zone1.length_km} km · −{scenario.geomorph.zone1.drop_m.toFixed(0)} m</strong><span>{ko ? `가장 좁은 곳 ${scenario.geomorph.zone1.narrowest.valley_width_km} km` : `narrowest floor ${scenario.geomorph.zone1.narrowest.valley_width_km} km`}</span></article>
              <article><b>{ko ? '국경 아래' : 'BELOW BORDER'}</b><strong>{ko ? `강을 찍은 격자 ${scenario.geomorph.zone2.n_windows}개` : `${scenario.geomorph.zone2.n_windows} river windows`}</strong><span>{ko ? `계곡 바닥이 넓을수록 AI가 감지한 변화도 컸다 · 상관계수 ρ ${scenario.geomorph.zone2.correlations.valley_width_km?.spearman.toFixed(2)}` : `the wider the valley floor, the more change the AI saw · ρ ${scenario.geomorph.zone2.correlations.valley_width_km?.spearman.toFixed(2)}`}</span></article>
            </div>
            <p className="story-takeaway">{ko ? '지형을 보면 변화 후보가 강의 어느 지점에 몰렸는지 설명이 된다. 다만 물의 속도나 깊이, 도달 시간까지 계산한 물리 시뮬레이션과는 다르다.' : 'Terrain explains where the candidates cluster along the river. It is not a physics simulation of speed, depth or arrival time.'}</p>
            <details className="story-details"><summary>{ko ? 'DEM 분석과 상관계수 자세히 보기' : 'See DEM analysis and correlations'}</summary><p>{ko
              ? `발원지에서 국경까지 하도는 ${scenario.geomorph.zone1.length_km} km, 낙차는 ${scenario.geomorph.zone1.drop_m.toFixed(0)} m다. 국경 아래에서는 ${scenario.geomorph.zone2.n_windows}개 창을 비교했다. 계곡 바닥 폭과 AI 변화의 순위 상관은 ${scenario.geomorph.zone2.correlations.valley_width_km?.spearman.toFixed(2)}(p ${scenario.geomorph.zone2.correlations.valley_width_km?.p.toFixed(2)})였고, 기복이 큰 협착 구간은 반대 방향(${scenario.geomorph.zone2.correlations.relief_m?.spearman.toFixed(2)})이었다. 사건 하나의 탐색 결과이며 위험 예측 모형이 아니다.`
              : `The channel runs ${scenario.geomorph.zone1.length_km} km and drops ${scenario.geomorph.zone1.drop_m.toFixed(0)} m from source to border. Below the border, ${scenario.geomorph.zone2.n_windows} windows were compared. Valley-floor width correlates with AI change at ${scenario.geomorph.zone2.correlations.valley_width_km?.spearman.toFixed(2)} (p ${scenario.geomorph.zone2.correlations.valley_width_km?.p.toFixed(2)}), while high-relief confined reaches move in the opposite direction (${scenario.geomorph.zone2.correlations.relief_m?.spearman.toFixed(2)}). This is exploratory evidence from one event, not a hazard model.`}</p></details>
          </section>
          )}
          <section className="story-section story-step story-wide" id="story-trust">
            <p className="story-kicker">05 · {ko ? '틀렸던 것' : 'WHAT WE GOT WRONG'}</p>
            <h2>{ko ? '레이더 단위 하나가 뒤집은 결과 둘' : 'One radar unit, two retracted results'}</h2>
            <div className="story-correction"><div><span>{ko ? '철회' : 'WITHDRAWN'}</span><b>9.8%</b><small>{ko ? '잘못된 S1 단위가 만든 회랑 결과' : 'corridor result inflated by wrong S1 units'}</small></div><i>→</i><div><span>{ko ? '재계산' : 'RECOMPUTED'}</span><b>27/27</b><small>{ko ? '사건 변화가 평시 범위 안' : 'event change inside ordinary range'}</small></div></div>
            <p>{ko ? '센티넬-1 레이더 자료를 선형 강도 값으로 넣었는데, AI는 데시벨 단위를 전제하고 있었다. 오류를 바로잡아 다시 계산했고 잘못 나온 결과와 후보 지역은 철회했다. 공개한 결과에는 광학 위성인 센티넬-2로 계산한 100개 구역만 남겼다.' : 'Sentinel-1 radar was fed as linear intensity where the model expected decibels. We fixed the unit, recomputed, and retracted the affected results and candidates. The public record keeps only the 100 windows computed from optical Sentinel-2.'}</p>
            <details className="story-details"><summary>{ko ? '오류가 결과에 미친 영향 자세히 보기' : 'See exactly how the error changed the result'}</summary><p>{ko ? '데시벨로 바꾼 뒤 5개 앵커와 회랑 27창 모두에서 사건 전후 거리가 평시 범위 안으로 돌아왔다. 레이더 단독 회랑 평균도 사건 0.03, 평시 0.06이었다. 렌데 후보와 레이더 24번 창을 함께 철회했다.' : 'After conversion to dB, the before/after distance returned inside the ordinary range at all five anchors and all 27 corridor windows. The radar-only corridor mean was 0.03 for the event and 0.06 ordinarily. The Lhende and radar-window-24 candidates were withdrawn with it.'}</p></details>
          </section>

          <section className="story-section story-step story-wide">
            <p className="story-kicker">06 · {ko ? '연구자분들께' : 'FOR RESEARCHERS'}</p>
            <h2 className="story-note-title">{ko ? '검증 자료를 남겨두었습니다' : 'The full record is kept below'}</h2>
            <p>{ko ? <>모델 설정과 변화 점수, 검증 결과, 철회 내역, 코드 경로를 모두 남겨두었습니다. 궁금한 점이나 나누고 싶은 이야기가 있다면 언제든 편하게 <a href="mailto:iameastroot@gmail.com">이메일</a>로 연락 주세요</> : 'The model contract, change scores, validation, retractions and code paths are all preserved below. Questions and conversations are always welcome.'}</p>
            <details className="story-details story-research-details">
              <summary>{ko ? '재현 정보 전체 펼치기 · 모델, 수식, 검증, 코드' : 'Open the reproducibility record · model, score, validation and code'}</summary>
            <div className="research-list">
              <div><b>{ko ? '모델' : 'Model'}</b><span>OlmoEarth v1 Base (Ai2), frozen, patch 4, 768-d tokens at 40 m. Optical scan: Sentinel-2 L2A, 12 bands, 256 px × 2.56 km windows. Sealed contract: Sentinel-1 RTC in dB + Sentinel-2, 4 periods × 14 d.</span></div>
              <div><b>{ko ? '변화 점수' : 'Change score'}</b><span>Δz = 1 − cos(z_before, z_after) per token; before = mean over three baseline dates (3 Jul, 23 Jul, 7 Aug), after = 27 Aug. Ordinary range = p99 of the same statistic over placebo pairs (three pairs, 19 May → 3 Jul; pooled p99 {scenario?.placebo_extended?.threshold_pooled3.toFixed(3) ?? '0.317'}). Tokens brighter than B02 &gt; 2600 in the base mean or target are excluded; windows with &lt; 20% valid tokens are not judged.</span></div>
              <div><b>{ko ? '검증' : 'Validation'}</b><span>Sen12-Landslides: AI vs classical 9/9 (M73); Presto control 6/7 (M79); radar-only 2/7, fusion gain &lt; +0.03 everywhere (M78, M80). Nepal controls: Tadi Khola 1.3%, pre-registered p009 1.0% vs Dalphedi 13.3% under the pooled threshold (M77, M81, M82).</span></div>
              <div><b>{ko ? '철회' : 'Retracted'}</b><span>Rasuwagadhi 9.8% token exceedance and the Lhende / radar-window-24 candidates: Sentinel-1 fed as linear intensity where the model expects dB (M75/M76).</span></div>
              <div><b>{ko ? '코드·장부' : 'Code and ledger'}</b><span>github: DDanggle/eo-rasuwa — code/corridor_s2_candidates_*.py, corridor_placebo_extended.py, corridor_geomorph.py, sen12_*.py; MEASURED_FINDINGS.md M66–M85; artifacts/*/report.json with SHA-256. Public bundle: nepal-live-twin.</span></div>
              <div><b>{ko ? '열린 질문' : 'Open questions'}</b><span>{ko ? '동결한 외부 범위(M86: 창 규모 무판별)와의 40 m 토큰 규모 대조; 다른 사건(Gorkha 2015)에서 계곡 폭–변화 상관 재현; 두 번째 실제 흐린 지역의 레이더 성능; 두 번째 광학 FM(Prithvi/Clay) 같은 계약.' : 'Token-scale (40 m) comparison against the frozen external extents (M86 found window scale non-discriminative); replication of valley-width/change correlation on another event (Gorkha 2015); radar performance in a second truly cloudy region; a second optical FM (Prithvi/Clay) under the same contract.'}</span></div>
            </div>
            </details>
          </section>

          <section className="story-section story-step story-boundary" id="story-next">
            <p className="story-kicker">07 · {ko ? '마지막으로' : 'FINALLY'}</p>
                        {ko ? (<>
              <p>마지막으로 데이터를 갱신한 날은 8월 31일이다. 세 기관 — IWM, TASA, JAXA — 이 발표한 홍수 지도를 손대지 않고 그대로 가져왔고, 이쪽의 순위와 기준도 바꾸지 않았다. 여기에 AI가 매긴 우선순위 6곳을 얹으면 어떻게 될까.</p>
              <p>결과는 6곳 모두 홍수 범위 안에 있었다. 다만 AI가 고르지 않은 곳들도 대부분 같은 범위 안에 있었다. 2.56km 격자 단위의 대조만으로는 이 우선순위를 명확하게 가려낼 수 없다는 뜻이다. 남은 일은 같은 지도를 40m 격자로 잘게 쪼개 다시 대보는 것이다.</p>
              <p>홍수가 강을 따라 내려가며 남긴 피해는 숫자 바깥에 있다. 지금도 많은 사람이 구조와 회복을 기다린다. AI로 우선순위를 더 빨리 찾는 일은 계속하겠지만, 가장 먼저 할 일은 생명을 살리고 일상을 되돌리는 것이다. 작은 후원이 수십 명의 생명을 구할 수 있다 — <a href="https://donation.nrcs.org/" target="_blank" rel="noreferrer">네팔 적십자사</a>·<a href="https://www.ifrc.org/emergency/nepal-flash-floods-2026" target="_blank" rel="noreferrer">IFRC ↗</a> / <a href="https://www.unicef.org/nepal/flooding-nepal-2026-0" target="_blank" rel="noreferrer">UNICEF ↗</a>·<a href="https://www.icrc.org/en/donate" target="_blank" rel="noreferrer">ICRC</a></p>
            </>) : (<>
              <p>The data was last refreshed on 31 August. Flood maps from three agencies — IWM, TASA and JAXA — were taken exactly as published, and nothing on our side was retuned. What happens when the six AI-ranked priorities are laid on top?</p>
              <p>All six fall inside the flood extent. But so do most of the windows the AI did not choose. At a 2.56 km grid this comparison can neither confirm nor refute the ranking — the flood simply ran too long along the river. The next step is to cut the same maps into 40 m cells and try again.</p>
              <p>What the flood left along the river is larger than any number on this page. People are waiting for rescue and recovery right now. We will keep working on faster AI triage, but the first thing is saving lives and rebuilding. A small donation goes a long way — <a href="https://donation.nrcs.org/" target="_blank" rel="noreferrer">Nepal Red Cross</a>·<a href="https://www.ifrc.org/emergency/nepal-flash-floods-2026" target="_blank" rel="noreferrer">IFRC ↗</a> / <a href="https://www.unicef.org/nepal/flooding-nepal-2026-0" target="_blank" rel="noreferrer">UNICEF ↗</a>·<a href="https://www.icrc.org/en/donate" target="_blank" rel="noreferrer">ICRC</a></p>
            </>)}
            <div className="story-schedule">{(scenario?.scheduled_scenes ?? []).map((scene) => <div key={scene.id ?? scene.acquired_at} className={scene.state === 'missed_coverage' ? 'missed' : ''}><b>{shortSensor(scene.sensor)}</b><span>{kstStamp(scene.acquired_at)} KST</span><em>{scene.state.replace(/_/g, ' ').toUpperCase()}</em></div>)}</div>
            <div className="story-sources"><a href="https://www.usgs.gov/media/images/2026-nepal-debris-avalanche-and-flash-flood-map" target="_blank" rel="noreferrer">USGS preliminary extent ↗</a><a href="https://sentinel-asia.org/EO/2026/article20260826NP.html" target="_blank" rel="noreferrer">Sentinel Asia products ↗</a><a href="https://www.who.int/nepal/emergencies/2026-rasuwa-flash-floods" target="_blank" rel="noreferrer">WHO health response ↗</a><a href="https://allenai.org/blog/olmoearth-embeddings" target="_blank" rel="noreferrer">Ai2 OlmoEarth ↗</a><a href="https://planetarycomputer.microsoft.com/docs/quickstarts/using-the-data-api/" target="_blank" rel="noreferrer">Planetary Computer STAC ↗</a><a href="https://source.coop/planet/disasterdata" target="_blank" rel="noreferrer">Planet Disaster Data ↗</a></div>
            <p className="story-outro">{scenario?.research.integration_disclaimer}</p>
          </section>

          <footer className="story-foot">
            <p>{ko ? <>이 페이지는 개인 분석 프로젝트이며 기부를 받지 않습니다. 긴급 구호와 관련한 공식 페이지가 열려 있습니다 — 꼭 확인해보세요: <a href="https://donation.nrcs.org/" target="_blank" rel="noreferrer">네팔 적십자사</a>·<a href="https://www.ifrc.org/emergency/nepal-flash-floods-2026" target="_blank" rel="noreferrer">IFRC ↗</a> / <a href="https://www.unicef.org/nepal/flooding-nepal-2026-0" target="_blank" rel="noreferrer">UNICEF ↗</a>·<a href="https://www.icrc.org/en/donate" target="_blank" rel="noreferrer">ICRC</a></> : <>This is a personal analysis project and accepts no donations. Official emergency-relief pages are open — please have a look: <a href="https://donation.nrcs.org/" target="_blank" rel="noreferrer">Nepal Red Cross</a>·<a href="https://www.ifrc.org/emergency/nepal-flash-floods-2026" target="_blank" rel="noreferrer">IFRC ↗</a> / <a href="https://www.unicef.org/nepal/flooding-nepal-2026-0" target="_blank" rel="noreferrer">UNICEF ↗</a>·<a href="https://www.icrc.org/en/donate" target="_blank" rel="noreferrer">ICRC</a></>}</p>
            <p>{ko ? '문의' : 'Contact'}: <a href="mailto:iameastroot@gmail.com">{ko ? '이메일' : 'email'}</a> · <a href="https://github.com/DDanggle/eo-rasuwa" target="_blank" rel="noreferrer">github ↗</a></p>
            <p className="foot-disclaimer">{ko
              ? '독립 개인 연구 데모이며 Ai2·ESA/Copernicus·Planet Labs 및 링크된 구호 기관과 제휴·보증 관계가 없습니다.'
              : 'An independent personal research demo — not affiliated with or endorsed by Ai2, ESA/Copernicus, Planet Labs, or the relief organisations linked here.'}</p>
          </footer>
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
              <div className={lbZoom ? 'lb-single zoomed' : 'lb-single'}
                onClick={(e) => {
                  if (lbZoom) { setLbZoom(null); return; }
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setLbZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                }}>
                <img src={lightbox.extra![lbExtra].src} alt={lightbox.extra![lbExtra].label}
                  style={lbZoom ? { transform: 'scale(2.6)', transformOrigin: `${lbZoom.x}% ${lbZoom.y}%` } : undefined} />
                <span className="swipe-label post">{lightbox.extra![lbExtra].label}</span>
                <span className="lb-zoom-hint">{lbZoom ? 'CLICK TO RESET' : 'CLICK TO ZOOM ×2.6'}</span>
              </div>
            )}
            <footer>
              {lightbox.leadIndex != null && (
                <span className="lb-stepper">
                  <button onClick={() => openLeadLightbox(lightbox.leadIndex! - 1)} aria-label="Previous lead">‹ PREV</button>
                  <b>LEAD {lightbox.leadIndex + 1} / {leadRows.length || 6}</b>
                  <button onClick={() => openLeadLightbox(lightbox.leadIndex! + 1)} aria-label="Next lead">NEXT ›</button>
                </span>
              )}
              <button className={lbExtra === null ? 'is-active' : ''} onClick={() => { setLbExtra(null); setLbZoom(null); }}>BEFORE ⇄ AFTER</button>
              {(lightbox.extra ?? []).map((x, i) => <button key={x.src} className={lbExtra === i ? 'is-active' : ''} onClick={() => { setLbExtra(i); setLbZoom(null); }}>{x.label}</button>)}
              <span className="lb-tip">drag the handle · ESC closes</span>
            </footer>
          </div>
        </div>
      )}

      <div className="provenance-stamp">DATA SNAPSHOT {scenario?.generated_at.slice(0, 16).replace('T', ' ') ?? '—'} UTC · OSM ODbL · ESA COPERNICUS · PLANET DISASTER DATA (CC-BY-NC-4.0)</div>
    </main>
  );
}

export default function MapPage() {
  return <MapExperience />;
}
