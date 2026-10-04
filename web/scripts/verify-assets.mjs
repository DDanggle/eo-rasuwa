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
// 2026-09-04: 8/31 레이더는 스와스가 5개 앵커를 못 덮어 봉인 계약 대신 M92 별도 스캔으로 분석됨.
assert.equal(scenario.scheduled_scenes.find((scene) => scene.id === 's1d_20260831')?.state, 'analysed_partial_swath');
assert.equal(scenario.scheduled_scenes.find((scene) => scene.id === 's2a_20260831')?.state, 'published');
assert.ok(scenario.ops_log.some((event) => event.type === 'RADAR_SCAN'));
assert.ok(scenario.ops_log.some((event) => event.type === 'RADAR_NOT_DETECTED'));
assert.equal(scenario.provenance.catalog_snapshot, '20260831T041914Z');
// M86 외부 라벨 채점 (2026-08-31): 동결 라벨, 순위 불변, 창 규모 무판별 판정.
assert.equal(scenario.external_label_score?.measurement_id, 'M86');
assert.equal(scenario.external_label_score?.ranking_unchanged, true);
assert.equal(scenario.external_label_score?.precision_at_6_vector_union, 1);
assert.ok(scenario.external_label_score?.non_lead_base_rate_vector_union > 0.85);
assert.equal(scenario.external_label_score?.verdict, 'window_scale_not_discriminative');
// M92 레이더 스캔 (2026-09-03): 같은 궤도 3v1, dB 입력, 지역 전체 무검출 + 국소 클러스터.
assert.equal(scenario.source_radar_scan?.measurement_id, 'M92');
assert.equal(scenario.source_radar_scan?.contract.orbit, 121);
assert.match(scenario.source_radar_scan?.contract.input_unit ?? '', /dB/);
assert.equal(scenario.source_radar_scan?.region_wide_result.verdict, 'not_detected_region_wide');
assert.equal(scenario.source_radar_scan?.observability.radar_readable, 56);
assert.ok(scenario.source_radar_scan?.region_wide_result.mean_d_event < scenario.source_radar_scan?.region_wide_result.mean_d_placebo);
// 2026-09-04 정정: 평시쌍을 사건쌍과 같은 시간 간격으로 재실행. 결론은 유지됨.
assert.equal(scenario.source_radar_scan?.contract.time_matched, true);
assert.equal(scenario.source_radar_scan?.contract.placebo_pair.target, '2026-08-07');
assert.ok(scenario.source_radar_scan?.correction?.date === '2026-09-04');
assert.ok(scenario.source_radar_scan?.local_cluster.permutation_p < 0.05);
assert.ok((scenario.source_radar_scan?.excluded.windows ?? []).includes('v094'));
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

// ── 2026-09-08: 발표된 헤드라인 숫자를 전부 검증기에 묶는다.
// 이 파일이 통과했는데도 사이트에 철회된 값이 살아 있었던 적이 있다. 다시는.
const ribbon = JSON.parse(await readFile(resolve(root, 'public/data/change-ribbon.geojson'), 'utf8'));
const glaciers = JSON.parse(await readFile(resolve(root, 'public/data/glaciers.geojson'), 'utf8'));
const neighborWindows = JSON.parse(await readFile(resolve(root, 'public/data/neighbors-windows.geojson'), 'utf8'));

// 강 길이: 합계와 두 스캔의 분해가 맞아야 한다
assert.equal(ribbon.observed_river_km, 621.0);
assert.equal(ribbon.total_river_km, 920.2);
assert.ok(Math.abs(ribbon.main_scan_river_km + ribbon.extension_river_km - ribbon.observed_river_km) < 0.5,
  'per-scan river km must sum to the published total');
assert.match(ribbon.claim, /not interchangeable thresholds/,
  'the ribbon must disclose that the two scans use separate threshold pools');

// 빙하: 통계 블록과 실제 피처 수가 어긋나면 안 된다
assert.equal(glaciers.stats.glaciers, 1100);
assert.equal(glaciers.features.length, glaciers.stats.glaciers);
assert.ok(Math.abs(glaciers.stats.total_km2 - 1141.3) < 0.1);

