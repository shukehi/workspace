> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy Technical Closeout Verdict (2026-04-21)

## Verdict
From an internal code and test perspective, the config-center refactor is **technically ready for closeout**.

## What is already finished
- Runtime and profile protocol unification are in place
- Main data platformization is in place
- Legacy route families have been collapsed from many endpoints to one default-mounted write shim
- Final shim controls, readiness checks, and rehearsal helpers exist

## What is *not* a code blocker anymore
- No `src/` production callers remain for the legacy shims
- Mappings and material-catalog legacy route families are already unmounted
- Formulas shim has already moved past default-off and is no longer part of the default mounted surface
- Materials POST shim is isolated, observable, and independently controllable

## What is still blocking final removal
Only one class of blocker remains:
- **external caller / operational compatibility uncertainty** for `POST /api/config/materials`

This is not an architecture blocker and not a refactor-structure blocker.
It is an integration-retirement decision blocker.

## Practical conclusion
If external audit clears `POST /api/config/materials`, the remaining work is operationally straightforward:
1. disable via `ENABLE_LEGACY_CONFIG_MATERIALS_POST=false`
2. confirm no regressions
3. delete the shim route
4. delete the bridge shell

## Recommended label
- Refactor status: **technically complete, operational retirement pending**
