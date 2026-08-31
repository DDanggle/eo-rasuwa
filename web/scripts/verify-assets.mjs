import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const scenario = JSON.parse(await readFile(resolve(root, 'public/data/scenario.json'), 'utf8'));
const hydrography = JSON.parse(await readFile(resolve(root, 'public/data/hydrography.geojson'), 'utf8'));
const observableGeojson = JSON.parse(await readFile(resolve(root, 'public/data/candidates.geojson'), 'utf8'));
const reviewLeadsGeojson = JSON.parse(await readFile(resolve(root, 'public/data/review-leads.geojson'), 'utf8'));

assert.equal(scenario.schema, 'olmoearth-nepal-live-twin/v2');
assert.ok(scenario.scene_records.length >= 9);
assert.ok(scenario.scene_records.some((scene) => scene.id === 's2-2026-08-27'));
assert.equal(scenario.olmoearth.anchors, 5);
assert.equal(scenario.research.confirmatory_transfer.regions, 8);
assert.equal(scenario.research.confirmatory_transfer.wins_reuse_vs_raw_strong, 6);
assert.equal(scenario.research.ai_run_ledger.length, 6);
const rerunDone = scenario.input_contract_audit?.five_anchor_rerun?.status === 'recomputed';
assert.ok(['corrected', 'corrected_and_rerun'].includes(scenario.input_contract_audit?.status));
if (rerunDone) {
  assert.notEqual(scenario.olmoearth.post_event_delta?.status, 'superseded_missing_sentinel1_db_transform');
  assert.equal(scenario.research.ai_run_ledger.find((run) => run.id === 'nepal_pre_event_representation')?.state, 'EXECUTED');
} else {
  assert.equal(scenario.olmoearth.post_event_delta?.status, 'superseded_missing_sentinel1_db_transform');
  assert.equal(scenario.research.ai_run_ledger.find((run) => run.id === 'nepal_pre_event_representation')?.state, 'SUPERSEDED');
}
if (!rerunDone) assert.match(scenario.research.ai_run_ledger.find((run) => run.id === 'nepal_pre_event_representation')?.output ?? '', /preserved legacy rasters.*excluded/);
assert.equal(scenario.research.ai_run_ledger.find((run) => run.id === 'pre_event_forecast')?.state, 'NEGATIVE_RESULT');
assert.equal(scenario.research.ai_run_ledger.find((run) => run.id === 'nepal_post_event_delta')?.state, rerunDone ? 'EXECUTED' : 'SUPERSEDED');
assert.equal(scenario.research.ai_run_ledger.find((run) => run.id === 'matched_second_geofm')?.state, 'NOT_RUN');
assert.equal(scenario.corridor_sealed?.schema, 'corridor-sealed-delta-s1db-v1');
assert.equal(scenario.corridor_sealed?.windows, 27);
assert.equal(scenario.corridor_sealed?.top.length, 6);
assert.equal(scenario.corridor_sealed?.top[0].id, 'w23');
assert.equal(scenario.corridor_sealed?.max_exceedance, 17 / 4096);
assert.equal(scenario.corridor_sealed?.comparison.ordinary_transition_count, 1);
assert.equal(scenario.downstream_visual.purpose, 'visual_only_downstream_context_not_part_of_five_anchor_olmo_contract');
assert.deepEqual(scenario.downstream_visual.records.map((record) => record.label), ['pre', 'post']);
assert.ok(scenario.points.find((point) => point.id === 'E')?.display_label === 'SOURCE ESTIMATE');
assert.ok(scenario.points.find((point) => point.id === 'E')?.map_label === 'E · SOURCE');
assert.ok(scenario.points.find((point) => point.id === 'C')?.in_event_chain === false);
assert.ok(scenario.points.find((point) => point.id === 'C')?.map_label === 'C · CONTROL');
assert.ok(scenario.points.find((point) => point.id === 'G')?.map_label === 'G · GALCHHI');
assert.ok(['not_run_in_this_web_snapshot', 'executed_offline_with_delta_provenance'].includes(scenario.olmoearth.embedding_status));
assert.ok(['published', 'selected', 'materialized', 'sealed'].includes(scenario.live_observation.catalog_status));
assert.equal(scenario.live_observation.olmo_ready, true);
assert.equal(scenario.live_observation.selection_preflight_valid, true);
assert.equal(scenario.live_observation.materialization_seal_valid, true);
assert.equal(scenario.live_observation.materialization_status, 'sealed_olmo_input');
if (rerunDone) { assert.equal(scenario.headline?.sealed_total, 5); assert.ok(scenario.headline?.matched); }
else { assert.equal(scenario.headline?.sealed_total, null); assert.equal(scenario.headline?.matched, undefined); }
assert.ok(scenario.candidates && scenario.candidates.windows >= 27);
if (!rerunDone) assert.equal(scenario.research.nepal_embedding.status, 'five_anchor_superseded_missing_s1_db_transform');
assert.match(scenario.event.evidence_status, /contract-correct 27-window OLMoEarth screening is complete/i);
assert.equal(scenario.live_observation.coverage_status, 'operational_anchors_covered');
assert.equal(scenario.live_observation.operational_anchor_count, 5);
if (rerunDone) { assert.ok(['NOT DETECTED ABOVE VARIABILITY', 'REVIEW CANDIDATE EVIDENCE'].includes(scenario.decision.action)); }
else { assert.equal(scenario.decision.action, 'RERUN FIVE-ANCHOR CONTRACT'); assert.equal(scenario.decision.status, 'hold'); assert.match(scenario.decision.reason, /dB transform/); }
assert.ok(scenario.ops_log.some((event) => event.type === 'SEAL_INVALID'));
assert.ok(scenario.ops_log.some((event) => event.type === 'COVERAGE_PASS'));
assert.ok(scenario.ops_log.some((event) => event.type === (rerunDone ? 'DELTA_REPORT' : 'DELTA_SUPERSEDED')));
assert.ok(scenario.ops_log.some((event) => event.type === 'S1DB_SCREENING'));
// 2026-08-31 카탈로그 스냅샷 20260831T041914Z: s2c 8/29, s1d 8/31 모두 published 확인.
assert.equal(scenario.scheduled_scenes.find((scene) => scene.id === 's2c_20260829')?.state, 'published');
assert.equal(scenario.scheduled_scenes.find((scene) => scene.id === 's1d_20260831')?.state, 'published');
assert.equal(scenario.provenance.catalog_snapshot, '20260831T041914Z');
// M86 외부 라벨 채점 (2026-08-31): 동결 라벨, 순위 불변, 창 규모 무판별 판정.
assert.equal(scenario.external_label_score?.measurement_id, 'M86');
assert.equal(scenario.external_label_score?.ranking_unchanged, true);
assert.equal(scenario.external_label_score?.precision_at_6_vector_union, 1);
assert.ok(scenario.external_label_score?.non_lead_base_rate_vector_union > 0.85);
assert.equal(scenario.external_label_score?.verdict, 'window_scale_not_discriminative');
assert.equal(new Set(scenario.ops_log.map((event) => event.event_id)).size, scenario.ops_log.length);
assert.equal(scenario.live_observation.cloud_cover_tile_pct, null);
assert.match(scenario.live_observation.product_name, /^S1D_IW_GRDH_1SDV_20260828/);
assert.equal(scenario.simulation.claim, 'illustrative_kinematic_preview_not_hazard_forecast');
assert.ok(scenario.simulation.mapped_route_km_from_border > 70);
assert.equal(scenario.simulation.reported_total_travel_km, 100);
assert.equal(scenario.simulation.trace_endpoint.name, 'Galchhi reach-search endpoint');
assert.equal(scenario.corridor_contract.expected_windows, 27);
assert.equal(scenario.corridor_contract.expected_layers_per_window, 8);
assert.equal(scenario.corridor_contract.baseline.total_layers, 216);
assert.equal(scenario.corridor_contract.s1_live.total_layers, 216);
assert.equal(scenario.corridor_contract.placebo_b.total_layers, 216);
assert.equal(scenario.corridor_contract.placebo_b.embedded_windows, 27);
assert.equal(scenario.corridor_contract.stage, 'screening_complete');
assert.ok(hydrography.simulation_route.length >= 40 && hydrography.simulation_route.length <= 96);
assert.ok(hydrography.features.length >= 11 && hydrography.features.length <= 20); // 2026-08-29: Galchhi 방향 연장으로 15

