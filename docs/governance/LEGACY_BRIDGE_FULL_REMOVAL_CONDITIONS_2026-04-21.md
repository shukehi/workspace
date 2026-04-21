> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy Bridge Full Removal Conditions (2026-04-21)

## Current state summary
- **Legacy mount families still present in code:** 2
  - `/api/config/formulas`
  - `/api/config`
- **Mounted by default:**
  - `/api/config`
- **Already retired from default routing:**
  - `/api/config/mappings`
  - `/api/config/material-catalog`
- **Final remaining default-mounted shim endpoint:**
  - `POST /api/config/materials`
- **Default-off candidate already prepared:**
  - `/api/config/formulas` via `ENABLE_LEGACY_FORMULAS_PUBLISHED_MAP`

## Full removal conditions

### Condition 1 — formulas shim removed
Remove `GET /api/config/formulas/published-map` after:
1. caller audit confirms no remaining dependency
2. explicit compatibility flag is no longer needed
3. `server/routes/formulasConfig.ts` can be deleted
4. `/api/config/formulas` entry can be removed from `legacyConfigBridge.ts`

### Condition 2 — materials POST shim removed
Remove `POST /api/config/materials` after:
1. downstream callers move to `/api/config/profiles/material_catalog`
2. legacy POST request/response shape is no longer required
3. `server/routes/configData.ts` can be deleted
4. `/api/config` entry can be removed from `legacyConfigBridge.ts`

### Condition 3 — bridge manifest removed
After both shim endpoints are gone:
1. delete `server/routes/legacyConfigBridge.ts`
2. remove all legacy mount logic from `server/routes/index.ts`
3. delete remaining legacy bridge readiness tests
4. update docs to remove legacy shim references

## Recommended order
1. Keep formulas shim default-off in controlled environments and remove it first
2. Remove materials POST shim second
3. Delete bridge manifest and aggregator glue last
