# Repo Health Baseline (2026-04-16)

> 分支：`fix/week1-health-baseline`
> 目的：记录 Week 1 健康基线修复前后的门禁状态与本轮修复范围。

---

## 修复前基线

### 通过
- `npm run type-check`
- `npm run build`

### 失败
- `npm run type-check:server`
- `npm test`

### 失败分类

1. **server TS 边界 / 配置问题**
   - `tsconfig.server.json` 无法覆盖当前实际共享依赖
   - `src/*` 共享代码在 server type-check 下出现路径、模块模式和声明问题

2. **订单更新 DTO / validator 漂移**
   - `OrderUpdateInput` 缺少 `order_no`
   - update validator 未覆盖 `order_no`
   - `order.service.ts` 直接使用该字段

3. **模板 /脚本类型问题**
   - `order.template.ts` 中间态对象类型过窄
   - `audit_po_quantity_history.ts` 与 source-analysis / packagingConfig 类型对接不稳定

4. **stale guard**
   - `tests/config-table-guard.test.ts` 仍锁定旧的 lock-config 试跑 UI 命名

5. **print E2E harness 问题**
   - `tests/print-document-customer-name.e2e.test.ts` 通过 `npm run dev` 传参启动 4175 端口，但 `scripts/dev.mjs` 不透传 `--host/--port`

---

## 本轮修复范围

涉及文件：

- `tsconfig.server.json`
- `server/models/types.ts`
- `server/validators/order.validators.ts`
- `server/services/orders/order.service.ts`
- `server/services/orders/order.template.ts`
- `server/scripts/audit_po_quantity_history.ts`
- `src/services/mappings/mappingAdapter.ts`
- `src/services/mappings/mappingValidator.ts`
- `src/types/shared-mappings.d.ts`
- `tests/config-table-guard.test.ts`
- `tests/print-document-customer-name.e2e.test.ts`

### 关键修复点

1. 补齐 `type-check:server` 对 `@/*` 和 shared `.mjs` 共享代码的检查边界
2. 让订单 update DTO、validator 与 service 的真实契约重新一致
3. 收窄 `order.template.ts` 与 audit 脚本中的中间态类型问题
4. 用 `@ts-ignore` + 本地声明文件兜住 shared `.mjs` 的无类型导入
5. 把 lock-config guard 从旧试跑变量名切到当前 `RuleExplainPlayground` 语义
6. 把 print e2e 从 `npm run dev` 改为 `npm run dev:web`，修复端口透传失效导致的 `ERR_CONNECTION_REFUSED`

---

## 修复后基线

### 全部通过

```bash
npm run type-check
npm run type-check:server
npm test
npm run build
```

### 当前结果

- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `npm test` ✅（435 pass / 0 fail / 1 skip）
- `npm run build` ✅

---

## 结论

Week 1 的健康基线已经恢复到**可信可执行状态**：

1. 前后端类型门禁均可作为后续重构反馈地面
2. 已知的 stale guard 与 print harness 问题已清掉
3. 可以进入下一阶段：
   - 运行时契约收口
   - 或 `Inventory.vue` / `OrderService` 等热点结构重构