// 이웃 확장 스캔: 자기 신고 개수 = 실제 개수
assert.equal(neighborWindows.features.length, 251);
assert.match(neighborWindows.claim, /all 251 windows/);

// 격자 회계: "비교했다"가 아니라 스캔 1.4M / 채점 0.8M
assert.equal(scenario.cell_accounting.cells_scanned, 1_437_696);
assert.equal(scenario.cell_accounting.cells_scored, 811_008);
assert.equal(scenario.cell_accounting.windows_scanned * scenario.cell_accounting.tokens_per_window,
  scenario.cell_accounting.cells_scanned);

// 문턱: 발표값 고정. 그리고 시간정합 한계가 문서에 남아 있어야 한다
assert.ok(Math.abs(scenario.placebo_extended.threshold_pooled3 - 0.3170) < 0.0005);
assert.equal(scenario.review.leads[0].candidate_token_frac, 0.133);
assert.equal(scenario.points.find((pt) => pt.id === 'C').control_stats.candidate_token_frac_pooled3, 0.023);

// 철회된 값이 사용자 화면 문구로 되살아나지 않게 한다
const copy = await Promise.all(['app/map/page.tsx', 'app/page.tsx', 'app/layout.tsx']
  .map((f) => readFile(resolve(root, f), 'utf8')));
for (const text of copy) {
  assert.ok(!/only 1\.3% exceedance|Tadi Khola 1\.3%|초과 비율도 1\.3%/.test(text),
    'the retracted 1.3% control figure must not reappear in user-facing copy');
  assert.ok(!/compared 1\.4 million/.test(text),
    'say scanned/scored, not "compared", for the 1.4M cell count');
}

// data-release 사본은 사이트가 보여주는 것과 같은 파일이어야 한다
for (const f of ['change-ribbon.geojson', 'candidates.geojson', 'review-leads.geojson']) {
  const a = await readFile(resolve(root, '../data-release', f));
  const b = await readFile(resolve(root, 'public/data', f));
  assert.ok(a.equals(b), `data-release/${f} is out of sync with web/public/data/${f}`);
}

// M93 독립 궤도 복제: 두 트랙이 같은 획득을 공유하면 복제가 아니다
const orb = scenario.radar_orbit_replication;
assert.equal(orb.measurement_id, 'M93');
assert.notEqual(orb.reference_orbit, orb.replication_orbit, 'a replication must use a different orbit');
assert.equal(orb.gap_days_identical, true, 'both tracks must use identical base->target spacing');
assert.equal(orb.windows_ranked_in_both, 56);
assert.ok(orb.spearman > 0.7 && orb.spearman <= 1);
assert.ok(Math.abs(orb.threshold_ratio - 1) < 0.05, 'independent thresholds must agree within 5%');
assert.match(orb.claim_boundary, /still n=1|not evidence of damage/);

// M94 외부 발원 폴리곤 대조. 순위를 손대지 않았다는 것과 라이선스 표기가 계약이다.
const src = scenario.external_source_score;
assert.equal(src.measurement_id, 'M94');
assert.equal(src.ranking_unchanged, true);
assert.equal(src.labels_frozen.licence, 'CC-BY-SA-4.0');
assert.equal(src.windows_ranked, 56);
assert.equal(src.windows_flagged, 6);
for (const key of ['detachment_zone', 'barrier_lakes']) {
  const L = src[key];
  assert.ok(L.flagged_mean_overlap_frac > L.non_flagged_mean_overlap_frac,
    `${key}: flagged windows must overlap more than non-flagged for the claim to hold`);
  assert.ok(L.permutation_p_overlap < 0.05, `${key}: permutation p must be below 0.05`);
}
assert.match(src.claim_boundary, /FieldValidation = 0/);
assert.match(src.claim_boundary, /Not damage, not risk/);

// UNOSAT 레이어: share-alike 라이선스라 출처 표기가 파일에 남아 있어야 한다
const unosatFiles = ['detachment-zone', 'barrier-lakes', 'flood-extent', 'affected-roads',
  'affected-buildings', 'cultural-heritage'];
