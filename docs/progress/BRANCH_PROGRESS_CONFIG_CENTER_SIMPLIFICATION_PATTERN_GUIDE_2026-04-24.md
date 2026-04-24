# Config Center Simplification Pattern Guide (2026-04-24)

Branch: `docs/config-center-simplification-patterns`
Source plan: `.omx/plans/prd-config-center-simplification.md`
Related trial branches:
- `feat/config-center-simplification-packaging` @ `9f01f4f`
- `feat/config-center-simplification-lock` @ `4806c2b`
- `feat/config-center-simplification-handle` @ `cb55089`
- `feat/config-center-simplification-cylinder` @ `1905c04`
- `feat/config-center-simplification-lockfork` @ `bf4acdc`

## Purpose
把已经完成的五个试点分支收敛成一套可复用的前端简化模式，帮助后续 review、回收共享抽象、以及决定哪些模式值得推广到其他配置页。

---

## 1. 已验证可复用的简化模式

### Pattern A — “系统默认 + 人工例外项”优先于“完整配置表”
适用分支：
- packaging
- lock
- handle
- cylinder（仅 mappings/exclusions 子区）
- lockfork（仅 default supplier 子区，且必须遵守真实契约）

核心思想：
- 首屏优先展示系统标准值或统一策略
- 人工输入不再被表达成“完整配置表”，而是“例外项维护面”
- 只有当标准规则/默认值无法覆盖时，用户才新增一条例外项

价值：
- 降低用户进入页面后的默认认知负担
- 避免把低价值、低频配置暴露成高频编辑项
- 更贴合 deep-interview 结论：减少重复手填、减少规则暴露、减少误配

### Pattern B — synthetic placeholder row 只在 drafting 期间可见
适用分支：
- packaging
- lock
- handle
- cylinder（mappings/exclusions）

核心思想：
- 保持 `useEditableList` 原有行为不变（空列表时仍保留占位行）
- 但由页面级 helper 决定：
  - 非 drafting 状态下，隐藏无意义占位行
  - 保存/校验时，过滤掉无意义占位行
  - 首次新增时，优先复用这条占位行，而不是额外 append 一条空行

价值：
- 不需要高风险重构共享 `useEditableList`
- 能立刻修掉“空页面显示空白行”“首次新增出现双空行”“幽灵校验错误”等问题

### Pattern C — 搜索条件不应该让新增草稿行“消失”
已在 packaging 试点验证。

核心思想：
- 如果新增动作会生成一条新的空草稿行，就先清空搜索词
- 让用户能明确看到“新增成功”

价值：
- 避免搜索过滤把草稿行藏起来，造成“点击没反应”的错觉

### Pattern D — 先让 UI 语义与真实契约对齐，再谈更强的产品形态
适用分支：
- lockfork（最典型）

核心思想：
- 如果后端/runtime 只支持 `suppliers.default`，就不要做成“任意键供应商映射表”
- 先把界面严格收敛到真实支持的 contract
- 只有在 adapter / validator / runtime / type 全部拓宽后，才开放更强的编辑形态

价值：
- 避免“看起来支持，实际不保存/不生效”的虚假能力
- 防止前端先跑到产品边界之外

---

## 2. 各试点分支的真实边界

### Packaging — `9f01f4f`
改动文件：
- `src/views/PackagingConfig.vue`
- `src/features/config-editor/utils/packagingEditorState.ts`
- `tests/config-table-guard.test.ts`
- `tests/packaging-editor-state.test.ts`

边界：
- 不改 packaging profile contract
- 不改 adapter / validator / runtime
- 只改编辑体验与空状态

得到的结论：
- 这是最适合复制的基线模式

### Lock — `4806c2b`
改动文件：
- `src/views/LockConfig.vue`
- `src/features/config-editor/utils/lockEditorState.ts`
- `tests/config-table-guard.test.ts`
- `tests/lock-editor-state.test.ts`

边界：
- 不改 `LockMappingConfig`
- 不动 rule playground
- 不碰 normalize / fallback / runtime 规则

得到的结论：
- “系统默认基础策略 + 例外映射表”在规则型映射页也成立

已知非阻断旧问题：
- 只填 `model`、其余字段为空时，adapter 可能丢弃该行
- 这不是试点引入的问题，但值得后续单独治理

### Handle — `cb55089`
改动文件：
- `src/views/HandleConfig.vue`
- `src/features/config-editor/utils/handleEditorState.ts`
- `tests/config-table-guard.test.ts`
- `tests/handle-editor-state.test.ts`

边界：
- 不改 `HandleMappingConfig`
- 不动关键词识别、外贸规则、门厚配件包运行逻辑
- 只改基础默认策略表现和映射页空状态

得到的结论：
- 系统默认值展示可以先行，先减少首屏噪音，不必先做 runtime 变更

已知非阻断关注点：
- `useSystemDefaultStrategy` 目前是 UI 状态，不是从字段实时推导
- 后续若推广，可考虑统一成 computed 派生

### Cylinder — `1905c04`
改动文件：
- `src/views/CylinderConfig.vue`
- `src/features/config-editor/utils/cylinderEditorState.ts`
- `tests/config-table-guard.test.ts`
- `tests/cylinder-editor-state.test.ts`

