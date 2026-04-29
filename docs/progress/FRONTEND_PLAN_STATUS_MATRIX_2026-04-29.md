# Frontend Plan Status Matrix (2026-04-29)

> 状态：现行状态索引。
> 用于回答“前端计划是否完成”；具体执行仍以各源文档和最新 PR 为准。

## Executive answer

The frontend plan is **not globally complete**. The completed part is the
Config Center frontend/UI release line. Other frontend tracks remain partial or
planning-oriented.

Short version:

- **Config Center frontend/UI:** complete and sealed for this release line.
- **Frontend compatibility shim retirement:** complete for the targeted shims.
- **Master Data frontend workbench:** partially delivered; broader roadmap still
  has Phase 2+ work.
- **System optimization frontend items:** partially complete as part of a wider
  system plan.
- **Procurement template UI:** mostly implemented, but still has E2E / historical
  print regression gaps.

## Status matrix

| Track | Current status | Evidence | Remaining decision |
| --- | --- | --- | --- |
| Config Center release/UI simplification | **Complete / sealed** | `docs/progress/CONFIG_CENTER_RELEASE_CLOSEOUT_2026-04-29.md`; PRs #56/#58/#59/#61/#62/#63 | Do not continue this lane unless a regression appears. |
| Config Center runtime snapshot / shell | **Delivered for current release** | `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_RUNTIME_SNAPSHOT_2026-04-21.md`; release closeout smoke evidence | Keep API key and published-mapping prerequisites in release smoke. |
| Config Center original roadmap / Wave1 docs | **Historical / superseded for release status** | `docs/roadmaps/CONFIG_CENTER_REFACTOR_IMPLEMENTATION_PLAN_2026-04-21.md`; `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md`; PR note / checklist docs | Use as background only; final release state is the 2026-04-29 closeout. |
| Frontend compatibility shim retirement | **Complete for targeted shims** | `docs/progress/BRANCH_PROGRESS_FRONTEND_SHIM_RETIREMENT_EXECUTION_2026-04-21.md` | Continue only if new shim surfaces are discovered. |
| Master Data frontend workbenchization | **Partial / active roadmap** | `docs/roadmaps/MASTER_DATA_FRONTEND_REFACTOR_PLAN_2026-04-21.md`; `docs/roadmaps/MASTER_DATA_FRONTEND_IMPLEMENTATION_SEQUENCE_2026-04-21.md`; progress docs for workbenchization/visual smoke | First align the roadmap with actual completed phases; then pick one small component/repair-flow slice. |
| System optimization frontend items | **Partial / stale-check needed** | `docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md` says partial; task list includes frontend request/auth/normalizer items | Reassess whether old checklist items are still relevant after current API/auth state. |
| Procurement template UI | **Mostly implemented, not closed** | `docs/roadmaps/procurement/PROCUREMENT_TEMPLATE_OPTIMIZATION_PLAN.md` marks Phase 3 basically complete and Phase 4 partial | Add page-level UI/E2E coverage for template entry → dialog initialization → business-category validation, or close stale remaining items explicitly. |

## Completed frontend scope

### Config Center frontend/UI

This line can be considered complete for the current release because:

- Config Center navigation is grouped by operator intent.
- Rule-exception pages use one canonical first-screen guide card:
  `首屏操作指南`.
- The duplicate legacy guide card title `首屏维护顺序` has been removed from the
  five mapping pages.
- Review panels were reduced/noise-controlled while validation remains prominent.
- Production runtime smoke and UI smoke are recorded in the release closeout.

Do not use the older implementation roadmap or Wave1 “review-ready” docs as the
final state. They are useful history, but the current authority is
`CONFIG_CENTER_RELEASE_CLOSEOUT_2026-04-29`.

### Compatibility shim retirement

The targeted frontend shims were physically retired:

- `ConfigPageLayout.vue`
- `useMappingConfigEditor.ts`
- `formulaApi.ts`

The retirement execution doc records targeted tests and type-check evidence.
This lane should stay closed unless a new compatibility shim is identified.

## Not complete / still active

### Master Data frontend workbench

The Master Data frontend direction is still a roadmap, not a sealed closeout.
The plan still describes moving Material/Supplier pages from enhanced management
pages into a list/detail/diagnostics/audit workbench shape.

The safest next slice is documentation/status alignment first:

1. compare the implementation sequence against current `src/views` and
   extracted components;
2. mark which Phase 1/2 components are already done;
3. choose one small remaining component extraction or interaction-flow slice.

### System optimization frontend items

The system optimization plan is explicitly marked partial. Because it is broad
and older than the Config Center closeout, do not start implementation directly
from that checklist. First reassess which frontend items are still accurate after
API key auth, pagination, and response-normalizer changes already landed.

### Procurement template UI

The procurement template plan records substantial implementation progress, but
also lists remaining page-level interaction tests and historical print regression
coverage. This is a better candidate for a focused QA/test slice than for another
large UI refactor.

## Recommended next frontend slice

Do **not** continue Config Center frontend work right now.

Recommended next docs PR:

1. Mark older Config Center roadmap docs as historical or superseded by the
   2026-04-29 closeout where appropriate.
2. Audit the Master Data frontend implementation sequence against current code.
3. Update roadmap/progress docs with a phase-completion checklist.

If the next slice must be implementation rather than docs, choose the smallest
explicitly named active frontend gap: Procurement page-level automation for
`template entry → dialog initialization → business-category validation`.

Why this is the next safest step:

- It does not touch runtime/API/schema/data.
- It prevents stale plans from being mistaken for current work.
- It creates a clear handoff before any new frontend implementation starts.

## Verification for this matrix

This matrix was prepared from existing docs plus the current main state:

```bash
git status --short --branch
gh pr list --state open --limit 20
rg -n "状态：|完成|remaining|剩余|frontend|前端|UI|Config Center" docs/roadmaps docs/progress docs/governance
```

Current repository state at creation:

- `main` matched `origin/main`.
- No open PRs were listed.
- Latest closeout commit: `c61762e Record Config Center release smoke handoff`.
