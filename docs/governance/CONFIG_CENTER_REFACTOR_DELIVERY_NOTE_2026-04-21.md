# Config Center Refactor Delivery Note (2026-04-21)

## Delivered
- Unified config runtime loading via snapshot + profile fallback
- Unified config platform routes under `profiles` / `masters`
- Shared config-center frontend shell and editor host surfaces
- Formulas migrated into the unified collection-profile model
- Supplier/material master-data surfaces established
- Material↔supplier relationship diagnostics, drill-down, and remediation guidance added
- Legacy config runtime bridge fully removed from code

## Current supported surfaces
### Runtime
- `GET /api/runtime/config-snapshot`

### Unified config platform
- `/api/config/profiles/*`
- `/api/config/masters/*`

## Removed runtime surfaces
- `/api/config/mappings/*`
- `/api/config/material-catalog/*`
- `/api/config/formulas/published-map`
- `/api/config/materials`

## Operational note
If any external integration still expects removed legacy endpoints, it must migrate to the unified config platform interfaces. The application no longer exposes the legacy compatibility bridge at runtime.

## Recommended verification after delivery
- smoke test config-center pages
- smoke test supplier/material master pages
- smoke test config publish/update flows
- confirm runtime snapshot boot still succeeds