for (const f of unosatFiles) {
  const g = JSON.parse(await readFile(resolve(root, `public/data/unosat-${f}.geojson`), 'utf8'));
  assert.match(g.attribution ?? '', /UNOSAT \/ UNITAR.*CC-BY-SA-4\.0/,
    `unosat-${f}.geojson must carry the CC-BY-SA attribution`);
  assert.ok(g.features.length > 0, `unosat-${f}.geojson is empty`);
}
const detachFc = JSON.parse(await readFile(resolve(root, 'public/data/unosat-detachment-zone.geojson'), 'utf8'));
assert.ok(Math.abs(detachFc.area_km2 - src.detachment_zone.area_km2) < 0.01,
  'the published detachment area must match the area M94 scored against');

// 공식 기록은 인용이다. 출처와 시점이 없으면 인용이 아니다.
const rec = JSON.parse(await readFile(resolve(root, 'public/data/official-event-record.json'), 'utf8'));
assert.match(rec.source.author, /NDRRMA/);
assert.equal(rec.source.as_of_local, '2026-09-01T09:00:00+05:45');
assert.equal(rec.mechanism.type, 'ice-rock avalanche');
assert.equal(rec.mechanism.not, 'glacial lake outburst flood');
assert.equal(rec.timeline_local_npt.length, 8);
assert.equal(rec.hydrology.peak_discharge_m3s, 5850);
assert.match(rec.claim_boundary, /not a product of this project/);

// 확장 스캔: 순위가 매겨진 창은 모두 클릭해서 볼 프레임이 있어야 한다.
// 예전에는 상위 12개만 있어서 나머지를 누르면 숫자 한 줄만 나왔다.
const framesManifest = JSON.parse(await readFile(resolve(root, 'public/data/neighbors/frames-manifest.json'), 'utf8'));
const rankedNeighbors = neighborWindows.features.filter((f) => f.properties.status === 'ranked');
assert.equal(framesManifest.windows, rankedNeighbors.length,
  'every ranked extension window must have rendered frames');
for (const f of rankedNeighbors) {
  const id = f.properties.id;
  for (const rel of [`public/data/neighbors/frames/${id}_pre.webp`,
                     `public/data/neighbors/frames/${id}_post.webp`,
                     `public/data/neighbors/frames/${id}_delta.png`]) {
    const st = await stat(resolve(root, rel)).catch(() => null);
    assert.ok(st && st.size > 200, `missing or truncated ${rel}`);
  }
}

// M95 결합. 커버리지 산술이 맞아야 하고, 공통 척도 가정(귀무 ≈1%)이 성립해야 한다.
const fus = scenario.modality_fusion;
assert.equal(fus.measurement_id, 'M95');
const H = fus.headline;
assert.equal(H.windows_total, 100);
assert.equal(H.optical_readable, 47);
assert.equal(H.fused_readable, H.optical_readable + H.radar_rescues,
  'fused coverage must equal optical readable plus what radar rescues');
assert.equal(H.fused_readable + H.still_unreadable, H.windows_total);
assert.equal(fus.sensor_overlap.radar_only, H.radar_rescues);
// 두 센서의 귀무 초과율이 1% 근처가 아니면 한 목록에 올릴 근거가 없다
for (const k of ['optical', 'radar']) {
  assert.ok(fus.null_check[k] > 0.002 && fus.null_check[k] < 0.02,
    `${k} placebo exceedance ${fus.null_check[k]} is not near the 1% the common scale assumes`);
}
assert.match(fus.threshold_asymmetry.bias_direction, /radar windows mildly favoured/);
assert.match(fus.claim_boundary, /extends coverage, it does not improve accuracy/);
assert.ok(fus.cross_sensor_agreement.n <= 10,
  'if the both-readable overlap grows, the weak-check wording must be revisited');

