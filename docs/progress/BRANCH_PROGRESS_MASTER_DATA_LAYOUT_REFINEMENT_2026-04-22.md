# 主数据页面布局收口进度（2026-04-22）

## 本轮完成

### 1. Material / Supplier 页面布局收口
- 将 `工作台` 区提升为主视觉区域
- 将 `治理概览` / `Lifecycle` 下移到次级治理区
- 将 `诊断与修复建议` 放在工作台之后，降低与主内容区的视觉竞争
- 将顶部 `profile/workflow/total/search` 收成更紧凑的上下文区

### 2. 统一诊断页布局收口
- 新增 `优先处理事项` 区，承载：
  - lifecycle 待处理
  - 人工处理任务流
  - 批量重连结果反馈
- 将 `批量修复控制台` 单独作为一侧主区域
- 将 Material / Supplier 异常明细整体下移到下半区

### 3. 治理看板布局收口
- 优先展示：
  - 治理状态总览
  - 治理焦点
- 将：
  - 近期活动
  - 治理建议
  归到次级信息区
- 让页面更像“管理看板”，而不是多个卡片平铺拼盘

## 当前结果

四个主数据相关页面已形成更统一的骨架：
1. 顶部标题区
2. 操作/上下文区
3. 主内容区
4. 次级治理区
5. 辅助说明区

## 验证基线
- `tests/config-table-guard.test.ts`
- `tests/master-data-governance-page-state.test.ts`
- `tests/master-data-diagnostics-page-state.test.ts`
- `tests/material-management-page-state.test.ts`
- `tests/supplier-master-page-state.test.ts`
- `npm run type-check`
- `npm run type-check:server`
