# Docs Index

`docs/` 目前按“长期规范 / 路线图 / 进度 / 参考资料 / 历史归档 / 主题文档”分层。

## 快速查找

如果主要目的是为了快速定位开发资料，可按下面顺序查找：

1. **先看根目录 `README.md`**
   - 项目是什么
   - 怎么启动
   - 怎么验证
   - 文档总入口在哪
2. **再看当前文件 `docs/README.md`**
   - 当前该看哪类文档
   - 当前执行计划在哪
   - 历史文档在哪
3. **再按任务类型进入对应目录**
   - 改代码结构 / 做重构：`docs/roadmaps/`
   - 确认长期规范：`docs/governance/`
   - 查当前业务规则 / API / 字段契约：`docs/reference/`
   - 看当前阶段结果：`docs/progress/`
   - 查历史方案 / 历史进度：`docs/archive/`
   - 查问题背景 / 变更原因：`docs/issues/`
   - 查设计方向：`docs/design/`

一句话记忆：

> 根目录 `README.md` 看入口，`docs/README.md` 看导航，`roadmaps` 看计划，`governance` 看规范，`reference` 看规则，`archive` 看历史。

## governance

长期有效的开发规范、接入规则、PR 检查和退场策略。

当前优先阅读顺序：

1. 边开发边生产使用安全约束：`LIVE_DEVELOPMENT_PRODUCTION_SAFETY_2026-03-13.md`
2. 改库前一页式检查：`DB_CHANGE_CHECKLIST_2026-03-13.md`
3. 本地开发数据保护规则：`LOCAL_DEVELOPMENT_DATA_SAFETY_2026-03-13.md`
4. 当前阶段架构护栏：`CURRENT_ARCHITECTURE_GUARDRAILS_2026-03-13.md`
5. 前后端/数据库通用约束：`ENGINEERING_CONVENTIONS.md`
6. 页面、store、配置域、请求校验、兼容层放置规则：`FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md`
7. 合并前自检清单：`PR_FEATURE_CHECKLIST_2026-03-10.md`

- [LIVE_DEVELOPMENT_PRODUCTION_SAFETY_2026-03-13.md](/Users/aries/Dve/workspace/docs/governance/LIVE_DEVELOPMENT_PRODUCTION_SAFETY_2026-03-13.md)
- [DB_CHANGE_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/governance/DB_CHANGE_CHECKLIST_2026-03-13.md)
- [LOCAL_DEVELOPMENT_DATA_SAFETY_2026-03-13.md](/Users/aries/Dve/workspace/docs/governance/LOCAL_DEVELOPMENT_DATA_SAFETY_2026-03-13.md)
- [CURRENT_ARCHITECTURE_GUARDRAILS_2026-03-13.md](/Users/aries/Dve/workspace/docs/governance/CURRENT_ARCHITECTURE_GUARDRAILS_2026-03-13.md)
- [ENGINEERING_CONVENTIONS.md](/Users/aries/Dve/workspace/docs/governance/ENGINEERING_CONVENTIONS.md)
- [FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md](/Users/aries/Dve/workspace/docs/governance/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md)
- [PR_FEATURE_CHECKLIST_2026-03-10.md](/Users/aries/Dve/workspace/docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md)
- [COMPATIBILITY_SHELL_RETIREMENT_2026-03-13.md](/Users/aries/Dve/workspace/docs/governance/COMPATIBILITY_SHELL_RETIREMENT_2026-03-13.md)
- [FEATURE_PLACEMENT_GUIDE_2026-03-13.md](/Users/aries/Dve/workspace/docs/governance/FEATURE_PLACEMENT_GUIDE_2026-03-13.md)
- [LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md](/Users/aries/Dve/workspace/docs/governance/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md)
- [DOCUMENT_STATUS_CONVENTIONS.md](/Users/aries/Dve/workspace/docs/governance/DOCUMENT_STATUS_CONVENTIONS.md)
- [CSS_GOVERNANCE_CHECKLIST.md](/Users/aries/Dve/workspace/docs/governance/CSS_GOVERNANCE_CHECKLIST.md)
- [GIT_GUIDE.md](/Users/aries/Dve/workspace/docs/governance/GIT_GUIDE.md)
- [STYLE_CONSTRAINTS_NEW_YORK.md](/Users/aries/Dve/workspace/docs/governance/STYLE_CONSTRAINTS_NEW_YORK.md)

## roadmaps

阶段性改造计划、任务拆分和迁移路线图。

阅读提示：

1. `roadmaps/` 下同时包含进行中计划、已完成阶段计划和历史阶段文档。
2. 阅读前请先看每份文档顶部的状态说明，不要仅凭目录判断其是否仍代表当前依据。

### 当前执行入口

