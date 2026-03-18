# TypeScript 迁移驱动重构计划
**制定日期：** 2026-03-18
**适用项目：** 颐家采购管理系统（Vue 3 + Express + Sequelize + SQLite）

---

## 一、现状快照

### 前端（src/）
- **100% TypeScript** — 无需迁移，仅需重构
- 存在若干架构问题（见第四节）

### 后端（server/）
| 类别 | JS 文件数 | 行数 | TS 文件数 | 状态 |
|------|-----------|------|-----------|------|
| routes/ | 14 | 1,256 | 0 | 全部待迁移 |
| services/ | 8 | 549 | 多个 | 部分已迁移 |
| middleware/ | 4 | 83 | 0 | 待迁移 |
| config/ | 4 | 140 | 0 | 待迁移 |
| models/ | 1 | 59 | 17 | 大部分完成 |
| db/migrations/ | 6 | 149 | 0 | 保持 JS（规范） |
| scripts/ | 6 | 399 | 0 | 保持 JS（工具脚本） |
| index.js | 1 | 111 | — | 入口，最后迁移 |
| **合计** | **49** | **3,183** | — | — |

---

## 二、核心原则

### 迁移驱动型重构（Migration-driven Refactoring）
**不做两遍手术**：迁移一个 JS 文件到 TS 时，同批次完成架构重构。
禁止先照搬结构迁移 TS、再单独重构。

```
❌ 错误方式：
JS 原始代码 → 翻译成 TS（保持原结构）→ 之后再重构

✅ 正确方式：
设计目标架构蓝图 → 迁移 JS + 同时重构 → 一次完成
```

