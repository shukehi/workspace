# Config Center Review Follow-up (2026-04-21)

> 状态：当前执行计划。
> 分支：`fix/config-center-review-followup`
> 范围：仅修复 config center review 中确认的两个小问题，不扩展重构范围。

---

## 1. 背景

`docs/governance/CONFIG_CENTER_REVIEW_CHECKLIST_2026-04-21.md` 对当前 unified config platform 做 review 后，确认没有阻断性缺陷，但存在两个应尽快修复的问题：

1. `supplier-master` detail 读取路径存在重复 seed / 聚合尝试
2. handoff / delivery summary 对 `material_catalog` fallback 现状描述过于乐观

---

## 2. 本轮目标

只做两件事：

1. 去掉 `getSupplierMasterDetail()` 中重复的 seed 路径，减少重复聚合与噪音日志
2. 让 config-center handoff / summary 文档准确反映当前 runtime + profile fallback + materials static fallback 的真实状态

---

## 3. 本轮不做的事

1. 不扩大为新的 config-center 重构阶段
2. 不修改 unified route 协议或数据结构
3. 不调整 runtime snapshot 的 fail-open / fail-closed 语义
4. 不清理其他历史文档
5. 不新增依赖

---

## 4. 推荐切口

建议在：
- `server/services/config-platform/supplier-master.ts`
- `docs/governance/CONFIG_CENTER_REFACTOR_DELIVERY_SUMMARY_2026-04-21.md`
- `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
- `docs/README.md`

如需要，补一个最小测试以锁定 supplier-master detail 不再重复 seed。

---

## 5. 完成标准

至少满足：

1. `getSupplierMasterDetail()` 不再重复触发 seed / 聚合逻辑
2. 相关定向测试继续通过
3. governance / handoff 文档与当前实现一致
4. diff 仍然保持小、清晰、可 review

---

## 6. 验证

至少执行：

```bash
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 tests/config-profile-routes.test.ts tests/runtime-config-route.test.ts tests/config-endpoint-source-guard.test.ts
```
