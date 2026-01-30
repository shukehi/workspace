# 前端重构优化方案：迁移至 Vue 3

## 1. 项目背景与目标

当前系统前端采用原生 JavaScript (ES6 Modules) 开发，随着功能增加（特别是配置管理和动态交互），代码复杂度日益提高。主要面临以下痛点：
- **大量 DOM 操作**：手动 `document.createElement` 和 `innerHTML` 拼接导致代码臃肿且难以维护。
- **状态同步困难**：数据变更后需要手动触发渲染，容易遗漏导致视图与数据不一致。
- **组件复用性差**：缺乏标准的组件化机制，难以复用 UI 逻辑。

**本次重构目标**：
在**不修改后端架构**、**不破坏现有业务**的前提下，采用 **Vue 3** 渐进式重构前端视图层，实现：
- 减少 50% 以上的视图逻辑代码。
- 实现数据驱动视图（响应式更新）。
- 提升代码可读性与可维护性。

---

## 2. 技术架构方案

### 2.1 混合架构 (Hybrid Architecture)
鉴于项目现状，采用**渐进式迁移**策略，不立即引入 Webpack/Vite 复杂构建工具，而是利用现代浏览器对 ES Modules 的支持，直接使用 **Vue 3 ES Browser Build**。

*   **HTML 入口**：保持 `index.html` 不变，只添加 Vue 挂载点。
*   **JS 加载**：通过 `import` 引入 Vue，与现有业务逻辑（提取器、API服务）无缝集成。
*   **样式**：继续使用现有 CSS，逐步迁移到 Vue 组件的 Class 绑定。

### 2.2 核心模块重构映射

| 模块 | 当前实现 (Native JS) | 重构方案 (Vue 3) | 状态 |
| :--- | :--- | :--- | :--- |
| **状态管理** | `StateManager.js` (自制观察者) | **Vue Reactive / Ref** | ✅ 替换 |
| **事件通信** | `EventBus.js` | **Vue Events** + 事件总线 (桥接) | 🔄 混合 |
| **配置管理** | `configManager.js` (DOM 操作) | **ConfigPanel.js** (Vue 组件) | 🚀 优先 |
| **工作台主控** | `workbench.js` (DOM 操作) | **WorkbenchApp.js** (Vue 根组件) | 🚀 核心 |
| **采购明细表** | 手动拼接 `<tr>` 字符串 | `<tr v-for="item in list">` | ✨ 重点 |
| **侧边栏** | `SmartSidebar.js` (Class) | **SmartSidebar.js** (Vue 组件) | ✨ 重点 |
| **业务逻辑** | `dataExtractors.js` (纯函数) | (保持不变，被 Vue 调用) | 🔒 保留 |
| **打印/导出** | `printGenerator.js` | (保持不变，数据源改为 Vue) | 🔒 保留 |

---

## 3. 详细实施步骤 (Phased Implementation)

### 阶段一：环境准备与试点 (预计 1-2 天)

**目标**：引入 Vue 环境，并重构最复杂的“配置管理”模块作为验证 (Pilot)。

1.  **环境配置**：
    - 修改 `index.html`，引入 Vue 3 ESM 版本。
    - 清理旧的 DOM 本地引用。

2.  **重构「配置管理」 (Config Tab)**：
    - 创建 `public/js/components-vue/ConfigPanel.js`。
    - 使用 Vue 的 `v-for` 渲染原材料列表。
    - 使用 `v-model` 实现原材料和配方的双向绑定编辑。
    - **收益**：此模块交互最复杂，重构后代码量预计减少 60%。

### 阶段二：核心工作台迁移 (预计 3-5 天)

**目标**：接管核心数据的渲染与交互。

1.  **挂载根应用**：
    - 创建 `public/js/WorkbenchApp.js` 作为新的应用入口。
    - 将 `index.html` 中的静态 HTML 结构（Tab页、列表容器）逐步转化为 Vue 模板。

2.  **重构各个 Tab页**：
    - **Source Tab**：使用 Vue 渲染订单明细表，实现“合并复选框”和“统计开关”的响应式绑定。
    - **Stats Tab**：利用 `computed` 属性自动计算颜色统计，移除手动的 `renderStatistics()`。
    - **Orders Tab**：使用 `v-for` 渲染采购单列表，绑定查看/打印操作。

3.  **状态迁移**：
    - 将 `orderPool` 中的数据接入 Vue 的 `reactive` 状态系统，实现“数据变 -> 界面变”的自动化。

### 阶段三：收尾与优化 (预计 1-2 天)

1.  **侧边栏重构**：
    - 将 `SmartSidebar` 改为 Vue 组件，利用 `watch` 监听当前订单变化，自动刷新警告信息。

2.  **清理遗留代码**：
    - 删除 `workbench.js` 中废弃的 DOM 操作代码。
    - 删除 `StateManger` 中不再使用的逻辑。

3.  **兼容性测试**：
    - 确保 PDF 导出和打印功能（依赖 `localStorage` 传递数据）依然正常工作。

---

## 4. 风险评估与应对

| 风险点 | 应对策略 |
| :--- | :--- |
| **Vue 与现有 CSS 冲突** | Vue 仅替换 DOM 生成逻辑，保留现有 CSS 类名，确保样式无缝衔接。 |
| **事件总线断裂** | 在重构初期保留 `EventBus`，Vue 组件在 `mounted` 时订阅 Global 事件，确保新旧模块互通。 |
| **打印功能失效** | 打印页面由于独立于主页面，建议**暂不重构**打印页，仅确保 Vue 能正确将数据写入 `localStorage` 供打印页读取。 |
| **正则逻辑丢失** | 业务逻辑层（`dataExtractors.js`）完全不动，Vue 仅负责调用这些函数展示结果。 |

---

## 5. 预期成果

- **代码量减少**：核心视图控制代码减少约 1500+ 行。
- **开发效率**：新增 UI 功能（如增加一个过滤条件）仅需修改几行 Vue 数据，无需编写 DOM 操作。
- **稳定性**：彻底根除由于 DOM 操作不当导致的 ID 冲突和渲染残留 bug。
