# Inventory Optimization Progress

## Overall Status

- Overall completion: `90% - 95%`
- Status: `Core ledger, adjustment, receipt/outbound, reconciliation, movement query, and cleanup dry-run are landed; the main remaining work is operational closure around controlled repair execution`
- Review date: `2026-04-12`

## Completed

### 1. Blocked direct total-stock edits

- `PUT /api/inventory/:id` no longer allows direct `stock_quantity` updates
- inventory updates are limited to `min_stock`
- direct stock edit attempts now return `STOCK_QUANTITY_IMMUTABLE`

Related files:

- `/Users/aries/Dve/workspace/server/services/inventory/inventory.service.ts`
- `/Users/aries/Dve/workspace/server/validators/inventory.validators.ts`
- `/Users/aries/Dve/workspace/server/shared/contracts/api.ts`

### 2. Landed unified inventory ledger table

- `inventory_movements` table and model are in place
- movement records now serve as the unified stock mutation ledger
- source uniqueness and idempotency semantics were introduced for movement writes

Related files:

- `/Users/aries/Dve/workspace/server/db/migrations/20260329-009-add-inventory-movements.ts`
- `/Users/aries/Dve/workspace/server/models/InventoryMovement.ts`
- `/Users/aries/Dve/workspace/server/models/types.ts`
- `/Users/aries/Dve/workspace/server/models/index.ts`

### 3. Delivered manual adjustment flow

- added `POST /api/inventory-adjustments`
- adjustment writes update:
  - `materials.stock_quantity`
  - `inventory_location_balances.quantity`
  - `inventory_movements`
- adjustment path now requires stable `operation_key`
- duplicate retries are idempotent
- adjustment path has concurrency protection instead of plain read-check-write

Related files:

- `/Users/aries/Dve/workspace/server/services/inventory/inventory-adjustment.service.ts`
- `/Users/aries/Dve/workspace/server/controllers/inventory-adjustment.controller.ts`
- `/Users/aries/Dve/workspace/server/routes/inventoryAdjustments.ts`
- `/Users/aries/Dve/workspace/server/validators/inventory-adjustment.validators.ts`

### 4. Unified receipt / outbound / reversal ledger writes

- receipt stock-in writes `receipt_in`
- receipt reversal writes `receipt_reversal`
- outbound writes `outbound`
- outbound reversal writes `outbound_reversal`
- stock, location balance, and movement write path are now shared

Related files:

- `/Users/aries/Dve/workspace/server/services/inventory/inventory-movement.service.ts`
- `/Users/aries/Dve/workspace/server/services/inventory/inventory-receipt.service.ts`
- `/Users/aries/Dve/workspace/server/services/inventory/inventory-outbound.service.ts`

### 5. Delivered movement query API

- added `GET /api/inventory-movements`
- supports:
  - `page`
  - `pageSize`
  - `materialId`
  - `warehouseId`
  - `locationId`
  - `sourceType`
  - `keyword`
  - `startDate`
  - `endDate`
- keyword filtering is now pushed into the database query
- pagination and total count now use the same filtered dataset

Related files:

- `/Users/aries/Dve/workspace/server/services/inventory/inventory-movement-query.service.ts`
- `/Users/aries/Dve/workspace/server/controllers/inventory-movement.controller.ts`
- `/Users/aries/Dve/workspace/server/routes/inventoryMovements.ts`
- `/Users/aries/Dve/workspace/server/validators/inventory-movement.validators.ts`

### 6. Delivered frontend traceability and reconciliation UI

- inventory page now shows per-material movement trace
- inventory page now shows reconciliation metrics:
  - mismatch count
  - total absolute diff
- inventory table now shows:
  - location total
  - reconciliation diff
  - movement trace action
- added mismatch-only filter

Related files:

- `/Users/aries/Dve/workspace/src/views/Inventory.vue`
- `/Users/aries/Dve/workspace/src/stores/useInventoryStore.ts`
- `/Users/aries/Dve/workspace/src/components/inventory/InventoryColumns.ts`
- `/Users/aries/Dve/workspace/src/types/inventory.ts`

### 7. Added test coverage for delivered scope

- route coverage for inventory update, adjustment, movement query
- service coverage for receipt / outbound ledger writes
- frontend guard coverage for inventory trace and reconciliation UI

Related files:

