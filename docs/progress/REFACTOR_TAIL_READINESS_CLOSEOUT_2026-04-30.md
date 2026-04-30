# Refactor Tail Readiness Closeout (2026-04-30)

> Status: closeout note for the remaining Master Data and stale-refactor tails before starting new feature work.
> This note is docs/status only. It does not change runtime, API, schema, data, or dependencies.

## Executive answer

The remaining closeout tails are closed enough for new feature development to start. Do not continue Master Data, Inventory, Order, Source-analysis, Procurement, or System Optimization refactors from stale roadmap momentum alone. Reopen one of those lanes only when a fresh feature or regression supplies a narrow failing guard or concrete maintenance pain.

## Current calls

| Tail | Readiness call | Evidence | Next action |
| --- | --- | --- | --- |
| Release/devserver readiness | Local build, devserver, API-key/CORS/release-env guards are green; real production smoke still requires environment-specific secrets/origins. | `docs/progress/RELEASE_CONFIGURATION_VERIFICATION_2026-04-30.md`, `tests/release-env-contract.test.ts`, `tests/env-config-cors.test.ts`, `tests/api-key-auth.test.ts`, `tests/config-profile-auth-boundary.test.ts` | Start new features locally; run real release smoke only in the target environment. |
| Procurement QA | Template entry, business-category validation, print model, legacy `/print-document`, and PDF route coverage are green. | `docs/progress/PROCUREMENT_TEMPLATE_UI_COVERAGE_AUDIT_2026-04-30.md`, `tests/procurement-template-entry.e2e.test.ts`, `tests/print-doc-builder.test.ts`, `tests/print-document-customer-name.e2e.test.ts`, `tests/pdf-route.test.ts` | Do not refactor Procurement UI now; optional manual browser/PDF spot checks can happen during release QA. |
| Master Data Phase 4 | Audit-log list extraction is delivered; Summary and Diagnostics remain deliberately deferred. | `docs/progress/MASTER_DATA_PHASE4_REUSE_EVALUATION_2026-04-30.md`, `docs/progress/MASTER_DATA_PHASE4_REUSE_BOUNDARY_AUDIT_2026-04-30.md`, `src/features/master-data/components/MasterDataAuditLogList.vue`, `tests/master-data-audit-panel-guard.test.ts` | Do not extract Summary/Diagnostics until a future shared contract and focused render/interaction guards exist. |
| Inventory / Order / Source-analysis structural cleanup | Current cleanup wave is paused; remaining seams are lower-value polish unless a real pain appears. | `docs/progress/SOURCE_ORDER_INVENTORY_OPTIMIZATION_CLOSEOUT_2026-04-20.md` | Treat old partitioning/normalization pass docs as history, not active instructions. |
| System Optimization frontend | Stale-check complete; old request-race, API-key header, response-normalizer, and pagination frontend items are already covered. | `docs/progress/FRONTEND_NEXT_GAP_STATUS_REFRESH_2026-04-30.md`, `docs/progress/FRONTEND_PLAN_STATUS_MATRIX_2026-04-29.md` | No new frontend lane from the old checklist. |
| System Optimization backend/API | Old P1 backend/API items are mostly closed and guarded; remaining confidence is release-environment verification. | `docs/progress/BRANCH_PROGRESS_SYSTEM_OPTIMIZATION_BACKEND_API_STALE_CHECK_2026-04-30.md`, `docs/progress/RELEASE_CONFIGURATION_VERIFICATION_2026-04-30.md` | Use environment-specific release smoke only; no broad API/schema rewrite. |

## Guardrails for the next feature lane

- Start new feature work from the feature's own acceptance criteria, not from old refactor pass documents.
- Keep release/devserver checks green as the baseline; do not block feature planning on production-only secrets or origins that cannot be committed.
- Keep the Master Data Phase 4 boundary as-is: `MasterDataAuditLogList.vue` is the delivered shared audit-list seam; Summary/Diagnostics are deferred because their data/action contracts differ.
- Keep Inventory/Order/Source-analysis cleanup paused unless the new feature exposes a specific owner boundary that is too costly to maintain.
- Keep System Optimization stale roadmap items as status history; reopen only with fresh failing evidence.

## Verification run for this closeout

The intended lightweight verification set for this docs/status lane is:

```bash
git diff --check
npm run type-check
npm run type-check:server
npm run type-check:test
npm run lint:css
npm run build
# Devserver smoke: npm run dev:web -- --host 127.0.0.1 --port 5173 --strictPort --force, then curl http://127.0.0.1:5173/
node --require tsx/cjs --test --test-concurrency=1 \
  tests/release-env-contract.test.ts \
  tests/env-config-cors.test.ts \
  tests/api-key-auth.test.ts \
  tests/config-profile-auth-boundary.test.ts
node --require tsx/cjs --test --test-concurrency=1 \
  tests/procurement-template-entry.e2e.test.ts \
  tests/print-doc-builder.test.ts \
  tests/print-document-customer-name.e2e.test.ts \
  tests/pdf-route.test.ts
node --require tsx/cjs --test --test-concurrency=1 \
  tests/master-data-audit-panel-guard.test.ts \
  tests/config-table-guard.test.ts \
  tests/master-data-phase3-interaction-flow-guard.test.ts \
  tests/material-management-page-state.test.ts \
  tests/supplier-master-page-state.test.ts \
  tests/master-data-diagnostics-page-state.test.ts \
  tests/master-data-governance-page-state.test.ts
```

If those checks remain green, there is no refactor-status blocker to starting new feature development.
