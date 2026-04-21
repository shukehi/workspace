> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy materials POST default-off candidate evaluation (2026-04-21)

## Assessment summary
- Endpoint: `POST /api/config/materials`
- Flag: `ENABLE_LEGACY_CONFIG_MATERIALS_POST`
- Codebase `src/` callers: none
- Contract coverage: isolated to `tests/materials-config-compatibility-route.test.ts`
- External caller audit: not yet complete
- Ready for default-off now: **no**

## Why it is close but not done
The shim is now technically isolated and internally well-understood, but default-off still depends on one non-code question:
- whether any external automation or operator workflow still posts to the legacy endpoint

## Practical next move
1. audit external callers
2. if clear, test with `ENABLE_LEGACY_CONFIG_MATERIALS_POST=false`
3. if clean, flip to default-off
4. then delete the shim and bridge glue
