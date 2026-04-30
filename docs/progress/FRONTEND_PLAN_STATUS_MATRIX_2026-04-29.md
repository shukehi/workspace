# Frontend Plan Status Matrix (2026-04-29)

> 状态：现行状态索引。
> 用于回答“前端计划是否完成”；具体执行仍以各源文档和最新 PR 为准。
> 2026-04-30 refresh：已纳入 Master Data audit-log list extraction、Procurement historical print/PDF closeout，以及 System Optimization frontend stale-check。

## Executive answer

The frontend plan is **not globally complete**. Config Center and Procurement's
current automated UI/print/PDF lines are closed for this release; Master Data is
mostly delivered but still has optional Phase 4 abstraction candidates; the
broader System Optimization frontend checklist has now been stale-checked; it does
not currently justify a new frontend implementation lane.

Short version:

- **Config Center frontend/UI:** complete and sealed for this release line.
- **Frontend compatibility shim retirement:** complete for the targeted shims.
- **Master Data frontend workbench:** Phase 1/2/3 are aligned; Phase 4
  audit-log list extraction is now delivered, while Summary / Diagnostics reuse
  remains intentionally deferred.
- **System optimization frontend items:** frontend stale-check complete; request
  race, API key header, response normalizer, and pagination touchpoints are not
  new frontend gaps.
- **Procurement template UI:** automated template-entry, print, PDF, and
  historical compatibility coverage is closed for this status pass; only
  release/manual spot checks remain.

## Status matrix

| Track | Current status | Evidence | Remaining decision |
| --- | --- | --- | --- |
| Config Center release/UI simplification | **Complete / sealed** | `docs/progress/CONFIG_CENTER_RELEASE_CLOSEOUT_2026-04-29.md`; PRs #56/#58/#59/#61/#62/#63 | Do not continue this lane unless a regression appears. |
| Config Center runtime snapshot / shell | **Delivered for current release** | `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_RUNTIME_SNAPSHOT_2026-04-21.md`; release closeout smoke evidence | Keep API key and published-mapping prerequisites in release smoke. |
| Config Center original roadmap / Wave1 docs | **Historical / superseded for release status** | `docs/roadmaps/CONFIG_CENTER_REFACTOR_IMPLEMENTATION_PLAN_2026-04-21.md`; `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_SIMPLIFICATION_WAVE1_READY_2026-04-24.md`; PR note / checklist docs | Use as background only; final release state is the 2026-04-29 closeout. |
| Frontend compatibility shim retirement | **Complete for targeted shims** | `docs/progress/BRANCH_PROGRESS_FRONTEND_SHIM_RETIREMENT_EXECUTION_2026-04-21.md` | Continue only if new shim surfaces are discovered. |
| Master Data frontend workbenchization | **Partial / active roadmap; audit-log slice delivered** | `docs/roadmaps/MASTER_DATA_FRONTEND_IMPLEMENTATION_SEQUENCE_2026-04-21.md`; `src/features/master-data/components/MasterDataAuditLogList.vue`; `tests/master-data-audit-panel-guard.test.ts`; PR #67 + follow-up audit-log extraction | Do not reopen Phase 3. Keep Phase 4 active only for post-extraction closeout and a future, separately guarded Summary/Diagnostics decision. |
| System optimization frontend items | **Frontend stale-check complete / no new frontend lane** | `docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md`; `src/lib/api.ts`; `src/stores/useProcurementStore.ts`; `src/features/procurement/model/orderNormalizer.ts`; `tests/api-contract-compat.test.ts`; `tests/procurement-store-normalize.test.ts`; `tests/procurement-store-fetch-orders-query.test.ts` | Keep as docs/status. Any follow-up should be backend/API contract or release verification, not Config Center/Procurement/Master Data frontend implementation. |
| Procurement template UI | **Automated coverage closed; release QA only** | `docs/progress/PROCUREMENT_TEMPLATE_UI_COVERAGE_AUDIT_2026-04-30.md`; `docs/roadmaps/procurement/PROCUREMENT_TEMPLATE_OPTIMIZATION_PLAN.md` 2026-04-30 supplement; print/PDF guard commits through `5cec8d5` | Pause implementation. If release confidence is requested, run manual browser/PDF spot checks rather than reopening template UI or data modeling. |

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

The Master Data frontend direction is no longer an early workbenchization
roadmap. Phase 1 and Phase 2 are implemented, Phase 3 is sealed by guard +
browser smoke evidence, and the Phase 4 audit-log list/card extraction is now
present as `MasterDataAuditLogList.vue` with `tests/master-data-audit-panel-guard.test.ts`.

The earlier documentation/status alignment has been mostly completed: Phase 1/2
are recorded as done, Phase 3 is sealed by guard + browser smoke evidence, and
the Phase 4 audit-log list seam has been extracted into
`MasterDataAuditLogList.vue` with a focused static guard.

The remaining Master Data decision is deliberately smaller: do **not** reopen
repair-flow work; either close out the audit-log extraction evidence or defer
Summary / Diagnostics reuse until a focused guard and shared contract are worth
the abstraction.

### System optimization frontend items

The system optimization plan remains a broad partial system plan, but its
frontend stale-check is complete as of 2026-04-30:

| Old item | Current frontend call | Evidence |
| --- | --- | --- |
| P2-3 request race | **Completed** | `useProcurementStore.fetchOrders` aborts the previous request and ignores cancellation errors. |
| P1-2 API key header | **Completed for frontend** | `src/lib/api.ts` injects `x-api-key` from `VITE_API_KEY` when configured. |
| P2-4 response normalizer | **Frontend compatibility completed; API contract consolidation separate** | `normalizeApiEnvelope` supports `{ success, data }`; `normalizeOrderListPayload` handles paginated order payloads. |
| P1-1 pagination touchpoints | **Completed for frontend** | procurement store sends paginated `/orders` queries and tracks server pagination state. |

Therefore, do not start a frontend implementation directly from the old 2026-03-18 checklist. Remaining System Optimization work, if any, should be scoped as backend/API contract, configuration, or release verification with fresh failing evidence.

### Procurement template UI

The procurement template plan now records substantial implementation and
automated coverage progress. Page-level template-entry validation, the historical
print matrix, `/print-document` legacy snapshot smoke, and PDF transient snapshot
coverage are all represented in tests/status docs.

This lane should pause unless release QA specifically asks for manual browser/PDF
spot checks. It is no longer the next implementation gap.

## Recommended next frontend slice

Do **not** continue Config Center frontend work right now.

Recommended next lane:

1. Treat Config Center as sealed, Procurement as automated-coverage closed, and
   Master Data Phase 4 audit-log list extraction as delivered.
2. Treat the System Optimization frontend stale-check as docs/status complete; do
   not open a new frontend implementation unless a fresh failing guard identifies
   a specific gap.
3. If implementation is required next, choose a non-frontend System Optimization
   backend/API contract or release-verification item with explicit evidence.

If the next slice must be frontend implementation, do **not** choose Config
Center, Procurement template UI, Master Data repair flow, or the old request
race/auth/normalizer/pagination checklist without a new failing test.

Why this is the next safest step:

- It does not touch runtime/API/schema/data.
- It prevents stale plans from being mistaken for current work and records which old frontend items are already covered.
- It keeps recently closed Procurement and Master Data lanes from being reopened
  without new failing evidence.

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
- Latest audited commit in this refresh: `5cec8d5 Guard Procurement PDF generation for legacy snapshots`.
