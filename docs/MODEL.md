# The LolChain graph model

LolChain maps **exploit chains**, not isolated bugs. The whole graph is derived from three
fields on each node plus a small controlled vocabulary. Understanding these five rules
tells you exactly why any edge exists — and lets you trust (or challenge) it.

## The three node fields

- **`requires`** — capabilities that must already be true before this technique can run
  (its preconditions). Nodes with `requires: []` are **entry points** (roots of a chain).
- **`provides`** — capabilities this technique hands to the attacker on success
  (its postconditions).
- **`achieves`** — goal end-states realised by reaching this node (`domain-admin`,
  `data-breach`, …). This is what "I want X" goal-search matches on.

Capabilities (`data/capabilities.yml`) and goals (`data/goals.yml`) are closed
vocabularies. The build **fails** on any unknown slug, so typos can't silently create
dead links.

## The five edge rules

1. **Derived edge:** `A → B` exists wherever `A.provides ∩ B.requires ≠ ∅`. The shared
   capabilities are the edge's `via`. This is OR-semantics: one matching capability is
   enough.
2. **Curated edge:** a hand-authored `chains:` entry on a node. Represents a specific,
   documented real-world attack. Curated edges are intentional and may encode one-hop
   jumps that the generic derivation wouldn't (and shouldn't) produce.
3. **Curated wins:** if a curated `A → B` exists, the derived one is suppressed (no
   duplicates).
4. **`via ⊆ provides`:** a curated edge may only hand off capabilities the source node
   actually provides. Enforced at build time.
5. **Cross-OS guard:** when both endpoints declare an `os` (`linux`/`windows`) and they
   differ, the derived edge is suppressed. A Windows-only RCE cannot lead into a Linux
   local-privesc. OS-agnostic nodes omit `os` and link to both.

## Goal reachability

For each node the builder does a DFS over all outgoing edges and unions the `achieves` of
everything downstream. That precomputed set (`reachGoals`) is what makes "start here →
which goals can I ultimately hit" instant in the UI. So a node surfaces for a goal if it
`achieves` it **or** can reach a node that does.

## Known modelling simplifications (read before trusting an edge)

- **`os-command-exec` is generic.** OS-agnostic RCE links to both Linux and Windows
  local-privesc. That's honest (the technique genuinely could hit either), but it means a
  derived RCE→privesc edge asserts *"if this host runs that OS"*, not a guarantee. Only
  explicitly OS-tagged nodes are filtered.
- **Generic movement caps** (`priv-esc`, `lateral-movement`, `domain-credentials`) are
  broad by design so cross-domain chains connect. They favour recall over precision; a
  derived edge through one of them means "plausible hand-off", not "always exploitable".
- **Curated chains can be one-hop** where a real documented attack is one hop (e.g.
  Kerberoasting a privileged service account straight to Domain Takeover). These are
  deliberate and cite a source.

See `docs/DATA-AUDIT.md` for the Phase-1 findings that shaped the current wiring.
