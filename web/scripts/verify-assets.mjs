import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const scenario = JSON.parse(await readFile(resolve(root, 'public/data/scenario.json'), 'utf8'));
const hydrography = JSON.parse(await readFile(resolve(root, 'public/data/hydrography.geojson'), 'utf8'));

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
assert.equal(scenario.scheduled_scenes.find((scene) => scene.id === 's2c_20260829')?.state, 'acquired_pending_catalog');
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

console.log(JSON.stringify({ scenes: scenario.scene_records.length, anchors: scenario.olmoearth.anchors, route_points: hydrography.simulation_route.length, wasm_particles: count, map_worker_bytes: mapWorker.length + mapWorkerShared.length }, null, 2));
