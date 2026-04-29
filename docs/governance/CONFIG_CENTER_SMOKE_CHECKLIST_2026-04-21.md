# Config Center Smoke Checklist (2026-04-21)

## Goal
Quickly validate the config-center refactor after code integration.

## 1. Bootstrap
- Start app and confirm bootstrap succeeds
- Verify no config bootstrap failure shell appears
- Verify main navigation loads normally

## 2. Config center pages
Visit and confirm pages render without console/runtime errors:
- `/config/materials`
- `/config/suppliers`
- `/config/material-catalog`
- `/config/packaging`
- `/config/cylinder`
- `/config/lock`
- `/config/handle`
- `/config/lock-fork`
- `/formula`

## 3. Unified workflow checks
For at least one config profile:
- load current detail
- modify draft
- publish
- confirm detail refreshes
- confirm diff / impact / replay / reference-check panels render

## 4. Master-data checks
### Supplier master
- create supplier
- edit supplier
- archive supplier
- confirm audit log appears
- confirm relationship health panels render

### Material master
- create material
- edit material
- manual supplier master link
- confirm audit log appears
- confirm relationship diagnostics render

## 5. Runtime checks
- reload app after config publish
- confirm runtime still boots from unified config path
- confirm formulas/material catalog reads still work after refresh
- for production-like smoke, set `API_KEY` and send `x-api-key`; see `docs/progress/CONFIG_CENTER_RELEASE_CLOSEOUT_2026-04-29.md`
- when smoking a fresh DB, publish required mapping profiles before expecting `/api/runtime/config-snapshot` to return 200

## 6. Legacy retirement checks
- confirm removed legacy routes are not expected by current UI
- if doing controlled env verification, confirm deleted/default-off legacy paths return 404

## 7. Exit criteria
Smoke pass is good when:
- pages render
- save/publish flows work
- no blocking console/server errors
- runtime bootstrap remains healthy
