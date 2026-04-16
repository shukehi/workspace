# Week 1 执行清单：恢复可信健康基线（2026-04-16）

> 目标：把当前仓库从“状态不可信”恢复到“能稳定判断是否健康”。

---

## 1. 本周目标

把当前项目恢复到可以稳定回答下面问题：

- 类型检查是否可信？
- 测试结果是否可信？
- 当前失败是产品问题、类型边界问题，还是测试/运行环境问题？

本周完成标准：

```bash
npm run type-check
npm run type-check:server
npm test
npm run build
```

---

## 2. 当前问题拆分

本周先按 4 类问题拆开，不混着改：

### A. server type-check：module / alias / tsconfig 边界
相关文件：
- `tsconfig.server.json`
- `src/lib/packagingMatcher.ts`
- `src/services/poGenerator.ts`
- `src/services/sourceAnalysis.ts`

### B. server type-check：领域类型漂移
相关文件：
- `server/models/types.ts`
- `server/validators/order.validators.ts`
- `server/services/orders/order.service.ts`
- `server/services/orders/order.template.ts`
- `server/scripts/audit_po_quantity_history.ts`

### C. stale guard / spec drift
相关文件：
- `tests/config-table-guard.test.ts`
- `src/views/LockConfig.vue`

### D. print E2E harness / runtime
相关文件：
- `tests/print-document-customer-name.e2e.test.ts`
- `src/views/PrintDocument.vue`
- `server/routes/pdf.ts`
- `server/services/renderBaseUrl.ts`
- `scripts/dev.mjs`

---

## 3. 文件级执行顺序

### 第一批：先修 `type-check:server`
1. `tsconfig.server.json`
2. `server/models/types.ts`
3. `server/validators/order.validators.ts`
4. `server/services/orders/order.service.ts`
5. `server/services/orders/order.template.ts`
6. `server/scripts/audit_po_quantity_history.ts`
7. 观察 `src/lib/packagingMatcher.ts` / `src/services/poGenerator.ts` / `src/services/sourceAnalysis.ts` 是否还报错

### 第二批：修 stale guard
8. `tests/config-table-guard.test.ts`
9. `src/views/LockConfig.vue`（只在测试更新后仍不符时再改实现）

### 第三批：修 print E2E
10. `tests/print-document-customer-name.e2e.test.ts`
11. `src/views/PrintDocument.vue`（只有在 harness 修正后仍断言失败才动）
12. `server/routes/pdf.ts` / `server/services/renderBaseUrl.ts`（同上）

### 第四批：收尾
13. `docs/progress/REPO_HEALTH_BASELINE_2026-04-16.md`

---

## 4. 最小改动 patch 设计稿

## Patch 1：修 `tsconfig.server.json`

### 目标
让 `type-check:server` 能解析当前实际依赖的 `@/*` 与 shared 文件。

### 建议改法
```diff
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
+   "baseUrl": ".",
+   "paths": {
+     "@/*": ["src/*"]
+   },
+   "allowJs": true,
+   "checkJs": false,
    "types": ["node"]
  },
  "include": [
    "server/**/*.ts",
-   "server/**/*.d.ts"
+   "server/**/*.d.ts",
+   "src/**/*.ts",
+   "shared/**/*.js",
+   "shared/**/*.mjs"
  ]
}
```

### 验证
```bash
npm run type-check:server
```

---

## Patch 2：补齐 `OrderUpdateInput`

### 文件
- `server/models/types.ts`

### 建议改法
```diff
export interface OrderUpdateInput {
+   order_no?: string;
    supplier?: string | null;
    source_contract_code?: string | null;
    category?: string | null;
```

### 验证
```bash
npm run type-check:server
```

---

## Patch 3：补 validator 对 `order_no` 的更新校验

### 文件
- `server/validators/order.validators.ts`

### 建议改法
```diff
export function validateOrderUpdateBody(body: unknown): ValidationIssue[] {
  const issues = validateObjectBody(body);
  if (issues.length > 0) return issues;

  const payload = body as UnknownRecord;
+ pushIfPresentIsNotString(issues, payload, 'order_no');
  pushIfPresentIsNotString(issues, payload, 'supplier');
  pushIfPresentIsNotString(issues, payload, 'category');
```

### 验证
```bash
npm test -- tests/order-routes.test.ts
npm test -- tests/order-service.test.ts
```

---

## Patch 4：收口 `order.service.ts` 的更新单号逻辑

### 文件
- `server/services/orders/order.service.ts`

### 建议改法
```diff
const nextSupplier = data.supplier === undefined ? order.supplier : data.supplier;
+const nextOrderNo = data.order_no === undefined ? order.order_no : data.order_no;
const nextStatus = data.status === undefined
  ? normalizeStatus(order.status)
  : assertValidStatusTransition(order.status, data.status);

const mergedOrderForValidation: OrderCreateInput = {
- order_no: data.order_no === undefined ? order.order_no : data.order_no,
+ order_no: nextOrderNo,
  supplier: nextSupplier || '',
  category: nextCategory || '',
  ...
};

- await this.assertUniqueOrderNo(mergedOrderForValidation.order_no, id, transaction);
+ await this.assertUniqueOrderNo(nextOrderNo, id, transaction);
```

### 验证
```bash
npm run type-check:server
npm test -- tests/order-service.test.ts
```

---

## Patch 5：修 `order.template.ts` 的中间态对象类型

### 文件
- `server/services/orders/order.template.ts`

