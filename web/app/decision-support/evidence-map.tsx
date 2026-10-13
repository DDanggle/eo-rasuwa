'use client';
import { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { WindowRecord } from './model';
import styles from './workspace.module.css';

export default function EvidenceMap({ windows, active, selected, onPick, ko }: {
  windows: WindowRecord[]; active: string; selected: string[]; onPick: (id: string) => void; ko: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const pick = useRef(onPick);
  const [failed, setFailed] = useState(false);
  useEffect(() => { pick.current = onPick; }, [onPick]);
  useEffect(() => {
    if (!host.current) return;
    let instance: Map;
    try {
      setWorkerUrl('/maplibre-gl-worker.mjs');
      instance = new Map({ container: host.current, center: [85.3, 28.12], zoom: 9,
        attributionControl: { compact: true },
        style: { version: 8, sources: {
          terrain: { type: 'raster', tileSize: 256, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}'], attribution: 'Hillshade © Esri' },
        }, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#f6f5f1' } }, { id: 'terrain', type: 'raster', source: 'terrain', paint: { 'raster-opacity': 0.38, 'raster-saturation': -1 } }] },
      });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- WebGL availability can only be determined when mounting the map
      setFailed(true); return;
    }
    map.current = instance;
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    instance.on('load', () => {
      instance.addSource('windows', { type: 'geojson', data: { type: 'FeatureCollection', features: windows.map(w => ({ type: 'Feature', geometry: w.geometry, properties: { id: w.id, lead: w.leadRank !== null } })) } });
      instance.addLayer({ id: 'windows-fill', type: 'fill', source: 'windows', paint: { 'fill-color': ['case', ['get', 'lead'], '#eb6834', '#9db8cc'], 'fill-opacity': 0.12 } });
      instance.addLayer({ id: 'windows-outline', type: 'line', source: 'windows', paint: { 'line-color': ['case', ['get', 'lead'], '#eb6834', '#7a97ab'], 'line-width': 1 } });
      instance.addSource('centres', { type: 'geojson', data: { type: 'FeatureCollection', features: windows.map(w => ({ type: 'Feature', geometry: { type: 'Point', coordinates: w.center }, properties: { id: w.id, lead: w.leadRank !== null } })) } });
      instance.addLayer({ id: 'centres', type: 'circle', source: 'centres', paint: { 'circle-radius': ['case', ['get', 'lead'], 6, 3], 'circle-color': ['case', ['get', 'lead'], '#eb6834', '#9db8cc'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } });
      instance.addSource('focus', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      instance.addLayer({ id: 'focus', type: 'line', source: 'focus', paint: { 'line-color': ['case', ['get', 'active'], '#16151a', '#2a78d6'], 'line-width': ['case', ['get', 'active'], 3, 2] } });
      instance.on('click', 'windows-fill', e => { const id = e.features?.[0]?.properties?.id; if (typeof id === 'string') pick.current(id); });
      instance.on('mouseenter', 'windows-fill', () => { instance.getCanvas().style.cursor = 'pointer'; });
      instance.on('mouseleave', 'windows-fill', () => { instance.getCanvas().style.cursor = ''; });
    });
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(host.current);
    return () => { resize.disconnect(); instance.remove(); map.current = null; };
  }, [windows]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const update = () => {
      const source = instance.getSource('focus') as GeoJSONSource | undefined;
      source?.setData({ type: 'FeatureCollection', features: windows.filter(w => w.id === active || selected.includes(w.id)).map(w => ({ type: 'Feature', geometry: w.geometry, properties: { active: w.id === active } })) });
      const w = windows.find(w => w.id === active);
      if (w) instance.easeTo({ center: w.center, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400 });
    };
    update();
    instance.on('load', update);
    return () => { instance.off('load', update); };
  }, [active, selected, windows]);
  return <div className={styles.mapWrap}>
    <div ref={host} className={styles.map} role="region" aria-label={ko ? '관측 가능한 47개 분석 창 지도' : 'Map of 47 observable analysis windows'} />
    <div className={styles.mapLabel}><b>RASUWA → BIDUR</b><span>{ko ? '관측된 분석 창 · 피해 경계 아님' : 'Analysis windows · not damage boundaries'}</span></div>
    <div className={styles.mapLegend}><span><i />{ko ? '검토 후보' : 'Published lead'}</span><span><i className={styles.otherDot} />{ko ? '그 외 관측 창' : 'Other observable window'}</span></div>
    {failed && <p className={styles.mapFailure}>{ko ? '이 브라우저에서 지도를 표시할 수 없습니다. 아래 목록과 근거 자료를 이용하세요.' : 'The map is unavailable in this browser. All records and evidence remain available in the list.'}</p>}
  </div>;
}
