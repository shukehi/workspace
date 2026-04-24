## Summary

- Change type: `feat` / `fix` / `refactor` / `chore` / `docs` / `test`
- Scope:
- Main files changed:
- Related roadmap / governance doc:

## Risk & Impact

- User-facing impact:
- API contract impact: `Yes/No`
- Request validation impact: `Yes/No`
- Database schema impact: `Yes/No`
- Browser/runtime side-effect boundary touched: `Yes/No`
- Legacy / compatibility entry touched: `Yes/No`
- Backward compatibility strategy:
- Legacy / compatibility retirement plan:

## Validation

- [ ] `npm run lint:css`
- [ ] `node --require tsx/cjs --test tests/print-style-guard.test.ts`
- [ ] `npm run type-check`
- [ ] `npm test` (required when API/DB/core logic changed)
- [ ] Manual verification completed for affected pages
- [ ] Request validation / error response shape verified for affected write APIs
- [ ] Added or updated guard / structure test when introducing new boundary rules

## Rollback Plan

- Revert commit(s):
- Data rollback required: `Yes/No`
- Operational notes:
- Rollback verification steps:

## Checklist

- [ ] Followed `docs/governance/ENGINEERING_CONVENTIONS.md`
- [ ] Followed `docs/governance/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md`
- [ ] Cross-checked `docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md`
- [ ] New code does not depend on legacy `/api/config/*` compatibility routes unless explicitly justified
- [ ] Any compatibility shell remains forwarding-only and has a documented retirement path
- [ ] Page/store boundaries remain clear; no new "big page" or "big store" introduced
- [ ] Browser-side effects (`confirm/prompt/open/localStorage/download/onbeforeunload`) were not pushed deeper into core store / manager layers
- [ ] Fallback logic stays inside repository/facade layers, not in pages/components
- [ ] Affected write APIs have a clear request validation boundary; no new raw request passthrough added
- [ ] Error response shape remains consistent for touched endpoints, or the contract delta is explicitly documented
- [ ] Updated docs if behavior/contract changed
- [ ] Added/updated tests or explained why not needed