- [REFACTOR_EXECUTION_PLAN_V1_2026-04-16.md](/Users/aries/Dve/workspace/docs/roadmaps/REFACTOR_EXECUTION_PLAN_V1_2026-04-16.md)
  — 当前优先执行的重构总路线图
- [WEEK1_HEALTH_BASELINE_EXECUTION_2026-04-16.md](/Users/aries/Dve/workspace/docs/roadmaps/WEEK1_HEALTH_BASELINE_EXECUTION_2026-04-16.md)
  — 当前优先执行的 Week 1 施工图
- [INVENTORY_PAGE_REFACTOR_PLAN_2026-04-16.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_PAGE_REFACTOR_PLAN_2026-04-16.md)
  — Inventory 页面第一轮收口计划
- [INVENTORY_STORE_PASS2_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_PASS2_PLAN_2026-04-17.md)
  — Inventory store/state 第二轮收口计划
- [INVENTORY_STORE_PASS3_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_PASS3_PLAN_2026-04-17.md)
  — Inventory store/state 第三轮收口计划
- [INVENTORY_STORE_PASS4_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_PASS4_PLAN_2026-04-17.md)
  — Inventory store/state 第四轮收口计划
- [INVENTORY_STORE_PASS5_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_PASS5_PLAN_2026-04-17.md)
  — Inventory store/state 第五轮收口计划
- [INVENTORY_STORE_PASS6_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_PASS6_PLAN_2026-04-17.md)
  — Inventory store/state 第六轮收口计划
- [INVENTORY_STORE_PASS7_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_PASS7_PLAN_2026-04-17.md)
  — Inventory store/state 第七轮收口计划
- [INVENTORY_STORE_PASS8_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_PASS8_PLAN_2026-04-17.md)
  — Inventory store/state 第八轮收口计划
- [INVENTORY_STORE_PASS9_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_PASS9_PLAN_2026-04-17.md)
  — Inventory store/state 第九轮收口计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PLAN_2026-04-18.md)
  — Inventory store/state 进入 deeper partitioning 阶段后的当前计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS2_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS2_2026-04-18.md)
  — Inventory store/state deeper partitioning 第二刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS3_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS3_2026-04-18.md)
  — Inventory store/state deeper partitioning 第三刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS4_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS4_2026-04-18.md)
  — Inventory store/state deeper partitioning 第四刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS5_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS5_2026-04-18.md)
  — Inventory store/state deeper partitioning 第五刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS6_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS6_2026-04-18.md)
  — Inventory store/state deeper partitioning 第六刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS7_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS7_2026-04-18.md)
  — Inventory store/state deeper partitioning 第七刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS8_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS8_2026-04-18.md)
  — Inventory store/state deeper partitioning 第八刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS9_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS9_2026-04-18.md)
  — Inventory store/state deeper partitioning 第九刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS10_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS10_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS11_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS11_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十一刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS12_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS12_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十二刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS13_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS13_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十三刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS14_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS14_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十四刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS15_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS15_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十五刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS16_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS16_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十六刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS17_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS17_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十七刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS18_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS18_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十八刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS19_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS19_2026-04-19.md)
  — Inventory store/state deeper partitioning 第十九刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS20_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS20_2026-04-19.md)
  — Inventory store/state deeper partitioning 第二十刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS21_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS21_2026-04-19.md)
  — Inventory store/state deeper partitioning 第二十一刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS22_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS22_2026-04-19.md)
  — Inventory store/state deeper partitioning 第二十二刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS23_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS23_2026-04-19.md)
  — Inventory store/state deeper partitioning 第二十三刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS24_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS24_2026-04-19.md)
  — Inventory store/state deeper partitioning 第二十四刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS25_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS25_2026-04-19.md)
  — Inventory store/state deeper partitioning 第二十五刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS26_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS26_2026-04-19.md)
  — Inventory store/state deeper partitioning 第二十六刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS27_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS27_2026-04-19.md)
  — Inventory store/state deeper partitioning 第二十七刀计划
- [INVENTORY_STORE_DEEPER_PARTITIONING_PASS28_2026-04-19.md](/Users/aries/Dve/workspace/docs/roadmaps/INVENTORY_STORE_DEEPER_PARTITIONING_PASS28_2026-04-19.md)
  — Inventory store/state deeper partitioning 第二十八刀计划
- [ORDER_SERVICE_REFACTOR_PLAN_2026-04-16.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_SERVICE_REFACTOR_PLAN_2026-04-16.md)
  — OrderService 第一轮收口计划
- [ORDER_LIFECYCLE_PASS3_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS3_PLAN_2026-04-17.md)
  — Order lifecycle 第三轮收口计划
- [ORDER_LIFECYCLE_PASS4_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS4_PLAN_2026-04-17.md)
  — Order lifecycle 第四轮收口计划
