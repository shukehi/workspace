# Branch Progress — Supplier linked-material drill-down (2026-04-21)

## Completed
- Added supplier-linked material drill-down routes:
  - `GET /api/config/masters/suppliers/:id/materials`
  - `GET /api/config/profiles/supplier_master/items/:id/materials`
- Added backend linked-material listing in `server/services/config-platform/supplier-master.ts`
- Extended `supplierMasterProfileApi` with `linkedMaterials(id)`
- Extended `useSupplierMaster()` with:
  - `selectedSupplier`
  - `linkedMaterials`
  - `linkedMaterialsLoading`
  - `loadLinkedMaterials(id)`
- Updated `SupplierMaster.vue` to show:
  - `查看关联物料` action
  - `关联物料明细` panel with recent linked materials

## Verification
- Targeted API + state + guard coverage updated
- Follow-up verification run pending in current iteration

## Notes
- Drill-down intentionally stays read-only for now.
- Full cross-master relationship editing remains out of scope for this increment.
