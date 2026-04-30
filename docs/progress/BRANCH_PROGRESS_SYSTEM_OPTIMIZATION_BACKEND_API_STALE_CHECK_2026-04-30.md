# System Optimization Backend/API Stale-Check (2026-04-30)

> 状态：现行状态索引。
> 用于回答 `docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md` 中 P1 后端/API 旧项是否仍是实现缺口。

## Executive answer

The old P1 backend/API items are **mostly closed in current code**. Do not reopen a broad order-query, auth, migration, or CORS rewrite from the 2026-03-18 roadmap without fresh failing evidence.

This run closes the smallest safe guard lane by adding focused regression coverage for CORS env parsing, `/api/orders` auth mounting, and explicit migration-index assertions. Remaining work should be release verification only unless fresh failing evidence appears.

## Status matrix

| Old item | Current call | Evidence | Remaining next step |
| --- | --- | --- | --- |
| P1-1 order DB pagination/filtering | **Completed** | `OrderService.getPaginatedOrders` delegates to `getPaginatedOrdersResult`; repository SQL applies query predicates plus `LIMIT`/`OFFSET`, then reloads page ids with items. Covered by order service/repository/route tests. | Treat older `getAllOrders + slice` text as stale. Only revisit if a new failing query/facet regression appears. |
| P1-2 API key auth mount | **Completed; release env verification still required** | `server/routes/index.ts` mounts `apiKeyAuth` before `/api/config/*` and aggregate `/api` routes. `tests/api-key-auth.test.ts` and `tests/config-profile-auth-boundary.test.ts` cover middleware behavior, `/api/orders`, config profile/master mount order, and runtime rejection. | Release smoke should confirm `API_KEY` and frontend `VITE_API_KEY` are aligned in the deployed profile. |
| P1-3 database indexes | **Completed and guarded** | `server/db/migrations/20260318-006-add-query-indexes.ts` creates the requested orders/order_items/inventory_receipts indexes; `tests/db-migrations.test.ts` now asserts the exact index names after legacy-schema migration. | None; only revisit if target environments show a migration drift. |
| P1-4 CORS config | **Completed and guarded** | `server/config/env.ts` defaults to `http://localhost:5173`, splits comma-separated `CORS_ORIGIN`, and keeps `credentials: true`; `tests/env-config-cors.test.ts` guards the default and comma-split behavior. | None; release profiles still need explicit origin review. |

## Evidence details

### P1-1 order pagination/filtering

- `server/services/orders/order.service.ts` routes `getPaginatedOrders(query)` into `getPaginatedOrdersResult` instead of `getAllOrders()` plus in-memory slicing.
- `server/services/orders/order.service.query.ts` computes bounded `page`/`pageSize`, obtains full-result aggregates, then fetches only the requested page ids.
- `server/services/orders/order.repository.ts` builds SQL predicates for status, category, supplier, date range, order number, keyword, and risk, and uses `LIMIT :limit OFFSET :offset` for page ids.
- `tests/order-service.test.ts` verifies DB-level filters and full-result aggregates stay aligned; `tests/order-routes.test.ts` covers API-level supplier/date filters; `tests/order-repository-paginated.test.ts` covers the legacy `findOrdersPaginated` helper behavior.

### P1-2 API key auth

- `server/routes/index.ts` mounts `router.use(config.api.prefix, apiKeyAuth)` before config profile/master routes and before the aggregate API routes.
- `server/app/middleware/apiKeyAuth.ts` allows non-production without `API_KEY`, fails production misconfiguration, and rejects missing/wrong keys when configured.
- `tests/config-profile-auth-boundary.test.ts` includes a source-order guard and runtime missing-key rejection for config profile/master routes.

### P1-3 indexes

Current migration creates all indexes listed by the old roadmap:

- `idx_orders_status`
- `idx_orders_category`
- `idx_orders_supplier`
- `idx_orders_source_contract_code`
- `idx_orders_created_at`
- `idx_order_items_order_id`
- `idx_order_items_material_id`
- `idx_inventory_receipts_order_id`

The migration is protected in `tests/db-migrations.test.ts` via `PROTECTED_MIGRATION_IDS`, and this stale-check adds exact-name assertions with `PRAGMA index_list(...)`.

### P1-4 CORS

- `server/config/env.ts` no longer falls back to `'*'` while `credentials` is true.
- `CORS_ORIGIN` supports comma-separated origins with whitespace trimming.
- `tests/env-config-cors.test.ts` now proves those two facts, so this is no longer a runtime implementation gap or a missing guard.

## Recommendation

Stop treating the 2026-03-18 P1 backend/API list as fresh implementation work. If the next slice must touch this lane, make it release verification only: confirm deployed `API_KEY`/`VITE_API_KEY` alignment and production `CORS_ORIGIN` values. Avoid frontend work, schema/data changes, dependency changes, or large order-query rewrites unless fresh failing evidence narrows the defect.
