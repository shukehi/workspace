# Config Center / Backend Refactor Closeout

Date: 2026-04-29
Status: closeout artifact for current `main`
Source snapshot: `/Users/aries/Dve/workspace/.omx/context/config-backend-closeout-smoke-20260429T074102Z.md`
Current main head: `89bfdbc Guard retired lock-fork selector oracle (#52)`

## Purpose

This is a no-feature closeout record for the backend/config-center simplification wave that landed after the material mapping phase. The intent is to freeze what is complete, capture verification already available, identify release-smoke gaps still being checked by the verification lane, and recommend the next phase without making runtime/product or data/config changes.

## Completed PR/refactor wave

Recent `main` contains a focused sequence that moved runtime/config behavior away from stale static or legacy request-path defaults and toward explicit workflow/profile ownership:

- `02c68fa` — stopped the runtime material catalog client fallback to `/data/materials-catalog.json`; runtime materials now depend on the workflow-published `material_catalog` profile.
- `bc0f872` — made Config Center intent grouping explicit so rule editors, formula workbench, master-data repair, and admin/governance surfaces are easier to distinguish.
- `36a7606` and `dc788de` — exposed runtime readiness/degraded-profile semantics instead of hiding missing or unavailable profile state.
- `df2d372`, `6c50c76` — clarified formula collection/profile workflow boundaries and kept generic profile semantics separate from item-level formula operations.
- `527e99e`, `9cbd730`, `b0d1654` — retired remaining legacy JSON/file bridge behavior from runtime request paths, including cylinder detail and material catalog workflow bridge boundaries.
- `cf8dc5d`, `9ce29fc`, `2ca1fcf` — locked legacy config JSON and material resolver fallback boundaries with explicit guards/audits.
- `c7f9a89`, `e9d7cac`, `8d41de9`, `7bdfee5`, `ebe0d7d` — preserved ownership/default/reference semantics across packaging, lock, handle, cylinder, and lock-fork mappings while moving defaults into shared mapping/profile adapters rather than UI/runtime ad hoc paths.
- `82da9cb`, `2992030`, `89bfdbc` — covered lock-fork replay health, retired the legacy lock-fork selector oracle, and guarded against its return.

Together these changes close the highest-risk part of the first Config Center backend simplification phase: runtime consumers should now use published profile/workflow sources, while old legacy/static paths are either removed from request paths or fenced as compatibility/migration concerns with tests.

## Verification evidence available so far

Evidence captured before this closeout artifact:

- Config Center backend/runtime first-phase plan recorded successful checks for the material fallback removal lane:
  - `npm run type-check:server` — PASS.
  - Repository test command covering config loader/source guards/runtime/profile routes — PASS with 643 tests, 642 passing, 1 skipped, 0 failed.
  - `data/config/materials-catalog.json` was restored after tests and `git status --short` was clean.
- Config Center frontend/IA lane recorded:
  - `npm run type-check` — PASS.
  - `node --require tsx/cjs --test --test-concurrency=1 tests/config-table-guard.test.ts` — PASS, 4/4 tests.
  - `git status --short` clean and no material catalog data mutation.
- Material mapping phase closeout recorded a full regression lane:
  - `npm run type-check` — PASS.
  - `npm run type-check:server` — PASS.
  - `npm run type-check:test` — PASS.
  - `npm test` — PASS, 642 pass / 0 fail / 1 skipped.
  - `npm run build` — PASS.
  - `npm run lint:css` — PASS.
  - `data/config/materials-catalog.json` restored after tests.
- The closeout snapshot records:
  - `gh pr list --state open` returned no open PRs.
  - Worktree was clean before team launch.
  - `/usr/bin/git` is usable again after the Xcode exit/license issue.

Release-style verification on the exact current `main` head is owned by the verification lane and should be treated as the final smoke gate for this closeout. Required smoke commands are:

```bash
npm run type-check
npm run type-check:server
npm run type-check:test
npm test
npm run build
npm run lint:css
```

## Remaining risks / release watchpoints

- Full release smoke on current `89bfdbc` is still the decisive gate; earlier passes are strong evidence but were collected across the PR wave, not necessarily all on the final head.
- Manual/browser smoke with production-like supplier/material/profile data is still recommended before a user-facing release, especially for Config Center publish/replay/reference-check flows.
- Formula workflow remains intentionally split: generic `formulas` profile semantics are read-only/collection-like, while item-level formula create/update/publish/archive/rollback operations remain active. Future UI/API work should keep that distinction explicit.
- Runtime readiness now surfaces degraded profiles, but downstream consumers should continue to be audited so they do not silently convert not-ready runtime state into empty/partial baselines.
- Legacy JSON/data files should remain out of request paths. Any future migration/seed script that reads or writes them should be documented as migration-only and guarded against reintroducing runtime fallback behavior.
- Stale `.omx/state/team/*` directories may be historical state rather than product risk; cleanup should be a separate workspace-hygiene decision, not part of this no-feature closeout unless the leader explicitly scopes it.

## Recommended next phase

1. Finish the current release-style verification lane and require a clean `git status --short`, with no data/config JSON mutation, before declaring the wave closed.
2. If the smoke lane passes, treat the backend/config-source hardening wave as closed and avoid more opportunistic runtime refactors in this release window.
3. Start the next phase with operator-facing Config Center simplification rather than deeper backend churn:
   - make the grouped Config Center entry surface the default navigation mental model;
   - reduce high-density mapping pages by emphasizing defaults/templates first and exception rows second;
   - label raw JSON/material catalog surfaces as advanced/admin fallback;
   - keep existing profile payload schemas, publish/draft semantics, and routes stable.
4. Plan any remaining legacy-file retirement as a separate migration phase with explicit inventory, tests, and rollback notes.
5. Keep material mapping follow-ups limited to bugfixes or explicit business asks; customer-code mappings, BOM/material alternatives, and canonical integer `OrderItem.material_id` migration remain deferred roadmap items.

## Artifact scope

This artifact intentionally changes only `.omx/plans/config-center-backend-refactor-closeout-20260429.md`. It does not edit product runtime files, package scripts, or data/config JSON.
