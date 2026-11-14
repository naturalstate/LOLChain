# Contributing to LolChain

Thanks for helping map exploit chains. Data lives in `data/` as YAML, is validated
against a JSON Schema, and is reviewed by PR. The build **fails loudly** on any bad
reference, so you get fast feedback.

> **Scope:** LolChain is a conceptual reference. Entries describe the *capability
> handoff*, outcome, detection, and remediation — **not** weaponized exploit code.
> Keep contributions at that altitude. See [scope & ethics](src/pages/scope.astro).

## Quick start

```bash
npm install
npm run validate   # schema + cross-reference check (what CI runs)
npm run dev        # preview at http://localhost:4321
```

## The data model

Three files/folders:

- `data/capabilities.yml` — the **handoff currency**. Every capability is a stable
  slug with a label and description. Nodes reference these in `requires` / `provides`
  and chain `via`. Keep this list small and curated; it is the glue of the graph.
- `data/goals.yml` — the controlled vocabulary of **end states**. A node declares
  `achieves: [<goal-slug>]` when reaching it realises that goal. Goal-directed search
  matches these.
- `data/nodes/<slug>.yml` — one vuln per file. **Filename must equal the `slug`.**

An edge A → B exists wherever `A.provides` intersects `B.requires`. Curated chains are
authored explicitly; the build infers the rest as *derived · unverified*.

## Node shape

```yaml
id: ssrf                    # kebab-case, == slug
name: Server-Side Request Forgery
slug: ssrf                  # == filename
tier: basic                 # basic | advanced | expert
category: web               # web | cloud | kubernetes | cicd | llm | mobile | network
aliases: [ssrf]
summary: >
  One or two sentences: what the weakness is.
requires:                   # capability slugs that must already hold (omit for entry nodes)
  - server-processes-attacker-url
provides:                   # capability slugs this node hands off (>= 1 required)
  - server-side-request
  - internal-network-reach
achieves:                   # optional: goal slugs realised here
  - internal-network-access
detection: >                # how a defender spots it
  ...
remediation: >              # how a defender breaks the link
  ...
mitre: [T1190]              # optional ATT&CK technique ids
references:                 # optional, but required for documented chains
  - title: PortSwigger - SSRF
    url: https://portswigger.net/web-security/ssrf
chains:                     # curated handoffs from this node
  - to: cloud-imds-cred-theft  # an existing node slug
    via: [server-side-request] # capability slugs; MUST be a subset of this node's provides
    outcome: Pull temporary cloud credentials from the metadata service.
    tier: basic
    difficulty: medium         # easy | medium | hard
    documented: true           # true only with a real reference below
    references:
      - https://portswigger.net/web-security/ssrf
```

## Rules the build enforces

- Every slug in `requires` / `provides` / chain `via` exists in `capabilities.yml`.
- Every slug in `achieves` exists in `goals.yml`.
- Every chain `to:` points at an existing node.
- A chain's `via` is a **subset of the source node's `provides`** (you can only hand
  off what you have).
- `slug` matches the filename; required fields present; enums valid.

Run `npm run validate` before opening a PR.

## Authoring guidance

- **Capabilities before nodes.** If a handoff needs a new capability, add it to
  `capabilities.yml` with a clear label/description first. Prefer reusing an existing
  slug over inventing a near-duplicate.
- **Curated vs derived.** Only set `documented: true` when you cite a real source
  (PortSwigger, OWASP, vendor advisory, public writeup). **Never invent references.**
  Leave speculative handoffs to the derived layer.
- **Keep it conceptual.** Describe the outcome and the handoff, not a working payload.
- **Defensive parity.** Fill in `detection` and `remediation` — they are what make the
  graph useful to defenders.

## PR checklist

- [ ] `npm run validate` passes.
- [ ] New capability/goal slugs are documented in their vocab files.
- [ ] Documented chains have real references.
- [ ] `detection` and `remediation` are filled in.