// M96 크기 사다리: 네 크기, 파라미터 단조 증가, 그리고 결론이 야드스틱 한계를 함께 말해야 한다
const lad = scenario.scaling_ladder;
assert.equal(lad.measurement_id, 'M96');
assert.deepEqual(lad.ladder.map((r) => r.size), ['nano', 'tiny', 'base', 'large']);
for (let i = 1; i < lad.ladder.length; i++) {
  assert.ok(lad.ladder[i].params_M > lad.ladder[i - 1].params_M, 'ladder must be ordered by parameter count');
}
assert.equal(lad.ladder.find((r) => r.size === 'base').spearman_vs_base, 1);
for (const r of lad.ladder) assert.ok(r.detachment_p < 0.05 && r.lakes_p < 0.05, `${r.size} must clear the external test`);
assert.equal(lad.monotone_improvement_with_size, false);
assert.match(lad.yardstick_resolution.reading, /ceiling of the yardstick/);
assert.match(lad.null_check_note, /not an input-contract test/);

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

console.log(JSON.stringify({ scenes: scenario.scene_records.length, anchors: scenario.olmoearth.anchors, scanned_windows: scenario.review.funnel.scanned, observable_windows: observableGeojson.features.length, review_leads: reviewLeadsGeojson.features.length, route_points: hydrography.simulation_route.length, wasm_particles: count, map_worker_bytes: mapWorker.length + mapWorkerShared.length,
  observed_river_km: ribbon.observed_river_km, main_scan_km: ribbon.main_scan_river_km,
  extension_km: ribbon.extension_river_km, glaciers: glaciers.stats.glaciers,
  neighbor_windows: neighborWindows.features.length,
  cells_scanned: scenario.cell_accounting.cells_scanned,
  cells_scored: scenario.cell_accounting.cells_scored,
  radar_replication_spearman: orb.spearman,
  m94_detach_p: src.detachment_zone.permutation_p_overlap,
  m94_lakes_p: src.barrier_lakes.permutation_p_overlap,
  unosat_layers: unosatFiles.length,
  extension_windows_with_frames: framesManifest.windows,
  fused_coverage: `${fus.headline.fused_readable}/${fus.headline.windows_total}`,
  optical_only_coverage: `${fus.headline.optical_readable}/${fus.headline.windows_total}`,
  scaling_sizes: lad.ladder.length,
  scaling_monotone: lad.monotone_improvement_with_size }, null, 2));