- [ORDER_LIFECYCLE_PASS5_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS5_PLAN_2026-04-17.md)
  — Order lifecycle 第五轮收口计划
- [ORDER_LIFECYCLE_PASS6_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS6_PLAN_2026-04-17.md)
  — Order lifecycle 第六轮收口计划
- [ORDER_LIFECYCLE_PASS7_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS7_PLAN_2026-04-17.md)
  — Order lifecycle 第七轮收口计划
- [ORDER_LIFECYCLE_PASS8_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS8_PLAN_2026-04-17.md)
  — Order lifecycle 第八轮收口计划
- [ORDER_LIFECYCLE_PASS9_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS9_PLAN_2026-04-17.md)
  — Order lifecycle 第九轮收口计划
- [ORDER_LIFECYCLE_PASS10_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS10_PLAN_2026-04-17.md)
  — Order lifecycle 第十轮收口计划
- [ORDER_LIFECYCLE_PASS11_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS11_PLAN_2026-04-17.md)
  — Order lifecycle 第十一轮收口计划
- [ORDER_LIFECYCLE_PASS12_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS12_PLAN_2026-04-17.md)
  — Order lifecycle 第十二轮收口计划
- [ORDER_LIFECYCLE_PASS13_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_PASS13_PLAN_2026-04-17.md)
  — Order lifecycle 第十三轮收口计划
- [ORDER_LIFECYCLE_NORMALIZATION_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PLAN_2026-04-17.md)
  — Order lifecycle deeper normalization 计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS3_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS3_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第三刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS4_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS4_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第四刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS5_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS5_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第五刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS6_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS6_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第六刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS7_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS7_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第七刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS8_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS8_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第八刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS10_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS10_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS12_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS12_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十二刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS13_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS13_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十三刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS14_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS14_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十四刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS15_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS15_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十五刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS16_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS16_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十六刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS17_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS17_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十七刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS21_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS21_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十一刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS18_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS18_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十八刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS23_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS23_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十三刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS22_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS22_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十二刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS24_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS24_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十四刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS25_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS25_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十五刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS26_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS26_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十六刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS27_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS27_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十七刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS28_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS28_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十八刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS29_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS29_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十九刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS30_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS30_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS31_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS31_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十一刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS32_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS32_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十二刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS33_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS33_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十三刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS34_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS34_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十四刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS35_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS35_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十五刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS36_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS36_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十六刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS37_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS37_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十七刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS38_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS38_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十八刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS39_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS39_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第三十九刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS40_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS40_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS41_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS41_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十一刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS42_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS42_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十二刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS43_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS43_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十三刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS44_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS44_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十四刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS45_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS45_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十五刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS46_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS46_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十六刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS47_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS47_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十七刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS48_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS48_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十八刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS49_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS49_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第四十九刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS50_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS50_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第五十刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS51_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS51_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第五十一刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS52_PLAN_2026-04-18.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS52_PLAN_2026-04-18.md)
  — Order lifecycle normalization 第五十二刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS20_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS20_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第二十刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS19_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS19_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十九刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS11_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS11_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第十一刀计划
- [ORDER_LIFECYCLE_NORMALIZATION_PASS9_PLAN_2026-04-17.md](/Users/aries/Dve/workspace/docs/roadmaps/ORDER_LIFECYCLE_NORMALIZATION_PASS9_PLAN_2026-04-17.md)
  — Order lifecycle normalization 第九刀计划
- [SOURCE_ANALYSIS_EXTRACTOR_REFACTOR_PLAN_2026-04-16.md](/Users/aries/Dve/workspace/docs/roadmaps/SOURCE_ANALYSIS_EXTRACTOR_REFACTOR_PLAN_2026-04-16.md)
  — source-analysis extractor 第一轮拆分计划
- [SOURCE_ANALYSIS_TYPE_TIGHTENING_PLAN_2026-04-16.md](/Users/aries/Dve/workspace/docs/roadmaps/SOURCE_ANALYSIS_TYPE_TIGHTENING_PLAN_2026-04-16.md)
  — source-analysis extractor 第二阶段类型收紧计划
- [SOURCE_ANALYSIS_SHARED_TYPES_PLAN_2026-04-16.md](/Users/aries/Dve/workspace/docs/roadmaps/SOURCE_ANALYSIS_SHARED_TYPES_PLAN_2026-04-16.md)
  — source-analysis shared types 提炼计划
- [REFACTOR_EXECUTION_INDEX_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/REFACTOR_EXECUTION_INDEX_2026-03-13.md)
  — 本轮结构治理总索引，适合作为背景导航

### 现行参考计划

- [SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md](/Users/aries/Dve/workspace/docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md)
  — 系统架构审查与优化项总览（当前仍有参考价值）
