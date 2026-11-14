// Build step: validate the dataset and emit public/graph.json for the client.
// `--check` validates only (CI gate) and writes nothing.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildGraph } from '../src/lib/graph.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const checkOnly = process.argv.includes('--check');

try {
  const graph = buildGraph();
  const { stats } = graph;

  if (!checkOnly) {
    const out = path.join(ROOT, 'public', 'graph.json');
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(graph, null, 2));
    console.log(`Wrote ${path.relative(ROOT, out)}`);
  }

  console.log(
    `OK: ${stats.nodeCount} vulns - ${stats.chainCount} chains - ` +
      `${stats.documentedCount} documented - ${stats.derivedCount} derived - ` +
      `${stats.categoryCount} categories`
  );
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
