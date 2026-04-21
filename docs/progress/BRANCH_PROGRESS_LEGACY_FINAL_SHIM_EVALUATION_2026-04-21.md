> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy final shim evaluation (2026-04-21)

## Completed
- Added explicit final-shim metadata to the legacy bridge manifest:
  - `remainingShimEndpoints`
  - `recommendedRetirementAction`
- Exposed helper `listRemainingLegacyShimEndpoints()`
- Expanded route-aggregator warning output to include the final remaining shim endpoints
- Added readiness coverage to assert the exact final shim list:
  - `GET /api/config/formulas/published-map`
  - `POST /api/config/materials`

## Final shim evaluation
### 1. `GET /api/config/formulas/published-map`
- Purpose: preserve published-formula lookup compatibility
- Preferred replacement: profile-derived published formulas reads
- Retirement mode: blocked until callers migrate

### 2. `POST /api/config/materials`
- Purpose: preserve legacy write compatibility for material-catalog publish flow
- Preferred replacement: `/api/config/profiles/material_catalog` workflow routes
- Retirement mode: blocked until callers migrate

## Notes
- At this point the legacy bridge has effectively become a 2-endpoint compatibility shell.
- Any further legacy removal should focus directly on these two endpoints rather than on broader route families.
