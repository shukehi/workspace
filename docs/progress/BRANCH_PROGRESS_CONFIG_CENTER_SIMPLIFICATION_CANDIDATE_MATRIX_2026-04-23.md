# Candidate Matrix — Config Center Simplification

Branch: `plan/config-center-simplification`
Source plan: `.omx/plans/prd-config-center-simplification.md`

## Purpose
把“配置中心复杂度简化”从高层原则推进到模块级候选项，便于后续按模块切实施分支。

## Scoring Legend
- **Value**: 对减少重复手填 / 降低误配 / 降低理解门槛的预期价值
- **Risk**: 改动职责后对现有工作流、发布、例外处理的影响风险
- **Recommended ownership**:
  - `backend-default`
  - `backend-derived`
  - `template-driven`
  - `master-data-owned`
  - `frontend-exception`

## Module-by-module candidate matrix

| Priority | Module | Candidate | Current evidence | Recommended ownership | Why this should stop being explicit user config | Keep manual override? | Value | Risk |
|---|---|---|---|---|---|---|---|---|
| P0 | Packaging | 默认供应商 | `src/views/PackagingConfig.vue:20-27`, `src/views/PackagingConfig.vue:103-106` | `backend-default` | 默认供应商是稳定策略，不应每次由用户显式维护 | Yes — 允许新增例外映射时覆盖 | High | Low |
| P0 | Packaging | 常见包装名称 -> 采购名称映射字典 | `src/views/PackagingConfig.vue:28-37`, `src/views/PackagingConfig.vue:114-127` | `template-driven` + `frontend-exception` | 大多数映射是标准字典，用户只应维护少量新增或异常包装名 | Yes — 页面保留“例外映射”表 | High | Low |
| P0 | Lock | 默认单位 / 主锁标签 / 副锁标签 | `src/views/LockConfig.vue:39-60`, `src/views/LockConfig.vue:190-199` | `backend-default` | 这些是 profile 级规则，不应占用用户每次进入页面的认知负担 | Yes — 允许 profile 级覆盖，不允许散落逐页手调 | Medium | Low |
| P0 | Lock | 型号 normalize 规则 | `src/views/LockConfig.vue:63-78`, `src/views/LockConfig.vue:93-150` | `backend-derived` | normalize 是标准化逻辑，本质上属于后端 canonicalization，而不是运营手工配置 | Yes — 未命中时进入例外池 | High | Medium |
| P0 | Lock | 主锁/副锁规格推导 | `src/views/LockConfig.vue:54-60`, `src/views/LockConfig.vue:93-150` | `backend-derived` | 规格命中规则更像规则引擎，不该让用户通过列表维护全部常态映射 | Yes — 未命中或特殊型号保留例外项 | High | Medium |
| P0 | Handle | 默认供应商 / 未匹配供应商 / 人工处理标签 | `src/views/HandleConfig.vue:27-35`, `src/views/HandleConfig.vue:201-208` | `backend-default` | 属于系统处理策略，不应暴露为高频编辑项 | Yes — profile 级兜底保留 | High | Low |
| P0 | Handle | 外贸默认单双活策略 | `src/views/HandleConfig.vue:30-33`, `src/views/HandleConfig.vue:211-223` | `backend-default` + `backend-derived` | 对外贸客户的默认活动类型是统一策略，不应由用户在多个规则层重复理解 | Yes — 特殊客户保留例外 | Medium | Medium |
| P0 | Handle | 单双活关键词 / fallbackModelSources | `src/views/HandleConfig.vue:53-58`, `src/views/HandleConfig.vue:237-240` | `backend-derived` | 文本识别规则本质属于分类逻辑，应集中治理并减少前端暴露 | Yes — 无法识别时进人工处理 | High | Medium |
| P0 | Handle | 门厚配件包策略 | `src/views/HandleConfig.vue:58-60`, `src/views/HandleConfig.vue:226-233` | `template-driven` | 门厚到配件包的映射是标准模板，不是用户逐次决策 | Yes — 异常门厚可手工补录 | Medium | Medium |
| P0 | Cylinder | 基础门厚尺寸表 | `src/views/CylinderConfig.vue:52-55`, `src/views/CylinderConfig.vue:78-88` | `template-driven` | 门厚尺寸组合天然适合模板化，而不是逐行长期维护 | Yes — 增加罕见门厚例外 | High | Medium |
| P0 | Cylinder | 特殊规则 / 二级特殊规则 | `src/views/CylinderConfig.vue:54-56`, `src/views/CylinderConfig.vue:89-100` | `backend-derived` | 规则判断属于系统逻辑，用户不应理解完整条件树 | Yes — 特殊订单保留 override | High | High |
| P0 | Cylinder | 配件包规则 | `src/views/CylinderConfig.vue:56-66`, `src/views/CylinderConfig.vue:101-114`, `src/views/CylinderConfig.vue:140-155` | `template-driven` + `backend-derived` | 多字段条件命中 + 厚度包配置说明其本质是可组合模板与推导逻辑 | Yes — 未覆盖组合保留人工补充 | High | High |
| P0 | Cylinder | customLogos / excludedCylinders | `src/views/CylinderConfig.vue:67-69`, `src/views/CylinderConfig.vue:115-117` | `frontend-exception` | 这些更像异常白名单/黑名单，应明确降级为例外池而不是核心配置面 | Yes — 本身就是例外项 | Medium | Low |
| P0 | LockFork | 吊脚标准值 / 高度参考值 | `src/views/LockForkConfig.vue:41-47`, `src/views/LockForkConfig.vue:187-190` | `backend-default` | 这类参考值更像系统标准参数，而不是用户频繁决策项 | Yes — 特殊项目保留 override | Medium | Medium |
| P0 | LockFork | 基础尺寸组合 | `src/views/LockForkConfig.vue:49-64`, `src/views/LockForkConfig.vue:199-210` | `template-driven` | 门厚 x 常规/吊脚尺寸组合是经典模板化对象 | Yes — 新门厚或异型门保留例外 | High | Medium |
| P0 | LockFork | 锁具类型 / 边型参数 | `src/views/LockForkConfig.vue:75-89`, `src/views/LockForkConfig.vue:211-228` | `backend-derived` + `template-driven` | 用户当前在维护规则组合，不是在做真实业务决策 | Yes — 无法命中的组合留例外项 | High | High |
| P1 | Material Catalog | 目录 JSON 直编 | `src/views/MaterialCatalogConfig.vue:12-19`, `src/views/MaterialCatalogConfig.vue:71-79` | `template-driven` + restricted advanced edit | 原始 JSON 直编要求用户理解底层结构，复杂度和出错成本都高 | Yes — 保留高级 JSON 兜底入口 | High | Medium |
| P1 | Formula | 新建配方从空白开始 | `src/features/formulas/components/FormulaProfileHost.vue:35-45`, `src/features/formulas/composables/useFormulaManager.ts:146-160` | `template-driven` | 从空白 BOM 开始会放大认知负担，常见配方应模板化起步 | Yes — 模板后仍允许人工改 BOM | High | Medium |
| P1 | Formula | BOM 常见组合 | `src/features/formulas/components/FormulaProfileHost.vue:92-117`, `src/features/formulas/composables/useFormulaManager.ts:163-214` | `template-driven` | 常见 BOM 组合不应完全依赖用户逐项填入 | Yes — 个别行可继续编辑 | High | High |
| P2 | Supplier Master | 供应商命名 / 状态 / 关联关系 | `src/views/SupplierMaster.vue:137-220` | `master-data-owned` | 供应商权威信息不应在多个映射页重复维护 | Yes — 通过主数据页修正 | High | Medium |
| P2 | Material Master | 物料基础信息 / 供应商关联 | `src/views/MaterialManagement.vue:126-220` | `master-data-owned` | 物料权威数据应成为映射与规则的来源，而不是重复录入目标 | Yes — 通过主数据页修正 | High | Medium |
| P2 | Diagnostics/Governance | 异常验证与回归观察 | `src/views/MasterDataDiagnostics.vue:171-220`, `src/views/MasterDataGovernance.vue:41-120` | validation layer | 这些页面不该继续承载“新配置项”，而应承接下沉后的验证与异常收敛 | N/A | Medium | Low |

