# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- 库存域新增正式出库与库位管理闭环：支持库位列表维护、正式出库单创建/详情/冲销，以及库存页按 tab 导出库位余额和正式出库记录
- 采购订单风险提示支持人工取消与恢复；人工取消后列表 `!` 标记、风险筛选和风险计数保持一致

### Changed

- 采购订单支持在编辑页切换 `左右数量` / `总数量` 显示，且该显示方式会同步到预览、打印和导出 PDF
- 包装、锁具、锁芯、拉手、锁叉配置页统一改为顶部操作按钮 + 紧凑状态条布局，主映射表优先进入首屏
- 配置编辑主表支持页面级滚动，避免大表格吞掉页面滚轮导致难以滚动到底部

### Fixed

- 修复编辑采购订单时输入产品名称导致明细行因实时排序和索引 key 发生跳动的问题
- 修复打印和导出 PDF 的客户名称脱敏回退，恢复为括号内销售部门显示
- 修复配置映射表在未传 `title/header` 时“添加行”按钮消失的问题
- 修复锁芯配置 `customLogos` 缺少重复校验的问题，避免 `ZSF` 等 logo 重复写入
- 修复锁具配置“测试匹配”在布局重排后输入不再驱动命中结果更新的问题

## [1.1.4] - 2026-03-19

### Changed

- **前端 composable 拆分**：`Procurement.vue` 页面 script 从 270 行瘦身至 120 行——入库队列逻辑提取为 `useStockInQueue`，批量操作逻辑提取为 `useProcurementBulkActions`，两者均通过依赖注入接收 store/toast/回调，可独立测试
- `useProcurementStore.fetchOrders` 错误不再静默吞掉——现在向上抛出，页面层可统一用 toast 展示
- `tsconfig.server.json` 移除 `allowJs` / `checkJs`：server/ 目录全部为 `.ts`，不再允许混入 JS 文件
- 仓库层 WHERE 子句类型从松散的 `Record<string, unknown>` 升级为 Sequelize 的 `WhereOptions<T>`（`order.repository.ts` 和 `inventory-receipt.repository.ts`）
- `order.errors.ts`：`DuplicateOrderError.existingOrder` 由 `any` 改为 `OrderInstance`；`orderErrorResolver` 参数由 `any` 改为 `OrderDomainError | Error | unknown`；新增导出 `OrderDomainError` 联合类型供调用方使用

### Added

- `server/config/env.ts` 新增 Zod schema 启动时校验：`PORT` / `ERP_TIMEOUT` 自动 coerce 为数字，`NODE_ENV` 限制为合法枚举，`ERP_BASE_URL` 校验为 URL 格式——环境变量错误在进程启动时即报告，不再等到运行时才爆炸

## [1.1.3] - 2026-03-19

### Changed
- Migrated all 49 server JavaScript files to TypeScript (`.js` → `.ts`) with strict type checking enabled
- Migrated full test suite (89 test files) from `.js` to `.ts` with type-safe imports
- Restored typed return signatures across three repository layers (`formula.repository.ts`, `order.repository.ts`, `inventory-receipt.repository.ts`) — eliminating 30 degraded `any` returns via `ModelInstance<A, C>` intersection types
- Removed 13 CJS `module.exports` shims from TypeScript server files; test harness updated with `.default` unwrap for ESM-via-CJS routes
- Eliminated all 62 `as any` casts across the server codebase — replaced with `ModelInstance`, `RouterLike`, `FormulaWorkflowResult`, and inline type guards

### Fixed
- Race condition in `ContractCacheService.cacheContract()`: concurrent inserts now caught via `UniqueConstraintError` and retried with update, preventing duplicate constraint errors
- `PDF_DEBUG` env flag inverted logic fixed: debug mode now activates on `PDF_DEBUG === '1'` (was `!== '0'`)
- `importMaterials.ts` script: removed bare `process.exit(0)` and added `sequelize.close()` in `.finally()` to prevent connection leak
- `tsconfig.server.json` `rootDir` aligned to include `server/scripts/` directory
- Added `tsconfig.test.json` with `tsx` path alias and correct test root for the test runner

### Removed
- All server-side `.js` source files replaced by their `.ts` equivalents
- `module.exports` CJS shims that were used as interop bridges during migration
