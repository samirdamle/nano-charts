# nano-charts 1.0.0 plan

Status: planning (2026-10-27). Core 0.7.0 / React 0.2.0 published to npm 2026-10-27.

## Goal

1.0.0 is an API-freeze decision, not a feature count. The library is already
feature-complete for its mission (12 charts, axes, highlights, annotations on
every chart, CSS classes, the pictogram system). What 1.0 needs is proof the
public API is settled: the annotations v2 API and the renamed React
components have survived real use with no breaking fix needed.

1.0 promises a stable public API. Internals stay free to improve in 1.x.

## Why 1.0 was held

2026-10-27 decision: hold 1.0.0 because annotations v2 is too fresh for a
stability promise. Core stays 0.7.0, React 0.2.0 (the rename changeset went
major → minor via PR #188 so the bot proposed 0.2.0, not 1.0.0).

## Phases and issues

One issue per work item. Priority is start order, not just importance:
validation starts first because it takes wall-clock time, even though its
verdict comes last.

### Phase 0 — Finish the 0.7.0 landing (immediate)

| Issue | Work |
| --- | --- |
| #189 | 0.7.0 post-release hygiene: demo hero → v0.7.0, version sweep, figures re-measured on all surfaces, consumed changesets deleted from develop, main → develop merged and diffed |

### Phase 1 — Validation (the real 1.0 gate; start early)

| Issue | Work |
| --- | --- |
| #190 | Use core 0.7.0 + React 0.2.0 in a real product; exercise annotations and renamed components; collect API friction; record any breaking fix as 1.0-blocker input |

### Phase 2 — Internal hardening (no public API change)

From the 2026-10-26 architecture scan. Each change is verified with full
test suites + byte-identical differential scene snapshots.

| Issue | Work |
| --- | --- |
| #191 | One hit-target module in React (Strong) — also buys back React barrel headroom (14.91 / 15 kB) |
| #192 | One scene-finish module (Worth exploring) |
| #193 | Shared single-datum normalization (Worth exploring) |

### Phase 3 — Process and docs

| Issue | Work |
| --- | --- |
| #194 | Fix CI publishing (NPM_TOKEN auth) so 1.0 does not depend on one Mac |
| #195 | Migration guide for the React 0.1.5 → 0.2.0 rename |
| #196 | Close stale issues for already-merged work (#173, #175–#181, #184) |
| #197 | Audit docs/API.md for the annotations + reference-line surface |

### Phase 4 — Release

| Issue | Work |
| --- | --- |
| #198 | 1.0.0 release: API freeze + "what 1.0 promises" note, major bump for both packages, publish, announce |

## Triage (priority order)

1. **#189 hygiene** — immediate, clears the tree.
2. **#190 validation** — start now, judge later. This is the gate.
3. **#191 hit-targets** — Strong rating plus barrel-headroom relief.
4. **#194 CI publish** — required before 1.0 ships.
5. **#192, #193, #195, #197, #196** — hardening, docs, hygiene; any order.
6. **#198 1.0.0** — capstone. Blocked at minimum by #190 (validation verdict)
   and #194 (CI publish); the rest recommended.

## Explicit non-goals

- **Overlay pipeline** (architecture candidate 5): deferred. Speculative, flagged
  as a possible false abstraction (clip/span/drop semantics genuinely differ) —
  the wrong refactor to attempt right before a stability promise.
- **New chart types** (lollipop, dumbbell, waterfall, waffle): stay
  deprioritized. Adding features for 1.0's sake works against the freeze.
- **Demo usage-panel epics** (#129–#132): nice-to-have, not 1.0-blocking.

## Standing rules that apply throughout

- Issues → branch → code; PRs target `develop`, never merge unreviewed.
- After every update, re-measure and refresh all bundle-size figures on all
  surfaces (figures in bytes/1000); stale figure = bug.
- Double-check in every issue that no functionality is lost or hampered.
