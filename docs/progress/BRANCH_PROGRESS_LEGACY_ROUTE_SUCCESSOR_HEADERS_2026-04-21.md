> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy route successor headers (2026-04-21)

## Completed
- Upgraded legacy config compatibility middleware to emit richer retirement metadata:
  - `X-Config-Legacy-Phase: bridge-only`
  - `X-Config-Successor-Path`
  - `Sunset`
  - `Link: <...>; rel="successor-version"`
- Switched legacy config routes to declare route-specific successor paths:
  - formulas → `/api/config/profiles/formulas`
  - material catalog → `/api/config/profiles/material_catalog`
  - generic config / mappings → `/api/config/profiles`
- Added runtime header verification for the compatibility middleware
- Tightened guard tests so legacy routes must keep explicit successor mapping declarations

## Verification
- Guard tests updated for route-level successor-path wiring
- Runtime middleware header behavior verified in `tests/config-legacy-mount-flag.test.ts`

## Notes
- This change narrows legacy route responsibilities to bridge-only compatibility.
- Physical deletion is still deferred until the final retirement pass.
