> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy formula list test migration (2026-04-21)

## Completed
- Migrated paged formula-list shape coverage from legacy formulas route to unified profile route coverage
- Expanded `tests/config-profile-routes.test.ts` to assert:
  - `items`
  - `total`
  - `page`
  - `pageSize`
  on `GET /api/config/profiles/formulas/items`
- Removed the duplicate legacy bridge test for `GET /api/config/formulas`

## Impact
- Further reduces the amount of meaningful behavior that still requires legacy formulas route coverage
- Keeps pagination-contract protection on the unified formulas item bridge instead of the compatibility route

## Notes
- Legacy formulas route still retains lifecycle compatibility coverage in `tests/config-routes.test.ts`.
