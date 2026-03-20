# TODOS

## Completed

- **TypeScript server migration (Phase 0–4)** — Migrated all 49 server JS files to TS, eliminated `as any` casts, restored typed repository returns, removed CJS shims, migrated full test suite to TS.
  **Completed:** v1.1.3 (2026-03-19)

- **Procurement 前端 composable 拆分 (Phase 0)** — 从 `Procurement.vue` 提取 `useStockInQueue`、`useProcurementBulkActions` 两个 composable；`useProcurementStore.fetchOrders` 错误统一抛出。页面 script 从 270 行降至 120 行。
  **Completed:** v1.1.4 (2026-03-19)

- **TS 专项优化 (Phase 7)** — 删除 `tsconfig.server.json` 中 `allowJs`；`LooseWhere` 升级为 `WhereOptions<T>`；消除 `order.errors.ts` 中两处 `any`，导出 `OrderDomainError` 联合类型；新增 Zod env schema 启动时校验。
  **Completed:** v1.1.4 (2026-03-19)
