# 配置中心重构实施方案 V1（2026-04-21）

## 1. 背景

当前配置中心已经承担了**运行时规则真源**的职责，但在结构上仍更接近“多页面配置集合”，而不是统一的配置平台。

基于当前仓库只读分析，配置中心已经直接影响：
- 前端启动门禁（`src/main.ts`、`src/services/configLoader.ts`）
- 原始订单分析与物料拆解（`src/services/sourceAnalysis.ts`）
- 自动采购单生成（`src/services/poGenerator.ts`）
- 包装/锁芯/锁具/拉手/锁叉等规则匹配结果（`src/views/*Config.vue`、`src/services/po-rules/*`）

因此，本次重构目标不是“美化配置页”，而是把配置中心升级为：
- 统一版本化配置平台
- 统一运行时快照源
- 主数据 + 规则 + 发布三层结构

---

## 2. 当前问题清单

### 2.1 运行时真源分散
当前前端运行时依赖多次加载：
- material catalog
- formulas
- published mappings（packaging / cylinder / lock / handle / lock_fork）

对应入口：
- `src/services/configLoader.ts`
- `src/services/configRepository.ts`
- `src/main.ts`

问题：
- 启动链路分散
- 失败边界不统一
- 难以回答“当前页面到底基于哪一版配置运行”

### 2.2 Workflow API 与 legacy API 并存
当前后端同时提供：
- workflow 路由：
  - `server/routes/mappingsConfig.ts`
  - `server/routes/materialsConfig.ts`
  - `server/routes/formulasConfig.ts`
- legacy 兼容路由：
  - `server/routes/configData.ts`

问题：
- 协议重复
- 新旧入口共存增加维护成本
- 前端需要理解多套配置入口

### 2.3 前端配置页重复度高
包装、锁芯、锁具、拉手、锁叉、物料目录页面都重复了：
- load / reset / validate / save / publish / refreshRuntime
- 表格编辑器状态机
- issue 定位逻辑

对应入口：
- `src/views/PackagingConfig.vue`
- `src/views/CylinderConfig.vue`
- `src/views/LockConfig.vue`
- `src/views/HandleConfig.vue`
- `src/views/LockForkConfig.vue`
- `src/views/MaterialCatalogConfig.vue`
- `src/features/config-editor/composables/useMappingConfigEditor.ts`

### 2.4 主数据与规则配置混杂
当前配置页中大量直接维护：
- supplier
- materialCode
- vendorName
- unit
- category

问题：
- 规则层直接承载主数据文本
- 缺少统一引用
- 难做影响分析、引用校验、删除保护

### 2.5 运行时刷新是“页面级补丁”，不是“版本化快照”
当前保存配置后，前端通过 `refresh*Runtime()` 局部刷新内存配置。

问题：
- 无统一 runtime version
- 无法追踪某次分析/生成基于哪版配置
- 不利于后续做 diff 与问题回放

---

## 3. 重构目标

### 3.1 目标
1. 统一配置中心的后端协议与前端消费方式
2. 引入**运行时快照（runtime config snapshot）**作为唯一运行时真源
3. 将配置域拆分为：
   - 主数据层
   - 规则层
   - 发布层
4. 保留现有业务能力与 legacy 兼容壳，避免一次性硬切
5. 为未来的影响分析、回放、引用校验打基础

### 3.2 非目标
本轮不直接做：
- 全量重写所有配置页 UI
- 全量重建供应商/物料主数据平台
- 一次性删除所有 legacy 接口
- 同步重构采购/库存业务交易域

---

## 4. 目标架构

## 4.1 三层模型

### A. 主数据层（Master Data）
负责维护稳定、可复用的基础对象：
- 物料目录 / 物料主档
- 供应商主档（后续新增）
- 分类、单位、规格字典（后续新增）

### B. 规则层（Rules）
负责维护“什么时候用什么对象”：
- packaging
- cylinder
- lock
- handle
- lock_fork
- formulas

### C. 发布层（Publishing）
负责管理配置生命周期：
- draft
- publish
- rollback
- revisions
- audit logs

---

## 4.2 运行时快照层

新增统一接口：
- `GET /api/runtime/config-snapshot`

建议返回结构：

```json
{
  "version": "2026-04-21T10:30:00Z#cfg-128",
  "publishedAt": "2026-04-21T10:30:00Z",
  "profiles": {
    "material_catalog": {},
    "formulas": {},
    "packaging": {},
    "cylinder": {},
    "lock": {},
    "handle": {},
    "lock_fork": {}
  }
}
```