// ── Chapter 2 · 24–29 Sep monsoon (september.json is a separate file; scenario.json stays sealed) ──
{
  const sept = JSON.parse(await readFile(resolve(root, 'public/data/september.json'), 'utf8'));
  const geo = JSON.parse(await readFile(resolve(root, 'public/data/september-windows.geojson'), 'utf8'));
  assert.equal(sept.schema, 'nepal-september-2026/v1');
  const nFlood = geo.features.filter((f) => f.properties.kind === 'flood_site').length, nSrc = geo.features.filter((f) => f.properties.kind === 'source_corridor').length, nRiver = geo.features.filter((f) => f.properties.kind === 'river_corridor').length;
  assert.equal(nFlood, 125, '125 flood-site windows (5 sites × 25)'); assert.equal(nSrc, 56, '56 source-corridor windows');
  assert.ok(nRiver >= 54, 'river-corridor windows present (M103+)'); assert.equal(geo.features.length, nFlood + nSrc + nRiver, 'window kinds partition the layer');
  assert.equal(sept.source_corridor.unosat_source_touching_top6, 0, 'M99: the September ranking must not be presented as pointing at the August source');
  for (const f of sept.fused_top) {
    for (const k of ['pre.jpg', 'post.jpg', 'delta.png']) await stat(resolve(root, `public/data/september/frames/${f.id}_${k}`));
  }
  await stat(resolve(root, 'public' + sept.fusion.figure));
  const tokens = JSON.parse(await readFile(resolve(root, 'public/data/september-change-tokens.geojson'), 'utf8'));
  assert.ok(tokens.features.length > 1000 && tokens.features.length < 50000, 'change-token layer must be present and web-sized');
  assert.ok(tokens.features.every((f) => typeof f.properties.x === 'number' && typeof f.properties.flag === 'boolean'), 'change tokens carry x (ratio to threshold) and flag');
  for (const d of sept.frames.s2_dates.saptari) assert.ok(d.startsWith('2026-09'), 'Saptari optical dates are September');
  {
    const cmp = JSON.parse(await readFile(resolve(root, 'public/data/september-compare.json'), 'utf8'));
    const cr = JSON.parse(await readFile(resolve(root, 'public/data/september-compare-ribbon.geojson'), 'utf8'));
    assert.equal(cmp.schema, 'nepal-two-year-compare/v1');
    assert.equal(cr.features.length, cmp.reaches, 'compare ribbon reach count matches the summary');
    assert.ok(cr.features.every((f) => typeof f.properties.f24 === 'number' && typeof f.properties.f26 === 'number' && Math.abs(f.properties.d - (f.properties.f26 - f.properties.f24)) < 1e-3), 'each reach carries both years and d = f26 − f24');
    assert.deepEqual(cmp.dates['2024'].base.length, cmp.dates['2026'].base.length, 'both years use the same 2-pass memory');
    const bag = cmp.rivers.find((r) => r.river === 'xriver_bagmati'); assert.ok(bag.hot24 > 20 && bag.hot26 === 0, 'M108: Bagmati lit in 2024, dark in 2026');
    for (const f of cr.features.slice(0, 20)) for (const k of ['y24_pre.jpg', 'y24_post.jpg', 'y24_delta.png']) await stat(resolve(root, `public/data/september/frames/${f.properties.window}_${k}`));
    console.log(`compare: ${cr.features.length} reaches · ${cmp.rivers.map((r) => `${r.river.replace(/x?river_/, '')} ${r.hot24}→${r.hot26}`).join(' · ')}`);
  }
  {
    const simple = JSON.parse(await readFile(resolve(root, 'public/data/september-simple.geojson'), 'utf8'));
    const places = JSON.parse(await readFile(resolve(root, 'public/data/september-places.json'), 'utf8'));
    const ok = new Set(['big', 'some', 'normal', 'unseen']);
    assert.ok(simple.features.every((f) => ok.has(f.properties.lv26) && ok.has(f.properties.lv24)), 'simple view levels are plain categories');
    assert.ok(places.length >= 10 && places.every((p) => p.name && p.name_ko && p.lonlat), 'place lookup has names in both languages');
    assert.equal(places.find((p) => p.name === 'Susta')?.lv26, 'big', 'Susta reads as a big change in 2026');
    console.log(`simple: ${simple.features.length} reaches · ${places.length} places`);
  }
  if (sept.ribbon) {
    const rib = JSON.parse(await readFile(resolve(root, 'public' + sept.ribbon), 'utf8'));
    assert.ok(rib.features.length >= 40, 'river ribbon must cover the three rivers');
    assert.ok(rib.features.some((f) => !f.properties.observed) || rib.features.every((f) => f.properties.observed), 'ribbon keeps unobserved reaches instead of deleting them');
    assert.ok(rib.features.filter((f) => f.properties.observed).every((f) => typeof f.properties.frac === 'number'), 'observed reaches carry frac');
  }
  for (const f of sept.fused_top.filter((x) => x.site === 'saptari')) for (const k of ['s2pre.jpg', 's2post.jpg']) await stat(resolve(root, `public/data/september/frames/${f.id}_${k}`));
  const verdicts = Object.values(sept.flood_sites).map((s) => s.verdict);
  assert.equal(verdicts.filter((v) => v === 'clear signal').length, 2, 'Susta and Devghat (river-corridor reading, M105) carry clear signals');
  const text = JSON.stringify(sept);
  for (const bad of ['confirmed damage', 'damage confirmed', '피해 확정', 'detected flooding', 'households destroyed']) assert.ok(!text.includes(bad), `september.json must not say "${bad}"`);
  assert.match(sept.method.claim_boundary, /not damage/);
  console.log(`september: ${geo.features.length} windows · ${sept.fused_top.length} fused leads · verdicts ${verdicts.join('/')}`);
}
