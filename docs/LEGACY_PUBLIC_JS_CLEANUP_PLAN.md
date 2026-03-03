# public/js 去冗余清单（阶段 C2）

## 1. 结论

当前主应用已迁移到 `src`（Vite + Vue）。
`public/js` 仍有一条在用链路：`public/order-preview.html` 的打印预览。

## 状态更新（2026-03-03）

- 批次 A：已执行删除并完成冒烟验证（`npm test`、`npm run build` 通过）。
- 打印预览最小保留集：仍在，未删除。

因此不建议一次性删除 `public/js`，应采用“保留最小运行集 + 分批清理”策略。

---

## 2. 仍在运行时使用的最小保留集（Keep Set）

以下文件由 `public/order-preview.html` 直接或间接依赖，当前不能删除：

1. `public/order-preview.html`
2. `public/js/config/index.js`
3. `public/js/components/print/printGenerator.js`
4. `public/js/utils/parsers.js`
5. `public/js/utils/dataNormalizer.js`
6. `public/templates/print-page.html`
7. `public/css/pages/print.css`
8. `public/data/*`（打印与配置依赖的数据）

---

## 3. 可删除候选（已被 src 体系替代）

### 批次 A（低风险，建议先删）

1. `public/js/pages/workbench.js`
2. `public/js/components-vue/*`
3. `public/js/store/orderStore.js`
4. `public/js/composables/useOrderAnalysis.js`
5. `public/js/services/api.js`
6. `public/js/core/eventBus.js`
7. `public/js/core/state.js`
8. `public/js/components/navigation.js`
9. `public/js/components/AppNavigation.js`
10. `public/js/components/configManager.js`
11. `public/js/components/poWorkflow.js`
12. `public/js/components/purchaseOrder.js`
13. `public/js/components/packagingTable.js`
14. `public/js/components/print/printControls.js`
15. `public/js/components/print/printMerge.js`
16. `public/js/config/mergeRules.js`
17. `public/js/utils/configExporter.js`
18. `public/js/utils/dom.js`
19. `public/js/utils/formatters.js`
20. `public/js/utils/mapping.js`
21. `public/js/utils/pdfExport.js`
22. `public/js/utils/statisticsCalculator.js`
23. `public/js/utils/validation.js`
24. `public/js/utils/materialDecomposer.js`
25. `public/js/utils/dataExtractors.js`

说明：这些文件不在当前 `src` 运行链路中，且不在 `order-preview.html` 依赖闭包中。

### 批次 B（中风险，与打印链路耦合，后移）

1. `public/js/config/index.js`
2. `public/js/components/print/printGenerator.js`
3. `public/js/utils/parsers.js`
4. `public/js/utils/dataNormalizer.js`

说明：只有在完成“打印预览页面 Vue 化/服务端化”后，才能删除。

---

## 4. 删除执行顺序

1. 先执行批次 A。
2. 跑构建与手工冒烟：
   - 采购页打开预览弹窗。
   - 预览页渲染。
   - 打印按钮可用。
3. 冒烟通过后再考虑批次 B 的替换方案。

---

## 5. 回滚点

1. 回滚点 R1：批次 A 删除提交（独立 commit）。
2. 回滚点 R2：打印链路改造提交（独立 commit）。
3. 每批次失败可 `git revert <commit>` 单独回退，不影响其他优化。

---

## 6. 后续建议

1. 将 `order-preview.html` 迁移为 `src` 下 Vue 路由页或组件。
2. 将打印渲染逻辑迁移到 `src/services/print`，复用现有 `ProcurementPreviewModal` 数据结构。
3. 迁移完成后删除批次 B，彻底移除 `public/js` 运行依赖。
