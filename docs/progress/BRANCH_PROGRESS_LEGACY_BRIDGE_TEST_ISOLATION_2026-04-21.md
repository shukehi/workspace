> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy bridge test isolation (2026-04-21)

## Completed
- Marked legacy config route tests explicitly as `legacy bridge contract` coverage
- Added source guard to ensure direct legacy route mounting stays isolated to dedicated bridge contract tests:
  - `tests/config-routes.test.ts`
  - `tests/mapping-routes.test.ts`
- Tightened route-aggregator semantics by introducing explicit legacy mount mode:
  - `LEGACY_CONFIG_ROUTE_MOUNT_MODE = 'bridge-only'`
- Added non-test runtime warning when legacy routes are mounted

## Verification
- Guard tests assert:
  - legacy route mounts stay isolated to dedicated tests
  - route aggregator declares bridge-only mode explicitly
- No production-path consumers were reintroduced

## Notes
- Default mount behavior is unchanged in this increment to avoid a breaking compatibility flip.
- This is a preparation step before eventual default-off and physical deletion.
