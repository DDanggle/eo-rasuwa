import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import DecisionWorkspace from './workspace';
import { normalizeWindows, type DecisionData } from './model';

export const dynamic = 'force-static';
export const metadata: Metadata = {
  title: 'Geo Evidence — Decision Support',
  description: 'Compare Nepal satellite review candidates, inspect observation limits, and export evidence. An independent ESCWA application portfolio demo.',
  openGraph: { title: 'Geo Evidence — From observation to a review decision', description: 'Compare real Nepal observations and build an evidence brief. Independent portfolio demo; no ESCWA or UN affiliation.' },
};

export default async function DecisionPage() {
  const files = ['candidates.geojson', 'review-leads.geojson', 'scenario.json'];
  const texts = await Promise.all(files.map(file => readFile(path.join(process.cwd(), 'public/data', file), 'utf8')));
  const windows = normalizeWindows(JSON.parse(texts[0]));
  const scenario = JSON.parse(texts[2]);
  const publishedIds = JSON.parse(texts[1]).features.map((f: { properties: { id: string } }) => f.properties.id).sort();
  const normalizedIds = windows.filter(w => w.leadRank !== null).map(w => w.id).sort();
  const review = scenario.review;
  if (windows.length !== review.funnel.observable || JSON.stringify(publishedIds) !== JSON.stringify(normalizedIds)) throw new Error('Decision data and public review contract disagree');
  const sourceHashes = Object.fromEntries(files.map((file, index) => [file, createHash('sha256').update(texts[index]).digest('hex')]));
  const data: DecisionData = {
    windows, sourceHashes, sourceVersion: createHash('sha256').update(texts.join('\0')).digest('hex').slice(0, 12),
    threshold: review.threshold,
    counts: { scanned: review.funnel.scanned, observable: review.funnel.observable, leads: review.funnel.leads, confirmed: review.funnel.confirmed_damage_labels },
    reobserveIds: review.reobserve.map((w: { id: string }) => w.id),
  };
  return <DecisionWorkspace data={data} />;
}
