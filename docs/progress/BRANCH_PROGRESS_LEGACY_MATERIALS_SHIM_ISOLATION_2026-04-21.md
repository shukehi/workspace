> 历史进度文档。
> legacy runtime bridge 已移除；当前状态请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Branch Progress — Legacy materials shim isolation (2026-04-21)

## Completed
- Replaced broad `/api/config` bridge mounting with a dedicated materials compatibility shim mount at `/api/config/materials`
- Deleted `server/routes/configData.ts`
- Added `server/routes/materialsConfigCompatibility.ts` for the remaining legacy materials POST compatibility behavior
- Updated bridge metadata, readiness tests, and runtime mount checks to reflect the narrower mount path

## Impact
- The last default-mounted legacy write shim is now isolated to its own explicit route family
- Legacy mount summary now reports `/api/config/materials` instead of the broader `/api/config`

## Verification
- `tests/config-routes.test.ts`
- `tests/config-legacy-mount-flag.test.ts`
- `tests/legacy-config-route-removal-readiness.test.ts`
- `tests/legacy-config-route-headers-guard.test.ts`
- `npm run type-check:server`
