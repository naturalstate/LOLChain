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

## Phase 4 — View styles ✅ (done 2026-11-17)

Graph / Flowchart / Text picker in the viewbar; choice persists (localStorage),
applies to all three maps.

- **Flowchart**: strict top-down hierarchical layout with taxi (right-angle) edges.
- **Text**: hides the map and renders the current chain as an expandable
  plain-text outline (native `<details>`), ordered top-down. Each step expands to
  its summary, requires/provides/reaches chips, and a full-page link.

## Phase 5 — Content pages ✅ (done 2026-11-17)

- New **landing page** at `/`: hero, CTAs (query + browse), stat strip,
  authorized-use note, the chain-map SVG with caption, the query-modes SVG + three
  mode cards, and a real-incident teaser row linking to About.
- Catalog moved to **`/browse`** (nav gains "home" + "browse"); the old faceted
  table/search is intact there.
- **About** rewrite: woven in both SVGs (chain map + query modes), a "Grounded in
  real incidents" section, the Simple mode + view-toggle/scope/chain-list notes,
  and the full 9-category list — consistent with the README.
- SVGs copied to `public/images/` so Astro serves them.

## Phase 6 — Node-page mini-diagram ✅ (done 2026-11-17)

On `/node/<slug>/`, a static 1-hop chain diagram above the detail: predecessors
(↑ reached by) → the node → successors (↓ leads to), each neighbour a link that
walks the chain, labelled with the linking capability. Entry points and
terminal/goal nodes get a stub; the centre shows any goal it achieves. Capped at
6 per side with a "+N more below" pointer. Pure HTML/CSS, no JS.

## Phase 7 — Node context-menu actions + UX fixes ✅ (done 2026-11-17)

Extends the Phase 2 node context menu on the query page, plus two fixes.

- **Menu now stacks vertically** (was rendering side-by-side: the show handler
  set `display:block`, overriding the stylesheet's flex column — now shows as
  `flex`).
- **remove from path** — hide the clicked node (and its edges) from the diagram
  and the selected-chain list, then redraw. Undoable via the chain list's ↶ undo
  when a selection is active; "show all" restores otherwise.
- **remove `<category>` from path** — dynamic label per node (e.g. "remove
  active-directory from path"); strips every visible node in that scope category
  and redraws.
- **set as start** — makes the clicked node the start of an `X → goal Z` query
  (switches to that tab, populates the start dropdown). Offered on any node.
- **set as goal** — the clicked node achieves a goal, so target that goal in
  `X → goal Z`. Offered only on goal-achieving nodes (which map to the goal
  dropdown's options).
- **Data fix:** node title "Sudo Misconfiguration (GTFOBins)" → "Sudo
  Misconfiguration"; we don't name a tool/site in a title. GTFOBins stays in the
  node summary and references.
- **Bottom chain readout** (`.cy-chainkey`): was `pointer-events:none`, so a long
  chain clipped on the right with no way to scroll. Now draggable (click-drag to
  scroll horizontally) and a taller two-line strip.

## Deferred (not scheduled)

- Browser-storage canvas (save/pin a custom chain locally). User: "maybe don't
  implement this yet."
