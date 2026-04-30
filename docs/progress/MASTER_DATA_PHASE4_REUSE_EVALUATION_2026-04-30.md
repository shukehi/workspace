# Master Data Phase 4 reuse evaluation (2026-04-30)

## Scope

This is the docs/verification lane after the Phase 3 browser-smoke closeout in PR #67. It does **not** change runtime/API/schema/data and does **not** reopen Phase 3 repair-flow UI work.

The purpose was to turn Phase 4 into an evidence-backed slice. The audit-log list/card slice has since been extracted; this document now records the post-extraction status and keeps Summary / Diagnostics deliberately deferred.

## Current status

| Area | Status | Evidence | Phase 4 call |
| --- | --- | --- | --- |
| Existing shared master-data layer | Already shared | `MasterDataLifecyclePanel.vue`, `MasterDataDiagnosticsSummaryCards.vue`, `src/views/MasterDataDiagnostics.vue`, and `src/views/MasterDataGovernance.vue` are already tracked by the implementation sequence as Phase 4 partial completion. | Keep; do not rework in this slice. |
| Summary cards | Similar layout, different domain contract | Material summary consumes `totalMaterials`, `linkedMaterialCount`, `unlinkedMaterialCount`, and `inactiveSupplierLinkedMaterialCount`; Supplier summary consumes `totalSuppliers`, `totalLinkedMaterials`, `inactiveLinkedSupplierCount`, and `suppliersWithUnlinkedMaterialsCount`. Both render a three-card grid, but labels and metric semantics are still page-specific. | Defer extraction until a generic card-row contract is designed and snapshot/guard coverage exists. |
| Audit panels | Implemented small reuse slice | `MasterDataAuditLogList.vue` now owns the presentational audit-log card/list. `MaterialAuditPanel.vue` still slices 10 rows, `SupplierAuditPanel.vue` still slices 5 rows and owns the Supplier trend strip. | Keep; do not broaden into Supplier trend or data fetching. |
| Diagnostics panels | Divergent interaction contract | Material diagnostics takes `referenceCheck`, Material relationship-health samples, and emits `auto-relink` / `open-edit`; Supplier diagnostics takes Supplier relationship-health groups and emits `view-linked-materials` / `open-edit`. | Do not extract now; first document a shared issue-card vocabulary if more master-data object types appear. |
| Tests / guards | Static guard added for audit extraction | `tests/master-data-audit-panel-guard.test.ts` proves both panels still render `最近审计记录`, keeps row limits caller-owned, and prevents the shared audit list from absorbing Supplier trend or Summary/Diagnostics concerns. | Future Summary/Diagnostics refactors need similarly focused guards before code changes. |

## Evidence notes

- Material and Supplier workbench pages both import and mount their page-specific Summary and Diagnostics components: `src/views/MaterialManagement.vue` and `src/views/SupplierMaster.vue`.
- The current Summary components are layout-compatible but not data-contract-compatible: `src/features/master-data/components/MaterialSummaryCards.vue` and `src/features/master-data/components/SupplierSummaryCards.vue` expose different health fields and domain labels.
- The Audit components now share `src/features/master-data/components/MasterDataAuditLogList.vue`; Supplier still owns extra trend context in `SupplierAuditPanel.vue`.
- The current Diagnostics components are intentionally page-specific because their inputs and action events differ: `MaterialDiagnosticsPanel.vue` handles material reference/relink groups, while `SupplierDiagnosticsPanel.vue` handles linked-material navigation and supplier edit actions.
- Existing tests already provide reuse-safety guardrails:
  - `tests/config-table-guard.test.ts` asserts Material/Supplier component presence and visible labels.
  - `tests/master-data-phase3-interaction-flow-guard.test.ts` asserts diagnostics-to-workbench navigation and action wiring.
  - `tests/material-management-page-state.test.ts`, `tests/supplier-master-page-state.test.ts`, `tests/master-data-diagnostics-page-state.test.ts`, and `tests/master-data-governance-page-state.test.ts` cover the page/composable state that feeds these panels.

## Recommended next implementation slice

No new Master Data implementation slice is recommended from this status pass. The prior smallest slice, **audit-log list/card extraction**, is already in place:

1. `MasterDataAuditLogList.vue` is the shared presentational component.
2. Supplier trend rendering remains in `SupplierAuditPanel.vue`; row limits stay at the callers (`5` for Supplier, `10` for Material).
3. `tests/master-data-audit-panel-guard.test.ts` protects those boundaries.

Do **not** start with Summary or Diagnostics extraction unless a later audit proves a stable shared contract and adds focused guards first. Summary requires a generic metric-card contract, and Diagnostics has different event semantics that would be easy to over-abstract.

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