### 建议改法
```diff
export function ensureOrderTemplateType<T extends OrderMetadata | Record<string, unknown>>(
  metadata: T | null | undefined,
  categoryRaw: unknown,
): T {
- const next = metadata && typeof metadata === 'object'
-     ? { ...metadata }
-     : {};
+ const next: Record<string, unknown> = metadata && typeof metadata === 'object'
+     ? { ...metadata }
+     : {};

  const derivedTemplateType = deriveTemplateTypeFromCategory(categoryRaw);
  const templateType = derivedTemplateType || normalizeTemplateType(next.template_type, categoryRaw);
  if (!templateType) {
-     delete (next as Record<string, unknown>).template_type;
+     delete next.template_type;
      return next as T;
  }
```

### 验证
```bash
npm run type-check:server
```

---

## Patch 6：修 `audit_po_quantity_history.ts` 的 catalog 类型输入

### 文件
- `server/scripts/audit_po_quantity_history.ts`

### 建议改法
```diff
const { DataNormalizer } = await import('../../src/lib/erp-engine/dataNormalizer');
+type MaterialCatalogInput = Parameters<typeof DataNormalizer.normalizeMaterialCatalog>[0];

...

return {
  formulas,
- materials: DataNormalizer.normalizeMaterialCatalog(materialsCatalog as Record<string, unknown>),
+ materials: DataNormalizer.normalizeMaterialCatalog(materialsCatalog as MaterialCatalogInput),
  packagingMapping: packagingMapping || {},
```

### 验证
```bash
npm run type-check:server
```

---

## Patch 7：先不主动改 `packagingMatcher.ts` / `poGenerator.ts` / `sourceAnalysis.ts`

### 原则
先做完 Patch 1 后再看这些文件是否仍报错。

### 处理方式
```bash
npm run type-check:server
```

如果这些错误只是 `tsconfig.server.json` 导致，应自然消失。Week 1 不做 shared boundary 大重构。

---

## Patch 8：更新 stale guard，锁新语义

### 文件
- `tests/config-table-guard.test.ts`

### 建议改法
```diff
- assert.match(lockConfig, /v-model="previewPrimaryInput"/);
- assert.match(lockConfig, /v-model="previewSecondaryInput"/);
- assert.match(lockConfig, /showMatchTester = !showMatchTester/);
+ assert.match(lockConfig, /RuleExplainPlayground/);
+ assert.match(lockConfig, /useRuleExplainPreview/);
+ assert.match(lockConfig, /showRulePlayground = !showRulePlayground/);
+ assert.match(lockConfig, /主锁规则试跑/);
+ assert.match(lockConfig, /副锁规则试跑/);

- const testerIndex = lockConfig.indexOf('测试匹配');
+ const testerIndex = lockConfig.indexOf('规则试跑');
+
+ assert.match(lockConfig, /:fields="lockExplainFields"/);
```

### 验证
```bash
npm test -- tests/config-table-guard.test.ts
```

---

## Patch 9：修 print E2E 的启动方式，不先改页面逻辑

### 文件
- `tests/print-document-customer-name.e2e.test.ts`

### 问题
当前测试使用：
```ts
spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT)], ...)
```
但 `npm run dev` 实际走 `scripts/dev.mjs`，不会透传 `--host` / `--port`。

### 推荐改法
```diff
- const devServer = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
+ const devServer = spawn('npm', ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
```

### 原因
这个测试只依赖前端页面 `/print-document`，snapshot API 已被拦截 mock，不需要联动后端。

### 验证
```bash
npm test -- tests/print-document-customer-name.e2e.test.ts
npm test
```

---

## Patch 10：补 Week 1 健康基线文档

### 文件
- `docs/progress/REPO_HEALTH_BASELINE_2026-04-16.md`

### 建议结构
```md
# Repo Health Baseline

## 当前基线
- npm run type-check: ...
- npm run type-check:server: ...
- npm test: ...

## 失败分类
1. TS config / path boundary
2. Order update contract drift
3. Config guard stale expectations
4. Print E2E harness issue

## Week 1 目标
- 所有门禁绿
- 失败项全部归类并清空
- Week 2 可进入结构重构

## 结果
- 修复项
- 剩余项
- 风险说明
```

---

## 5. 执行命令顺序

### 第一步
```bash
npm run type-check:server
```

### 第二步：做 Patch 1~6
修完后：
```bash
npm run type-check:server
```

### 第三步：做 Patch 8
```bash
npm test -- tests/config-table-guard.test.ts
```

### 第四步：做 Patch 9
```bash
npm test -- tests/print-document-customer-name.e2e.test.ts
```

### 第五步：全量回归
```bash
npm run type-check
npm run type-check:server
npm test
npm run build
```

---

## 6. Week 1 明确不做的事

这一周明确不要做：

1. 不拆 `src/views/Inventory.vue`
2. 不拆 `server/services/orders/order.service.ts` 的结构
3. 不拆 `src/lib/erp-engine/dataExtractors.ts`
4. 不统一 config workflow
5. 不做 docs 大迁移

这些都属于 Week 2 以后。

---

## 7. Week 1 进入 Week 2 的条件

只有满足下面条件，才进入 Week 2：

- `npm run type-check` 绿
- `npm run type-check:server` 绿
- `npm test` 绿
- `npm run build` 绿
- 健康基线文档已更新
- 当前失败项已全部分类清楚

---

## 8. 一句话总结

如果只做 Week 1，优先只做这 6 件事：

1. 修 `tsconfig.server.json`
2. 给 `OrderUpdateInput` 补 `order_no`
3. 给 `validateOrderUpdateBody()` 补 `order_no`
4. 把 `order.service.ts` 里的 `nextOrderNo` 抽出来
5. 把 `order.template.ts` 的中间态显式成 `Record<string, unknown>`
6. 把 print E2E 从 `npm run dev` 改成 `npm run dev:web`

这通常就能先把 Week 1 的主要红灯打掉。
