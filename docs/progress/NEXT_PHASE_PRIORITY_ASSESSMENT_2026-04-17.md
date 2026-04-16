# Next Phase Priority Assessment (2026-04-17)

> 状态：当前决策文档。
> 用途：在 `main` 已恢复稳定、多个热点已完成阶段治理后，对下一阶段继续优化的主线做收益排序。

---

## 1. 候选主线

当前最现实的三个继续方向是：

1. **Inventory 状态层继续治理**
2. **Order lifecycle 更深层收口**
3. **Source-analysis deeper normalization**

---

## 2. 当前客观状态

### Inventory
核心热点已经明显下降：

- `src/views/Inventory.vue` 已收口为更接近页面装配壳
- `src/stores/useInventoryStore.ts` 当前约 **376 行**
- query / export helpers 已下沉

说明：
- 仍然可以继续收 store complexity
- 但它已经不是“最危险热点”

### Order lifecycle
- `server/services/orders/order.service.ts` 当前约 **563 行**
- 仍是后端主域中心 service
- 已完成两轮低风险收口，但剩余：
  - `bulkMarkArrived`
  - `deleteOrder`
  - 更深的 lifecycle / contract 整理

说明：
- 仍然是最直接影响后端主业务可维护性的热点
- 前面已经有 helper / create / update / stock-in 的铺垫，继续推进最顺

### Source-analysis
- `src/services/sourceAnalysis.ts` 当前约 **91 行**
- `dataExtractors.ts` 已经退化为纯聚合出口
- extractor 已拆分、局部类型已收紧、shared types 第一轮已完成

说明：
- 这条线已经从“高风险重构对象”转成“可以继续精修但并不急迫”的状态
- 如果继续做，会开始进入更深层抽象与契约统一，收益不会像前面那样立竿见影

---

## 3. 收益排序

### 第一优先：Order lifecycle 更深层收口
**推荐作为下一轮主线。**

原因：

1. 订单域仍然是后端核心业务流中心
2. 当前 `order.service.ts` 仍比其它剩余热点更集中
3. 前两轮收口已经把继续推进的地面铺好
4. 继续做第三轮，review 成本和收益比最好

### 第二优先：Inventory 状态层继续治理
适合作为第二选择。

原因：
- 仍有继续瘦身空间
- 但当前风险和收益都已经低于 Order lifecycle

### 第三优先：Source-analysis deeper normalization
适合作为第三选择。

原因：
- 现在更多是“质量提升型深化”，不是“明显热点拆雷”
- 需要更谨慎地控制抽象上升

---

## 4. 推荐执行方式

### 推荐新主线
> **Order lifecycle pass 3**

建议新分支方向：
- `refactor/order-lifecycle-pass3`

### 建议先写计划，再动代码
优先围绕：
- `bulkMarkArrived`
- `deleteOrder`
- 更稳定的 order lifecycle shared contracts / error shaping

并继续保持：
- 小步收口
- 先验证再扩展
- 不改变现有 API contract

---

## 5. 一句话结论

> **现在最值得继续投入的一轮优化，是订单生命周期更深层收口，而不是继续沿 Inventory 或 source-analysis 惯性深挖。**

