# Branch Progress — Master-data actionable relationship groups (2026-04-21)

## Completed
- Fixed material update semantics so `supplier_master_id: null` now means:
  - auto-match by supplier when possible
  - instead of forcing the link to stay null
- Added `autoRelinkMaterial()` flow in material master page state
- Added actionable relationship groups in material master UI:
  - `可自动修复`
  - `需人工处理`
- Wired quick actions:
  - `自动重连`
  - `打开编辑`

## Verification
- Added backend route-level coverage for null-override auto-match behavior
- Added page-state coverage for actionable grouping and auto-relink action
- Updated UI guard assertions for the new action labels

## Notes
- This increment intentionally reuses the existing edit/save flow instead of introducing a new remediation API.
- Clearing a link without rematch is still not a dedicated workflow; current UI semantics prioritize auto-match.
