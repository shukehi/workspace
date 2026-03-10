## Summary

- Change type: `feat` / `fix` / `refactor` / `chore` / `docs` / `test`
- Scope:
- Main files changed:

## Risk & Impact

- User-facing impact:
- API contract impact: `Yes/No`
- Database schema impact: `Yes/No`
- Backward compatibility strategy:

## Validation

- [ ] `npm run lint:css`
- [ ] `node --test tests/print-style-guard.test.js`
- [ ] `npm run type-check`
- [ ] `npm test` (required when API/DB/core logic changed)
- [ ] Manual verification completed for affected pages

## Rollback Plan

- Revert commit(s):
- Data rollback required: `Yes/No`
- Operational notes:

## Checklist

- [ ] Followed `docs/ENGINEERING_CONVENTIONS.md`
- [ ] Followed `docs/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md`
- [ ] New code does not depend on legacy `/api/config/*` compatibility routes unless explicitly justified
- [ ] Page/store boundaries remain clear; no new "big page" or "big store" introduced
- [ ] Fallback logic stays inside repository/facade layers, not in pages/components
- [ ] Updated docs if behavior/contract changed
- [ ] Added/updated tests or explained why not needed