- [SYSTEM_OPTIMIZATION_TASKS_2026-03-18.md](/Users/aries/Dve/workspace/docs/roadmaps/SYSTEM_OPTIMIZATION_TASKS_2026-03-18.md)
  — 对应系统优化计划的任务拆解
- [SYSTEM_OPTIMIZATION_PHASE1_DB_PAGINATION_2026-03-18.md](/Users/aries/Dve/workspace/docs/roadmaps/SYSTEM_OPTIMIZATION_PHASE1_DB_PAGINATION_2026-03-18.md)
  — 数据库分页与索引阶段清单（状态：部分完成）
- [PROCUREMENT_TEMPLATE_OPTIMIZATION_PLAN.md](/Users/aries/Dve/workspace/docs/roadmaps/procurement/PROCUREMENT_TEMPLATE_OPTIMIZATION_PLAN.md)
  — 采购模板优化计划（按文档内部状态判断是否继续执行）

### 历史路线图与旧周清单

以下内容主要用于追溯历史治理背景，不作为当前执行入口。统一从归档区进入：

- [docs/archive/roadmaps/README.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/README.md)
- [MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md)
- [MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md)
- [SYSTEM_OPTIMIZATION_PHASE2_CORS_AUTH_2026-03-18.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/SYSTEM_OPTIMIZATION_PHASE2_CORS_AUTH_2026-03-18.md)
- [PROJECT_STRUCTURE_OPTIMIZATION_PLAN_2026-03-09.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/PROJECT_STRUCTURE_OPTIMIZATION_PLAN_2026-03-09.md)
- [CSS_TEMPLATE_MIGRATION_PLAN.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/CSS_TEMPLATE_MIGRATION_PLAN.md)

## progress

阶段性总结、里程碑进度与结果沉淀。

- [INVENTORY_OUTBOUND_LOCATION_RELEASE_2026-03-20.md](/Users/aries/Dve/workspace/docs/progress/INVENTORY_OUTBOUND_LOCATION_RELEASE_2026-03-20.md)
- [BACKEND_TS_BATCH1_SUMMARY_2026-03-13.md](/Users/aries/Dve/workspace/docs/progress/BACKEND_TS_BATCH1_SUMMARY_2026-03-13.md)
- [REFACTOR_PROGRAM_SUMMARY_2026-03-13.md](/Users/aries/Dve/workspace/docs/progress/REFACTOR_PROGRAM_SUMMARY_2026-03-13.md)
- [PROCUREMENT_INVENTORY_PHASE1_SUMMARY_2026-03-11.md](/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_PHASE1_SUMMARY_2026-03-11.md)
- [DOCS_INFORMATION_ARCHITECTURE_CLEANUP_2026-04-16.md](/Users/aries/Dve/workspace/docs/progress/DOCS_INFORMATION_ARCHITECTURE_CLEANUP_2026-04-16.md)
  — 本轮 docs 信息架构清理总结与归档策略说明
- [CURRENT_REFACTOR_STATUS_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/CURRENT_REFACTOR_STATUS_2026-04-17.md)
  — 当前 main 上整体治理状态的一页式总盘点
