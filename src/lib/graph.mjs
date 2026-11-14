// Core data pipeline: load YAML -> validate -> resolve edges -> graph object.
// Shared by scripts/build.mjs (emits public/graph.json) and the Astro pages
// (build-time import). Single source of truth, no duplicated logic.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const p = (...parts) => path.join(ROOT, ...parts);

const readYaml = (file) => yaml.load(readFileSync(file, 'utf8'));

/** Build and validate the whole graph. Throws an aggregated error on any problem. */
export function buildGraph() {
  const errors = [];

  // --- Load vocab ---
  const capsDoc = readYaml(p('data', 'capabilities.yml'));
  const capabilityGroups = capsDoc.groups ?? [];
  const capabilities = capsDoc.capabilities ?? [];
  const capSlugs = new Set(capabilities.map((c) => c.slug));

  const goalsDoc = readYaml(p('data', 'goals.yml'));
  const goals = goalsDoc.goals ?? [];
  const goalSlugs = new Set(goals.map((g) => g.slug));

  // --- Schema validator ---
  const schema = JSON.parse(readFileSync(p('schema', 'node.schema.json'), 'utf8'));
  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  // --- Load nodes ---
  const nodeDir = p('data', 'nodes');
  const files = readdirSync(nodeDir).filter((f) => /\.ya?ml$/.test(f));
  const nodes = [];
  for (const file of files) {
    const full = path.join(nodeDir, file);
    let node;
    try {
      node = readYaml(full);
    } catch (e) {
      errors.push(`${file}: YAML parse error - ${e.message}`);
      continue;
    }
    if (!validate(node)) {
      for (const err of validate.errors) {
        errors.push(`${file}: ${err.instancePath || '/'} ${err.message}`);
      }
      continue;
    }
    if (node.slug && `${node.slug}.yml` !== file && `${node.slug}.yaml` !== file) {
      errors.push(`${file}: slug "${node.slug}" does not match filename`);
    }
    // Normalise optional arrays.
    node.requires ??= [];
    node.achieves ??= [];
    node.chains ??= [];
    node.references ??= [];
    nodes.push(node);
  }

  const nodeBySlug = new Map(nodes.map((n) => [n.slug, n]));

  // --- Cross-reference validation ---
  const checkCaps = (file, field, list) => {
    for (const slug of list ?? []) {
      if (!capSlugs.has(slug)) {
        errors.push(`${file}: unknown capability "${slug}" in ${field}`);
      }
    }
  };
  for (const n of nodes) {
    const file = `${n.slug}.yml`;
    checkCaps(file, 'requires', n.requires);
    checkCaps(file, 'provides', n.provides);
    for (const g of n.achieves) {
      if (!goalSlugs.has(g)) errors.push(`${file}: unknown goal "${g}" in achieves`);
    }
    const providesSet = new Set(n.provides);
    for (const c of n.chains) {
      checkCaps(file, `chains.to=${c.to}.via`, c.via);
      if (!nodeBySlug.has(c.to)) {
        errors.push(`${file}: chain target "${c.to}" is not a known node`);
      }
      // Invariant: a curated chain hands off capabilities the source actually provides.
      for (const v of c.via ?? []) {
        if (!providesSet.has(v)) {
          errors.push(`${file}: chain to "${c.to}" uses via "${v}" not in this node's provides`);
        }
      }
    }
  }

  if (errors.length) {
    const err = new Error(`Graph validation failed with ${errors.length} error(s):\n  - ${errors.join('\n  - ')}`);
    err.validationErrors = errors;
    throw err;
  }

  // --- Resolve edges ---
  const edges = [];
  const curatedKeys = new Set();
  for (const n of nodes) {
    for (const c of n.chains) {
      curatedKeys.add(`${n.slug}->${c.to}`);
      edges.push({
        from: n.slug,
        to: c.to,
        via: c.via,
        type: 'curated',
        outcome: c.outcome,
        tier: c.tier ?? n.tier,
        difficulty: c.difficulty ?? null,
        documented: c.documented ?? false,
        references: c.references ?? [],
      });
    }
  }
  // Derived edges: A.provides intersects B.requires, no curated edge already.
  for (const a of nodes) {
    const provides = new Set(a.provides);
    for (const b of nodes) {
      if (a.slug === b.slug) continue;
      if (curatedKeys.has(`${a.slug}->${b.slug}`)) continue;
      const via = b.requires.filter((r) => provides.has(r));
      if (via.length) {
        edges.push({
          from: a.slug,
          to: b.slug,
          via,
          type: 'derived',
          outcome: null,
          tier: b.tier,
          difficulty: null,
          documented: false,
          references: [],
        });
      }
    }
  }

  // --- Stats ---
  const curated = edges.filter((e) => e.type === 'curated');
  const byCategory = {};
  for (const n of nodes) byCategory[n.category] = (byCategory[n.category] ?? 0) + 1;
  const stats = {
    nodeCount: nodes.length,
    chainCount: curated.length,
    derivedCount: edges.length - curated.length,
    documentedCount: curated.filter((e) => e.documented).length,
    categoryCount: Object.keys(byCategory).length,
    capabilityCount: capabilities.length,
    byCategory,
  };

  return { capabilities, capabilityGroups, goals, nodes, edges, stats };
}
