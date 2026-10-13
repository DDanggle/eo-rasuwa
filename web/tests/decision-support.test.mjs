import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../app/decision-support/model.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { normalizeWindows, exportSelection, evidenceBrief, parseNotes } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const collection = JSON.parse(readFileSync(new URL('../public/data/candidates.geojson', import.meta.url), 'utf8'));
const leads = JSON.parse(readFileSync(new URL('../public/data/review-leads.geojson', import.meta.url), 'utf8'));
const scenario = JSON.parse(readFileSync(new URL('../public/data/scenario.json', import.meta.url), 'utf8'));
const data = { windows: normalizeWindows(collection), threshold: scenario.review.threshold, sourceVersion: 'test-version', sourceHashes: { 'candidates.geojson': 'test-hash' }, counts: { scanned: 100, observable: 47, leads: 6, confirmed: 0 }, reobserveIds: scenario.review.reobserve.map(w => w.id) };

test('uses corrected pooled-three-pair values and exactly the published six optical leads', () => {
  assert.equal(data.windows.length, 47);
  assert.deepEqual(data.windows.filter(w => w.leadRank !== null).map(w => w.id).sort(), leads.features.map(f => f.properties.id).sort());
  const first = data.windows.find(w => w.id === 'v003');
  assert.equal(first.change, 0.1331168831168831);
  assert.notEqual(first.change, 0.25432900432900435);
});

test('does not silently export missing scores as zero or duplicate windows', () => {
  const bad = structuredClone(collection); delete bad.features[0].properties.candidate_token_frac_pooled3;
  assert.throws(() => normalizeWindows(bad), /Invalid fractions/);
  const dup = structuredClone(collection); dup.features.push(dup.features[0]);
  assert.throws(() => normalizeWindows(dup), /duplicate/);
});

test('exports only selected existing windows once, with provenance and unavailable context as null', () => {
  const pack = exportSelection(data, ['v003', 'v003', 'not-a-window'], { v003: { status: 'reviewed', note: 'Check again.' } }, '2026-10-13T00:00:00Z');
  assert.equal(pack.features.length, 1);
  const p = pack.features[0].properties;
  assert.equal(p.facility_intersection_count, null);
  assert.equal(p.population_estimate, null);
  assert.equal(p.validation_status, 'no_field_validated_damage_label');
  assert.equal(p.local_review_status, 'reviewed');
  assert.equal(pack.source_sha256['candidates.geojson'], 'test-hash');
  assert.equal(pack.observation_dates.post, '2026-08-27');
  assert.match(pack.limitations, /Windows overlap/);
  assert.equal(exportSelection(data, [], {}, 'now').features.length, 0);
});

test('treats malformed or obsolete browser data as untrusted local notes', () => {
  assert.deepEqual(parseNotes('{bad', ['v003']), {});
  assert.deepEqual(parseNotes('[]', ['v003']), {});
  const raw = JSON.stringify({ v003: { status: 'reviewed', note: 'x'.repeat(1100) }, v999: { status: 'reviewed', note: 'old' }, v004: { status: 'confirmed_damage', note: 'not supported' } });
  const notes = parseNotes(raw, ['v003', 'v004']);
  assert.deepEqual(Object.keys(notes), ['v003']);
  assert.equal(notes.v003.note.length, 1000);
});

test('brief preserves missing context and differentiates display imagery from the scoring baseline', () => {
  const brief = evidenceBrief(data, ['v003'], {}, '2026-10-13T00:00:00Z');
  assert.match(brief, /13\.31%/);
  assert.match(brief, /illustrative 12 August/);
  assert.match(brief, /not the scoring baseline composite/);
  assert.match(brief, /joins have not been performed/);
  assert.match(brief, /no_field_validated_damage_label|No local note establishes confirmed damage/);
  assert.match(brief, /SHA-256 test-hash/);
});

test('re-observation priorities are observable comparison windows, not the 53 missing ones', () => {
  assert.equal(data.reobserveIds.length, 2);
  assert.ok(data.reobserveIds.every(id => data.windows.some(w => w.id === id && w.leadRank === null)));
});
