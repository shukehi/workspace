> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy materials POST retirement audit (2026-04-21)

## Default-mounted legacy shim
- **Mount path:** `/api/config/materials`
- **Endpoint:** `POST /api/config/materials`
- **Flag:** `ENABLE_LEGACY_CONFIG_MATERIALS_POST`
- **Default-off state:** blocked

## Why this is still the final default-mounted shim
- It is the last compatibility write path still enabled by default
- It publishes material-catalog state, so mistakes are more disruptive than read-only shim usage
- It still carries a dedicated bridge contract test for legacy write semantics

## Audit checklist before retirement
1. Confirm no external automation still posts to `/api/config/materials`
2. Confirm operators can use `/api/config/profiles/material_catalog` workflow routes instead
3. Confirm the legacy POST request/response shape is not contractually required anymore
4. Remove or replace the bridge contract test in `tests/config-routes.test.ts`
5. Disable via `ENABLE_LEGACY_CONFIG_MATERIALS_POST=false` in controlled envs before deletion

## Success criteria
- Shim disabled without regression in controlled envs
- No remaining write callers depend on the legacy endpoint
- `server/routes/materialsConfigCompatibility.ts` can be deleted safely
