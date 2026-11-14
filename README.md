# LolChain

**Living Off the Land, for vulnerability chains.** An interactive
precondition/postcondition graph of exploit chains — modelled on the LoL-site
family (lolcreds, GTFOBins, LOLBAS), but for *chains* instead of single primitives.

Every vuln is a handoff: it **requires** capabilities and **provides** others. An
edge exists wherever one node's `provides` satisfies another node's `requires`.
That single idea powers browse, filter, and (later) "tell me what you have → here's
what you can chain into" pathfinding.

> **Authorized use only.** Entries describe capability handoffs, detection, and
> remediation — not turnkey exploit code. For pentesters, red teams, and defenders.

## Stack

- **Data:** YAML in `data/`, hand-edited and PR-reviewed.
- **Vocab:** `data/capabilities.yml` (handoff currency) + `data/goals.yml` (controlled
  end-state vocabulary).
- **Schema:** `schema/node.schema.json` (JSON Schema, draft-07).
- **Build:** `scripts/build.mjs` loads + validates YAML and emits `public/graph.json`.
  Core logic lives in `src/lib/graph.mjs`, shared with the site.
- **Frontend:** [Astro](https://astro.build) — static per-node pages (`/node/<slug>/`)
  + client-side filtering/search. Pathfinding (Phase 3) runs over `graph.json` in the
  browser; no backend.

## Develop

```bash
npm install
npm run data      # validate dataset -> public/graph.json
npm run dev       # data + astro dev server (http://localhost:4321)
npm run build     # data + static site -> dist/
npm run validate  # schema + cross-reference check only (CI gate)
```

## Add a vuln

1. Create `data/nodes/<slug>.yml` (filename must match `slug`). See the schema and
   existing nodes for the shape.
2. Reference only capability slugs from `data/capabilities.yml` in `requires` /
   `provides` / chain `via`, and goal slugs from `data/goals.yml` in `achieves`.
3. Add curated `chains:` with `to:` (an existing node slug), `via:`, `outcome:`, and
   `references:`. Never invent references.
4. `npm run validate` — the build fails loudly on unknown slugs, bad `to:` targets, or
   schema violations.

## Status

- [x] **Phase 0** — pipeline skeleton (schema, vocab, seed nodes, build, filterable UI).
- [x] **Phase 1** — seed dataset (47 vulns, 29 curated chains, 7 categories).
- [x] **Phase 2** — "I have X" forward query + facets + per-node pages.
- [x] **Phase 3** — goal-directed + constrained + backward pathfinding; derived chains surfaced.
- [x] **Phase 4** — graph visualization (Cytoscape path/subgraph view on the query page).
- [x] **Phase 5** — scope/ethics + about pages, CONTRIBUTING, CI validation gate.
