# 阶段 A 任务清单：Source 分析层拆分（2026-03-10）

> 状态：历史阶段文档。
> 当前 source-analysis 收敛结果请优先查看 `docs/archive/roadmaps/WEEK7_MATERIALS_SOURCE_ANALYSIS_CHECKLIST_2026-03-13.md`。

## 1. 目标

在不改变 Source、Materials、PO 生成结果的前提下，将分析逻辑从 [`src/stores/useSourceStore.ts`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts) 中拆出，形成可独立测试、可复用、可替换配置来源的分析层。

本阶段完成后：

1. `useSourceStore` 不再直接编排材料分解和五金提取细节。
2. 分析逻辑拥有明确输入输出接口。
3. 后续阶段可以在不改 Source store 主体的前提下替换配置读取策略。

## 2. 范围

包含：

1. Source 分析 service/composable 抽取
2. 分析结果类型定义
3. `useSourceStore` 内部职责收缩
4. 对现有调用方的兼容适配
5. 必要的单测或快照基线

不包含：

1. 历史合同 store 拆分
2. `configLoader` repository 化
3. 采购页拆分
4. PO 生成规则改写

## 3. 现状边界

当前 [`calculateMaterials()`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts#L214) 混合了以下职责：

1. 确保配置装载完成
2. 刷新公式
3. 选择目标 items
4. 构造分析输入
5. 调用材料分解引擎
6. 调用锁芯、把手、锁叉、包装提取器
7. 回写 store 状态
8. 统一错误处理

这意味着任何一个依赖分析结果的流程都必须经过 Pinia store 和全局 `configLoader`，边界不清晰。

## 4. 目标结构

建议新增以下结构：

```text
src/
├── services/
│   └── sourceAnalysis.ts
├── types/
│   └── sourceAnalysis.ts
└── stores/
    └── useSourceStore.ts
```

如团队更偏向 feature 目录，也可落到：

```text
src/
└── features/
    └── source/
        ├── analyzeSourceOrder.ts
        └── types.ts
```

本阶段优先目标不是目录风格统一，而是接口边界稳定。

## 5. 新接口草案

建议定义统一输入输出接口。

输入：

```ts
type SourceAnalysisInput = {
  order: any;
  items?: any[];
  config: {
    formulas: Record<string, any>;
    materials: Record<string, any>;
    cylinderMapping: unknown;
    handleMapping: unknown;
    lockForkMapping: unknown;
    packagingMapping: unknown;
  };
};
```

输出：

```ts
type SourceAnalysisResult = {
  materialRequirements: any;
  hardwareRequirements: {
    cylinders: any[];
    handles: any[];
    lockForks: any[];
    packaging: Record<string, any> | any[];
  };
  flatMaterials: any[];
  flatCylinders: any[];
  flatHandles: any[];
  flatForks: any[];
  flatPackaging: any[];
};
```

函数签名建议：

```ts
export function analyzeSourceOrder(input: SourceAnalysisInput): SourceAnalysisResult
```

另建议补一个配置快照装配函数：

```ts
export async function loadSourceAnalysisConfig(): Promise<SourceAnalysisConfig>
```

注意：

1. 真正的纯函数应是 `analyzeSourceOrder()`。
2. `loadSourceAnalysisConfig()` 可以暂时依赖 `configLoader`，但应与分析函数分离。

## 6. 文件级任务

### 任务 A1：新增分析类型定义

目标文件：

1. [`src/types/sourceAnalysis.ts`](/Users/aries/Dve/workspace/src/types/sourceAnalysis.ts)

内容：

1. `SourceAnalysisConfig`
2. `SourceAnalysisInput`
3. `SourceAnalysisResult`
4. `HardwareRequirements`

验收：

1. 类型名称可以准确表达分析边界。
2. `useSourceStore` 不再大量裸用 `any` 来描述分析结果。

### 任务 A2：新增纯分析 service

目标文件：

1. [`src/services/sourceAnalysis.ts`](/Users/aries/Dve/workspace/src/services/sourceAnalysis.ts)

内容：

1. 接收 `order + items + config`
2. 构造 `_originOrder` / `_originIndex`
3. 调用 `calculateMaterialRequirements`
4. 调用各类 extractor
5. 返回统一结果对象
6. 内部可包含 `flattenMaterialRequirements()` 等小型纯辅助函数

约束：

1. 不在该文件内调用 `api`
2. 不在该文件内读写 `localStorage`
3. 不在该文件内直接操作 Pinia state

验收：

1. 输入相同则输出稳定。
2. 可以在 Node 测试环境下直接调用。

### 任务 A3：新增配置快照装配函数

目标文件：

1. [`src/services/sourceAnalysis.ts`](/Users/aries/Dve/workspace/src/services/sourceAnalysis.ts) 或独立的 [`src/services/sourceAnalysisConfig.ts`](/Users/aries/Dve/workspace/src/services/sourceAnalysisConfig.ts)

内容：

1. `await configLoader.loadAll()`
2. `await configLoader.refreshFormulas()`
3. 返回一次性的 config snapshot

目的：

1. 让 `useSourceStore` 不再知道配置字段细节。
2. 为后续 repository 化留下替换点。

验收：

1. store 仅依赖“加载配置快照”这个入口。
2. 后续阶段替换 `configLoader` 时不需要再次修改分析函数。

### 任务 A4：收缩 `useSourceStore`

目标文件：

1. [`src/stores/useSourceStore.ts`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts)

具体改动：

1. 保留 `currentOrder`、`loading`、`error`、快照恢复、合同应用等主链状态。
2. 将 `calculateMaterials()` 改为：
   - 加载配置快照
   - 调用 `analyzeSourceOrder()`
   - 将结果回写到 `materialRequirements` / `hardwareRequirements`
3. 将 `flatMaterials`、`flatCylinders`、`flatHandles`、`flatForks`、`flatPackaging` 改为优先从分析结果对象中读取，避免重复变换逻辑散落在 store。

验收：

1. `useSourceStore` 内不再出现材料分解与 extractor 细节调用。
2. store 中保留的分析相关代码主要是调度和状态回写。

### 任务 A5：兼容调用方

目标文件：

1. [`src/views/Source.vue`](/Users/aries/Dve/workspace/src/views/Source.vue)
2. [`src/views/Materials.vue`](/Users/aries/Dve/workspace/src/views/Materials.vue)
3. [`src/services/poGenerator.ts`](/Users/aries/Dve/workspace/src/services/poGenerator.ts)
4. [`src/components/source/GeneratePODialog.vue`](/Users/aries/Dve/workspace/src/components/source/GeneratePODialog.vue)

处理原则：

1. 第一阶段不主动改对外字段名。
2. 如果新分析层已经能提供更完整结果，也先通过 store 做兼容导出。

验收：

1. 调用方无需同步大面积改动。
2. 本阶段的 diff 主要集中在 Source 域。

### 任务 A6：补测试与基线

建议新增：

1. [`tests/source/sourceAnalysis.spec.ts`](/Users/aries/Dve/workspace/tests/source/sourceAnalysis.spec.ts)
2. 如已有样本，可补充 fixture 到 `tests/fixtures/`

至少覆盖：

1. 空 items 输入时返回空结果
2. 单合同样本的材料分析结果
3. 五金提取结果结构
4. `flatMaterials` / `flatPackaging` 的派生结果

验收：

1. 分析 service 可独立测试。
2. 后续如果调整配置层，可快速发现分析输出回归。

## 7. 推荐提交顺序

建议拆成 4 个提交：

1. 提交 1：新增类型和纯分析 service，不改 store 行为
2. 提交 2：`useSourceStore` 切到新分析层，保证页面行为不变
3. 提交 3：补测试和基线样本
4. 提交 4：小范围清理旧注释、重复转换逻辑和无用 import

这样做的原因：

1. 便于确认回归点
2. 便于独立 review 纯函数层
3. 出现问题时容易只回退 store 接线而不丢分析实现

## 8. 实施步骤

### 步骤 1

新增 [`src/types/sourceAnalysis.ts`](/Users/aries/Dve/workspace/src/types/sourceAnalysis.ts)，定义输入输出类型。

### 步骤 2

新增 [`src/services/sourceAnalysis.ts`](/Users/aries/Dve/workspace/src/services/sourceAnalysis.ts)，先完成纯函数 `analyzeSourceOrder()`。

### 步骤 3

在同文件或新文件中补 `loadSourceAnalysisConfig()`，暂时封装 `configLoader`。

### 步骤 4

修改 [`src/stores/useSourceStore.ts`](/Users/aries/Dve/workspace/src/stores/useSourceStore.ts)，将旧 `calculateMaterials()` 改造成调度层。

### 步骤 5

跑通 Source 页面、Materials 页面、PO 生成 smoke 检查。

### 步骤 6

补 `tests/source/sourceAnalysis.spec.ts`，锁定至少一个典型合同样本的输出结构。

## 9. 风险点

1. `flatMaterials` 当前由 store 内 computed 计算，迁移后若输出格式变化，Materials 页面可能出现字段丢失。
2. `currentOrder.value.code` 与 `targetItems` 的 `_originIndex` 注入方式一旦变化，PO 生成或后续关联逻辑可能受影响。
3. 如果分析结果对象被设计得过于依赖当前 UI 展示字段，后续又会形成新的耦合层。
4. 若本阶段顺手修改类型过多，可能把“职责拆分”演变为“领域模型重写”。

## 10. 验证清单

本阶段结束后，至少执行：

1. `npm run type-check`
2. `npm test`
3. `npm run build`
4. 加载一个合同，确认 Source 页面分析结果正常
5. 打开 Materials 页面，确认材料汇总与五金分类正常
6. 打开历史合同后加载到当前合同，确认分析仍可正常刷新
7. 执行一次 PO 生成主流程 smoke 检查

## 11. 完成标准

满足以下条件即可视为阶段 A 完成：

1. 分析逻辑已从 `useSourceStore` 中提取为独立 service。
2. `useSourceStore` 仅负责分析调度和状态承接，不再承载算法细节。
3. Source、Materials、PO 生成流程输出与重构前一致。
4. 至少存在一组自动化基线用于锁定分析输出。
