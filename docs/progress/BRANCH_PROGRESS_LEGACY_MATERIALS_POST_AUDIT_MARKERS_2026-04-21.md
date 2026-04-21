> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy materials POST audit markers (2026-04-21)

## Completed
- Added explicit controlled-disable audit headers to `materialsConfigCompatibility.ts`:
  - `X-Config-Legacy-Disable-Flag: ENABLE_LEGACY_CONFIG_MATERIALS_POST`
  - `X-Config-Legacy-Default-Off-Ready: false`
  - `X-Config-Legacy-Blocking-Reason: legacy-write-compatibility`
- Added runtime warning log on each legacy materials POST invocation with operator + top-level payload keys
- Extended route-level tests and guard tests to lock these markers in place

## Impact
- The last default-mounted legacy shim now emits the information needed for audit and controlled-disable rollout on every response
- Operational teams can identify the exact disable flag and current blocker directly from runtime traffic

## Notes
- This increment does not disable the shim.
- It improves observability for the final compatibility write path before staged disable.
