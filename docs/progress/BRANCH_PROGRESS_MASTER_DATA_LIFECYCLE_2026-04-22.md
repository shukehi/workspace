# 主数据 lifecycle 进度（2026-04-22）

## 本轮完成

### 1. Supplier / Material 主数据引入 revision workflow
- `master_data_profiles`
- `master_data_revisions`
- 支持 profile code：
  - `supplier_master`
  - `material_master`

### 2. 主数据编辑自动生成 draft revision
- Supplier 主数据 create / update / archive 后自动同步 draft snapshot
- Material 主数据 create / update 后自动同步 draft snapshot

### 3. 支持 publish / rollback / revisions
- `GET /api/config/profiles/supplier_master/revisions`
- `POST /api/config/profiles/supplier_master/publish`
- `POST /api/config/profiles/supplier_master/rollback`
- `GET /api/config/profiles/material_master/revisions`
- `POST /api/config/profiles/material_master/publish`
- `POST /api/config/profiles/material_master/rollback`

### 4. 前端页面接入 lifecycle 面板
- Material 主数据页新增 lifecycle 面板
- Supplier 主数据页新增 lifecycle 面板
- 展示：
  - latest revision
  - draft revision
  - published revision
  - revisions list
- 提供：
  - 发布当前 draft
  - 回滚到指定版本

## 当前结果

主数据平台现在已经不仅有：
- 工作台
- 统一诊断
- 批量修复

还具备：
- revision
- publish
- rollback

主数据治理从 CRUD + diagnostics 进入了 lifecycle 阶段。

## 验证基线
- `tests/config-profile-routes.test.ts`
- `tests/config-table-guard.test.ts`
- `tests/material-management-page-state.test.ts`
- `tests/supplier-master-page-state.test.ts`
- `tests/master-data-diagnostics-page-state.test.ts`
- `npm run type-check`
- `npm run type-check:server`
