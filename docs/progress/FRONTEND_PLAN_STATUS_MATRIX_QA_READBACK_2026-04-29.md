# Frontend Plan Status Matrix QA Readback (2026-04-29)

> Scope: docs-only readback for the frontend plan status matrix. No runtime,
> API, schema, data, or package changes were made in this worker slice.

## Readback verdict

The matrix should answer **not globally complete** for the full frontend plan.
Config Center frontend/UI closeout is complete and sealed, but other frontend
planning tracks remain active, partially complete, or stale enough to need a
status-alignment pass before new UI feature work.

## Evidence matrix

| Track | Status to show | Evidence | QA note |
| --- | --- | --- | --- |
| Config Center release/UI closeout | Complete / sealed | `docs/progress/CONFIG_CENTER_RELEASE_CLOSEOUT_2026-04-29.md` records that the closeout path completed UI and production runtime smoke on 2026-04-29, lists merged PRs #56/#58/#59/#61/#62, and says no further code changes are needed from the closeout. | Treat this as the only fully closed frontend line. Preserve the documented smoke prerequisites instead of reopening runtime/API behavior. |
| Config Center original refactor roadmap | Complete for early runtime/workflow/shell intent; stale as a roadmap | `docs/roadmaps/CONFIG_CENTER_REFACTOR_IMPLEMENTATION_PLAN_2026-04-21.md` still lists Phase 1-5 implementation steps and the first ticket for runtime snapshot, while later closeout docs show those release slices have moved on. | Link it as historical roadmap context, not as the current source of open work. |
| Config Center wave1 simplification | Mostly complete with named follow-ups | `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md` is approved and verified, but still names shared adapter drift and packaging backend/default ownership as next moves. The PR note also leaves manual verification and write-API response-shape verification unchecked. | Show as completed wave with explicit residual follow-ups, not a blocker to Config Center closeout. |
| Master Data frontend | Partially complete / active | `docs/progress/BRANCH_PROGRESS_MASTER_DATA_FRONTEND_WORKBENCHIZATION_2026-04-21.md` says Material and Supplier were upgraded to workbench subcomponents, and `docs/progress/BRANCH_PROGRESS_MASTER_DATA_VISUAL_SMOKE_2026-04-22.md` says four master-data pages passed browser smoke. | The implementation sequence includes later edit/repair-flow and cross-page reuse phases, so this is stable enough for follow-up slicing but not globally finished. |
| Frontend compatibility shims | Complete | Readiness and execution docs show shim consumers were inspected, guards added, and obsolete frontend shims physically retired. | Safe to mark done unless server-side legacy route retirement is included in a broader backend/API plan. |
| System optimization frontend item | Partial / pending | `docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md` is marked partially complete and still includes the frontend request-race item in `src/stores/useProcurementStore.ts`, plus broader API consistency work that would require frontend normalizers. | This is not part of the sealed Config Center release and should stay open in the matrix. |
| Procurement template optimization | Partially complete / active | `docs/roadmaps/procurement/PROCUREMENT_TEMPLATE_OPTIMIZATION_PLAN.md` says phases 1-2 are complete, phase 3 is basically complete, and phase 4 is partially complete; remaining work includes page-level automation and end-to-end print verification. | Recommend this as an active feature area, but not the smallest next slice if the goal is answering plan completeness. |

## Stale or partial-plan flags

- The Config Center implementation roadmap is useful history, but its phase list
  should not be read as fresh open scope without cross-linking the 2026-04-29
  release closeout.
- Config Center wave1 follow-ups are residual cleanup or ownership shifts; they
  should not downgrade the closeout status unless the matrix explicitly tracks
  post-release follow-ups.
- Master Data has strong implementation and smoke evidence, but the older
  implementation sequence still lists later phases. Mark it as **partial / active**.
- Procurement is explicitly **partial / active** because page-level automation,
  historical print regression, and end-to-end print verification remain open.
- System optimization remains **partial / stale**, with at least one frontend
  store race-condition item and API-normalizer implications still listed.

## Runtime/API/schema/data change check

This QA slice changed only this documentation file. It did not touch:

- `src/`
- `server/`
- `shared/`
- `data/`
- package manifests or lockfiles
- migrations or schemas

## Recommended next smallest frontend slice

Before starting new UI feature work, do a **docs/status alignment slice**:

1. Add the status matrix under `docs/progress/` as the current decision aid.
2. Mark older Config Center roadmap docs as historical or superseded by the
   2026-04-29 closeout where appropriate.
3. Add one cross-link from the matrix to the active Master Data and Procurement
   remaining-work docs.

If the next slice must be implementation rather than docs, choose the smallest
active frontend work with clear acceptance criteria: the Procurement page-level
automation covering `template entry -> dialog initialization -> business
category validation`, because it is explicitly named as remaining work and does
not require changing runtime/API/schema contracts.
