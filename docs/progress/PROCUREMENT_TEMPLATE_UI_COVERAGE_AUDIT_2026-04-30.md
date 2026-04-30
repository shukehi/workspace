# Procurement template UI coverage audit (2026-04-30)

> 状态：docs/status closeout for the frontend-plan matrix follow-up.
> 本次不改 API / schema / data，也不做采购页面重构。

## Executive answer

Procurement template UI is **mostly closed for template entry and dialog
validation coverage**. The earlier status-matrix concern was still directionally
right, but the current codebase already contains stronger coverage than the
matrix implied.

Current call:

- **Template entry → dialog initialization → business-category validation:**
  covered by existing page-level E2E and dialog/unit guards.
- **Template-driven draft/schema/validation:** covered by existing unit/static
  tests.
- **Print / PDF / historical compatibility:** substantially covered; a
  fixture-driven legacy print matrix now guards representative old categories
  in `tests/print-doc-builder.test.ts`, `/print-document` has a browser smoke
  for a legacy `锁叉` snapshot, and PDF generation now captures the same
  legacy-like payload through its transient snapshot handoff.
- **Recommended next slice:** do not refactor Procurement UI now; this line is
  ready to pause unless release QA wants manual browser/PDF spot checks.

## Evidence map

| Surface | Current evidence | Status |
| --- | --- | --- |
| Template entry buttons | `src/views/Procurement.vue` renders `PROCUREMENT_TEMPLATE_OPTIONS` and calls `openManualEntry({ templateType: option.value })`. | Covered. |
| Dialog create context | `src/views/Procurement.vue` passes `createTemplateType` / `createCategory` into `EditOrderDialog.vue`; `tests/procurement-dialogs.test.ts` asserts manual entry stores template context. | Covered. |
| Business-category choice | `EditOrderDialog.vue` uses `resolveTemplateCategories`, `requiresBusinessCategoryChoice`, `currentTemplateCategoryOptions`, `handleBusinessCategoryChange`; `tests/procurement-template-entry.e2e.test.ts` checks merged templates require explicit business category selection. | Covered. |
| Dialog/static guard | `tests/procurement-layout-guard.test.ts` asserts template options, template/category handlers, and business-category choice wiring remain present. | Covered. |
| Draft/schema/validation | `tests/edit-order-draft.test.ts`, `tests/order-draft.test.ts`, `tests/procurement-shared-schema.test.ts`, and related order-sheet tests cover template/category draft and schema behavior. | Covered. |
| Print/PDF/export path | `tests/print-doc-builder.test.ts`, `tests/print-snapshot-route.test.ts`, `tests/print-snapshot-store.test.ts`, `tests/pdf-route.test.ts`, `tests/pdf-generator-lifecycle.test.ts`, `tests/procurement-preview.test.ts`, and layout/style guards cover the current print/PDF surfaces. | Substantially covered; still the best future smoke target. |
| Historical category compatibility | Existing order-sheet/print tests include category-specific behavior, but the roadmap still calls out wider historical old-order regression. | Partially closed; keep as QA follow-up rather than UI refactor. |

## What changed since the old roadmap status

`docs/roadmaps/procurement/PROCUREMENT_TEMPLATE_OPTIMIZATION_PLAN.md` still
lists page-level automation for `template entry → dialog initialization →
business-category validation` as a remaining item. The current repo now has
`tests/procurement-template-entry.e2e.test.ts`, which directly covers that path.

That means the safest next step is **not** another Procurement implementation
slice. The gap has shifted from “missing page-level automation” to “release-style
historical print/browser confidence.”

## Recommended next Procurement slice

If Procurement remains the next active frontend lane, choose one of these small
QA-only slices:

1. **Release QA spot check**
   - the fixture-driven print-doc builder matrix now covers representative legacy
     categories at model level;
   - `/print-document` now has a browser smoke for a legacy `锁叉` snapshot;
   - PDF generation now proves the legacy `锁叉` payload is stored in the
     transient snapshot and rendered through `/print-document`;
   - remaining confidence, if requested, should be manual browser/PDF spot checks
     rather than more template UI implementation.
2. **Manual/browser smoke note**
   - open `/procurement`;
   - click `双开门配件` and `通用配件` template entries;
   - verify the dialog starts with no default business category and blocks save
     until `锁具/拉手` or `锁叉/五金/配件` is selected;
   - verify preview/print remains reachable for one new and one legacy-like
     record.

Do not start with a UI refactor. Do not rework template/category data modeling in
this lane.

## Verification for this audit

Read-only/codebase evidence was gathered from:

```bash
rg -n "template|Template|businessCategory|category|print|PDF" \
  src/views/Procurement.vue \
  src/components/procurement \
  src/features/procurement \
  src/stores/useProcurementStore.ts \
  tests/*procurement* tests/*print* tests/*dialog* tests/*draft*
```

Relevant existing tests identified:

```bash
tests/procurement-template-entry.e2e.test.ts
tests/procurement-dialogs.test.ts
tests/procurement-layout-guard.test.ts
tests/edit-order-draft.test.ts
tests/order-draft.test.ts
tests/procurement-shared-schema.test.ts
tests/print-doc-builder.test.ts
tests/print-snapshot-route.test.ts
tests/print-snapshot-store.test.ts
tests/pdf-route.test.ts
tests/pdf-generator-lifecycle.test.ts
tests/procurement-preview.test.ts
```

No runtime code was changed for this audit.
