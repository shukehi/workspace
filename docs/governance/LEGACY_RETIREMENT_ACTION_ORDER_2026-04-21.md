> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy Retirement Action Order (2026-04-21)

## Current end-state snapshot
- **Default-mounted legacy shim:** `POST /api/config/materials`
- **Default-off legacy shim:** `GET /api/config/formulas/published-map`
- **Already unmounted:**
  - `/api/config/mappings`
  - `/api/config/material-catalog`
- **Already deleted / collapsed:**
  - broad `configData.ts` compatibility surface
  - broad formulas lifecycle bridge surface

## Recommended closeout order

### Step 1 — Finish formulas shim retirement
1. Run controlled environments with `ENABLE_LEGACY_FORMULAS_PUBLISHED_MAP=false`
2. Confirm no hidden callers need `GET /api/config/formulas/published-map`
3. Delete `server/routes/formulasConfig.ts`
4. Remove `/api/config/formulas` from `legacyConfigBridge.ts`

### Step 2 — Execute materials POST caller audit
1. Identify any automation or external clients still posting to `/api/config/materials`
2. Confirm replacement path:
   - `/api/config/profiles/material_catalog`
3. Decide whether the legacy POST response shape must be preserved anywhere else

### Step 3 — Controlled disable of materials POST
1. Set `ENABLE_LEGACY_CONFIG_MATERIALS_POST=false` in controlled environments
2. Monitor logs / failures / operator workflows
3. If clean, make the shim default-off or delete directly depending on rollout confidence

### Step 4 — Delete the materials POST shim
1. Delete `server/routes/materialsConfigCompatibility.ts`
2. Remove `/api/config/materials` from `legacyConfigBridge.ts`
3. Delete `tests/materials-config-compatibility-route.test.ts`
4. Remove related blocker metadata from readiness tests and docs

### Step 5 — Remove the bridge shell
After both final shims are gone:
1. Delete `server/routes/legacyConfigBridge.ts`
2. Remove legacy mount logic from `server/routes/index.ts`
3. Delete remaining legacy bridge readiness tests
4. Clean obsolete governance/progress docs that only exist for shim retirement

## Practical recommendation
- **Next real deletion target:** formulas published-map shim
- **Next risky target:** materials POST shim
- **Final cleanup target:** bridge manifest + mount glue
