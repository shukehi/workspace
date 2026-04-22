# 主数据页面浏览器级 smoke（2026-04-22）

## 目标
对主数据相关页面做浏览器级 smoke，确认布局收口后的主次关系、关键跳转与主要交互仍然成立。

## 覆盖页面
- `/material-master`
- `/config/suppliers`
- `/config/master-data-diagnostics`
- `/config/master-data-governance`

## 结果

### Material 工作台
- 页面成功进入主工作台布局
- 列表 + 详情是第一视觉区域
- 上下文区、治理概览、Lifecycle、诊断区层级正常
- `materialId` / `tab` query 恢复正常
- Material → Supplier 跳转正常

### Supplier 工作台
- 页面成功进入主工作台布局
- 列表 + 详情是第一视觉区域
- Summary / Lifecycle / Diagnostics 已退居次级治理区
- `supplierId` / `tab` query 恢复正常
- Supplier → Material 跳转正常

### 主数据统一诊断
- 上方为优先处理事项与批量修复控制台
- 下方为 Material / Supplier 异常明细
- 人工任务流与批量修复操作在布局上更突出

### 主数据治理看板
- 上方为治理状态总览与治理焦点
- 下方为近期活动与治理建议
- 页面已更符合“管理看板”而不是“功能卡片拼盘”

## 发现与处理
- 在 smoke 过程中发现 `master-data lifecycle` 冷启动时存在 SQLite 初始化竞争，导致前端 bootstrap 偶发失败。
- 已通过串行化主数据 lifecycle profile bootstrap 修复，随后重新启动服务并完成 smoke。

## 结论
本轮布局收口后的四个主数据页面，主次关系和关键交互已达到可继续迭代的稳定状态。
