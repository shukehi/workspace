> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy formulas `published-map` default-off rollout (2026-04-21)

## Goal
Retire `GET /api/config/formulas/published-map` before the final legacy materials POST shim.

## Why this shim goes first
- It is read-only
- It has no `src/` production callers
- Unified formulas profile reads already cover the workflow surface
- The remaining value is compatibility-only published-map lookup

## Rollout plan
1. **Stage 0 — current state**
   - Shim remains enabled by default
   - Dedicated flag exists: `ENABLE_LEGACY_FORMULAS_PUBLISHED_MAP`
2. **Stage 1 — candidate disable in controlled envs**
   - Set `ENABLE_LEGACY_FORMULAS_PUBLISHED_MAP=false`
   - Verify no regressions and no hidden consumers
3. **Stage 2 — default-off flip**
   - Change default behavior so the formulas shim is disabled unless explicitly re-enabled
4. **Stage 3 — deletion**
   - Remove `server/routes/formulasConfig.ts`
   - Remove `/api/config/formulas` from `legacyConfigBridge.ts`

## Success criteria
- No runtime callers require `/api/config/formulas/published-map`
- Bridge contract test can be deleted or replaced by unified coverage
- Route aggregator shows only `POST /api/config/materials` as the remaining shim
