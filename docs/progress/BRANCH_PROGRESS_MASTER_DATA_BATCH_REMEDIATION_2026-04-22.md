# 主数据批量修复增强进度（2026-04-22）

## 本轮完成

### 1. 统一诊断页支持批量自动重连
- 可自动修复物料支持勾选
- 支持全选可见项 / 清空选择
- 支持批量自动重连
- 支持批量结果反馈（processed / succeeded / failed）

### 2. 新增人工处理任务流
- 聚合 Material / Supplier 的人工处理任务
- 提供：
  - 上一条
  - 下一条
  - 处理当前对象
  - 查看关联对象（如适用）
- 将人工修复从“自己找下一个”变成连续任务流

### 3. 状态层增强
- `useMasterDataDiagnostics` 新增：
  - `batchRelinking`
  - `relinkingMaterialIds`
  - `lastBatchRelinkResult`
  - `autoRelinkMaterials()`

## 当前结果

主数据统一诊断页现在不仅能聚合异常，还能：
- 批量处理可自动修复项
- 以任务流方式推进人工处理项
- 进一步缩短异常发现到修复完成的时间

## 验证基线
- `tests/config-table-guard.test.ts`
- `tests/master-data-diagnostics-page-state.test.ts`
- `tests/material-management-page-state.test.ts`
- `tests/supplier-master-page-state.test.ts`
- `npm run type-check`
- `npm run type-check:server`
