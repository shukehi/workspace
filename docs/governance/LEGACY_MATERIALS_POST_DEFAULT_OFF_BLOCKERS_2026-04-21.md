> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy materials POST default-off blockers (2026-04-21)

## Endpoint
`POST /api/config/materials`

## Current state
- Still mounted by default
- Controlled by flag: `ENABLE_LEGACY_CONFIG_MATERIALS_POST`
- Not a default-off candidate yet

## Why it is blocked
1. It is still the last write-compatibility shim in the legacy bridge
2. It changes published material-catalog state, so accidental removal is riskier than read-only shims
3. Bridge contract coverage still depends on it for legacy write semantics

## Required before default-off
1. Confirm no callers still depend on the legacy POST request/response shape
2. Move any remaining compatibility validation to unified workflow coverage or remove it
3. Verify operational teams can use `/api/config/profiles/material_catalog` workflow routes instead
4. Add rollout plan mirroring the formulas default-off path if needed

## Recommended decision
Keep this shim blocked for now; retire it only after the formulas shim has been fully deleted or after a separate caller audit explicitly clears the write compatibility risk.
