# CSS Governance Checklist

## Goal
Keep CSS optimization safe and prevent accidental visual regressions.

## Required checks before merge
1. Run `npm run lint:css`
2. Run `node --test tests/print-style-guard.test.js`
3. Run `npm run type-check`
4. Manually verify pages:
   - `public/index.html.bak`
   - `public/procurement.html.bak`
   - `public/inventory.html.bak`
   - `public/statistics.html.bak`

## Rule for future refactors
1. Prefer selector grouping and module split over value changes.
2. Do not change spacing/size/color tokens in the same PR as structural CSS refactor.
3. Keep commits small and scoped by file/theme.

## CI Enforcement
1. GitHub Actions workflow: `.github/workflows/css-governance.yml`
2. Enforced checks:
   - `npm run lint:css`
   - `node --test tests/print-style-guard.test.js`
