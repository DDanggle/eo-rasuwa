import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const scenarioPath = resolve(root, 'public/data/scenario.json');
const candidatesPath = resolve(root, 'public/data/candidates.geojson');
const leadsPath = resolve(root, 'public/data/review-leads.geojson');

const scenario = JSON.parse(await readFile(scenarioPath, 'utf8'));
const observable = JSON.parse(await readFile(candidatesPath, 'utf8'));
const review = scenario.review;

assert.ok(review, 'scenario.review is required');
assert.equal(review.funnel.scanned, scenario.candidates.geojson.features.length);

const pooledById = new Map(observable.features.map((feature) => [feature.properties.id, feature.properties]));
const leadById = new Map(review.leads.map((lead) => [lead.id, lead]));
const reobserveById = new Map(review.reobserve.map((lead) => [lead.id, lead]));

const normalize = (feature) => {
  const properties = { ...feature.properties };
  const id = properties.id;
  const pooled = pooledById.get(id);
  const lead = leadById.get(id);
  const reobserve = reobserveById.get(id);

  if (properties.rank_single_pair == null) properties.rank_single_pair = properties.rank ?? null;
  if (properties.candidate_token_frac_single_pair == null) {
    properties.candidate_token_frac_single_pair = properties.candidate_token_frac ?? null;
  }
  if (pooled) {
    properties.rank_pooled3 = pooled.rank_pooled3 ?? pooled.rank ?? null;
    properties.candidate_token_frac_pooled3 = pooled.candidate_token_frac_pooled3;
    properties.rank = properties.rank_pooled3;
    properties.candidate_token_frac = properties.candidate_token_frac_pooled3;
    properties.place = pooled.place ?? properties.place ?? null;
  }
  properties.review_status = lead ? 'lead' : reobserve ? 'reobserve' : pooled ? 'screened' : 'unobservable';
  properties.review_rank = lead?.rank ?? null;
  return { ...feature, properties };
};

scenario.candidates.geojson.features = scenario.candidates.geojson.features.map(normalize);
const normalizedById = new Map(scenario.candidates.geojson.features.map((feature) => [feature.properties.id, feature]));
for (const row of scenario.downstream_profile ?? []) {
  const properties = normalizedById.get(row.id)?.properties;
  if (!properties) continue;
  row.candidate_token_frac = properties.candidate_token_frac;
  row.observable = properties.valid_event_frac;
  row.rank = properties.rank;
}
const observableFeatures = observable.features.map((feature) => normalize(normalizedById.get(feature.properties.id) ?? feature));
const leadFeatures = review.leads.map((lead) => {
  const feature = normalizedById.get(lead.id);
  assert.ok(feature, `review lead ${lead.id} is missing from the 100-window scan`);
  return feature;
});

const common = {
  type: 'FeatureCollection',
  license: observable.license,
  claim: 'review priority from pooled three-pair ordinary-change calibration — not damage, cause, area, or probability',
  contract: {
    score: '1 - cosine(z_before, z_after)',
    ordinary_threshold: 'pooled p99 from three non-event fortnight transitions',
    minimum_observable_fraction_for_lead: 0.4,
    lead_deduplication: 'one lead per place name',
  },
};

await writeFile(candidatesPath, `${JSON.stringify({ ...common, name: 'olmoearth_nepal_rasuwa_2026_observable_windows', features: observableFeatures })}\n`);
await writeFile(leadsPath, `${JSON.stringify({ ...common, name: 'olmoearth_nepal_rasuwa_2026_review_leads', features: leadFeatures })}\n`);

review.download = '/data/review-leads.geojson';
review.all_observable_download = '/data/candidates.geojson';
review.contract = common.contract;
await writeFile(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`);

console.log(JSON.stringify({ scanned: scenario.candidates.geojson.features.length, observable: observableFeatures.length, leads: leadFeatures.length, lead_ids: leadFeatures.map((feature) => feature.properties.id) }, null, 2));
