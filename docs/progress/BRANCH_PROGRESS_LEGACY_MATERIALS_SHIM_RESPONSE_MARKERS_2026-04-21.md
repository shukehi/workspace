> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy materials shim response markers (2026-04-21)

## Completed
- Added explicit response markers to `server/routes/materialsConfigCompatibility.ts`:
  - `X-Config-Legacy-Shim-Type: write-compatibility`
  - `X-Config-Legacy-Last-Write-Shim: true`
  - `X-Config-Replacement-Workflow: /api/config/profiles/material_catalog`
- Updated route-level compatibility test to assert the new runtime headers
- Updated guard tests to ensure the materials shim keeps these migration/audit markers

## Impact
- The final default-mounted shim now self-identifies as the last legacy write-compatibility surface
- Consumers of the endpoint receive an explicit migration target in the response headers

## Notes
- This increment does not disable the shim.
- It improves observability and migration signaling for the last remaining default-mounted legacy endpoint.
