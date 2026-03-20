---
name: canvas-architecture-review
description: |
  Review canvas, scene-graph, and template changes against the repo's shared architecture north star. Use for code reviews, PR reviews, or any request to check whether new abstractions fit the refactor plan instead of drifting into template-specific forks.

  Trigger scenarios:
  - User asks for a code review of canvas, scene-graph, selection, viewport, rendering, behavior, or template changes
  - User asks whether a change fits the shared template/canvas architecture
  - User wants help preventing architectural drift, duplicated abstractions, or product-specific logic in shared code
  - Review touches `packages/shared/src/canvas/`, `packages/shared/src/scene-graph/`, or template-local canvas integrations

  Trigger phrases: "review this PR", "review this diff", "check architecture", "does this fit the refactor", "look for drift", "shared canvas review", "template architecture review"
---

# Canvas Architecture Review

Use this skill to review changes for architectural fit first, then for normal correctness risks.

This skill is optimized for answering: "What should I look for?" It does not require a specific review transport. Apply it whether the code comes from a local diff, a branch, pasted snippets, or a PR.

## Review Order

### Step 1: Classify the touched area

Decide which surfaces changed:
- `packages/shared/src/scene-graph/` or shared node types
- `packages/shared/src/canvas/` shared behaviors, rendering, selection, viewport, undo, formatting
- `templates/*/src/` template-specific renderers, tool chains, visuals, and app composition
- Cross-template copy/paste, clipboard, or node creation flows

### Step 2: Load the right references

- Always read [architecture-invariants.md](./references/architecture-invariants.md)
- Always read [general-review-checklist.md](./references/general-review-checklist.md)

When architecture docs and code disagree, trust the shared API surface and active template composition code first. `packages/shared/src/canvas/index.ts` is the quickest map of what is already meant to be shared.

Focus on architectural fit first. A change can be locally clean and still be wrong for the system.

### Step 3: Look for north-star violations

Prioritize findings that indicate drift:
- Template-specific branching in shared code
- New local abstractions that duplicate an existing shared abstraction
- New node types added locally when the concept must interoperate across templates
- Behavior differences implemented with conditionals instead of composition
- React-driven or per-template state sneaking back into shared scene-graph/canvas foundations

### Step 4: Suggest the fitting pattern

For each architectural finding, do not stop at "this is wrong." Explain the replacement pattern:
- move the concept to shared
- compose a different behavior chain per template
- inject render/event handlers instead of switching on product/template
- represent the feature as behavior or rendering logic rather than a new node type
- keep shared types generic and template visuals local

### Step 5: Run the normal code-review pass

After architectural fit, check the usual risks:
- correctness bugs
- undo/redo integration gaps
- stale subscriptions or Strict Mode hazards
- dirty-tracking / RAF sync regressions
- selection invariant violations
- missing tests around interactive flows

## Output Expectations

Lead with findings, ordered by severity. Each finding should include:
1. What code pattern is concerning
2. Why it violates the architecture or risks correctness
3. What pattern fits this repo better

If no issues are found, say that explicitly and call out any residual testing gaps.

## Repo-Specific Context

The refactor north star is:
- shared node types and shared scene-graph foundations
- shared canvas primitives where behavior is truly common
- template-local composition for visuals, tool chains, and product-specific affordances
- no product/template switches inside shared code
- copy/paste compatibility across templates as a design constraint

Shared includes behaviors, rendering infrastructure, connectors, grid utilities, label editing, selection-property hooks, and undo/redo machinery. Reviews should flag new local abstractions that duplicate those existing shared surfaces.

When in doubt, prefer the simpler abstraction that preserves cross-template interoperability.