// Public result contract: the landing page, map and downloads must all expose
// the same pooled-three-pair score, not the superseded single-pair ranking.
assert.deepEqual(scenario.review.funnel, { scanned: 100, observable: 47, leads: 6, confirmed_damage_labels: 0 });
assert.equal(Object.values(scenario.review.by_zone).reduce((sum, row) => sum + row.total, 0), 100);
assert.equal(Object.values(scenario.review.by_zone).reduce((sum, row) => sum + row.observable, 0), 47);
assert.equal(scenario.review.threshold, scenario.placebo_extended.threshold_pooled3);
assert.equal(scenario.review.download, '/data/review-leads.geojson');
assert.equal(scenario.review.all_observable_download, '/data/candidates.geojson');
assert.equal(scenario.candidates.geojson.features.length, 100);
assert.equal(observableGeojson.features.length, 47);
assert.equal(reviewLeadsGeojson.features.length, 6);
assert.deepEqual(scenario.review.leads.map((lead) => lead.rank), [1, 2, 3, 4, 5, 6]);
assert.equal(new Set(scenario.review.leads.map((lead) => lead.id)).size, 6);
assert.ok(scenario.review.leads.every((lead) => lead.observable >= 0.4));
assert.ok(scenario.review.reobserve.every((lead) => lead.observable < 0.4));
assert.ok(scenario.review.reobserve.some((lead) => lead.id === 'v064'));
assert.ok(!scenario.review.leads.some((lead) => lead.id === 'v064'));
assert.ok(scenario.review.leads.every((lead) => lead.external_reports.verified_by_this_build === false));

