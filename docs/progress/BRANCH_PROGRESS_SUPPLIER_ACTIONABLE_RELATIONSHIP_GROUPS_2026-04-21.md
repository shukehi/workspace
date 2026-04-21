# Branch Progress — Supplier actionable relationship groups (2026-04-21)

## Completed
- Added supplier master relationship trend summary using the latest 5 audit records
- Added supplier-side actionable anomaly grouping:
  - `inactive 但仍有关联物料`
  - `需补充正式链接`
- Added inline actions from anomaly groups:
  - `查看关联物料`
  - `打开编辑`
- Kept supplier remediation inside the existing supplier/material edit flows

## Verification
- Updated supplier master page-state coverage for relationship and audit summaries
- Updated config table guard coverage for the new supplier UI diagnostics/actions

## Notes
- Trend summary is intentionally lightweight and audit-derived, not a historical analytics system.
- Unlinked-supplier remediation still routes through existing edit surfaces rather than a bulk fix workflow.
