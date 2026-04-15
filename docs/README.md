# Docs Index

`docs/` 目前按“长期规范 / 路线图 / 进度 / 参考资料 / 历史归档 / 主题文档”分层。

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

最新优化计划（2026-03-18 系统审查）：

- [SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md](/Users/aries/Dve/workspace/docs/roadmaps/SYSTEM_OPTIMIZATION_PLAN_2026-03-18.md)
  — 主文档：全系统架构审查，13 项优化点含优先级排序
- [SYSTEM_OPTIMIZATION_TASKS_2026-03-18.md](/Users/aries/Dve/workspace/docs/roadmaps/SYSTEM_OPTIMIZATION_TASKS_2026-03-18.md)
  — 任务附录：6 个阶段的文件级任务拆解与 PR 粒度建议
- [SYSTEM_OPTIMIZATION_PHASE1_DB_PAGINATION_2026-03-18.md](/Users/aries/Dve/workspace/docs/roadmaps/SYSTEM_OPTIMIZATION_PHASE1_DB_PAGINATION_2026-03-18.md)
  — 阶段一执行清单：数据库索引 + 分页查询改造（P1-1、P1-3）
- [SYSTEM_OPTIMIZATION_PHASE2_CORS_AUTH_2026-03-18.md](/Users/aries/Dve/workspace/docs/roadmaps/SYSTEM_OPTIMIZATION_PHASE2_CORS_AUTH_2026-03-18.md)
  — 阶段二/三执行清单：CORS 修复 + API Key 认证（P1-2、P1-4）

本轮结构治理主入口：

1. 总索引：`REFACTOR_EXECUTION_INDEX_2026-03-13.md`
2. 历史总蓝图：`archive/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md`
3. 历史任务拆解：`archive/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md`
4. 历史周清单：`archive/roadmaps/WEEK1...WEEK8`

- [REFACTOR_EXECUTION_INDEX_2026-03-13.md](/Users/aries/Dve/workspace/docs/roadmaps/REFACTOR_EXECUTION_INDEX_2026-03-13.md)
- [MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_PLAN_2026-03-13.md)
- [MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/MAINTAINABILITY_SCALABILITY_REFACTOR_TASKS_2026-03-13.md)
- [WEEK1_REFACTOR_EXECUTION_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/WEEK1_REFACTOR_EXECUTION_CHECKLIST_2026-03-13.md)
- [WEEK2_BACKEND_SPLIT_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/WEEK2_BACKEND_SPLIT_CHECKLIST_2026-03-13.md)
- [WEEK3_CONTROLLER_ERROR_MIDDLEWARE_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/WEEK3_CONTROLLER_ERROR_MIDDLEWARE_CHECKLIST_2026-03-13.md)
- [WEEK4_INVENTORY_DOMAIN_ROLLOUT_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/WEEK4_INVENTORY_DOMAIN_ROLLOUT_CHECKLIST_2026-03-13.md)
- [WEEK5_MAPPINGS_SHARED_VALIDATOR_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/WEEK5_MAPPINGS_SHARED_VALIDATOR_CHECKLIST_2026-03-13.md)
- [WEEK6_FORMULAS_MIGRATION_STANDARDIZATION_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/WEEK6_FORMULAS_MIGRATION_STANDARDIZATION_CHECKLIST_2026-03-13.md)
- [WEEK7_MATERIALS_SOURCE_ANALYSIS_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/WEEK7_MATERIALS_SOURCE_ANALYSIS_CHECKLIST_2026-03-13.md)
- [WEEK8_EXECUTION_INDEX_GOVERNANCE_CHECKLIST_2026-03-13.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/WEEK8_EXECUTION_INDEX_GOVERNANCE_CHECKLIST_2026-03-13.md)
- [LOCK_FORK_HIGH_HEIGHT_RULE_PLAN_2026-03-11.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/LOCK_FORK_HIGH_HEIGHT_RULE_PLAN_2026-03-11.md)
- [SOURCE_CONFIG_REFACTOR_PLAN_2026-03-10.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/SOURCE_CONFIG_REFACTOR_PLAN_2026-03-10.md)
- [STAGE_A_SOURCE_ANALYSIS_REFACTOR_TASKS_2026-03-10.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/STAGE_A_SOURCE_ANALYSIS_REFACTOR_TASKS_2026-03-10.md)
- [PROJECT_STRUCTURE_OPTIMIZATION_PLAN_2026-03-09.md](/Users/aries/Dve/workspace/docs/roadmaps/PROJECT_STRUCTURE_OPTIMIZATION_PLAN_2026-03-09.md)
- [ROOT_FILE_MIGRATION_INVENTORY_2026-03-09.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/ROOT_FILE_MIGRATION_INVENTORY_2026-03-09.md)
- [OPTIMIZATION_PLAN_2026-03-03.md](/Users/aries/Dve/workspace/docs/archive/roadmaps/OPTIMIZATION_PLAN_2026-03-03.md)
- [PROCUREMENT_TEMPLATE_OPTIMIZATION_PLAN.md](/Users/aries/Dve/workspace/docs/roadmaps/procurement/PROCUREMENT_TEMPLATE_OPTIMIZATION_PLAN.md)
- [CSS_TEMPLATE_MIGRATION_PLAN.md](/Users/aries/Dve/workspace/docs/roadmaps/CSS_TEMPLATE_MIGRATION_PLAN.md)

## progress

阶段性总结、里程碑进度与结果沉淀。

- [INVENTORY_OUTBOUND_LOCATION_RELEASE_2026-03-20.md](/Users/aries/Dve/workspace/docs/progress/INVENTORY_OUTBOUND_LOCATION_RELEASE_2026-03-20.md)
- [BACKEND_TS_BATCH1_SUMMARY_2026-03-13.md](/Users/aries/Dve/workspace/docs/progress/BACKEND_TS_BATCH1_SUMMARY_2026-03-13.md)
- [REFACTOR_PROGRAM_SUMMARY_2026-03-13.md](/Users/aries/Dve/workspace/docs/progress/REFACTOR_PROGRAM_SUMMARY_2026-03-13.md)
- [PROCUREMENT_INVENTORY_PHASE1_SUMMARY_2026-03-11.md](/Users/aries/Dve/workspace/docs/progress/PROCUREMENT_INVENTORY_PHASE1_SUMMARY_2026-03-11.md)
- [SOURCE_CONFIG_REFACTOR_PROGRESS_2026-03-10.md](/Users/aries/Dve/workspace/docs/progress/SOURCE_CONFIG_REFACTOR_PROGRESS_2026-03-10.md)

## reference

长期参考资料、字段契约和规则说明。

- [PO_FIELD_CONTRACT.md](/Users/aries/Dve/workspace/docs/reference/PO_FIELD_CONTRACT.md)
- [CYLINDER_RULES.md](/Users/aries/Dve/workspace/docs/reference/CYLINDER_RULES.md)
- [LOCK_FORK_RULES.md](/Users/aries/Dve/workspace/docs/reference/LOCK_FORK_RULES.md)
- [LAN_SHARING.md](/Users/aries/Dve/workspace/docs/reference/LAN_SHARING.md)
- [api.md](/Users/aries/Dve/workspace/docs/reference/api.md)
- [formula-management-refactor.md](/Users/aries/Dve/workspace/docs/reference/formula-management-refactor.md)

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
