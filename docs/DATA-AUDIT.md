# LolChain Data Audit — Phase 1 (Trust & Correctness)

_Generated 2026-11-16. Scope: the 92 vuln nodes, their capability wiring, and the 403 edges (69 curated chains + 334 derived)._

## How the graph is built (the model in one paragraph)

Every node declares `requires` (capabilities it needs before it can run), `provides`
(capabilities it hands off), and `achieves` (goal end-states it realises). A **derived
edge** `A → B` is auto-created wherever `A.provides ∩ B.requires ≠ ∅`. **Goal search**
("I want domain admin") matches on `achieves`. So two things decide whether the graph is
trustworthy: (1) are the capability hand-offs semantically honest, and (2) is every
node's `achieves` complete. The audit found problems in both.

---

## Severity 1 — Cross-OS privilege-escalation edges are wrong (biggest trust hole)

`os-command-exec` is a single, OS-agnostic capability. 20 RCE nodes provide it; the 6
host local-privesc nodes require it. Result: **every** RCE links to **both** Linux and
Windows privesc, so the graph asserts nonsense edges:

- `proxyshell` / `proxylogon` (Windows Exchange) → **privesc-linux-sudo** ❌
- `lfi-to-rce` / `ssti` (typical Linux web) → **privesc-windows-potato** ❌

This alone generates ~40 edges, roughly half semantically false. It's the single thing
most likely to make the map look untrustworthy.

**Recommended fix (surgical, implemented this pass):** add an optional `os:` tag
(`linux` | `windows`) to the clearly OS-bound nodes only. The edge builder suppresses a
derived edge when both endpoints declare an `os` and they differ. OS-agnostic RCE
(command-injection, webshell, log4shell) stays linked to both — which is honest, because
it genuinely could be either. This kills the clearly-wrong edges without over-splitting
the vocabulary.

## Severity 1 — One-hop "Domain Takeover" from any domain credential

`ad-domain-takeover` requires only `domain-credentials`. Every node that yields *a*
credential therefore claims a one-hop path to full domain admin:

- `asrep-roasting` → **AD Domain Takeover** ❌ (AS-REP roasting one low-priv user ≠ DA)
- `ad-kerberoasting` → **AD Domain Takeover** ❌ (a crackable SPN hash ≠ DA)

**Recommended fix (implemented this pass):** `ad-domain-takeover` now requires
`dcsync-rights` — the real "I can act as the domain" primitive. Roasting/creds must first
chain through an object-control step (`ad-attack-path → acl-abuse → dcsync-rights`) to
reach it. The web→DA kill chain still resolves, just via an honest, longer path.

## Severity 2 — Nodes missing `achieves`, so goal-search under-reports

These provide an end-state capability but declare no goal, so "I want X" never surfaces
them as an endpoint (fixed this pass):

| Node | Provides | Missing goal |
|------|----------|--------------|
| `config-secret-harvest` | cloud-credentials | cloud-account-compromise |
| `leaked-cloud-key` | cloud-credentials | cloud-account-compromise |
| `cicd-secret-exfil` | cloud-credentials, supply-chain-write | cloud-account-compromise, supply-chain-compromise |
| `exposed-k8s-dashboard` | cluster-api-access | cluster-admin |

Goal-coverage counts before fix (why some searches feel empty):

```
 1  cluster-admin           1  supply-chain-compromise   1  ransomware-impact
 3  domain-admin            4  cloud-account-compromise   5  internal-network-access
 6  data-breach             7  auth-bypass                8  account-takeover
16  privilege-escalation   21  remote-code-execution
```

`cluster-admin`, `supply-chain-compromise`, `ransomware-impact` sitting at 1 each are the
thinnest — legitimately rare end-states, but worth a second look for under-tagging.

## Severity 3 — Dead-end capabilities (provided, never consumed)

These capabilities are handed off but nothing requires them, so those nodes never chain
forward:

- `auth-bypass` (11 providers) — also a goal, so terminal-by-design. Acceptable, but it
  means an auth bypass never pivots to ATO/data in the graph. `race-condition` is the
  only fully orphaned node because of this.
- `arbitrary-file-read` (4: lfi, path-traversal, ssti, xxe) — **genuine missing chain.**
  Arbitrary read should reach secrets (`/etc/shadow`, `web.config`, cloud cred files) →
  credential access. Candidate new edge, flagged not yet built.
- `ci-runner-exec` (2) — runner code-exec that doesn't chain onward. Candidate.
- `forge-state-change`, `db-read`, `db-write`, `cache-control` — mostly legit terminal
  data/impact states.

## Not a problem (verified healthy)

- **Entry conditions**: all 14 "required but never provided" caps are `entry`-group
  (attacker-controlled-*, victim-interaction). Correct — those are the graph's roots.
- **Sinks**: every node with no outgoing edge achieves a goal. No silent dead-ends.
- **Vocabulary**: zero unused capabilities; schema still rejects unknown slugs and
  `via ⊄ provides` at build time.
- **Reference integrity**: unchanged from prior verification pass (real sources only).

---

## What this pass changes vs. defers

**Applied now:** os-tag cross-OS suppression; `ad-domain-takeover` requires tightening;
4 missing-`achieves` fixes; this document + a `docs/MODEL.md` describing the model.

**Deferred (needs your call):** new `arbitrary-file-read → secret-harvest` and
`ci-runner-exec → ci-secrets` forward edges; whether to let `auth-bypass` pivot forward;
a deeper per-node review of the 21 RCE and 16 privesc tags for completeness.