## Cross-module patterns worth standardizing first

### 1. Profile-level defaults
Strong candidates:
- packaging default supplier
- lock labels / default unit
- handle default supplier / unmatched label / manual review label
- lock-fork reference values

Shared rationale:
- 稳定、低争议、对大多数订单不需要人工逐次判断
- 可优先迁移到 profile metadata 或 runtime snapshot 默认值层

### 2. Text normalization / matching rules
Strong candidates:
- lock model normalization
- handle keyword detection
- cylinder / lock-fork rule matching

Shared rationale:
- 这些配置本质上是规则引擎输入
- 用户当前是在维护机器逻辑，而不是维护业务例外

### 3. Template libraries
Strong candidates:
- cylinder thickness/dimension sets
- lock-fork base dimensions
- formula BOM starter kits
- packaging standard dictionaries

Shared rationale:
- 同类组合重复率高
- 模板比逐条输入更符合“减少显式配置”的目标

### 4. Master-data ownership
Strong candidates:
- supplier identity / status / linkage
- material code / supplier linkage / canonical references
- eventually vendorName/materialCode from lock/handle mappings

Shared rationale:
- 这些是事实型数据，不应长期由映射页重复表达

## First implementation trial recommendation
### Best first slice: Packaging
Why:
1. 页面结构最简单，风险最低。见 `src/views/PackagingConfig.vue:94-132`
2. 能直接验证“后端默认 + 标准字典 + 前端例外表”的模式
3. 出成果快，便于把方法复制到 lock / handle / cylinder / lock-fork

## Explicit non-goal guardrails
- 不取消人工兜底覆盖
- 不承诺第一批就改完整 API / DB 结构
- 不把治理页继续做成新的配置录入页
- 不把所有配置一刀切地下沉后端