const scanById = new Map(scenario.candidates.geojson.features.map((feature) => [feature.properties.id, feature]));
const observableIds = new Set(observableGeojson.features.map((feature) => feature.properties.id));
for (const lead of scenario.review.leads) {
  const feature = scanById.get(lead.id);
  assert.ok(feature, `lead ${lead.id} is absent from the scan`);
  assert.equal(feature.properties.review_status, 'lead');
  assert.equal(feature.properties.review_rank, lead.rank);
  assert.ok(Math.abs(feature.properties.candidate_token_frac - lead.candidate_token_frac) < 0.001);
  assert.ok(observableIds.has(lead.id));
}
assert.deepEqual(reviewLeadsGeojson.features.map((feature) => feature.properties.id), scenario.review.leads.map((lead) => lead.id));
for (const feature of observableGeojson.features) {
  assert.equal(feature.properties.status, 'ranked');
  assert.ok(Number.isInteger(feature.properties.rank_pooled3));
  assert.equal(feature.properties.rank, feature.properties.rank_pooled3);
  assert.equal(feature.properties.candidate_token_frac, feature.properties.candidate_token_frac_pooled3);
  assert.ok(['lead', 'screened', 'reobserve'].includes(feature.properties.review_status));
}
for (const feature of scenario.candidates.geojson.features) {
  const id = feature.properties.id;
  assert.match(id, /^v\d{3}$/);
  assert.ok(['lead', 'reobserve', 'screened', 'unobservable'].includes(feature.properties.review_status));
  for (const suffix of ['pre', 'post', 'delta']) {
    const file = await stat(resolve(root, `public/data/candidates/${id}_${suffix}.png`));
    assert.ok(file.size > 1_000, `${id}_${suffix}.png is missing or truncated`);
  }
}
for (const row of scenario.downstream_profile) {
  const feature = scanById.get(row.id);
  assert.equal(row.candidate_token_frac, feature.properties.candidate_token_frac);
  assert.equal(row.rank, feature.properties.rank);
}

for (const scene of scenario.scene_records) {
  const image = await readFile(resolve(root, 'public', scene.image.slice(1)));
  assert.ok(image.length > 1_000, `${scene.id} rendered image is unexpectedly small`);
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(scene.coordinates.length, 4);
  assert.match(scene.source_sha256, /^[a-f0-9]{64}$/);
}

for (const row of scenario.corridor_sealed.top) {
  for (const path of [row.pre_image, row.post_image, row.delta_image]) {
    const image = await readFile(resolve(root, 'public', path.slice(1)));
    assert.ok(image.length > 1_000, `${path} is unexpectedly small`);
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
}

const wasmBytes = await readFile(resolve(root, 'public/wasm/nepal_flow.wasm'));
const mapWorker = await readFile(resolve(root, 'public/maplibre-gl-worker.mjs'));
const mapWorkerShared = await readFile(resolve(root, 'public/maplibre-gl-shared.mjs'));
assert.ok(mapWorker.length > 10_000, 'MapLibre worker entry is missing or truncated');
assert.ok(mapWorkerShared.length > 100_000, 'MapLibre shared worker bundle is missing or truncated');
const instantiated = await WebAssembly.instantiate(wasmBytes, {});
const wasm = instantiated.instance.exports;
assert.equal(wasm.abi_version(), 1);
wasm.clear_route();
hydrography.simulation_route.forEach(([lon, lat], index) => wasm.set_route_point(index, lon, lat));
wasm.reset(20260826);
wasm.step(0.016, 0.034);
const count = wasm.particle_count();
assert.equal(count, 280);
const values = new Float32Array(wasm.memory.buffer, wasm.particles_ptr(), count * 3);
assert.ok(values.every(Number.isFinite));
assert.ok(values[0] > 80 && values[0] < 90);
assert.ok(values[1] > 20 && values[1] < 35);

console.log(JSON.stringify({ scenes: scenario.scene_records.length, anchors: scenario.olmoearth.anchors, scanned_windows: scenario.review.funnel.scanned, observable_windows: observableGeojson.features.length, review_leads: reviewLeadsGeojson.features.length, route_points: hydrography.simulation_route.length, wasm_particles: count, map_worker_bytes: mapWorker.length + mapWorkerShared.length }, null, 2));
