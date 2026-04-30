# Frontend next-gap status refresh (2026-04-30)

## Executive call

Do not continue Config Center or Procurement implementation now. Both have current-release closeout evidence. The System Optimization frontend stale-check is now complete: the old request race, API key header, response normalizer, and pagination touchpoints are already covered in current frontend code. Master Data Phase 4 stays open only for future Summary/Diagnostics contract design.

## Evidence

| Track | Current call | Evidence | Next action |
| --- | --- | --- | --- |
| Config Center | Closed for current release | Release closeout and prior smoke docs | Pause unless regression appears. |
| Procurement template / print | Automated coverage closed | `tests/procurement-template-entry.e2e.test.ts`, `tests/print-doc-builder.test.ts`, `tests/print-document-customer-name.e2e.test.ts`, `tests/pdf-route.test.ts`, PRs #69-#71 | Release QA/manual browser-PDF spot checks only. |
| Master Data workbench | Mostly delivered; Phase 4 partial | `MasterDataAuditLogList.vue`, `tests/master-data-audit-panel-guard.test.ts`, PRs #66-#68 | Do not extract Summary/Diagnostics until a generic contract is justified. |
| System Optimization frontend | Stale-check complete; no new frontend lane | `docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md`; `src/lib/api.ts`; `src/stores/useProcurementStore.ts`; procurement normalizer/tests | Keep docs/status aligned. Follow up only with backend/API contract or release-verification evidence. |

## System Optimization frontend stale-check result

| Checklist item | Call | Current evidence | Next action |
| --- | --- | --- | --- |
| P2-3 request race in `useProcurementStore.ts` | **Completed** | `fetchOrders` aborts the prior request with `AbortController`, passes `signal`, and ignores intentional cancellation errors. | None for frontend. Add a new guard only if a regression appears. |
| P1-2 API key header | **Completed for frontend** | `src/lib/api.ts` injects `x-api-key` from `VITE_API_KEY` when configured. | Server auth/config verification is separate; do not add frontend work now. |
| P2-4 response normalizer | **Frontend compatibility completed / broad API contract still separate** | `normalizeApiEnvelope` unwraps `{ success, data }`; `normalizeOrderListPayload` handles paginated `rows/total/page/pageSize/summary/facets`. | Keep compatibility tests; only reopen for a concrete API migration failure. |
| P1-1 pagination touchpoints | **Completed for frontend** | procurement store sends paginated `/orders` params, tracks totals/page/pageSize, and `fetchAllOrders` walks pages. | Backend database-level pagination/index evidence remains outside this frontend lane. |

## Recommended next slice

No new frontend implementation should start from the old System Optimization checklist. If the program needs another lane, choose a backend/API contract or release-verification task with fresh failing evidence. Keep Config Center, Procurement template UI, and Master Data repair-flow lanes closed unless a regression appears.

## Verification for this refresh

This status refresh is docs-only. Verification for the completed stale-check should include docs whitespace and targeted frontend guards:

```bash
git diff --check
node --require tsx/cjs --test --test-concurrency=1 tests/master-data-audit-panel-guard.test.ts tests/procurement-template-entry.e2e.test.ts tests/print-doc-builder.test.ts tests/print-document-customer-name.e2e.test.ts tests/pdf-route.test.ts
```
