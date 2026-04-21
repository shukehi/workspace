# 主数据工作台增强进度（2026-04-21）

## 本轮完成

### 1. Material / Supplier 详情工作台加入 tab 状态控制
- Material 详情支持：`basic / relationship / diagnostics / audit`
- Supplier 详情支持：`basic / materials / diagnostics / audit`
- 页面已根据 query 参数同步选中对象与激活 tab

### 2. 建立主数据对象跨页跳转
- Material 详情中的 Supplier Master 关系区可直接跳到 Supplier 详情工作台
- Supplier 详情中的关联物料列表可直接跳到 Material 详情工作台

### 3. 修复路径更顺
- Material 页支持从详情区直接：
  - 打开编辑
  - 自动重连
  - 查看供应商详情
- Supplier 页支持从详情区直接：
  - 查看关联物料
  - 打开编辑
  - 查看物料详情

## 当前结果

主数据页面已经不仅是“列表 + 侧边详情”，而是具备：
- 上下文保留
- 详情 tab 导航
- 主数据对象互跳
- 发现问题到修复问题的更短路径

## 验证基线
- `tests/config-table-guard.test.ts`
- `tests/material-management-page-state.test.ts`
- `tests/supplier-master-page-state.test.ts`
- `npm run type-check`
- `npm run type-check:server`
