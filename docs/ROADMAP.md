# LolChain roadmap

Working phases for the "make it solid + more usable" effort. Order is deliberate:
trust the data first, then rework the query UX, then views, then content pages.

## Phase 1 — Trust & data correctness ✅ (done 2026-11-16)

See `docs/DATA-AUDIT.md` + `docs/MODEL.md`. Cross-OS edge guard, AD-takeover
tightening, missing goal tags, model documentation. Deferred within Phase 1:
`arbitrary-file-read → secret-harvest` / `ci-runner-exec → ci-secrets` forward
edges; deeper per-node RCE/privesc tag review.

## Phase 2 — Rework the "I have X" query page (left-sidebar overhaul)

The query sidebar is overloaded (postures + scope chips + vuln dropdown +
capabilities, all expanded at once). Collapse it and reclaim the space for
node info and chain control.

- **Collapsible input sections.** Choosing a posture collapses that section to
  just its selected value; click the value or the section title to re-expand.
  Same for privesc toggle, "start from a vuln" dropdown, and capabilities.
  Collapsing frees vertical space for the info box below.
- **Node info box (left sidebar).** Click a node on the map → a brief overview
  of that technique appears in the sidebar (name, what it is, requires/provides,
  goals). It stays until another node is clicked. No user action needed to show
  it — it just appears.
- **"Open info in new tab"** added to the node context menu, next to
  "Use this path" → opens the dedicated `/node/<slug>/` page in a new tab.
- **Pathway list view (left sidebar).** List the steps of the hovered/selected
  chain. Each step has an "✕" (or cleaner control) to hide/disable that step;
  toggling it re-filters the diagram so the user can fine-tune a busy map down
  to the chain they want.
- Clarified behaviour: "start from a vuln" + "capabilities" **combine** (union),
  they are not exclusive.

## Phase 3 — "Simple" search-drill-down subtab ✅ (done 2026-11-17)

New "Simple" tab: one large search-engine-style input over all 92 vulns, 11
goals, and every capability. Live ranked results; "narrow to" type chips appear
only when the top matches span kinds; "I want…" biases goals, "I have…" biases
capabilities. Clicking a result drills down — a goal lists what achieves it
directly vs. through a chain; a node shows ↑reached-by / ↓leads-to (clickable to
keep walking) plus requires/provides/reaches; a breadcrumb trail returns to
search. Map-only controls (viewbar/legend/scope) hide on this tab.

## Phase 4 — View styles

Flowchart-style layout + an expandable plain-text view (click a step to expand
detail). Picker on the query page.

## Phase 5 — Content pages

Weave README content + the two SVGs (query-modes.svg, chain-map.svg) into the
About page; keep About's existing added content; make About/README consistent.
Draft a new front page.

## Phase 6 — Node-page mini-diagram

On `/node/<slug>/`, show a small chain diagram centred on that node with
navigation arrows to walk neighbours.

## Deferred (not scheduled)

- Browser-storage canvas (save/pin a custom chain locally). User: "maybe don't
  implement this yet."
