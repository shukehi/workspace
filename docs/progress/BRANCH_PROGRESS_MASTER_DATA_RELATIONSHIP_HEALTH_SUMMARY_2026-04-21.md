# Branch Progress — Master-data relationship health summary (2026-04-21)

## Completed
- Added supplier master relationship-health summary cards and grouped anomaly panels
- Added material master relationship-health summary cards and grouped anomaly panels
- Extended supplier master state with computed relationship aggregates:
  - total suppliers
  - total linked materials
  - inactive-linked supplier count
  - suppliers-with-unlinked-materials count
- Extended material master state with computed relationship aggregates:
  - total materials
  - linked material count
  - unlinked material count
  - inactive-supplier-linked material count
- Exposed grouped anomaly previews directly in both pages for faster triage

## Verification
- Updated supplier/material page-state tests to assert relationship health summaries
- Updated guard tests to assert the new UI diagnostics are present

## Notes
- This increment stays read-only and diagnostic-focused.
- Relationship remediation flows still happen through existing material/supplier edit surfaces.
