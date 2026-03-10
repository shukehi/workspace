# public/js 去冗余清单（阶段 C2 + 批次 B）

## 状态更新（2026-03-03）

- 批次 A：已执行并验证通过。
- 批次 B：已执行并验证通过。
  - 打印预览已迁移到 `src/views/PrintPreview.vue`。
  - 预览入口由 `public/order-preview.html` 切换为路由 `/print-preview`。
  - `public/js` 运行依赖已全部移除。

## 当前结论

`public/js` 不再参与当前运行链路，项目主运行链路为：

1. 前端应用：`src`（Vue + Vite）
2. 后端服务：`server`（Express）
3. 打印模板资源：`public/templates/print-page.html` 与 `public/css/pages/print.css`

## 已完成项

1. 删除历史工作台/组件/store/services/core/utils 的 legacy 文件。
2. 删除旧打印页面及其脚本依赖：
   - `public/order-preview.html`
   - `public/js/config/index.js`
   - `public/js/components/print/printGenerator.js`
   - `public/js/utils/parsers.js`
   - `public/js/utils/dataNormalizer.js`
   - `public/js/utils/validation.js`
3. 采购预览弹窗 iframe 已接入新路由 `/print-preview`。

## 验证记录

- `npm test` 通过。
- `npm run build` 通过。
- 手工冒烟：采购预览弹窗、打印功能正常。

## 后续建议

1. 如需进一步收敛，可考虑将 `public/templates/print-page.html` 迁移为 Vue 组件模板。
2. 可将 `public/css/pages/print.css` 拆分迁入 `src/assets`，统一构建管理。
