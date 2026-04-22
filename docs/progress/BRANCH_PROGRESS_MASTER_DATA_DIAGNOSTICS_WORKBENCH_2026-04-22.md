# 主数据统一诊断页进度（2026-04-22）

## 本轮完成

### 1. 新增主数据统一诊断页
- 路由：`/config/master-data-diagnostics`
- 导航入口：`主数据诊断`
- 页面：`src/views/MasterDataDiagnostics.vue`

### 2. 聚合 Material / Supplier 异常
- Material：
  - 可自动修复
  - 需人工处理
- Supplier：
  - inactive 但仍有关联物料
  - 需补充正式链接

### 3. 建立聚合页到工作台的修复跳转
- 诊断页 → Material 工作台（携带 `materialId` 与 `tab`）
- 诊断页 → Supplier 工作台（携带 `supplierId` 与 `tab`）

### 4. 补齐工作台 URL 上下文保持
- Material 工作台支持 query 驱动：
  - `materialId`
  - `tab`
- Supplier 工作台支持 query 驱动：
  - `supplierId`
  - `tab`

## 当前结果

主数据平台现在已具备：
- 列表 + 详情工作台
- Material ↔ Supplier 对象互跳
- 聚合异常入口
- 从诊断页进入修复对象的最短路径

## 验证基线
- `tests/config-table-guard.test.ts`
- `tests/master-data-diagnostics-page-state.test.ts`
- `tests/material-management-page-state.test.ts`
- `tests/supplier-master-page-state.test.ts`
- `npm run type-check`
- `npm run type-check:server`
