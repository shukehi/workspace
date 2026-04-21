> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy retirement action order (2026-04-21)

## Completed
- Consolidated the current legacy end-state into one closeout action-order document
- Captured the exact recommended shutdown sequence:
  1. formulas shim deletion
  2. materials POST caller audit
  3. materials controlled disable
  4. materials shim deletion
  5. bridge shell deletion

## Outcome
- The remaining work is now an execution checklist rather than an architecture problem
- The next concrete deletion target is unambiguous: `GET /api/config/formulas/published-map`

## Notes
- This step adds no runtime behavior changes.
- It is the handoff-grade closeout plan for finishing legacy retirement.
