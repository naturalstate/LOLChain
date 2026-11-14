// Pathfinding over the chain graph: goal-directed (X -> Z), constrained
// (X -> through Y -> Z), and backward (I want Z -> entry points). Framework-agnostic;
// operates on the plain graph object from graph.json.

/** Collapse parallel edges A->B, preferring a curated edge over a derived one. */
export function buildAdjacency(graph) {
  const out = new Map();
  const inc = new Map();
  for (const n of graph.nodes) { out.set(n.slug, []); inc.set(n.slug, []); }
  const seen = new Map();
  for (const e of graph.edges) {
    const k = `${e.from}>${e.to}`;
    const prev = seen.get(k);
    if (!prev || (e.type === 'curated' && prev.type !== 'curated')) seen.set(k, e);
  }
  for (const e of seen.values()) {
    out.get(e.from)?.push(e);
    inc.get(e.to)?.push(e);
  }
  return { out, inc };
}

const DIFF = { easy: 1, medium: 2, hard: 3 };
const edgeWeight = (e) => (e.type !== 'curated' ? 2 : DIFF[e.difficulty] ?? 2);

/** Annotate + rank paths: documented first, then fully-curated, shorter, easier. */
function rankPaths(paths) {
  return paths
    .map((p) => {
      const documented = p.edges.length > 0 && p.edges.every((e) => e.type === 'curated' && e.documented);
      const allCurated = p.edges.every((e) => e.type === 'curated');
      const diff = p.edges.reduce((s, e) => s + edgeWeight(e), 0);
      return { ...p, documented, allCurated, length: p.edges.length, diff };
    })
    .sort(
      (a, b) =>
        Number(b.documented) - Number(a.documented) ||
        Number(b.allCurated) - Number(a.allCurated) ||
        a.length - b.length ||
        a.diff - b.diff
    );
}

const goalNodeSet = (graph, goalSlugs) =>
  new Set(
    graph.nodes
      .filter((n) => (n.achieves ?? []).some((g) => goalSlugs.has(g)))
      .map((n) => n.slug)
  );

/**
 * All simple paths from `start` to any node achieving a goal in `goalSlugs`, up to
 * `maxDepth` edges. Optional `through` requires the path to pass that node slug.
 */
export function findPaths(graph, { start, goalSlugs, through = null, maxDepth = 4, limit = 80 }) {
  const { out } = buildAdjacency(graph);
  const goals = goalNodeSet(graph, new Set(goalSlugs));
  const paths = [];
  const nodes = [start];
  const edges = [];
  const visited = new Set([start]);

  (function dfs(node, depth) {
    if (paths.length >= limit) return;
    if (goals.has(node) && node !== start) {
      const hasThrough = !through || nodes.includes(through);
      if (hasThrough) { paths.push({ nodes: [...nodes], edges: [...edges] }); return; }
      // Goal reached but constraint not yet met — keep searching past it.
    }
    if (depth >= maxDepth) return;
    for (const e of out.get(node) ?? []) {
      if (visited.has(e.to)) continue;
      visited.add(e.to); nodes.push(e.to); edges.push(e);
      dfs(e.to, depth + 1);
      visited.delete(e.to); nodes.pop(); edges.pop();
    }
  })(start, 0);

  return rankPaths(paths);
}

/** Nodes that directly achieve any goal in the set. */
export function nodesAchieving(graph, goalSlugs) {
  const set = new Set(goalSlugs);
  return graph.nodes.filter((n) => (n.achieves ?? []).some((g) => set.has(g))).map((n) => n.slug);
}

/**
 * Backward search: for each node achieving the goal, enumerate reverse paths back to
 * entry nodes (no `requires`). Returned oriented forward (entry -> … -> goal).
 */
export function findBackward(graph, { goalSlugs, maxDepth = 4, limit = 80 }) {
  const { inc } = buildAdjacency(graph);
  const nodeBySlug = new Map(graph.nodes.map((n) => [n.slug, n]));
  const goalNodes = nodesAchieving(graph, goalSlugs);
  const results = [];

  for (const gn of goalNodes) {
    const nodes = [gn];
    const edges = [];
    const visited = new Set([gn]);
    (function dfs(node, depth) {
      if (results.length >= limit) return;
      const n = nodeBySlug.get(node);
      const isEntry = !n.requires.length;
      if (isEntry || depth >= maxDepth) {
        results.push({
          goalNode: gn,
          entry: node,
          complete: isEntry,
          nodes: [...nodes].reverse(),
          edges: [...edges].reverse(),
        });
        if (isEntry) return;
      }
      if (depth >= maxDepth) return;
      for (const e of inc.get(node) ?? []) {
        if (visited.has(e.from)) continue;
        visited.add(e.from); nodes.push(e.from); edges.push(e);
        dfs(e.from, depth + 1);
        visited.delete(e.from); nodes.pop(); edges.pop();
      }
    })(gn, 0);
  }
  return rankPaths(results);
}