- [NEXT_PHASE_PRIORITY_ASSESSMENT_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_2026-04-17.md)
  — 下一阶段主线选择的优先级评估
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_2026-04-17.md)
  — Order lifecycle pass 3 合并后的优先级刷新判断
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_2_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_2_2026-04-17.md)
  — Inventory store pass 2 合并后的优先级再次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_3_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_3_2026-04-17.md)
  — Order lifecycle pass 4 合并后的优先级第三次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_4_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_4_2026-04-17.md)
  — Inventory store pass 3 合并后的优先级第四次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_5_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_5_2026-04-17.md)
  — Order lifecycle pass 5 合并后的优先级第五次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_6_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_6_2026-04-17.md)
  — Inventory store pass 4 合并后的优先级第六次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_7_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_7_2026-04-17.md)
  — Order lifecycle pass 6 合并后的优先级第七次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_8_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_8_2026-04-17.md)
  — Order lifecycle pass 7 合并后的优先级第八次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_9_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_9_2026-04-17.md)
  — Inventory store pass 5 合并后的优先级第九次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_10_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_10_2026-04-17.md)
  — Order lifecycle pass 8 合并后的优先级第十次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_11_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_11_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_12_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_12_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_13_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_13_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_14_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_14_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_15_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_15_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_16_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_16_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_17_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_17_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_18_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_18_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_19_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_19_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_20_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_20_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_21_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_21_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_22_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_22_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_23_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_23_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_24_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_24_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_25_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_25_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_26_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_26_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_27_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_27_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_28_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_28_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_29_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_29_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_30_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_30_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_31_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_31_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_32_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_32_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_33_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_33_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_34_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_34_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_35_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_35_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_36_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_36_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_37_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_37_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_38_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_38_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_39_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_39_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_40_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_40_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_41_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_41_2026-04-17.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_42_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_42_2026-04-17.md)
  — Inventory store pass 6 合并后的优先级第十一次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_43_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_43_2026-04-17.md)
  — Order lifecycle normalization 第二十五刀合并后的优先级第四十三次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_44_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_44_2026-04-17.md)
  — Order lifecycle normalization 第二十六刀合并后的优先级第四十四次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_45_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_45_2026-04-17.md)
  — Order lifecycle normalization 第二十七刀合并后的优先级第四十五次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_46_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_46_2026-04-17.md)
  — Order lifecycle normalization 第二十八刀合并后的优先级第四十六次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_47_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_47_2026-04-17.md)
  — Order lifecycle normalization 第二十九刀合并后的优先级第四十七次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_48_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_48_2026-04-18.md)
  — Order lifecycle normalization 第三十刀合并后的优先级第四十八次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_49_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_49_2026-04-18.md)
  — Order lifecycle normalization 第三十一刀合并后的优先级第四十九次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_50_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_50_2026-04-18.md)
  — Order lifecycle normalization 第三十二刀合并后的优先级第五十次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_51_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_51_2026-04-18.md)
  — Order lifecycle normalization 第三十三刀合并后的优先级第五十一次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_52_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_52_2026-04-18.md)
  — Order lifecycle normalization 第三十四刀合并后的优先级第五十二次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_53_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_53_2026-04-18.md)
  — Order lifecycle normalization 第三十五刀合并后的优先级第五十三次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_54_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_54_2026-04-18.md)
  — Order lifecycle normalization 第三十六刀合并后的优先级第五十四次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_55_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_55_2026-04-18.md)
  — Order lifecycle normalization 第三十七刀合并后的优先级第五十五次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_56_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_56_2026-04-18.md)
  — Order lifecycle normalization 第三十八刀合并后的优先级第五十六次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_57_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_57_2026-04-18.md)
  — Order lifecycle normalization 第三十九刀合并后的优先级第五十七次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_58_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_58_2026-04-18.md)
  — Order lifecycle normalization 第四十刀合并后的优先级第五十八次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_59_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_59_2026-04-18.md)
  — Order lifecycle normalization 第四十一刀合并后的优先级第五十九次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_60_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_60_2026-04-18.md)
  — Order lifecycle normalization 第四十二刀合并后的优先级第六十次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_61_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_61_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_62_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_62_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_63_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_63_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_64_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_64_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_65_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_65_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_66_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_66_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_67_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_67_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_68_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_68_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_69_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_69_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_70_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_70_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_71_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_71_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_72_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_72_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_73_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_73_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_74_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_74_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_75_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_75_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_76_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_76_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_77_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_77_2026-04-18.md)
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_78_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_78_2026-04-18.md)
  — Inventory deeper partitioning 第九刀合并后的优先级第七十八次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_79_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_79_2026-04-19.md)
  — Inventory deeper partitioning 第十刀合并后的优先级第七十九次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_80_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_80_2026-04-19.md)
  — Inventory deeper partitioning 第十一刀合并后的优先级第八十次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_81_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_81_2026-04-19.md)
  — Inventory deeper partitioning 第十二刀合并后的优先级第八十一次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_82_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_82_2026-04-19.md)
  — Inventory deeper partitioning 第十三刀合并后的优先级第八十二次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_83_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_83_2026-04-19.md)
  — Inventory deeper partitioning 第十四刀合并后的优先级第八十三次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_84_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_84_2026-04-19.md)
  — Inventory deeper partitioning 第十五刀合并后的优先级第八十四次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_85_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_85_2026-04-19.md)
  — Inventory deeper partitioning 第十六刀合并后的优先级第八十五次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_86_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_86_2026-04-19.md)
  — Inventory deeper partitioning 第十七刀合并后的优先级第八十六次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_87_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_87_2026-04-19.md)
  — Inventory deeper partitioning 第十八刀合并后的优先级第八十七次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_88_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_88_2026-04-19.md)
  — Inventory deeper partitioning 第十九刀合并后的优先级第八十八次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_89_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_89_2026-04-19.md)
  — Inventory deeper partitioning 第二十刀合并后的优先级第八十九次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_90_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_90_2026-04-19.md)
  — Inventory deeper partitioning 第二十一刀合并后的优先级第九十次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_91_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_91_2026-04-19.md)
  — Inventory deeper partitioning 第二十二刀合并后的优先级第九十一次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_92_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_92_2026-04-19.md)
  — Inventory deeper partitioning 第二十三刀合并后的优先级第九十二次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_93_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_93_2026-04-19.md)
  — Inventory deeper partitioning 第二十四刀合并后的优先级第九十三次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_94_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_94_2026-04-19.md)
  — Inventory deeper partitioning 第二十五刀合并后的优先级第九十四次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_95_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_95_2026-04-19.md)
  — Inventory deeper partitioning 第二十六刀合并后的优先级第九十五次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_96_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_96_2026-04-19.md)
  — Inventory deeper partitioning 第二十七刀合并后的优先级第九十六次刷新
