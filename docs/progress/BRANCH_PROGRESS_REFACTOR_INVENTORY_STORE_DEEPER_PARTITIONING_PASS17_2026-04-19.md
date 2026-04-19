# Branch Progress — refactor/inventory-store-deeper-partitioning-pass17 (2026-04-19)

> 状态：阶段性总结文档。
> 分支：`refactor/inventory-store-deeper-partitioning-pass17`
> 用途：记录 Inventory deeper partitioning 第十七刀已完成的范围、验证证据，以及是否适合在当前点停下来做封板判断。

---

## 1. 分支目标

在 reverse/detail wrapper 已退役后，继续去掉 `Inventory.vue` 中针对 owner composable state 的本地 alias 层。

并保持：
- 页面行为不变
- 交互逻辑不变
- 小步、可回滚、易验证

---

## 2. 本轮已完成内容

### 2.1 计划文档
- `docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS17_2026-04-19.md`

### 2.2 已完成的切口
修改：
- `src/views/Inventory.vue`
- `tests/inventory-view-guard.test.ts`

### 2.3 结构结果
- `Inventory.vue` 不再保留 reverse/detail state 的本地 alias 常量
- 模板现在直接绑定 owner composable 提供的原始字段/方法名
- view 层少了一层纯转发命名中转

这让 view 不再承担额外的绑定包装责任，也让 composable owner 与模板绑定边界更直接。

---

## 3. 相对 main 的提交

- `1c61cfc` — 删除 view 层本地 alias 中转

---

## 4. 验证证据

### 已通过
- `npm run type-check` ✅
- `npm run type-check:server` ✅
- `node --require tsx/cjs --test --test-concurrency=1 tests/inventory-view-guard.test.ts tests/inventory-receipt-flow.test.ts tests/inventory-receipt-route-state.test.ts tests/inventory-route.test.ts tests/governance-boundary-guard.test.ts` ✅
- `npm test` ✅
- `npm run build` ✅

---

## 5. 当前是否适合停一下

**适合。**

原因：
1. 当前切片完整且边界清晰
2. 全量门禁已通过
3. deeper partitioning 继续保持在一个可 review 的小切口内
4. 如果继续同时处理更多 regrouping 面，会明显扩大本轮范围

---

## 6. 当前建议

### 建议
> **现在封板 / merge。**

理由：
- 当前已经形成自然阶段点
- Inventory 线继续稳定拿到 owner/view binding 收束收益
- 更稳妥的方式是先把这轮成果并回 `main`，再根据最新状态决定是否继续留在 Inventory 或重新评估主线
