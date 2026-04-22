# 主数据治理看板进度（2026-04-22）

## 本轮完成

### 1. 新增主数据治理看板页面
- 路由：`/config/master-data-governance`
- 导航入口：`主数据治理`
- 页面：`src/views/MasterDataGovernance.vue`

### 2. 治理看板聚合三类信息
- 治理状态总览
  - material / supplier profile 的 latest / draft / published / active revision
- 近期活动
  - material / supplier audit logs 聚合排序
- 治理焦点
  - pending publish
  - auto fix
  - manual review

### 3. 统一汇总 diagnostics + lifecycle
- 复用主数据 diagnostics 数据
- 复用 material / supplier profile detail
- 将异常治理与 lifecycle 治理提升到同一总览入口

## 当前结果

主数据平台现在拥有三个层级入口：
- 工作台（对象级）
- 统一诊断（问题级）
- 统一治理看板（管理级）

## 验证基线
- `tests/master-data-governance-page-state.test.ts`
- `tests/config-table-guard.test.ts`
- `npm run type-check`
- `npm run type-check:server`
