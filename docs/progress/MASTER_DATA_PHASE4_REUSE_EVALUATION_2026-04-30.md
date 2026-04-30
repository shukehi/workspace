# Master Data Phase 4 reuse evaluation (2026-04-30)

## Scope

This is the docs/verification lane after the Phase 3 browser-smoke closeout in PR #67. It does **not** change runtime/API/schema/data and does **not** reopen Phase 3 repair-flow UI work.

The purpose is to turn Phase 4 into an evidence-backed next slice: compare the Material and Supplier workbench Summary / Audit / Diagnostics surfaces, record what is already shared, and identify the smallest safe reuse candidate before any code extraction.

## Current status

| Area | Status | Evidence | Phase 4 call |
| --- | --- | --- | --- |
| Existing shared master-data layer | Already shared | `MasterDataLifecyclePanel.vue`, `MasterDataDiagnosticsSummaryCards.vue`, `src/views/MasterDataDiagnostics.vue`, and `src/views/MasterDataGovernance.vue` are already tracked by the implementation sequence as Phase 4 partial completion. | Keep; do not rework in this slice. |
| Summary cards | Similar layout, different domain contract | Material summary consumes `totalMaterials`, `linkedMaterialCount`, `unlinkedMaterialCount`, and `inactiveSupplierLinkedMaterialCount`; Supplier summary consumes `totalSuppliers`, `totalLinkedMaterials`, `inactiveLinkedSupplierCount`, and `suppliersWithUnlinkedMaterialsCount`. Both render a three-card grid, but labels and metric semantics are still page-specific. | Defer extraction until a generic card-row contract is designed and snapshot/guard coverage exists. |
| Audit panels | Best small reuse candidate | Material and Supplier audit entries share `id/action/operator/createdAt/meta`; both render `最近审计记录`. Supplier adds a trend strip and shows 5 rows; Material shows 10 rows. | Candidate next slice: extract only the repeated audit-log list/card, keeping Supplier trend and per-page row limits as callers' responsibility. |
| Diagnostics panels | Divergent interaction contract | Material diagnostics takes `referenceCheck`, Material relationship-health samples, and emits `auto-relink` / `open-edit`; Supplier diagnostics takes Supplier relationship-health groups and emits `view-linked-materials` / `open-edit`. | Do not extract now; first document a shared issue-card vocabulary if more master-data object types appear. |
| Tests / guards | Existing coverage is interaction/state-oriented | `tests/config-table-guard.test.ts` checks the current Material/Supplier component surfaces and labels; `tests/master-data-phase3-interaction-flow-guard.test.ts` locks route/action wiring; page-state tests cover Material and Supplier relationship/audit state. | Any future refactor must preserve these tests and add a focused guard for the new shared audit-log component. |

## Evidence notes

- Material and Supplier workbench pages both import and mount their page-specific Summary and Diagnostics components: `src/views/MaterialManagement.vue` and `src/views/SupplierMaster.vue`.
- The current Summary components are layout-compatible but not data-contract-compatible: `src/features/master-data/components/MaterialSummaryCards.vue` and `src/features/master-data/components/SupplierSummaryCards.vue` expose different health fields and domain labels.
- The current Audit components share the audit-log row shape, but Supplier owns extra trend context: `src/features/master-data/components/MaterialAuditPanel.vue` and `src/features/master-data/components/SupplierAuditPanel.vue`.
- The current Diagnostics components are intentionally page-specific because their inputs and action events differ: `MaterialDiagnosticsPanel.vue` handles material reference/relink groups, while `SupplierDiagnosticsPanel.vue` handles linked-material navigation and supplier edit actions.
- Existing tests already provide reuse-safety guardrails:
  - `tests/config-table-guard.test.ts` asserts Material/Supplier component presence and visible labels.
  - `tests/master-data-phase3-interaction-flow-guard.test.ts` asserts diagnostics-to-workbench navigation and action wiring.
  - `tests/material-management-page-state.test.ts`, `tests/supplier-master-page-state.test.ts`, `tests/master-data-diagnostics-page-state.test.ts`, and `tests/master-data-governance-page-state.test.ts` cover the page/composable state that feeds these panels.

## Recommended next implementation slice

If Phase 4 moves from evaluation into code, start with the **audit-log list/card extraction** only:

1. Add a shared presentational component for the repeated audit-log list body (for example, a generic `MasterDataAuditLogList` / `MasterDataAuditLogCard` under `src/features/master-data/components/`).
2. Keep the Supplier trend strip in `SupplierAuditPanel.vue` and keep row limits configurable at the caller level (`5` for Supplier, `10` for Material) so behavior stays unchanged.
3. Add or extend a static guard test that proves Material and Supplier still render `最近审计记录`, preserve the Supplier trend strip, and keep their row limits explicit.
4. Run `npm run type-check`, the targeted master-data tests, and the config-table guard before treating the extraction as complete.

Do **not** start with Summary or Diagnostics extraction unless the audit slice proves the shared-component seam is low-noise. Summary requires a generic metric-card contract, and Diagnostics has different event semantics that would be easy to over-abstract.

## Verification recorded for this docs lane

This lane updated documentation only. The relevant verification set is:

```bash
npm run type-check
node --require tsx/cjs --test --test-concurrency=1 \
  tests/config-table-guard.test.ts \
  tests/master-data-phase3-interaction-flow-guard.test.ts \
  tests/material-management-page-state.test.ts \
  tests/supplier-master-page-state.test.ts \
  tests/master-data-diagnostics-page-state.test.ts \
  tests/master-data-governance-page-state.test.ts
```

The commands above are the lightweight safety net for future Phase 4 code extraction because they cover component presence, route/action wiring, and Material/Supplier state inputs without requiring a full browser smoke.
