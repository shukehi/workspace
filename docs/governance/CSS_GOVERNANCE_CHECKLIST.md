# CSS Governance Checklist

## Goal
Keep CSS optimization safe and prevent accidental visual regressions.

## Required checks before merge
1. Run `npm run lint:css`
2. Run `node --test tests/print-style-guard.test.js`
3. Run `npm run type-check`
4. Manually verify current pages or flows impacted by the CSS change:
   - `src/views/Source.vue`
   - `src/views/Procurement.vue`
   - `src/views/Inventory.vue`
   - `src/views/Statistics.vue`
   - `src/views/PrintDocument.vue` when print styles are involved

## Notes

1. Historical `*.bak` template pages are no longer the primary verification target.
2. If a change only affects print styles, prioritize print preview and `tests/print-style-guard.test.js`.

## Rule for future refactors
1. Prefer selector grouping and module split over value changes.
2. Do not change spacing/size/color tokens in the same PR as structural CSS refactor.
3. Keep commits small and scoped by file/theme.

## CI Enforcement
1. GitHub Actions workflow: `.github/workflows/css-governance.yml`
2. Enforced checks:
   - `npm run lint:css`
   - `node --test tests/print-style-guard.test.js`
   - `npm run type-check`
