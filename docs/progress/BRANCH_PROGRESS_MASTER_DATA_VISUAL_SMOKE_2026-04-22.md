# 主数据页面浏览器级 smoke（2026-04-22）

## 目标
对主数据相关页面做浏览器级 smoke，确认布局收口后的主次关系、关键跳转与主要交互仍然成立。

## 覆盖页面
- `/material-master`
- `/config/suppliers`
- `/config/master-data-diagnostics`
- `/config/master-data-governance`

## 本地浏览器 smoke 路径
建议按以下顺序进行手动 / browser smoke：
1. 打开 `/config/master-data-diagnostics`
   - 确认统一诊断页首屏聚焦异常汇总、批量修复和人工处理入口
   - 从诊断项进入 Material / Supplier 详情页时，确认 `tab` 与对象 id 保持
2. 打开 `/material-master`
   - 确认详情面板、诊断面板、编辑 / 自动重连 / 相关对象跳转正常
3. 打开 `/config/suppliers`
   - 确认供应商工作台、详情面板、关联物料跳转与编辑入口正常
4. 打开 `/config/master-data-governance`
   - 作为治理总览回看诊断与工作台入口是否仍然连通

## Phase 3 修复流浏览器 closeout（2026-04-29）

### 启动与环境
- 后端：`PORT=3000 NODE_ENV=development npx tsx server/index.ts`
- 前端：`npx vite --host 127.0.0.1 --port 5180 --strictPort --force`
- 浏览器入口：`http://127.0.0.1:5180`
- 说明：本次使用 `--force` 单独启动 5180 端口，避免复用旧 dev server 时出现 Vite optimized dependency 504 干扰 smoke。

### 实测路径
1. 打开 `/config/master-data-diagnostics`
   - 页面成功挂载 `主数据统一诊断`。
   - 首屏可见 `总异常数`、`可自动修复`、`待发布主数据`、`人工处理任务流`、`批量修复控制台`。
   - 可见 `查看物料详情`、`查看供应商详情`、`自动重连` 操作入口。
2. 在统一诊断页点击第一条 `查看物料详情`
   - 成功进入 `/material-master?tab=relationship&materialId=99`。
   - 页面显示 `物料管理` 与 `物料详情工作台`。
   - `关系` tab 保持选中，详情区可见 `打开编辑`、`自动重连`。
3. 回到统一诊断页点击第一条 `查看供应商详情`
   - 成功进入 `/config/suppliers?tab=materials&supplierId=1`。
   - 页面显示 `供应商主数据` 与 `供应商详情工作台`。
   - `关联物料`路径保持，页面可见 `打开编辑` 和 `查看物料详情`。
4. 在供应商工作台点击 `查看物料详情`
   - 成功进入 `/material-master?tab=relationship&materialId=1`。
   - 页面显示 `物料管理` 与 `物料详情工作台`，并保持 `tab=relationship`。

### 浏览器观测
- Console：无业务错误；仅 DevTools accessibility issue：`A form field element should have an id or name attribute (count: 1)`，不阻断本次修复流。
- Network：关键 API 均为 200/304，包括：
  - `/api/config/profiles/material_master/items`
  - `/api/config/profiles/material_master/reference-check`
  - `/api/config/profiles/supplier_master/items`
  - `/api/config/profiles/supplier_master/items/1/materials`
  - `/api/materials/1/mappings`

### Closeout 结论
Phase 3 的核心修复流已具备两层证据：
- PR #66 的 route/action guard 测试固定了 diagnostics / workbench 的路由 payload 与事件链。
- 本次浏览器 smoke 证明真实页面可从统一诊断进入 Material / Supplier 工作台，并继续执行 edit/relink/related-object 的入口导航。

因此 Phase 3 可从“待封口”更新为“已封口（guard + browser smoke）”；后续不应继续扩大 Phase 3 UI 重构，下一阶段应转向 Phase 4 的跨页复用评估。

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
