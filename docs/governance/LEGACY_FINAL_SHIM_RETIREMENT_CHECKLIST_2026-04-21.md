> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy Final Shim Retirement Checklist (2026-04-21)

> 历史退场清单。
> 当前 legacy shim 已从运行时代码移除；本文件保留为过程记录。

## Remaining shims

### 1. `GET /api/config/formulas/published-map`
- **Status:** blocked
- **Why still exists:** preserve legacy published-formula lookup compatibility
- **Unified replacement:** published formulas reads derived from `/api/config/profiles/formulas`
- **Deletion preconditions:**
  1. confirm no runtime callers require `/api/config/formulas/published-map`
  2. confirm bridge contract test can be removed or replaced
  3. delete `server/routes/formulasConfig.ts`
  4. remove `/api/config/formulas` from `legacyConfigBridge.ts`

### 2. `POST /api/config/materials`
- **Status:** blocked
- **Why still exists:** preserve legacy write compatibility for material-catalog publish flow
- **Unified replacement:** `/api/config/profiles/material_catalog` draft/publish workflow
- **Deletion preconditions:**
  1. confirm no remaining callers depend on legacy POST shape
  2. confirm legacy bridge contract test can be removed or replaced
  3. delete `server/routes/configData.ts`
  4. remove `/api/config` from `legacyConfigBridge.ts`

## Recommended order
1. Retire `GET /api/config/formulas/published-map`
2. Retire `POST /api/config/materials`
3. Delete `legacyConfigBridge.ts` if no legacy mounts remain

## Current observation
At this stage the legacy bridge is no longer a route family; it is a two-endpoint compatibility shell.
