# Master Data Phase 4 reuse boundary audit (2026-04-30)

## Scope

This is the worker-1 code/component boundary audit for the Phase 4 reuse evaluation after PR #67. It is docs-only: no runtime, API, schema, data, dependency, or Phase 3 UI changes were made.

Evaluated surfaces:

- Summary cards: `MaterialSummaryCards.vue`, `SupplierSummaryCards.vue`, `MasterDataDiagnosticsSummaryCards.vue`
- Audit panels: `MaterialAuditPanel.vue`, `SupplierAuditPanel.vue`
- Diagnostics panels: `MaterialDiagnosticsPanel.vue`, `SupplierDiagnosticsPanel.vue`
- Integration/composable boundaries: `MaterialManagement.vue`, `SupplierMaster.vue`, `useMaterialManagementPageState.ts`, `useSupplierMaster.ts`, `useMasterDataDiagnostics.ts`

## Current reuse already present

| Reuse surface | Evidence | Status |
| --- | --- | --- |
| Shared lifecycle UI | `src/views/MaterialManagement.vue` and `src/views/SupplierMaster.vue` both mount `MasterDataLifecyclePanel`; the roadmap already records `MasterDataLifecyclePanel.vue` as Phase 4 reuse evidence. | Keep shared. No action needed in this slice. |
| Unified diagnostics/governance pages | `src/views/MasterDataDiagnostics.vue`, `src/views/MasterDataGovernance.vue`, and `src/features/master-data/components/MasterDataDiagnosticsSummaryCards.vue` provide cross-page issue and governance entry points. | Keep shared. They are the strongest existing Phase 4 reuse boundary. |
| Route/action contracts | `src/features/master-data/masterDataNavigation.ts` and `tests/master-data-phase3-interaction-flow-guard.test.ts` guard cross-page navigation from diagnostics to Material/Supplier workbenches. | Keep sealed as Phase 3 evidence; do not reopen in Phase 4 cleanup. |

## Boundary findings and recommendation

| Area | Evidence | Recommendation |
| --- | --- | --- |
| Summary cards | `MaterialSummaryCards.vue` and `SupplierSummaryCards.vue` have the same three-card visual skeleton: `<div class="grid gap-4 md:grid-cols-3">`, repeated `Card` / `CardContent`, label, numeric value, and helper text. Their data contracts differ (`totalMaterials`, `linkedMaterialCount`, material relationship counts vs `totalSuppliers`, `totalLinkedMaterials`, supplier relationship counts). `MasterDataDiagnosticsSummaryCards.vue` uses the same card idiom but a five-column diagnostics-specific summary. | **Defer.** A tiny `SummaryMetricCards` renderer is plausible later, but it should be introduced only with a component/render guard that preserves Chinese labels, color classes, and metric formulas. Current tests mostly assert strings and page-state computed values rather than rendering a generic card contract. |
| Audit panels | `MaterialAuditPanel.vue` is a simple conditional list of up to 10 audit logs. `SupplierAuditPanel.vue` adds a trend card (`create`, `update`, `archive`, `latest`) and lists up to 5 logs. The common seam is the audit-log row/list body, while Supplier-specific trend context can remain outside the shared piece. | **Best next micro-slice.** Extract only the presentational audit-log list/card after adding a focused render/static guard; keep Supplier trend and per-page row limits in their current callers. |
| Diagnostics panels | `MaterialDiagnosticsPanel.vue` owns material reference-check display, supplier reference path samples, unlinked/inactive material groups, and emits `auto-relink` / `open-edit`. `SupplierDiagnosticsPanel.vue` owns inactive suppliers, suppliers-with-unlinked-materials, and emits `view-linked-materials` / `open-edit`. The props and actions are intentionally object-specific even though both use `Card` lists. | **Defer.** The shared abstraction would need a generalized issue-list/action schema, which is larger than a behavior-preserving Phase 4 micro-refactor. Keep the current explicit components until a tested common issue-card primitive is needed. |

## Ownership boundaries

- Material workbench data is still owned by `src/features/materials/composables/useMaterialManagementPageState.ts`:
  - `relationshipHealth` computes total, linked, unlinked, inactive-linked, and sample material groups.
  - `actionableRelationshipGroups` computes material auto-fix and manual-review candidates.
- Supplier workbench data is owned by `src/features/master-data/composables/useSupplierMaster.ts`:
  - `relationshipHealth` computes total suppliers, linked material total, inactive-linked suppliers, and suppliers with unlinked materials.
  - `auditTrendSummary` is Supplier-specific and should not be forced into Material audit without a product requirement.
- Unified diagnostics aggregation is owned by `src/features/master-data/composables/useMasterDataDiagnostics.ts`:
  - `materialIssues`, `supplierIssues`, and `summary` already provide a cross-object contract for the dedicated diagnostics page.

## Existing coverage relevant to the decision

- `tests/config-table-guard.test.ts` asserts the Material/Supplier summary, audit, diagnostics components exist and retain key user-facing labels.
- `tests/master-data-phase3-interaction-flow-guard.test.ts` guards diagnostics/workbench action wiring for edit, relink, linked-materials, and related-object jumps.
- `tests/material-management-page-state.test.ts` covers Material relationship health and actionable relationship groups.
- `tests/supplier-master-page-state.test.ts` covers Supplier relationship health and audit trend counts.
- `tests/master-data-diagnostics-page-state.test.ts` covers unified diagnostics aggregation and auto-relink behavior.

## Phase 4 next slice

Recommended next implementation slice, if the team chooses code after this docs/status run:

1. Add a small rendering/static guard for the current Material and Supplier audit panels.
2. Extract only a generic presentational audit-log list/card that accepts the existing `id/action/operator/createdAt/meta` row shape.
3. Keep Supplier's trend strip in `SupplierAuditPanel.vue` and keep row limits configurable at the caller level (`5` for Supplier, `10` for Material).
4. Keep Summary and Diagnostics explicit until their shared contracts are covered by focused render guards.

## Closeout recommendation

Do not refactor code in this run. Phase 4 should remain **partial / active**, with Audit log list/card extraction as the narrowest next implementation candidate and Summary/Diagnostics explicitly deferred. This preserves PR #67's Phase 3 browser-smoke closeout while giving the next Phase 4 slice a narrow, testable boundary.
