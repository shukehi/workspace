# 主数据 lifecycle 诊断聚合进度（2026-04-22）

## 本轮完成

### 1. 统一诊断页聚合 lifecycle 待处理项
- 新增 `Lifecycle 待处理` 区块
- 聚合：
  - `material_master` draft 待发布
  - `supplier_master` draft 待发布
- 支持直接跳转到对应主数据页面的 lifecycle 面板上下文

### 2. 统一诊断汇总卡纳入待发布主数据
- 新增摘要项：`待发布主数据`
- 统一把异常、修复与 lifecycle 待处理视为同一个治理视图

### 3. 诊断状态层复用主数据 profile detail
- `useMasterDataDiagnostics` 现在会同时读取：
  - material profile detail
  - supplier profile detail
- 由此生成 lifecycle 待处理聚合与统计

## 当前结果

主数据统一诊断页现在不仅能看：
- 结构异常
- 修复动作

还可以看：
- 哪个主数据 profile 有 draft 但未 publish

这样异常治理与 lifecycle 治理已经开始汇合到同一个入口。

## 验证基线
- `tests/master-data-diagnostics-page-state.test.ts`
- `tests/config-table-guard.test.ts`
- `tests/config-profile-routes.test.ts`
- `npm run type-check`
- `npm run type-check:server`