- [NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_97_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/NEXT_PHASE_PRIORITY_ASSESSMENT_REFRESH_97_2026-04-19.md)
  — Inventory deeper partitioning 第二十八刀合并后的优先级第九十七次刷新
- [REPO_HEALTH_BASELINE_2026-04-16.md](/Users/aries/Dve/workspace/docs/progress/REPO_HEALTH_BASELINE_2026-04-16.md)
  — Week 1 健康基线修复前后状态记录
- [BRANCH_PROGRESS_FIX_WEEK1_HEALTH_BASELINE_2026-04-16.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_FIX_WEEK1_HEALTH_BASELINE_2026-04-16.md)
  — 当前治理分支的阶段性成果与下一步建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_SERVICE_PASS2_2026-04-16.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_SERVICE_PASS2_2026-04-16.md)
  — OrderService 第二轮收口分支的阶段性成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS3_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS3_2026-04-17.md)
  — Order lifecycle 第三轮收口当前阶段成果与停点建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS4_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS4_2026-04-17.md)
  — Order lifecycle 第四轮收口当前阶段成果与停点建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS5_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS5_2026-04-17.md)
  — Order lifecycle 第五轮收口当前阶段成果与停点建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS6_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS6_2026-04-17.md)
  — Order lifecycle 第六轮收口当前阶段成果与停点建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS7_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS7_2026-04-17.md)
  — Order lifecycle 第七轮收口当前阶段成果与停点建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS8_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS8_2026-04-17.md)
  — Order lifecycle 第八轮收口当前阶段成果与停点建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS9_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS9_2026-04-17.md)
  — Order lifecycle 第九轮收口当前阶段成果与停点建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS10_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS10_2026-04-17.md)
  — Order lifecycle 第十轮收口当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS11_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS11_2026-04-17.md)
  — Order lifecycle 第十一轮收口当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS12_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS12_2026-04-17.md)
  — Order lifecycle 第十二轮收口当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS13_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_PASS13_2026-04-17.md)
  — Order lifecycle 第十三轮收口当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_2026-04-17.md)
  — Order lifecycle normalization 阶段当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS2_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS2_2026-04-17.md)
  — Order lifecycle normalization 第二刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS3_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS3_2026-04-17.md)
  — Order lifecycle normalization 第三刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS4_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS4_2026-04-17.md)
  — Order lifecycle normalization 第四刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS5_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS5_2026-04-17.md)
  — Order lifecycle normalization 第五刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS6_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS6_2026-04-17.md)
  — Order lifecycle normalization 第六刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS7_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS7_2026-04-17.md)
  — Order lifecycle normalization 第七刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS8_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS8_2026-04-17.md)
  — Order lifecycle normalization 第八刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS9_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS9_2026-04-17.md)
  — Order lifecycle normalization 第九刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS10_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS10_2026-04-17.md)
  — Order lifecycle normalization 第十刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS12_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS12_2026-04-17.md)
  — Order lifecycle normalization 第十二刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS13_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS13_2026-04-17.md)
  — Order lifecycle normalization 第十三刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS14_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS14_2026-04-17.md)
  — Order lifecycle normalization 第十四刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS15_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS15_2026-04-17.md)
  — Order lifecycle normalization 第十五刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS16_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS16_2026-04-17.md)
  — Order lifecycle normalization 第十六刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS17_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS17_2026-04-17.md)
  — Order lifecycle normalization 第十七刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS18_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS18_2026-04-17.md)
  — Order lifecycle normalization 第十八刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS22_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS22_2026-04-17.md)
  — Order lifecycle normalization 第二十二刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS23_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS23_2026-04-17.md)
  — Order lifecycle normalization 第二十三刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS24_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS24_2026-04-17.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS25_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS25_2026-04-17.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS26_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS26_2026-04-17.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS27_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS27_2026-04-17.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS28_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS28_2026-04-17.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS29_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS29_2026-04-17.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS30_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS30_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS31_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS31_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS32_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS32_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS33_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS33_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS34_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS34_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS35_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS35_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS36_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS36_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS37_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS37_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS38_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS38_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS39_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS39_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS40_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS40_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS41_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS41_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS42_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS42_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS43_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS43_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS44_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS44_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS45_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS45_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS46_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS46_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS47_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS47_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS48_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS48_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS49_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS49_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS50_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS50_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS51_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS51_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS52_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS52_2026-04-18.md)
  — Order lifecycle normalization 第二十四刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS21_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS21_2026-04-17.md)
  — Order lifecycle normalization 第二十一刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS19_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS19_2026-04-17.md)
  — Order lifecycle normalization 第十九刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS20_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS20_2026-04-17.md)
  — Order lifecycle normalization 第二十刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS11_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_ORDER_LIFECYCLE_NORMALIZATION_PASS11_2026-04-17.md)
  — Order lifecycle normalization 第十一刀当前成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS2_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS2_2026-04-17.md)
  — Inventory store/state 第二轮当前阶段成果与停点建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS3_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS3_2026-04-17.md)
  — Inventory store/state 第三轮当前阶段成果与停点建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS4_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS4_2026-04-17.md)
  — Inventory store/state 第四轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS5_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS5_2026-04-17.md)
  — Inventory store/state 第五轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS6_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS6_2026-04-17.md)
  — Inventory store/state 第六轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS7_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS7_2026-04-17.md)
  — Inventory store/state 第七轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS8_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS8_2026-04-17.md)
  — Inventory store/state 第八轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS9_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_PASS9_2026-04-17.md)
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS2_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS2_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS3_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS3_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS4_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS4_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS5_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS5_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS6_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS6_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS7_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS7_2026-04-18.md)
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS8_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS8_2026-04-18.md)
  — Inventory store/state 第八轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS9_2026-04-18.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS9_2026-04-18.md)
  — Inventory store/state 第九轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS10_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS10_2026-04-19.md)
  — Inventory store/state 第十轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS11_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS11_2026-04-19.md)
  — Inventory store/state 第十一轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS12_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS12_2026-04-19.md)
  — Inventory store/state 第十二轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS13_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS13_2026-04-19.md)
  — Inventory store/state 第十三轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS14_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS14_2026-04-19.md)
  — Inventory store/state 第十四轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS15_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS15_2026-04-19.md)
  — Inventory store/state 第十五轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS16_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS16_2026-04-19.md)
  — Inventory store/state 第十六轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS17_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS17_2026-04-19.md)
  — Inventory store/state 第十七轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS18_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS18_2026-04-19.md)
  — Inventory store/state 第十八轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS19_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS19_2026-04-19.md)
  — Inventory store/state 第十九轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS20_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS20_2026-04-19.md)
  — Inventory store/state 第二十轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS21_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS21_2026-04-19.md)
  — Inventory store/state 第二十一轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS22_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS22_2026-04-19.md)
  — Inventory store/state 第二十二轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS23_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS23_2026-04-19.md)
  — Inventory store/state 第二十三轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS24_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS24_2026-04-19.md)
  — Inventory store/state 第二十四轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS25_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS25_2026-04-19.md)
  — Inventory store/state 第二十五轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS26_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS26_2026-04-19.md)
  — Inventory store/state 第二十六轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS27_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS27_2026-04-19.md)
  — Inventory store/state 第二十七轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS28_2026-04-19.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_INVENTORY_STORE_DEEPER_PARTITIONING_PASS28_2026-04-19.md)
  — Inventory store/state 第二十八轮当前阶段成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_EXTRACTORS_2026-04-16.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_EXTRACTORS_2026-04-16.md)
  — Source-analysis extractor 分支的阶段性成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_TYPES_2026-04-16.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_TYPES_2026-04-16.md)
  — Source-analysis 类型收紧分支的阶段性成果与封板建议
