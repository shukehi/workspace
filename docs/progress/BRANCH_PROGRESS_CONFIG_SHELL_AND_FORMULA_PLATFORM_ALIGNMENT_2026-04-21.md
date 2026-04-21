# BRANCH PROGRESS — Config Shell and Formula Platform Alignment (2026-04-21)

## Scope
Next roadmap increment after profile bridge adoption:
- extract explicit `ConfigCenterShell` / `ProfileEditorHost` abstractions
- move existing config pages onto the new shell/host surface
- bring formula UI into the same platform framing without rewriting its full workflow yet

## Checklist
- [x] Create execution/progress artifact for this increment
- [ ] Inspect current shared layout and formula UI boundaries
- [ ] Implement compatibility-first shell/host wrappers
- [ ] Migrate current config pages to the shell/host layer
- [ ] Align formula UI with the platform shell
- [ ] Run targeted verification

## Notes
- This increment is primarily about front-end structure and framing.
- Existing data/workflow logic should remain stable during extraction.
