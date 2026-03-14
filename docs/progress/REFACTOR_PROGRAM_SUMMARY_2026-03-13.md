# 可维护性与可扩展性治理阶段总结（2026-03-13）

> 状态：现行参考文档。
> 用途：作为 Week 1-8 治理阶段的结果总结与阅读入口。

## 1. 本轮完成了什么

这轮治理不是重写业务，而是把当前仓库从“局部可运行但边界持续膨胀”的状态，推进到“多数高风险域已有稳定分层样板”的状态。

当前已经完成的主线包括：

1. Week 1：建立共享契约落点，并用 Procurement 做前端低风险拆分样板。
2. Week 2：把订单后端从单体 `OrderService` 拆成 policy / mapper / repository / stock-in / service 结构。
3. Week 3：为订单域建立 `route -> controller -> service`、统一错误抽象和请求校验落点。
4. Week 4：把订单域模式复制到 inventory 域，收敛页面编排、receipt service 和 HTTP 层。
5. Week 5：抽出 mappings 共享规则核心，结束前后端长期双份核心规则实现。
6. Week 6：收敛 `useFormulaManager`，并建立数据库 migration 正式基线。
7. Week 7：收敛 materials / source-analysis runtime 链路，补齐页面状态、workflow 和材料管理页面状态。
8. Week 8：把治理约束沉淀成 compatibility shell 退场清单、guard 和落位指南。

## 2. 为什么按这个顺序推进

这轮顺序不是按业务优先级排，而是按“治理收益 / 风险 / 可复制性”排。

1. 先做 Procurement，是因为它能提供前端样板，但不会直接冲击订单主流程。
2. 再拆 OrderService，是因为订单后端是核心复杂度中心，不先拆它，后面的 controller 化和 inventory 复制模式都不稳。
3. 再做 controller / validation，是因为 service 先稳定，HTTP 层才适合收口。
4. inventory 放在订单后面，是为了复制已验证模式，而不是再探索一套新拆法。
5. mappings 放在中段，是为了在 formulas/materials 扩展前先收口双端重复规则。
6. formulas 和 migration 放在同一周，是因为一边解决前端 manager 膨胀，一边解决 schema 演进失控。
7. source-analysis 放在较后位置，是因为它更像边界整理和 runtime 收口，需要前面几周先建立方法论。
8. 最后做 Week 8，是把前七周已经证实有效的做法固化成长期门禁。

## 3. 当前最关键收益

最关键的收益不是“代码变少”，而是结构风险开始可控：

1. 订单和 inventory 已经有可复用的后端分层样板。
2. 前端已经形成“页面装配 -> page state / flow composable -> model / service”的收敛路径。
3. shared 和 mappings 核心层开始承担真实复用，而不是只停留在规划。
4. migration 已从启动补丁转向正式目录和基线测试。
5. compatibility shell、浏览器副作用边界、配置真源边界已经进入治理文档和自动 guard。

## 4. 还未完全收口的高风险项

当前仍需谨慎对待的地方：

1. 多个周清单仍是 `in_progress`，因为还没有统一补全 `npm test` / `npm run build` / 更广泛 smoke 验证。
2. compatibility shell 已被文档化，但还没有真正开始删除。
3. `MaterialManagement.vue` 目前只完成页面状态收敛，还没继续抽 API/normalizer。
4. source-analysis 和 config runtime 已经分层，但还没有更完整的 store/page 行为测试。
5. formulas 后端入口虽然已有模块化基础，但尚未做和订单/inventory 同等级别的 HTTP 层统一。

## 5. 如果资源有限，后续怎么裁剪

如果后续资源有限，建议优先保住以下成果，不要回退：

1. 保住 Week 2-4 的后端分层和请求校验模式。
2. 保住 Week 5 的 shared rule 单一来源。
3. 保住 Week 6 的 migration 基线。
4. 保住 Week 8 的 guard 和治理文档。

可以延后但不建议回退的部分：

1. materials / source-analysis 更深层的 API / normalizer 收口
2. formulas 后端进一步统一
3. compatibility shell 的真正删除

## 6. 下一阶段建议

如果继续推进，建议按下面顺序进入下一阶段：

1. 先补全更统一的全量验收：`type-check`、`test`、`build`、关键主链路 smoke。
2. 再挑一个域做 compatibility shell 真正退场试点。
3. 之后再考虑后端渐进式 TypeScript 试点或扩大 migration 覆盖面。
