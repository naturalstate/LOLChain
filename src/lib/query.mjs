// Client-side query engine over the capability graph. Framework-agnostic: takes a
// plain graph object ({ nodes, edges, goals }) and runs precondition/postcondition
// reachability. Powers the "I have X -> what can I chain into" forward query.

function addProvider(map, cap, node) {
  if (!map.has(cap)) map.set(cap, new Set());
  map.get(cap).add(node);
}

/**
 * Forward reachability from a set of held capabilities and/or starting nodes.
 *
 * A node "activates" when every capability in its `requires` is held. Pure entry
 * nodes (no requires) are skipped unless named as a start — they are environmental,
 * not something another vuln hands you. Activation adds the node's `provides` to the
 * held set, so chains extend by fixpoint.
 *
 * @param {{nodes:any[], edges:any[], goals?:any[]}} graph
 * @param {{startNodes?:string[], startCaps?:string[]}} opts
 */
export function forwardReach(graph, { startNodes = [], startCaps = [] } = {}) {
  const nodeBySlug = new Map(graph.nodes.map((n) => [n.slug, n]));
  const curatedByPair = new Map();
  for (const e of graph.edges) {
    if (e.type === 'curated') curatedByPair.set(`${e.from}>${e.to}`, e);
  }

  const held = new Set(startCaps);
  const providerOf = new Map(); // capability -> Set(node slugs that provided it)
  const records = new Map(); // slug -> activation record

  for (const s of startNodes) {
    const n = nodeBySlug.get(s);
    if (!n) continue;
    records.set(s, { slug: s, depth: 0, start: true, viaCaps: [], predecessors: [] });
    for (const p of n.provides) {
      held.add(p);
      addProvider(providerOf, p, s);
    }
  }

  let changed = true;
  let depth = 0;
  while (changed) {
    changed = false;
    depth++;
    for (const n of graph.nodes) {
      if (records.has(n.slug)) continue;
      if (!n.requires.length) continue; // environmental entry node
      if (!n.requires.every((r) => held.has(r))) continue;

      const predecessors = [];
      for (const r of n.requires) {
        const provs = providerOf.get(r);
        if (provs) for (const p of provs) predecessors.push({ node: p, cap: r });
      }
      let curated = false;
      let outcome = null;
      for (const pr of predecessors) {
        const e = curatedByPair.get(`${pr.node}>${n.slug}`);
        if (e) { curated = true; outcome = e.outcome; break; }
      }

      records.set(n.slug, {
        slug: n.slug,
        depth,
        start: false,
        viaCaps: n.requires.slice(),
        predecessors,
        curated,
        outcome,
      });
      for (const p of n.provides) {
        if (!held.has(p)) held.add(p);
        addProvider(providerOf, p, n.slug);
      }
      changed = true;
    }
  }

  const activated = [...records.values()]
    .filter((r) => !r.start)
    .sort((a, b) => a.depth - b.depth || Number(b.curated) - Number(a.curated));

  // Goals reached by any activated or starting node.
  const goalsReached = [];
  const seenGoal = new Set();
  for (const r of records.values()) {
    const n = nodeBySlug.get(r.slug);
    for (const g of n.achieves ?? []) {
      if (!seenGoal.has(g)) { seenGoal.add(g); }
      goalsReached.push({ goal: g, node: r.slug, depth: r.depth });
    }
  }

  return {
    held: [...held],
    activated,
    startNodes: startNodes.filter((s) => nodeBySlug.has(s)),
    startCaps: [...startCaps],
    goalsReached,
  };
}
