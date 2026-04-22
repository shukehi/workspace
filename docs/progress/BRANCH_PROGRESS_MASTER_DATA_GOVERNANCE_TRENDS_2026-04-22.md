# 主数据治理趋势与运营指标进度（2026-04-22）

## 本轮完成

### 1. 治理看板新增趋势摘要
- 最近 publish 次数
- 最近 rollback 次数
- 自动修复占比
- 最近活动窗口规模

### 2. 新增热点对象区块
- 基于 material / supplier audit logs 聚合近期高频对象
- 识别反复更新的主数据对象

### 3. 新增风险提示区块
- 待发布主数据
- 自动修复积压
- 人工处理积压
- 将治理看板从静态总览提升为“可判断风险”的看板

## 当前结果

主数据治理看板现在不仅能看：
- 当前状态
- 当前焦点

还可以看：
- 近期治理趋势
- 高频热点对象
- 风险提示

## 验证基线
- `tests/master-data-governance-page-state.test.ts`
- `tests/master-data-diagnostics-page-state.test.ts`
- `tests/config-table-guard.test.ts`
- `tests/material-management-page-state.test.ts`
- `tests/supplier-master-page-state.test.ts`
- `npm run type-check`
- `npm run type-check:server`
