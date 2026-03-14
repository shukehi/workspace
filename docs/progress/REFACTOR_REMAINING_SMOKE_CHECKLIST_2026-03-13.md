# Refactor Remaining Smoke Checklist (2026-03-13)

## 1. Purpose

This checklist tracks the remaining manual smoke / usage records required before Week 1-8 can be moved from `in_progress` to `completed`.

Current automated validation is already green:

- `npm run type-check`
- `npm run build`
- `npm test`

What remains is week-specific smoke evidence.

## 2. Week 1 - Procurement

- [ ] Open Procurement page and verify route query sync for filter / pagination / keyword changes.
- [ ] Verify edit / preview switching still works.
- [ ] Verify status labels render correctly after shared constant migration.
- [ ] Verify print preview and export entry are still usable.
- [ ] Record smoke result in [WEEK1_REFACTOR_EXECUTION_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/WEEK1_REFACTOR_EXECUTION_CHECKLIST_2026-03-13.md).

## 3. Week 2 - Order Backend Split

- [x] Run create order main path.
- [x] Run update order main path.
- [x] Run arrive / stock-in main path.
- [x] Run cancel or delete path.
- [ ] Verify duplicate-order / idempotency behavior on at least one realistic sample.
- [x] Record smoke result in [WEEK2_BACKEND_SPLIT_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/WEEK2_BACKEND_SPLIT_CHECKLIST_2026-03-13.md).

## 4. Week 3 - Controller / Error / Validation

- [x] Verify at least one successful order write request through the controller pipeline.
- [x] Verify at least one validation error response shape.
- [x] Verify at least one not-found or business error response shape.
- [x] Save one before/after response example in [WEEK3_CONTROLLER_ERROR_MIDDLEWARE_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/WEEK3_CONTROLLER_ERROR_MIDDLEWARE_CHECKLIST_2026-03-13.md).

## 5. Week 4 - Inventory Domain

- [x] Verify inventory list load.
- [x] Verify inventory update flow.
- [x] Verify inventory receipt detail flow.
- [x] Verify inventory receipt reverse flow.
- [x] Verify stock-in to inventory linkage with one realistic case.
- [x] Record smoke result in [WEEK4_INVENTORY_DOMAIN_ROLLOUT_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/WEEK4_INVENTORY_DOMAIN_ROLLOUT_CHECKLIST_2026-03-13.md).

## 6. Week 5 - Shared Mappings Core

- [x] Compare one real packaging mapping result between frontend and backend.
- [x] Compare one real cylinder mapping result between frontend and backend.
- [x] Compare one real lock or lock-fork mapping result between frontend and backend.
- [x] Record one adapter / validator diff summary in [WEEK5_MAPPINGS_SHARED_VALIDATOR_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/WEEK5_MAPPINGS_SHARED_VALIDATOR_CHECKLIST_2026-03-13.md).

## 7. Week 6 - Formulas And Migrations

- [ ] Verify formulas list load.
- [ ] Verify detail load and revision load.
- [ ] Verify local draft create / edit / clear flow.
- [ ] Verify save / publish / rollback flow.
- [ ] Verify migration runner on an empty database.
- [ ] Verify migration runner on a legacy schema upgrade path.
- [ ] Record smoke result in [WEEK6_FORMULAS_MIGRATION_STANDARDIZATION_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/WEEK6_FORMULAS_MIGRATION_STANDARDIZATION_CHECKLIST_2026-03-13.md).

## 8. Week 7 - Source Analysis And Materials

- [ ] Verify Source page contract load.
- [ ] Verify Source page history contract rehydrate.
- [ ] Verify Source page analysis recompute.
- [ ] Verify Source page snapshot restore after refresh.
- [ ] Verify Materials page navigation/tab state.
- [ ] Verify MaterialManagement search / edit / save flow.
- [ ] Record smoke result in [WEEK7_MATERIALS_SOURCE_ANALYSIS_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/WEEK7_MATERIALS_SOURCE_ANALYSIS_CHECKLIST_2026-03-13.md).

## 9. Week 8 - Governance

- [ ] Verify docs entry points are enough for a new contributor to find roadmap / governance / placement guidance.
- [ ] Verify PR template and governance docs are mutually consistent.
- [ ] Verify compatibility shell retirement list matches current codebase.
- [ ] Record smoke / usage result in [WEEK8_EXECUTION_INDEX_GOVERNANCE_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/WEEK8_EXECUTION_INDEX_GOVERNANCE_CHECKLIST_2026-03-13.md).

## 10. Completion Rule

Only after a week's smoke items are recorded in its corresponding roadmap file should that week be switched from `in_progress` to `completed`.
