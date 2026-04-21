> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy formulas default-off candidate (2026-04-21)

## Completed
- Added `defaultOffCandidate` metadata to the legacy bridge manifest
- Marked `/api/config/formulas` as the only current default-off candidate
- Added helper `listLegacyDefaultOffCandidates()`
- Expanded route-aggregator warning output to include `default-off-candidates`
- Added governance rollout note:
  - `docs/governance/LEGACY_FORMULAS_PUBLISHED_MAP_DEFAULT_OFF_ROLLOUT_2026-04-21.md`

## Decision
- `GET /api/config/formulas/published-map` is the preferred first final-shim candidate for staged disablement
- `POST /api/config/materials` remains blocked behind a later step

## Notes
- This increment does not flip the default yet.
- It makes the first low-risk final-shim candidate explicit and test-backed.
