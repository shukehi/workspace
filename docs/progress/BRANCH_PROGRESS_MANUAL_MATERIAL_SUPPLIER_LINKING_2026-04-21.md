# BRANCH PROGRESS — Manual Material→Supplier Linking (2026-04-21)

## Scope
Next increment after best-effort material-to-supplier linking:
- allow explicit `supplier_master_id` override in material create/update flows
- expose manual supplier master selection in the Material Management page
- keep best-effort supplier-name matching as the fallback path

## Checklist
- [x] Create execution/progress artifact for this increment
- [ ] Accept explicit `supplier_master_id` in backend material create/update flows
- [ ] Expose manual supplier master selection in the Material Management page
- [ ] Add regression tests for explicit override behavior
- [ ] Run targeted verification and update progress docs
