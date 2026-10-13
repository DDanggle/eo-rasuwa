import type { Feature, FeatureCollection, Polygon } from 'geojson';

export type SourceProperties = {
  id: string; place: string; kind: string; center_lonlat: [number, number];
  candidate_token_frac_pooled3: number; valid_event_frac: number;
  review_rank: number | null; review_status: string;
};
export type WindowRecord = {
  id: string; place: string; kind: string; center: [number, number];
  change: number; observed: number; leadRank: number | null; geometry: Polygon;
};
export type ReviewStatus = 'unreviewed' | 'imagery' | 'field-check' | 'hold' | 'reviewed';
export type ReviewNote = { status: ReviewStatus; note: string };
export type ReviewNotes = Record<string, ReviewNote>;
export type DecisionData = {
  windows: WindowRecord[];
  reobserveIds: string[];
  counts: { scanned: number; observable: number; leads: number; confirmed: number };
  threshold: number;
  sourceVersion: string;
  sourceHashes: Record<string, string>;
};
export const CONTRACT = 'nepal-s2-pooled-three-pair-review';
export const BOUNDARY = 'Review priorities, not confirmed damage, damaged area, cause, or probability. Optical ordinary transitions are not fully time-matched. Windows overlap; counts are not administrative-area coverage.';

export function normalizeWindows(collection: FeatureCollection<Polygon, SourceProperties>): WindowRecord[] {
  const ids = new Set<string>();
  return collection.features.map(({ properties: p, geometry }) => {
    if (!p || !/^v\d{3}$/.test(p.id) || ids.has(p.id)) throw new Error('Invalid or duplicate window ID');
    if (![p.candidate_token_frac_pooled3, p.valid_event_frac].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error(`Invalid fractions: ${p.id}`);
    if (!geometry || geometry.type !== 'Polygon' || !p.center_lonlat?.every(Number.isFinite)) throw new Error(`Invalid geometry: ${p.id}`);
    ids.add(p.id);
    return { id: p.id, place: p.place, kind: p.kind, center: p.center_lonlat,
      change: p.candidate_token_frac_pooled3, observed: p.valid_event_frac,
      leadRank: p.review_status === 'lead' ? p.review_rank : null, geometry };
  }).sort((a, b) => b.change - a.change || a.id.localeCompare(b.id));
}

export function parseNotes(raw: string | null, ids: string[]): ReviewNotes {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result: ReviewNotes = {};
    for (const [id, entry] of Object.entries(value)) {
      if (!ids.includes(id) || !entry || typeof entry !== 'object') continue;
      if (!['unreviewed', 'imagery', 'field-check', 'hold', 'reviewed'].includes(entry.status) || typeof entry.note !== 'string') continue;
      result[id] = { status: entry.status, note: entry.note.slice(0, 1000) };
    }
    return result;
  } catch { return {}; }
}

export function exportSelection(data: DecisionData, ids: string[], notes: ReviewNotes, exportedAt: string) {
  const chosen = data.windows.filter(w => ids.includes(w.id));
  const features: Feature<Polygon>[] = chosen.map(w => ({
    type: 'Feature', id: w.id, geometry: w.geometry,
    properties: {
      id: w.id, place: w.place, geography_type: 'analysis_window',
      published_review_rank: w.leadRank,
      ordinary_threshold_exceedance_fraction: w.change,
      valid_token_fraction: w.observed,
      geometry_role: 'analysis_window_not_damage_extent',
      validation_status: 'no_field_validated_damage_label',
      administrative_area: null, facility_intersection_count: null, population_estimate: null,
      missing_context_reason: 'administrative_facility_population_joins_not_performed',
      local_review_status: notes[w.id]?.status ?? 'unreviewed',
      local_review_note: notes[w.id]?.note ?? '',
      note_scope: 'browser_local_analyst_note_not_independent_verification',
    },
  }));
  return {
    type: 'FeatureCollection' as const,
    schema: 'nepal-decision-support-export/v1',
    analysis_contract: CONTRACT,
    source_version: data.sourceVersion,
    source_sha256: data.sourceHashes,
    exported_at: exportedAt,
    observation_dates: { baseline: ['2026-07-03', '2026-07-23', '2026-08-07'], post: '2026-08-27' },
    threshold_p99: data.threshold,
    selection_rule: 'analyst_selected_subset_sorted_by_published_pooled_three_pair_change_fraction',
    limitations: BOUNDARY,
    attribution: 'Donggeun Yi / Nepal Live Twin; ESA Copernicus Sentinel-2; Ai2 OlmoEarth v1 Base.',
    license: 'CC-BY-4.0 for source Sentinel-derived review data; analyst notes are user supplied.',
    features,
  };
}

export function evidenceBrief(data: DecisionData, ids: string[], notes: ReviewNotes, exportedAt: string): string {
  const pack = exportSelection(data, ids, notes, exportedAt);
  const rows = pack.features.map(f => {
    const w = data.windows.find(row => row.id === f.id)!;
    const note = notes[w.id];
    return [
      `## ${w.place} (${w.id})`,
      `Published lead rank: ${w.leadRank ?? 'not a published lead'}.`,
      `Ordinary-threshold exceedance: ${(w.change * 100).toFixed(2)}% of valid tokens.`,
      `Observable share: ${(w.observed * 100).toFixed(2)}% of this analysis window.`,
      `Local review status: ${note?.status ?? 'unreviewed'} (not a damage verdict).`,
      `Analyst note (user supplied): ${note?.note || 'None.'}`,
      `Evidence map: https://eo-rasuwa.dev/map?focus=${w.id}`,
    ].join('\n\n');
  });
  return [
    '# Nepal regional review brief',
    'Independent research demo developed for an ESCWA application portfolio. No ESCWA or UN affiliation, endorsement, or integration is claimed.',
    `Exported: ${exportedAt}\n\nSource version: ${data.sourceVersion}\n\nAnalysis contract: ${CONTRACT}`,
    `Selected windows: ${rows.length}. The full optical sample contains ${data.counts.scanned} windows; ${data.counts.observable} were observable and ${data.counts.leads} were published review leads.`,
    'Post-event observation: 27 August 2026. Scoring baseline: 3 July, 23 July, and 7 August 2026. The displayed before image is an illustrative 12 August scene, not the scoring baseline composite.',
    BOUNDARY,
    ...rows,
    '## Unavailable context',
    'Administrative-boundary, facility, and population joins have not been performed. No local note establishes confirmed damage.',
    '## Sources',
    'Source geometry and scores: /data/candidates.geojson and /data/review-leads.geojson. Method and review contract: /data/scenario.json. Code: https://github.com/DDanggle/eo-rasuwa',
    ...Object.entries(data.sourceHashes).map(([path, hash]) => `${path}: SHA-256 ${hash}`),
    'Attribution: Donggeun Yi / Nepal Live Twin; ESA Copernicus Sentinel-2; Ai2 OlmoEarth v1 Base. Source review data: CC-BY-4.0.',
  ].join('\n\n') + '\n';
}