边界：
- **只改 mappings/exclusions 页签**
- 不碰尺寸、特殊规则、副锁护罩配件包规则、规则试跑

得到的结论：
- 在高复杂页面里，先拆出“最像例外项维护面”的子区单独治理，是安全路线

已知非阻断关注点：
- `excludedCylinders` 的“空状态”不是持久化零状态；系统默认排除项仍然存在
- 已通过 copy 明确化处理

### LockFork — `c2e5c36` + `91d3ad1`
改动文件：
- `src/views/LockForkConfig.vue`
- `tests/config-table-guard.test.ts`

边界：
- 最终只保留 **default supplier** 的契约对齐收敛
- 不碰 base / lockType / edges / playground

得到的结论：
- 在真实 contract 只支持 `default` 时，前端必须停止假装支持“例外映射表”
- “先和真实契约对齐”优先于“让界面看起来更强”

已完成的后续收口：
- `LockForkMappingConfig.suppliers` 已收窄到真实支持的 `default` 形态
- shared JS / MJS adapter、前端默认值与 runtime 消费方向已对齐到同一个 `default-only` 契约

---

## 3. 哪些模式值得共享，哪些暂时不该共享

### 值得共享的部分
1. **页面级 draft-row policy helper 结构**
   - `isMeaningful*Row`
   - `get*RowsForValidation`
   - `get*FilteredRows`
   - `shouldReuseEmpty*Draft`

2. **空状态文案结构**
   - “当前没有需要人工维护的 X 例外项”
   - “当系统标准规则无法覆盖时，再新增一条例外项”

3. **摘要卡片模式**
   - 已维护映射数量
   - 冲突数量 / 默认策略模式 / 当前筛选结果

### 暂时不该共享成通用抽象的部分
1. **直接改 `useEditableList` 语义**
   - 风险太高，当前各模块通过页面级 helper 已足够解决问题

2. **强行统一“系统默认策略”开关实现**
   - packaging / lock / handle / cylinder / lockfork 的真实契约和默认值来源并不完全一样

3. **把“例外映射表”推广到其实不支持的 contract**
   - lockfork 已证明：如果 runtime 只支持 `default`，不要超前做前端能力

---

## 4. 后续最值得做的统一收口

### 优先级 P0
#### P0.1 收敛共享 helper 设计文档，而不是立刻合并代码
建议先写一个小型设计说明，回答：
- 哪些模块适合 “system defaults + exceptions”
- 哪些模块只适合局部子页签试点
- draft-row policy helper 是否需要统一成 generator / factory

#### P0.2 修正最明显的契约/类型不一致
优先对象：
- `LockForkMappingConfig.suppliers` 类型宽于真实契约

#### P0.3 处理试点里发现的“旧问题但非阻断”项
例如：
- lock page 中只填 `model` 会被 adapter 丢弃
- handle page 的 `useSystemDefaultStrategy` 只是 UI 状态，不是实时派生

### 优先级 P1
#### P1.1 选一个模块进入“后端真正承接标准字典”阶段
优先建议：
- packaging

原因：
- 它已经是最成熟的前端试点
- 后端默认 + 标准字典化的收益最直接
- 风险最低

#### P1.2 为其它规则型模块补统一的“只读默认值来源说明”
例如：
- 当前默认值来自 profile contract 还是 adapter fallback
- 用户为什么现在看到的是系统标准策略而不是可编辑表

---

## 5. 推荐的后续分支策略

已存在的试点分支：
- `feat/config-center-simplification-packaging`
- `feat/config-center-simplification-lock`
- `feat/config-center-simplification-handle`
- `feat/config-center-simplification-cylinder`
- `feat/config-center-simplification-lockfork`

建议下一阶段不要再继续开更多试点分支，而是选下面两条路线之一：

### Route A — 文档/共性收口
建议分支名：
- `docs/config-center-simplification-patterns`（当前分支）
- 或后续 `refactor/config-center-simplification-shared-patterns`

目标：
- 整理共享模式
- 决定哪些 helper 真要共享
- 明确哪些契约要先收窄/统一

### Route B — 从 packaging 进入真实后端承接
建议分支名：
- `feat/config-center-simplification-packaging-runtime`
- 或 `feat/config-center-simplification-packaging-dictionary`

目标：
- 真正把“标准字典”和“人工例外项”分层到后端/发布态

---

## 6. 结论
首轮试点已经回答了最关键的问题：

> 配置中心前端是否可以通过“系统默认 + 人工例外项”模式，显著减少用户显式配置复杂度？

答案是：**可以，但必须严格服从真实 contract 边界，并优先在最像“例外维护面”的区域落地。**

已验证的经验：
- Packaging：最适合作为标准模板
- Lock / Handle：规则型映射页也适合做“默认策略 + 例外项”
- Cylinder：高复杂页面应先从子页签切入
- LockFork：先尊重真实 contract，再谈更强能力

因此，下一步最合理的不是继续横向开试点，而是：
1. 收口共性模式
2. 修正最明显的契约/类型不一致
3. 再从 packaging 进入真正的后端承接阶段