- `/Users/aries/Dve/workspace/tests/inventory-route.test.ts`
- `/Users/aries/Dve/workspace/tests/inventory-outbound-service.test.ts`
- `/Users/aries/Dve/workspace/tests/inventory-receipt-service.test.ts`
- `/Users/aries/Dve/workspace/tests/inventory-view-guard.test.ts`
- `/Users/aries/Dve/workspace/tests/db-migrations.test.ts`

### 8. Delivered reconciliation dry-run and mismatch export

- added reusable reconciliation report builder for stock-vs-location comparison
- added `inventory:reconcile:dry-run` script for historical baseline scanning
- dry-run supports JSON output and optional file output
- inventory page now supports exporting reconciliation mismatch rows

Related files:

- `/Users/aries/Dve/workspace/server/services/inventory/inventory-reconciliation.service.ts`
- `/Users/aries/Dve/workspace/server/scripts/reconcile_inventory_baseline.ts`
- `/Users/aries/Dve/workspace/package.json`
- `/Users/aries/Dve/workspace/src/stores/useInventoryStore.ts`
- `/Users/aries/Dve/workspace/src/views/Inventory.vue`
- `/Users/aries/Dve/workspace/tests/inventory-reconciliation-service.test.ts`

### 9. Delivered zero-stock hiding and safe cleanup dry-run

- inventory list now hides `stock_quantity <= 0` rows by default
- added a safe zero-stock cleanup planner
- added cleanup dry-run / execute script with explicit confirm token gate
- only materials with zero stock and no inventory / order references are eligible for deletion

Related files:

- `/Users/aries/Dve/workspace/server/services/inventory/inventory.service.ts`
- `/Users/aries/Dve/workspace/server/services/inventory/inventory-material-cleanup.service.ts`
- `/Users/aries/Dve/workspace/server/scripts/cleanup_zero_stock_materials.ts`
- `/Users/aries/Dve/workspace/package.json`
- `/Users/aries/Dve/workspace/tests/inventory-material-cleanup-service.test.ts`
- `/Users/aries/Dve/workspace/tests/inventory-route.test.ts`

## Commits Delivered

1. `73472e4 feat: add inventory adjustment ledger`
2. `0e0965e feat: unify inventory movement ledger writes`
3. `d6fe5dd feat: add inventory movement query endpoint`
4. `d427dd2 feat: add inventory reconciliation view`
5. `a7282d2 feat: add inventory reconciliation dry run`

## Not Completed Yet

### 1. Historical baseline repair execution

- historical baseline dry-run script is now landed
- controlled repair execution flow is still not implemented
- the planned `dry-run -> review -> execute` loop is only partially complete

### 2. Guided repair tooling

- reconciliation can be viewed in UI
- mismatch export is now implemented
- guided repair execution workflow is still not implemented

### 3. Controlled repair / cleanup execution polish

- zero-stock cleanup execution is available but not yet documented as a standard operating workflow
- broader historical repair flow still stops at dry-run plus explicit manual execution

### 4. Final PR / merge closure

- work has been committed locally
- no PR has been opened yet
- branch still contains unrelated non-inventory changes in the wider diff

## Risks / Known Issues

### 1. Existing unrelated repository failure

- full repository test suite still has a known unrelated failure:
  - `/Users/aries/Dve/workspace/tests/print-document-customer-name.e2e.test.ts`
  - failure: `ERR_CONNECTION_REFUSED`

### 2. Scope drift in branch

- current branch includes unrelated procurement / print / config work
- this increases review and merge noise for the inventory rollout

### 3. Historical dirty data may still exist

- the new system prevents new inconsistency from the main mutation paths
- old mismatched stock data may still remain until a baseline repair step is executed

## Recommended Next Steps

### Option A. Close the current delivery first

1. Open a PR for the current inventory optimization work
2. Review branch scope carefully because unrelated changes still exist
3. Merge only after inventory reviewers confirm the ledger and UI closure

### Option B. Continue the next inventory phase

1. Add controlled repair execution workflow
2. Decide whether repair should write `inventory_movements` directly or route through a dedicated repair service
3. Open a PR after inventory-only scope is isolated clearly enough

## Summary

The inventory optimization is no longer in the planning stage. The critical path is already delivered:

- direct stock edits are blocked
- adjustment path is idempotent and concurrency-aware
- receipt / outbound / reversal flows write into a unified ledger
- movement records can be queried
- traceability is visible in the UI
- reconciliation mismatches are visible in the UI
- historical baseline mismatches can be scanned with a dry-run script
- reconciliation mismatch rows can be exported from the inventory page

What remains is mostly operational closure:

- repair legacy dirty data with a controlled execution flow
- separate or land the branch cleanly
