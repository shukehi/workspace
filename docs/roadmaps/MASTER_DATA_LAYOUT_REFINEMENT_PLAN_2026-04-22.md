# 主数据页面布局收口计划（2026-04-22）

## 1. 目标

在不新增后端协议、不扩展功能的前提下，对主数据相关页面做一轮纯前端布局收口，降低“信息很多但层级混乱”的感受，让用户更容易一眼看出：
- 当前页面主目标
- 当前页面主要动作
- 当前页面主内容区
- 当前页面次要治理信息

涉及页面：
- `MaterialManagement.vue`
- `SupplierMaster.vue`
- `MasterDataDiagnostics.vue`
- `MasterDataGovernance.vue`

---

## 2. 本轮只做什么

### 会做
1. 统一页面骨架顺序
2. 调整区块前后顺序与分组方式
3. 收紧辅助信息的视觉权重
4. 统一主内容区与辅助内容区的边界
5. 保持现有功能、状态流、路由上下文不变

### 不做
1. 不改后端协议
2. 不加新能力
3. 不重写 composable
4. 不改数据结构
5. 不做审批/权限/并发治理

---

## 3. 统一骨架

四页统一采用：
1. 顶部标题区
2. 操作/上下文区
3. 主内容区
4. 次级治理区
5. 辅助说明区（如有）

目标是让页面首先呈现“可操作主区域”，其次才是诊断、审计、建议等辅助信息。

---

## 4. 页面级调整策略

### 4.1 Material 页面
- 将 `profile/workflow/total + 搜索` 收成更紧凑的上下文区
- 将 Summary / Lifecycle 作为辅助治理区，而不是把所有卡片都压在主内容前面
- 保持列表 + 详情工作台作为页面视觉主区域
- 将 Diagnostics 放到工作台后方，作为次级治理信息

### 4.2 Supplier 页面
- 同样收紧顶部上下文区
- 保持列表 + 详情工作台为视觉主区域
- Summary / Lifecycle 进入辅助治理区
- Diagnostics 放到工作台之后，减少上半屏模块拥挤感

### 4.3 统一诊断页
- 保持摘要卡在顶部
- 将 `Lifecycle 待处理` 与 `人工处理任务流` 归并到“优先处理事项”区域
- 将 Material / Supplier 异常列表作为主内容区
- 将批量结果反馈与错误信息压缩到次级位置

### 4.4 治理看板
- 保留摘要卡
- 优先呈现：治理状态总览 + 治理焦点
- 将“近期活动”和“治理建议”下移为辅助治理信息
- 突出管理视角，而非和诊断页争主内容权重

---

## 5. 验证方式

### 自动验证
- `tests/config-table-guard.test.ts`
- `tests/master-data-governance-page-state.test.ts`
- `tests/master-data-diagnostics-page-state.test.ts`
- `tests/material-management-page-state.test.ts`
- `tests/supplier-master-page-state.test.ts`
- `npm run type-check`
- `npm run type-check:server`

### 页面 smoke
重点检查：
- Material 页面是否仍能正常进入列表/详情/编辑
- Supplier 页面是否仍能正常进入列表/详情/编辑
- 统一诊断页主要操作是否仍可见
- 治理看板入口与跳转是否仍正常

---

## 6. 成功标准

如果本轮布局收口完成，应达到：
- 四页主内容区更突出
- 页面顶部不再堆太多同级卡片
- Summary / Lifecycle / Diagnostics / Activity 的层级更清楚
- 页面看起来更像稳定工作台，而不是模块拼盘
- 不引入行为回归