- [BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_SHARED_TYPES_2026-04-17.md](/Users/aries/Dve/workspace/docs/progress/BRANCH_PROGRESS_REFACTOR_SOURCE_ANALYSIS_SHARED_TYPES_2026-04-17.md)
  — Source-analysis shared types 分支的阶段性成果与封板建议

历史阶段进度（不作为当前阶段结果入口）：

- [SOURCE_CONFIG_REFACTOR_PROGRESS_2026-03-10.md](/Users/aries/Dve/workspace/docs/archive/progress/SOURCE_CONFIG_REFACTOR_PROGRESS_2026-03-10.md)
- [PROCUREMENT_INVENTORY_PHASE1_PROGRESS_2026-03-12.md](/Users/aries/Dve/workspace/docs/archive/progress/PROCUREMENT_INVENTORY_PHASE1_PROGRESS_2026-03-12.md)
- [PROCUREMENT_INVENTORY_MANUAL_REGRESSION_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/progress/PROCUREMENT_INVENTORY_MANUAL_REGRESSION_CHECKLIST_2026-03-13.md)
- [REFACTOR_REMAINING_SMOKE_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/progress/REFACTOR_REMAINING_SMOKE_CHECKLIST_2026-03-13.md)

## reference

长期参考资料、字段契约和规则说明。