原则：
- 前端启动只拉一次 snapshot
- 业务层只读 snapshot，不再分别请求各 profile
- snapshot version 可用于日志、排错、问题回放

---

## 5. 后端设计

## 5.1 统一 profile 协议
将现有：
- mappings workflow
- materials catalog workflow
- formulas workflow

统一到同一协议表面：

- `GET /api/config/profiles`
- `GET /api/config/profiles/:code`
- `GET /api/config/profiles/:code/detail`
- `PUT /api/config/profiles/:code/draft`
- `POST /api/config/profiles/:code/publish`
- `POST /api/config/profiles/:code/rollback`
- `GET /api/config/profiles/:code/revisions`
- `GET /api/config/profiles/:code/audit-logs`

其中 profile code 示例：
- `material_catalog`
- `formulas`
- `packaging`
- `cylinder`
- `lock`
- `handle`
- `lock_fork`

### 保留兼容层
保留：
- `/api/config/packaging`
- `/api/config/cylinder`
- `/api/config/lock`
- `/api/config/handle`
- `/api/config/lock-fork`
- `/api/config/materials`

但内部只做桥接，不再承载真实工作流逻辑。

---

## 5.2 统一后端模块边界
建议新增：

```text
server/services/config-platform/
  profile.registry.ts
  profile.service.ts
  profile.repository.ts
  profile.snapshot.ts
  profile.types.ts
```

职责：
- profile registry：声明每个 profile 的 code / domain / validator / adapter
- profile service：统一 detail/draft/publish/rollback
- snapshot service：聚合 published payload，生成 runtime snapshot

现有模块保留业务实现，但通过 registry 接入：
- `server/services/mappings/*`
- `server/services/materials/*`
- `server/services/formulas/*`

---

## 5.3 统一配置快照聚合
新增：
- `server/routes/runtimeConfig.ts`
- `server/services/config-platform/profile.snapshot.ts`

职责：
- 读取所有 published payload
- 生成一个聚合快照
- 附带统一 version / publishedAt / profile revisions

可扩展字段：

```json
{
  "version": "...",
  "profiles": { ... },
  "meta": {
    "revisions": {
      "packaging": 12,
      "cylinder": 8
    }
  }
}
```

---

## 6. 前端设计

## 6.1 运行时消费改造
现有：
- `ConfigLoaderService` 分别读取 materials / formulas / mappings

目标：
- 改为优先读取 `/api/runtime/config-snapshot`
- `configLoader` 内部只负责：
  - load snapshot
  - 反序列化到 runtime memory
  - 暴露统一 getters

即：
- `readMaterials/readFormulas/readMapping` 逐步退化为兼容逻辑
- snapshot 成为运行时唯一入口

---

## 6.2 配置中心 UI 分层
建议拆为：

### A. ConfigCenterShell
统一提供：
- profile 导航
- latest/draft/published revision 展示
- audit logs
- save/publish status
- diff 入口

### B. ProfileEditorHost
统一提供：
- load/save workflow
- issue 展示
- revision 刷新
- runtime refresh / snapshot refresh

### C. Profile-specific renderer
每个 profile 只关心：
- schema
- payload editor
- rule playground
- local validation
- payload adapter

这样可以让 `useMappingConfigEditor` 演进为更通用的 `useProfileEditor`。

---

## 6.3 页面分层原则
### 主数据配置页
如：
- material catalog
- 未来 supplier master

不建议长期停留在“直接编辑 JSON”。
应逐步演进为：
- 搜索
- 筛选
- 引用校验
- 结构化 CRUD

### 规则配置页
如：
- packaging / cylinder / lock / handle / lock_fork / formulas

应统一提供：
- 编辑器
- 规则试跑
- 命中解释
- fallback 说明
- 覆盖率/冲突校验

---

## 7. 分阶段实施顺序

## Phase 0：冻结边界与术语（低风险）
### 目标
把现状、术语和迁移边界写清楚。

### 任务
1. 固化本方案文档
2. 建立 profile code 与 legacy endpoint 对照表
3. 明确哪些字段属于主数据、哪些属于规则

### 产物
- 本文档
- profile registry 草案

---

## Phase 1：统一运行时快照（P0）
### 目标
把前端启动链路收口到一个 snapshot。

### 后端
1. 新增 `GET /api/runtime/config-snapshot`
2. 聚合 published payload：
   - material catalog
   - formulas
   - packaging
   - cylinder
   - lock
   - handle
   - lock_fork
3. 返回统一 version / revisions meta

### 前端
4. 修改 `configRepository` / `configLoader` 优先读取 snapshot
5. `src/main.ts` 启动只依赖 snapshot 成功与否
6. 记录当前 runtime version（后续用于日志和问题回放）

