# Historical Legacy Doc Cleanup Checklist (2026-04-21)

## Goal
Clean up or clearly archive documents that still describe retired legacy config endpoints as active.

## Cleanup rules
1. If a document is still operationally useful but contains removed legacy paths, update it.
2. If a document is purely historical, keep it but add an obvious historical/archived note.
3. Do not silently delete decision history unless it is duplicated elsewhere and no longer useful.

## Highest-priority docs to update
### Reference docs
- `docs/reference/api.md`
- `docs/reference/RUNTIME_CONTRACT_2026-04-16.md`
- `docs/reference/formula-management-refactor.md`

Action:
- remove or mark retired paths:
  - `/api/config/mappings/*`
  - `/api/config/material-catalog/*`
  - `/api/config/formulas/published-map`
  - `/api/config/materials`
- replace with unified paths under:
  - `/api/config/profiles/*`
  - `/api/config/masters/*`
  - `/api/runtime/config-snapshot`

### Governance docs still describing transitional state
- `docs/governance/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md`
- `docs/governance/LEGACY_FINAL_SHIM_RETIREMENT_CHECKLIST_2026-04-21.md`
- `docs/governance/LEGACY_RETIREMENT_ACTION_ORDER_2026-04-21.md`
- `docs/governance/LEGACY_BRIDGE_FULL_REMOVAL_CONDITIONS_2026-04-21.md`
- `docs/governance/LEGACY_MATERIALS_POST_*`
- `docs/governance/LEGACY_FORMULAS_PUBLISHED_MAP_*`

Action:
- add a banner like: "Historical transition artifact — legacy bridge has been removed"
- link to final handoff / final summary docs instead of rewriting all history away

### Progress docs from the transition lane
- `docs/progress/BRANCH_PROGRESS_LEGACY_*`

Action:
- keep as historical log
- add one-line header or footer note indicating:
  - legacy runtime bridge is fully removed
  - see final summary for current state

## Suggested current source-of-truth docs
Use these as the "current state" anchors:
- `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
- `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

## Recommended execution order
1. Reference docs
2. Handoff/final-summary cross-links
3. Governance transition docs
4. Progress-log historical notes

## Definition of done
- No active reference doc presents removed legacy endpoints as supported current behavior
- Historical docs are clearly labeled as historical
- Current-state docs point only to unified routes and runtime snapshot flow
