# 采购管理模块：逻辑复用与视图重组开发计划

## 1. 任务背景
目前项目中“采购管理”页面（`src/views/Procurement.vue`）仅为占位符。为了完成从 Legacy 架构到 Vite + Vue 3 架构的平滑迁移，需要利用现有的业务逻辑、算法组件及后端 API，在现代前端框架下重构该页面。

## 2. 核心策略：逻辑复用 + 视图重组
我们不采取从零开发的策略，而是通过以下方式实现高效交付：
- **逻辑层 (Logic)**：完全复用已有的 Pinia Store (`useProcurementStore.ts`) 和业务匹配算法 (`packagingMatcher.ts`)。
- **视图层 (View)**：使用 Vite 项目中的 `DataTable` 组件及 Tailwind CSS 进行 UI 重组，确保视觉风格统一。
- **产出层 (Output)**：利用 `<iframe>` 桥接现有的 `order-preview.html` 打印模板，避免重写复杂的打印样式。

## 3. 功能清单与状态映射

| 功能点 | 现代版实现方案 | 对应组件/文件 |
| :--- | :--- | :--- |
| **订单列表展示** | 使用 `DataTable` + `ProcurementColumns` | `src/views/Procurement.vue` |
| **订单筛选/搜索** | 基于供应商、状态及类别 (Category) 的本地/远程筛选 | `src/views/Procurement.vue` |
| **创建/生成订单** | 集成现有的生成对话框 | `src/components/source/GeneratePODialog.vue` |
| **编辑订单详情** | 挂载并对接已开发的编辑组件 | `src/components/procurement/EditOrderDialog.vue` |
| **打印/预览** | 现代模态框内嵌旧版打印页 | `src/components/procurement/PreviewModal.vue` |
| **删除/状态流转** | 调用 `useProcurementStore` 的 Action | `src/stores/useProcurementStore.ts` |

## 4. 实施里程碑 (Milestones)

### 第一阶段：基础架构与列表 (Foundation)
- [ ] 创建 `src/components/procurement/ProcurementColumns.ts` 定义表格列。
- [ ] 实现 `src/views/Procurement.vue` 的基础布局与数据加载逻辑。
- [ ] 集成状态（Status）和类别（Category）的彩色 Badge 显示。

### 第二阶段：交互与编辑 (Interaction)
- [ ] 在列表中集成“编辑”按钮，触发 `EditOrderDialog`。
- [ ] 实现“删除”功能，并添加二次确认对话框。
- [ ] 确保编辑保存后列表能够响应式刷新。

### 第三阶段：预览与打印 (Output)
- [ ] 开发 `ProcurementPreviewModal.vue` 组件。
- [ ] 实现预览时的数据同步（将 Pinia 数据暂存至 `localStorage` 以驱动旧版打印模板）。
- [ ] 验证打印样式与边距在现代版容器中的兼容性。

### 第四阶段：流程优化 (Optimization)
- [ ] 实现按“物料分类”的快速切换标签（Tab）。
- [ ] 优化大数据量下的列表性能。
- [ ] 完善操作反馈（Toast 通知等）。

## 5. 关键复用代码路径
- **Store**: `src/stores/useProcurementStore.ts`
- **Editor**: `src/components/procurement/EditOrderDialog.vue`
- **Matcher**: `src/lib/packagingMatcher.ts`
- **Template**: `public/order-preview.html`
- **Styles**: `public/css/components/preview-modal.css` (作为参考)