### 验收标准
- 前端启动不再发起多次 published 配置请求
- snapshot 缺失时阻断应用启动
- 页面运行结果与改造前一致

---

## Phase 2：统一 profile workflow 协议（P1）
### 目标
收口后端配置协议，但不打断现有页面。

### 任务
1. 新增 `config-platform` 服务层
2. 将 materials / mappings / formulas 接入统一 profile registry
3. 暴露统一 `/api/config/profiles/:code/*`
4. legacy 路由内部改为桥接统一 workflow

### 验收标准
- 新旧接口返回的 published 结果一致
- revision / audit 能从统一协议拿到
- legacy 页面无需立即改动即可继续使用

---

## Phase 3：前端配置中心平台壳（P1）
### 目标
收口前端 workflow、审计、revision 与 runtime refresh。

### 任务
1. 新增 `ConfigCenterShell`
2. `useMappingConfigEditor` 抽象成 `useProfileEditor`
3. 统一：
   - load
   - save draft
   - publish
   - rollback
   - refresh runtime
4. 优先迁移页面：
   - packaging
   - lock
   - cylinder
   - handle
   - lock_fork

### 验收标准
- 各配置页不再重复实现 workflow 逻辑
- 页面 UI 可保持原样，但数据流统一

---

## Phase 4：主数据层显式化（P2）
### 目标
减少规则层中的自由文本主数据。

### 先从最小骨架开始
1. 统一物料引用：
   - 让规则优先引用 `material_id` / 标准 code
2. 新增供应商主数据草案：
   - supplier profile 或 supplier master table
3. 为规则层增加引用校验：
   - 配置中引用的 material code 是否存在
   - supplier 是否有效

### 验收标准
- 至少 material 引用具备显式校验能力
- 规则保存前可发现失效引用

---

## Phase 5：Diff / Impact / Replay（P3）
### 目标
把配置中心升级成可解释、可回放的平台。

### 任务
1. profile diff viewer
2. 发布前 impact summary
3. 样本回放：
   - 用最近 N 条 source order 回放配置变化前后的差异
4. runtime version 与生成结果关联

### 验收标准
- 能回答“这次配置发布会影响什么”
- 能回答“某张采购单是基于哪版配置生成的”

---

## 8. 风险与控制

### 风险 1：snapshot 聚合后，单 profile 容错策略改变
控制：
- 先保持与当前 bootstrap 语义一致：
  - materials + mappings fail-closed
  - formulas 可按现状保留软失败，或在 snapshot 内显式标注 degraded 状态

### 风险 2：legacy 页面依赖旧接口结构
控制：
- Phase 2 前不删除 legacy
- 对 legacy 做契约测试

### 风险 3：主数据层改造过早扩大范围
控制：
- 先只做“引用校验”，不急着做全量主数据平台

### 风险 4：前端页面大规模同时迁移
控制：
- 先迁移 workflow 外壳，再逐页接入 renderer

---

## 9. 建议的近期执行优先级

### 立即执行（本轮）
1. Phase 1：runtime snapshot
2. 补 profile registry 草案
3. 保持页面不重写，只改运行时加载入口

### 第二轮执行
4. Phase 2：统一 profile workflow 协议
5. 收口 legacy 桥接

### 第三轮执行
6. Phase 3：前端配置中心平台壳

---

## 10. 当前建议的第一张执行票

### Ticket: 引入统一 runtime config snapshot

#### 目标
让前端启动从多路配置请求切换为单路 snapshot 请求。

#### 后端任务
- 新增 `server/routes/runtimeConfig.ts`
- 新增 `server/services/config-platform/profile.snapshot.ts`
- 聚合 published payload
- 在 `server/routes/index.ts` 注册 `/api/runtime/config-snapshot`

#### 前端任务
- 新增 snapshot repository
- 修改 `configLoader` 优先走 snapshot
- 记录 runtime version
- 保留旧逻辑作为临时 fallback（可配开关）

#### 验收
- 启动配置请求数显著下降
- 配置缺失时阻断语义不变
- source analysis / PO generation 行为不变

---

## 11. 总结

本次重构不应被理解为“把几个配置页写得更漂亮”，而应被理解为：

> 将当前项目的配置中心从“多配置页集合”升级为“统一版本化业务规则平台”。

V1 的最小正确路径是：
1. 先统一运行时快照
2. 再统一 profile workflow
3. 然后再做前端平台壳与主数据收口

这样既能降低当前复杂度，又能控制迁移风险。
