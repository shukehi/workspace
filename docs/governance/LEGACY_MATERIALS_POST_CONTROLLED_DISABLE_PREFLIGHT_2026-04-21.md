> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy materials POST controlled-disable preflight (2026-04-21)

## Target shim
- Mount path: `/api/config/materials`
- Endpoint: `POST /api/config/materials`
- Flag: `ENABLE_LEGACY_CONFIG_MATERIALS_POST`

## Current preflight result
- **default-off state:** blocked
- **src callers present:** no
- **bridge contract test still present:** yes (`tests/config-routes.test.ts`)
- **ready for controlled disable now:** no

## Why not ready yet
1. The last legacy write-compatibility test still targets the shim directly
2. The legacy POST request/response contract has not been explicitly retired
3. Operational replacement through `/api/config/profiles/material_catalog` needs a final audit sign-off

## What to clear before disable
1. Replace or delete the remaining bridge contract test
2. Confirm no external automation still posts to the legacy endpoint
3. Confirm operators can use the unified workflow routes
4. Then test with `ENABLE_LEGACY_CONFIG_MATERIALS_POST=false` in controlled environments
