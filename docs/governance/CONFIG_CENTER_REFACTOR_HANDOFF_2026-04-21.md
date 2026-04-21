# Config Center Refactor Handoff (2026-04-21)

## 1. What is now true

### Runtime and protocol
- App runtime reads are unified around:
  - `GET /api/runtime/config-snapshot`
  - profile-detail fallback
- Config platform protocol is established around:
  - `profiles`
  - `detail`
  - `items`
  - `diff`
  - `impact`
  - `replay`
  - `reference-check`
  - `audit-logs`

### Frontend platform shell
- Shared shell/host/composable surfaces are in place:
  - `ConfigCenterShell`
  - `ProfileEditorHost`
  - `FormulaProfileHost`
  - `useProfileEditor`

### Main data platform
- `supplier_master` exists as persisted-first master data
- `material_master` is aligned with the profile platform
- `materials.supplier_master_id` is live
- material↔supplier linkage is visible and diagnosable in UI

### Legacy surface
- `/api/config/mappings` is gone
- `/api/config/material-catalog` is gone
- `/api/config/formulas` shim is gone
- `/api/config/materials` shim is gone
- The route aggregator no longer mounts any legacy config bridge layer

## 2. Final legacy state
- Default-mounted shims: none
- Opt-in shims: none
- Remaining legacy work: optional historical docs cleanup only

## 3. Recommended next actions
### A. If you want to keep pushing the refactor
1. clean historical docs that still mention removed legacy endpoints
2. prune now-obsolete retirement/governance docs if desired
3. keep unified profile/material-catalog paths as the only supported interfaces

### B. If you want to stabilize here
1. freeze the bridge-retirement work
2. treat legacy endpoint families as fully retired
3. keep targeted unified-route tests as the long-term safety net

## 4. Remaining risks
- External teams may still have stale documentation or local scripts referencing removed endpoints
- Historical governance/progress docs can cause confusion if not archived or cleaned up

## 5. Verification baseline
The refactor lane currently has strong targeted coverage around:
- runtime snapshot / fallback loading
- profile bridge routes
- formulas/material catalog/lock/handle unified workflow behavior
- main-data relationship health and diagnostics

Use the targeted tests already in the repo before any future protocol changes.
