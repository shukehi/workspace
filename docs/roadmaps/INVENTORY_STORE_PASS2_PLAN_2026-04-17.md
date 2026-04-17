# Inventory Store / State Pass 2 Plan (2026-04-17)

> 状态：当前执行计划。
> 分支：`refactor/inventory-store-pass2`
> 范围：继续收口 `useInventoryStore.ts`，优先下沉重复的分页/抓全量逻辑，但不改变现有 API contract 或页面行为。

---

## 1. 背景

Inventory 前端已经完成过：

- 页面状态抽离
- tab 组件化
- detail panel / reverse dialog 协调层抽离
- query / export helper 下沉

当前剩余主要热点集中在：
- `src/stores/useInventoryStore.ts`

该 store 仍同时承载：
- receipt / outbound / movement 多类分页请求
- 全量分页抓取循环
- location / outbound / receipt 请求编排

---

## 2. 本轮目标

本轮优先把 **重复且低风险** 的 store 逻辑下沉，使 `useInventoryStore.ts` 更聚焦于：

- 响应式 state 容器
- API flow orchestration

优先顺序：

1. 分页响应归一化 helper
2. “抓全量分页”循环 helper
3. 如果前两项顺利，再看是否继续收 location / outbound API flow

---

## 3. 本轮不做的事

1. 不改页面行为
2. 不改 API 返回形态
3. 不改 Inventory domain contract
4. 不重做 store 分片架构
5. 不引入新依赖

---

## 4. 推荐第一刀

建议新增一个轻量 helper 模块，例如：
- `src/features/inventory/inventoryStorePaging.ts`

优先承接：
- paged response 归一化
- fetch-all pages 循环

说明：
- 这一刀只收重复逻辑，不改业务语义
- 是 pass 2 最稳的起手

---

## 5. 完成标准

至少满足：

1. `useInventoryStore.ts` 中 receipt / outbound / movement 的重复分页逻辑下降
2. 全量抓取 receipts / outbounds 的循环不再内联在 store 中
3. 定向测试继续通过
4. 全量门禁保持全绿

---

## 6. 验证

至少执行：

```bash
npm run type-check
npm run type-check:server
npm test -- tests/inventory-view-guard.test.ts
npm test -- tests/inventory-receipt-flow.test.ts
npm test -- tests/inventory-receipt-route-state.test.ts
npm test -- tests/inventory-route.test.ts
npm test -- tests/governance-boundary-guard.test.ts
npm test
npm run build
```