- [PO_FIELD_CONTRACT.md](/Users/aries/Dve/workspace/docs/reference/PO_FIELD_CONTRACT.md)
- [OMX_COMMAND_GUIDE_CURRENT_PROJECT_2026-04-16.md](/Users/aries/Dve/workspace/docs/reference/OMX_COMMAND_GUIDE_CURRENT_PROJECT_2026-04-16.md)
- [RUNTIME_CONTRACT_2026-04-16.md](/Users/aries/Dve/workspace/docs/reference/RUNTIME_CONTRACT_2026-04-16.md)
- [CYLINDER_RULES.md](/Users/aries/Dve/workspace/docs/reference/CYLINDER_RULES.md)
- [LOCK_FORK_RULES.md](/Users/aries/Dve/workspace/docs/reference/LOCK_FORK_RULES.md)
- [LAN_SHARING.md](/Users/aries/Dve/workspace/docs/reference/LAN_SHARING.md)
- [api.md](/Users/aries/Dve/workspace/docs/reference/api.md)
- [formula-management-refactor.md](/Users/aries/Dve/workspace/docs/reference/formula-management-refactor.md)

## design

设计方向与历史视觉方案说明。

- [DESIGN_GUIDES.md](/Users/aries/Dve/workspace/docs/design/DESIGN_GUIDES.md)
  — 历史设计方向文档；当前页面视觉约束请优先看 `docs/governance/STYLE_CONSTRAINTS_NEW_YORK.md`

## issues

已记录的问题分析、缺陷背景与排查说明。

- [README.md](/Users/aries/Dve/workspace/docs/issues/README.md)
- `active/`：仍有效的需求记录与接口变更背景
- `archive/`：纯历史问题分析与旧实现缺陷说明

## archive

历史迁移方案、旧实现说明和阶段性文档归档区，不作为当前实现依据。

- [README.md](/Users/aries/Dve/workspace/docs/archive/README.md)
- [backend-ts/](/Users/aries/Dve/workspace/docs/archive/backend-ts)
- [domain/](/Users/aries/Dve/workspace/docs/archive/domain)
- [mapping-migration-plan/](/Users/aries/Dve/workspace/docs/archive/mapping-migration-plan)
- [roadmaps/](/Users/aries/Dve/workspace/docs/archive/roadmaps)
- [progress/](/Users/aries/Dve/workspace/docs/archive/progress)
- [DEVELOPMENT_GUIDE.md](/Users/aries/Dve/workspace/docs/archive/DEVELOPMENT_GUIDE.md)
- [TECH_STACK.md](/Users/aries/Dve/workspace/docs/archive/TECH_STACK.md)
- [PROCUREMENT_REFACTOR_PLAN.md](/Users/aries/Dve/workspace/docs/archive/PROCUREMENT_REFACTOR_PLAN.md)
- [预览模态框功能实现.md](/Users/aries/Dve/workspace/docs/archive/预览模态框功能实现.md)
- [代码重构总结.md](/Users/aries/Dve/workspace/docs/archive/代码重构总结.md)
- [视图切换功能说明.md](/Users/aries/Dve/workspace/docs/archive/视图切换功能说明.md)
- [VUE_REFACTOR_PLAN.md](/Users/aries/Dve/workspace/docs/archive/VUE_REFACTOR_PLAN.md)
- [VITE_REFACTOR_PLAN.md](/Users/aries/Dve/workspace/docs/archive/VITE_REFACTOR_PLAN.md)
- [DEVELOPMENT_PLAN.md](/Users/aries/Dve/workspace/docs/archive/DEVELOPMENT_PLAN.md)
- [troubleshooting.md](/Users/aries/Dve/workspace/docs/archive/troubleshooting.md)
- [LEGACY_PUBLIC_JS_CLEANUP_PLAN.md](/Users/aries/Dve/workspace/docs/archive/LEGACY_PUBLIC_JS_CLEANUP_PLAN.md)
- [VITE_SHADCN_REFACTOR_PLAN.md](/Users/aries/Dve/workspace/docs/archive/VITE_SHADCN_REFACTOR_PLAN.md)
- [implementation_plan_c.md](/Users/aries/Dve/workspace/docs/archive/implementation_plan_c.md)
- [refactoring-materials-tab.md](/Users/aries/Dve/workspace/docs/archive/refactoring-materials-tab.md)
- [store-materials-implementation.md](/Users/aries/Dve/workspace/docs/archive/store-materials-implementation.md)

## other docs

其余仍位于 `docs/` 其他子目录下的文件，后续按主题逐步整理；根目录现在只保留索引入口。
