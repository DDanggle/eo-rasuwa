import assert from 'node:assert/strict';

const cliArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const base = (cliArgs[0] ?? process.env.SMOKE_BASE_URL ?? '').replace(/\/$/, '');
assert.ok(cliArgs.length <= 1, 'usage: node scripts/smoke-host.mjs https://deployment.example');
assert.ok(/^https?:\/\//.test(base), 'usage: node scripts/smoke-host.mjs https://deployment.example');

const checks = [
  ['/', 'text/html'],
  ['/map', 'text/html'],
  ['/story', 'text/html'],
  ['/data/scenario.json', 'application/json'],
  ['/data/candidates.geojson', 'application/geo+json'],
  ['/data/review-leads.geojson', 'application/geo+json'],
  ['/wasm/nepal_flow.wasm', 'application/wasm'],
];

for (const [path, expectedType] of checks) {
  const response = await fetch(`${base}${path}`, { redirect: 'follow' });
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  const actualType = response.headers.get('content-type') ?? '';
  assert.ok(actualType.includes(expectedType) || (path.endsWith('.geojson') && actualType.includes('application/json')), `${path} content-type ${actualType}`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${path} is missing security headers`);
  if (path.endsWith('scenario.json')) {
    const scenario = await response.json();
    assert.deepEqual(scenario.review.funnel, { scanned: 100, observable: 47, leads: 6, confirmed_damage_labels: 0 });
  } else if (path.endsWith('review-leads.geojson')) {
    const leads = await response.json();
    assert.equal(leads.features.length, 6);
  } else if (path.endsWith('candidates.geojson')) {
    const candidates = await response.json();
    assert.equal(candidates.features.length, 47);
  } else {
    const body = new Uint8Array(await response.arrayBuffer());
    assert.ok(body.length > 100, `${path} response is unexpectedly small`);
  }
  console.log(`PASS ${path} · ${actualType}`);
}
