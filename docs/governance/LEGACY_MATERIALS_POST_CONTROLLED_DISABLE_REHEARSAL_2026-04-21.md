> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy materials POST controlled-disable rehearsal (2026-04-21)

## Objective
Rehearse disabling the final default-mounted legacy shim without deleting code.

## Flag
- `ENABLE_LEGACY_CONFIG_MATERIALS_POST=false`

## Expected runtime result
- `POST /api/config/materials` returns `404`

## Recommended verification
1. Run:
   - `node --require tsx/cjs --test --test-concurrency=1 tests/config-legacy-mount-flag.test.ts`
2. Run:
   - `npm run type-check:server`
3. Observe server logs and any external integration failures

## Go / no-go rule
Proceed to broader rollout only if controlled environments show **no external caller regressions**.
