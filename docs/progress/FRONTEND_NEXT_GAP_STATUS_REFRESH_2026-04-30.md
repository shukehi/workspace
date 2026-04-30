# Frontend next-gap status refresh (2026-04-30)

## Executive call

Do not continue Config Center or Procurement implementation now. Both have current-release closeout evidence. The next safe frontend move is a **System Optimization frontend stale-check** before any new code, while Master Data Phase 4 stays open only for future Summary/Diagnostics contract design.

## Evidence

| Track | Current call | Evidence | Next action |
| --- | --- | --- | --- |
| Config Center | Closed for current release | Release closeout and prior smoke docs | Pause unless regression appears. |
| Procurement template / print | Automated coverage closed | `tests/procurement-template-entry.e2e.test.ts`, `tests/print-doc-builder.test.ts`, `tests/print-document-customer-name.e2e.test.ts`, `tests/pdf-route.test.ts`, PRs #69-#71 | Release QA/manual browser-PDF spot checks only. |
| Master Data workbench | Mostly delivered; Phase 4 partial | `MasterDataAuditLogList.vue`, `tests/master-data-audit-panel-guard.test.ts`, PRs #66-#68 | Do not extract Summary/Diagnostics until a generic contract is justified. |
| System Optimization frontend | Broad and stale | `docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md` predates recent API/auth/pagination work | Audit current relevance before implementation. |

## Recommended next slice

Run a docs/code audit of the System Optimization frontend checklist:

1. map request/auth/normalizer checklist items to current `src/shared/api`, `src/lib/api`, router, and pagination code;
2. mark completed / stale / still-current items;
3. pick one tiny implementation target only if the audit finds a concrete current gap.

## Verification for this refresh

This status refresh is docs-only. Verification should be:

```bash
git diff --check
node --require tsx/cjs --test --test-concurrency=1 tests/master-data-audit-panel-guard.test.ts tests/procurement-template-entry.e2e.test.ts tests/print-doc-builder.test.ts tests/print-document-customer-name.e2e.test.ts tests/pdf-route.test.ts
```