### 分类处理
| 类型 | 策略 |
|------|------|
| 现有 TS 文件的 Bug | **立即修复**（不等迁移） |
| 现有 TS 文件的架构问题 | **现在重构**（前端大文件等） |
| JS 文件 | **迁移时同步重构** |
| db/migrations/*.js | **保持 JS**（Sequelize 迁移文件规范） |
| scripts/*.js | **保持 JS**（一次性工具脚本） |

---

## 三、立即执行项（不等迁移）

这些问题存在于现有 TS 文件中，每天都在制造隐患：

### 3.1 修复模块系统混用（🔴 Critical）
**问题：** 所有 `server/services/orders/*.ts` 文件顶部有 `export {}` 占位符，
底部又用 `module.exports = X`，TypeScript 编译器无法正确进行类型检查。

**受影响文件：**
- `server/services/orders/order.service.ts`
- `server/services/orders/order.mapper.ts`
- `server/services/orders/order.repository.ts`
- `server/services/orders/order.policy.ts`
- `server/services/orders/order.query-policy.ts`
- `server/services/orders/order.dedupe.ts`
- `server/app/errors/AppError.ts`

**修复方式：**
```typescript
// 删除底部的 module.exports = X 和顶部的 export {}
// 改为标准 ES6 命名导出或默认导出
export default orderService;
export { serializeOrder, normalizeOrderItemForPersistence };
```

**估时：** 2 小时

### 3.2 前端大文件重构（🟠 High）
这些文件已经是 TS，架构问题现在可以直接处理：

#### Procurement.vue（348 行）— 提取两个 composable

**提取 `useStockInQueue`：**
```typescript
// src/features/procurement/composables/useStockInQueue.ts
export function useStockInQueue(store: ProcurementStore) {
  const stockInOrder = ref<Order | null>(null);
  const stockInDialogOpen = ref(false);
  const stockInSaving = ref(false);
  const stockInQueue = ref<Order[]>([]);
  const stockInQueueIndex = ref(0);
  const stockInQueueCompletedCount = ref(0);

  // openStockInDialog / openStockInQueue / handleStockInOrder / resetStockInFlow
  return { stockInOrder, stockInDialogOpen, stockInSaving, ... };
}
```

**提取 `useProcurementBulkActions`：**
```typescript
// src/features/procurement/composables/useProcurementBulkActions.ts
export function useProcurementBulkActions(store: ProcurementStore, toast: ToastFn) {
  // handleBulkDelete / handleBulkStatusUpdate / handleBulkArrive
  return { handleBulkDelete, handleBulkStatusUpdate, handleBulkArrive };
}
```

**估时：** 4 小时（含测试）

#### useProcurementStore.ts — 统一错误处理
当前部分路径静默吞错，需要统一：
```typescript
// 所有 catch 块统一格式
catch (e: any) {
  const msg = e?.response?.data?.error || e?.message || '未知错误';
  logger.error('fetchOrders failed', { error: msg });
  throw new Error(msg);
}
```
**估时：** 1 小时

### 3.3 确定目标架构蓝图（🟡 设计先行）
在迁移 JS 文件之前，先设计各模块迁移后的目标结构（见第四节）。
**估时：** 已在本文档中完成

---

## 四、目标架构蓝图

### 4.1 后端目录结构（迁移完成后）

```
server/
├── index.ts                        ← 从 index.js 迁移
├── config/
│   ├── database.ts                 ← 从 database.js 迁移 + 加类型
│   ├── env.ts                      ← 从 env.js 迁移 + Zod 验证
│   ├── index.ts                    ← 从 index.js 迁移
│   └── paths.ts                    ← 从 paths.js 迁移
├── app/
│   ├── logger.ts                   ← 从 logger.js 迁移 + 类型
│   ├── errors/
│   │   ├── AppError.ts             ← 已有，修复 module.exports
│   │   └── errorCodes.ts           ← 新增：统一错误码枚举
│   └── middleware/
│       ├── apiKeyAuth.ts           ← 从 apiKeyAuth.js 迁移
│       ├── asyncHandler.ts         ← 从 asyncHandler.js 迁移
│       ├── errorHandler.ts         ← 从 errorHandler.js 迁移
│       └── notFound.ts             ← 从 notFound.js 迁移
├── models/
│   ├── ErpContract.ts              ← 从 ErpContract.js 迁移
│   └── index.ts                    ← 已有
├── routes/
│   ├── index.ts                    ← 从 routes/index.js 迁移
│   ├── api.ts                      ← 从 api.js 迁移
│   ├── order.ts                    ← 从 order.js 迁移（精简到纯路由声明）
│   ├── inventory.ts                ← 从 inventory.js 迁移
│   ├── inventoryReceipts.ts        ← 从 inventoryReceipts.js 迁移
│   ├── material.ts                 ← 从 material.js 迁移
│   ├── contracts.ts                ← 从 contracts.js 迁移
│   ├── pdf.ts                      ← 从 pdf.js 迁移
│   ├── print.ts                    ← 从 print.js 迁移
│   ├── configData.ts               ← 从 configData.js 迁移（拆分）
│   ├── formulasConfig.ts           ← 从 formulasConfig.js 迁移
│   ├── mappingsConfig.ts           ← 从 mappingsConfig.js 迁移
│   └── materialsConfig.ts          ← 从 materialsConfig.js 迁移
├── controllers/                    ← 迁移时将业务逻辑移出
│   ├── order.controller.ts         ← 从 order.controller.js 迁移（仅 HTTP 层）
│   ├── inventory.controller.ts     ← 从 inventory.controller.js 迁移
│   └── inventoryReceipt.controller.ts
├── services/
│   ├── ContractCacheService.ts     ← 从 .js 迁移 + 加类型
│   ├── erpService.ts               ← 从 .js 迁移 + 加类型
│   ├── pdfGenerator.ts             ← 从 .js 迁移 + 加类型
│   ├── printSnapshotStore.ts       ← 从 .js 迁移 + 加类型
│   ├── renderBaseUrl.ts            ← 从 .js 迁移
│   ├── orders/                     ← 已有，修复 module.exports
│   ├── formulas/                   ← 已有
│   ├── inventory/                  ← 已有
│   ├── mappings/
│   │   ├── mapping.adapter.ts      ← 从 .js 迁移
│   │   └── ...                     ← 已有 TS 文件
│   └── materials/                  ← 已有
├── db/
│   ├── migrate.ts                  ← 从 migrate.js 迁移（可选）
│   └── migrations/                 ← 保持 .js（规范，加 JSDoc 即可）
└── scripts/                        ← 保持 .js（一次性工具）
```

### 4.2 路由层目标规范（迁移后每个路由文件的格式）

```typescript
// server/routes/order.ts （目标格式）
import { Router } from 'express';
import { asyncHandler } from '../app/middleware/asyncHandler';
import { validateRequest } from '../app/middleware/validateRequest';
import { orderCreateSchema, orderUpdateSchema } from '../validators/order.validators';
import * as orderController from '../controllers/order.controller';

const router = Router();

// 路由文件只做声明：HTTP方法 + 路径 + 中间件 + controller
router.get('/',           asyncHandler(orderController.listOrders));
router.get('/:id',        asyncHandler(orderController.getOrder));
router.post('/',          validateRequest(orderCreateSchema), asyncHandler(orderController.createOrder));
router.put('/:id',        validateRequest(orderUpdateSchema), asyncHandler(orderController.updateOrder));
router.delete('/:id',     asyncHandler(orderController.deleteOrder));
router.put('/:id/status', asyncHandler(orderController.updateOrderStatus));
router.put('/:id/stock-in', asyncHandler(orderController.stockInOrder));

export default router;
```

**禁止在路由文件中：**
- 直接调用 Service（通过 controller 中转）
- 处理业务逻辑
- 手写内联 try/catch（用 asyncHandler）

### 4.3 Controller 层目标规范

```typescript
// server/controllers/order.controller.ts（目标格式）
import { Request, Response } from 'express';
import { orderService } from '../services/orders/order.service';
import { sendSuccess, sendError } from '../app/http/response';

// Controller 只做：解析 HTTP 请求 → 调用 Service → 格式化 HTTP 响应
export async function listOrders(req: Request, res: Response) {
  const query = req.query as ProcurementOrderQuery;
  const result = await orderService.getPaginatedOrders(query);
  sendSuccess(res, result);
}

export async function getOrder(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id) return sendError(res, 400, 'INVALID_ID');
  const order = await orderService.getOrderById(id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND');
  sendSuccess(res, order);
}
```

### 4.4 OrderService 目标拆分

当前 477 行的 `order.service.ts` 迁移后拆为：

```
server/services/orders/
├── order.service.ts          ← 精简到 CRUD，<200行
├── order.idempotency.ts      ← 幂等键管理（reserveKey/releaseKey）
├── order.dedupe.ts           ← 去重检测（已有，整合）
├── order.stockin.ts          ← 入库工作流（已有，整合）
├── order.repository.ts       ← 数据访问层
├── order.mapper.ts           ← 序列化/反序列化
├── order.policy.ts           ← 业务规则（状态机等）
├── order.query-policy.ts     ← 查询策略（facets/filter/risk）
└── order.errors.ts           ← 错误定义
```

### 4.5 前端 Procurement.vue 目标结构

```
src/features/procurement/composables/
├── useProcurementRouteQuery.ts    ← 已有 ✅
├── useProcurementBulkActions.ts   ← 待提取（从 Procurement.vue）
├── useStockInQueue.ts             ← 待提取（从 Procurement.vue）
├── useOrderActions.ts             ← 已有 ✅
└── useProcurementPageState.ts     ← 已有（待完善）

src/views/Procurement.vue          ← 目标 <150 行（仅模板 + 组合调用）
```

---

## 五、迁移执行计划

### Phase 0：立即执行（本周，不阻塞迁移）
| 任务 | 文件 | 估时 | 优先级 |
|------|------|------|--------|
| 修复 `module.exports` 混用 | 7 个 TS 文件 | 2h | 🔴 |
| 提取 `useStockInQueue` | Procurement.vue | 3h | 🟠 |
| 提取 `useProcurementBulkActions` | Procurement.vue | 2h | 🟠 |
| 统一 useProcurementStore 错误处理 | store.ts | 1h | 🟡 |

---

### Phase 1：基础设施层迁移（优先，无业务耦合）

迁移顺序以依赖关系决定，被依赖的先迁移。

#### 1-A：中间件（4 文件，83 行，无依赖）
| 文件 | 目标 | 重构要点 |
|------|------|----------|
| `asyncHandler.js` | `asyncHandler.ts` | 加 `RequestHandler` 泛型类型 |
| `apiKeyAuth.js` | `apiKeyAuth.ts` | 加 `Request`/`Response` 类型，错误用 `AppError` |
| `errorHandler.js` | `errorHandler.ts` | 识别 `AppError` 类型，规范响应格式 |
| `notFound.js` | `notFound.ts` | 使用 `AppError(404, 'NOT_FOUND')` |

#### 1-B：配置层（4 文件，140 行）
| 文件 | 目标 | 重构要点 |
|------|------|----------|
| `env.js` | `env.ts` | 用 Zod 验证环境变量，`process.env` 全部在此收口 |
| `database.js` | `database.ts` | 导出类型化的 `sequelize` 实例 |
| `config/index.js` | `config/index.ts` | 用 `as const` 固化配置类型 |
| `paths.js` | `paths.ts` | 加路径类型，`ensureDir` 加 `async` 签名 |

#### 1-C：Logger（1 文件，26 行）
| 文件 | 目标 | 重构要点 |
|------|------|----------|
| `logger.js` | `logger.ts` | 导出 `Logger` 类型，加上下文类型 `LogContext` |

---

### Phase 2：Model 层补全

#### 2-A：ErpContract 模型（1 文件，59 行）
| 文件 | 目标 | 重构要点 |
|------|------|----------|
| `models/ErpContract.js` | `models/ErpContract.ts` | 加 `ErpContractAttributes` 接口，与其他 model 风格统一 |

---

### Phase 3：Service 层迁移（按依赖顺序）

#### 3-A：工具类 Service（无跨模块依赖）
| 文件 | 目标 | 重构要点 | 估时 |
|------|------|----------|------|
| `renderBaseUrl.js` | `renderBaseUrl.ts` | 加 `Request` 类型，纯函数 | 30min |
| `erpService.js` | `erpService.ts` | 加响应类型，axios 错误统一处理 | 1h |
| `printSnapshotStore.js` | `printSnapshotStore.ts` | 加 `Snapshot` 类型，TTL 策略类型化 | 1h |

#### 3-B：PDF 生成（依赖 renderBaseUrl + printSnapshotStore）
| 文件 | 目标 | 重构要点 | 估时 |
|------|------|----------|------|
| `pdfGenerator.js` | `pdfGenerator.ts` | 加 `GeneratePdfOptions` 类型，Puppeteer 错误处理 | 1.5h |

#### 3-C：合同缓存 Service
| 文件 | 目标 | 重构要点 | 估时 |
|------|------|----------|------|
| `ContractCacheService.js` | `ContractCacheService.ts` | 加 `CachedContract` 类型，SHA256 hash 类型化 | 1.5h |

#### 3-D：Mapping Adapter（依赖 TS 的 mapping 服务）
| 文件 | 目标 | 重构要点 | 估时 |
|------|------|----------|------|
| `mappings/mapping.adapter.js` | `mappings/mapping.adapter.ts` | 加输入/输出类型，与 `MappingProfile` model 对齐 | 2h |

---

### Phase 4：Controller 层迁移 + 重构

**重构目标：** Controller 只做 HTTP 层，不含业务逻辑

#### 4-A：Order Controller
| 文件 | 目标 | 重构要点 | 估时 |
|------|------|----------|------|
| `controllers/order.controller.js` | `order.controller.ts` | 拆分为 `listOrders/getOrder/createOrder/...`，每个函数 <15 行，业务逻辑全部下移 service | 2h |

#### 4-B：Inventory Controllers
| 文件 | 目标 | 重构要点 | 估时 |
|------|------|----------|------|
| `controllers/inventory.controller.js` | `inventory.controller.ts` | 同上 | 1h |
| `controllers/inventory-receipt.controller.js` | `inventoryReceipt.controller.ts` | 同上 | 1h |

---

### Phase 5：Route 层迁移 + 精简

**重构目标：** 路由文件只做声明，不含逻辑

迁移顺序（按依赖复杂度从低到高）：

| 优先级 | 文件 | 行数 | 目标格式 | 估时 |
|--------|------|------|----------|------|
| 5-1 | `inventory.js` | 27 | 纯路由声明 | 30min |
| 5-2 | `inventoryReceipts.js` | 36 | 纯路由声明 | 30min |
| 5-3 | `material.js` | 36 | 纯路由声明 | 30min |
| 5-4 | `contracts.js` | 81 | 纯路由声明 + 缓存 service 注入 | 1h |
| 5-5 | `print.js` | 83 | 纯路由声明 | 1h |
| 5-6 | `order.js` | 59 | 纯路由声明 | 1h |
| 5-7 | `mappingProfile.routeFactory.js` | 88 | 工厂函数类型化 | 1h |
| 5-8 | `pdf.js` | 197 | 拆分快照/PDF 逻辑，加类型 | 2h |
| 5-9 | `materialsConfig.js` | 88 | 纯路由声明 | 1h |
| 5-10 | `formulasConfig.js` | 183 | 拆分为 formula.controller.ts | 2h |
| 5-11 | `mappingsConfig.js` | 172 | 拆分为 mapping.controller.ts | 2h |
| 5-12 | `configData.js` | 255 | 拆分为多个 controller，最复杂 | 3h |
| 5-13 | `api.js` | 76 | 路由聚合器 | 30min |
| 5-14 | `routes/index.js` | 42 | 路由聚合器 | 30min |

---

### Phase 6：入口文件迁移（最后）
| 文件 | 目标 | 重构要点 | 估时 |
|------|------|----------|------|
| `server/index.js` | `server/index.ts` | 加启动类型，DB 初始化类型化，graceful shutdown | 1h |

---

### Phase 7：TS 专项优化（迁移完成后）

只有全部迁移完，才能做这些改动（需要所有调用方都是 TS）：

| 任务 | 描述 | 估时 |
|------|------|------|
| 强类型化 WHERE clause | 替换 `LooseWhere = Record<string, unknown>` | 2h |
| 环境变量 Zod schema | 启动时验证所有 env var | 2h |
| 统一错误码枚举 | `OrderErrorCode`、`InventoryErrorCode` 枚举 | 2h |
| 前后端共享 Category 常量 | 消除品类归一化重复 | 3h |
| `total_amount` DB 持久化 | 消除每次 O(n) 实时重算 | 3h |
| Zod 请求体 schema | 替换现有 Joi-style validators | 4h |

---

## 六、迁移质量守则

### 每个文件迁移的完成标准（Definition of Done）

- [ ] 文件扩展名改为 `.ts`
- [ ] 无 `any` 类型（除有注释说明的豁免）
- [ ] 无 `module.exports`（全部改为 ES6 `export`）
- [ ] 无内联 `require()`（全部改为 `import`）
- [ ] 函数有完整的入参/返回值类型
- [ ] 错误使用 `AppError` 而非 `new Error('string')`
- [ ] 通过 `npx tsc --noEmit` 无报错
- [ ] 对应的 `.test.js` 仍然通过（或同步迁移为 `.test.ts`）

### 禁止的反模式

```typescript
// ❌ 禁止
export {};
module.exports = something;
const x: any = ...;
throw new Error('ORDER_NOT_FOUND');

// ✅ 正确
export default something;
export { namedExport };
const x: SpecificType = ...;
throw new AppError(OrderErrorCode.NOT_FOUND, { id });
```

---

## 七、工时汇总

| Phase | 描述 | 估时 |
|-------|------|------|
| Phase 0 | 立即修复（现有 TS 问题） | 8h |
| Phase 1 | 基础设施迁移（middleware/config/logger） | 4h |
| Phase 2 | Model 层补全 | 1h |
| Phase 3 | Service 层迁移 | 7h |
| Phase 4 | Controller 层迁移 | 4h |
| Phase 5 | Route 层迁移 | 16h |
| Phase 6 | 入口文件迁移 | 1h |
| Phase 7 | TS 专项优化 | 16h |
| **总计** | | **~57h（约 7–8 个工作日）** |

---

## 八、风险与注意事项

### 风险 1：tsx/cjs 依赖
当前测试使用 `node --require tsx/cjs` 运行，直接支持 TS 文件的 require()。
迁移后只需确保测试命令不变，无需额外配置。

### 风险 2：db/migrations 保持 JS
Sequelize 迁移文件**不迁移 TS**，原因：
- 迁移文件是历史记录，不应修改
- 新的迁移文件继续用 JS 编写（保持一致性）
- 加 JSDoc 注释作为类型说明即可

### 风险 3：scripts/ 保持 JS
`server/scripts/` 下的 6 个脚本是一次性数据工具，不在应用程序运行路径上，保持 JS 即可。

### 风险 4：循环依赖
迁移时注意 `services/orders/` 内部可能出现的循环依赖（service.ts 引用 repository.ts，repository.ts 引用 model，model 定义在 models/）。
使用 `madge` 检测：
```bash
npx madge --circular server/
```

### 风险 5：测试先行
每迁移一个文件，**先运行测试确认未破坏**：
```bash
node --require tsx/cjs --test --test-concurrency=1 "tests/**/*.test.js"
npx tsx --test "tests/**/*.test.ts"
```

---

## 九、进度追踪

迁移完成后，在此更新各文件状态：

### Phase 0（立即修复）
- [ ] order.service.ts — 修复 module.exports
- [ ] order.mapper.ts — 修复 module.exports
- [ ] order.repository.ts — 修复 module.exports
- [ ] order.policy.ts — 修复 module.exports
- [ ] order.query-policy.ts — 修复 module.exports
- [ ] order.dedupe.ts — 修复 module.exports
- [ ] AppError.ts — 修复 module.exports
- [ ] Procurement.vue — 提取 useStockInQueue
- [ ] Procurement.vue — 提取 useProcurementBulkActions
- [ ] useProcurementStore.ts — 统一错误处理

### Phase 1（基础设施）
- [ ] app/middleware/asyncHandler.ts
- [ ] app/middleware/apiKeyAuth.ts
- [ ] app/middleware/errorHandler.ts
- [ ] app/middleware/notFound.ts
- [ ] config/env.ts
- [ ] config/database.ts
- [ ] config/index.ts
- [ ] config/paths.ts
- [ ] app/logger.ts

### Phase 2（Models）
- [ ] models/ErpContract.ts

### Phase 3（Services）
- [ ] services/renderBaseUrl.ts
- [ ] services/erpService.ts
- [ ] services/printSnapshotStore.ts
- [ ] services/pdfGenerator.ts
- [ ] services/ContractCacheService.ts
- [ ] services/mappings/mapping.adapter.ts

### Phase 4（Controllers）
- [ ] controllers/order.controller.ts
- [ ] controllers/inventory.controller.ts
- [ ] controllers/inventoryReceipt.controller.ts

### Phase 5（Routes）
- [ ] routes/inventory.ts
- [ ] routes/inventoryReceipts.ts
- [ ] routes/material.ts
- [ ] routes/contracts.ts
- [ ] routes/print.ts
- [ ] routes/order.ts
- [ ] routes/mappingProfile.routeFactory.ts
- [ ] routes/pdf.ts
- [ ] routes/materialsConfig.ts
- [ ] routes/formulasConfig.ts
- [ ] routes/mappingsConfig.ts
- [ ] routes/configData.ts
- [ ] routes/api.ts
- [ ] routes/index.ts

### Phase 6（Entry）
- [ ] server/index.ts

### Phase 7（TS 专项优化）
- [ ] LooseWhere → 强类型 WHERE clause
- [ ] 环境变量 Zod schema
- [ ] 统一错误码枚举
- [ ] 品类常量前后端共享
- [ ] total_amount DB 持久化
- [ ] Zod 请求体 schema

---

*文档版本：v1.0 | 制定于 2026-03-18*
