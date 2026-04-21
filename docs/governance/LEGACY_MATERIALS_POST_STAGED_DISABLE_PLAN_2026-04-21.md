> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy materials POST staged disable plan (2026-04-21)

## Context
The legacy bridge has been reduced to two final shim endpoints. The formulas shim is already default-off by default, leaving `POST /api/config/materials` as the only default-mounted compatibility write path.

## Current staged sequence
1. **Already executed**
   - `GET /api/config/formulas/published-map`
   - default-off via `ENABLE_LEGACY_FORMULAS_PUBLISHED_MAP`
2. **Next candidate after blocker clearance**
   - `POST /api/config/materials`
   - currently blocked via `ENABLE_LEGACY_CONFIG_MATERIALS_POST`

## What must happen before staged disable
1. Audit any remaining callers that still rely on the legacy POST payload/response shape
2. Confirm `/api/config/profiles/material_catalog` workflow routes are acceptable replacements
3. Remove or rewrite the remaining bridge contract test for materials POST compatibility
4. Rehearse env-based disable with `ENABLE_LEGACY_CONFIG_MATERIALS_POST=false`

## Recommended rollout
- Stage A: caller audit + replacement confirmation
- Stage B: controlled-environment disable
- Stage C: default-off flip
- Stage D: delete `server/routes/materialsConfigCompatibility.ts`
- Stage E: remove `/api/config/materials` from `legacyConfigBridge.ts`
