# 后端架构优化与重构详细方案 (2026-03-14)

> **当前状态：阶段一、二已完成 (Done)，进入阶段三重构期。**
> **最后更新：2026-03-14**

## 1. 总体目标
*   **消除混合态**：将 `server/` 目录下伪装成 `.ts` 的 CommonJS 代码彻底转化为标准的 ESM (TypeScript)。 [Phase 1 DONE]
*   **架构一致性**：全面推广 `Repository` 模式，实现业务逻辑与数据访问的解耦。 [Phase 2 DONE]
*   **功能补完**：实现物料匹配的模糊搜索与别名逻辑，提升系统智能化程度。 [Phase 2 DONE]
*   **错误治理**：解耦巨型错误转换逻辑，提升系统的可扩展性。 [Phase 3 Target]

---

## 2. 阶段优化路径

### 阶段一：基础设施“混合态”清理（稳定性基石） [COMPLETED]
**目标**：彻底解决 `server/app` 目录下 TS 文件中 `require`/`module.exports` 混用的不规范现状。

**已执行步骤**：
1.  **ESM 语法转换**： [DONE]
    *   将 `server/app/errors/AppError.ts`、`response.ts`、`validateRequest.ts` 中的 `require` 替换为 `import`。
    *   将 `module.exports` 替换为命名的 `export` 或 `export default`。
    *   移除无意义的 `export {}` 标记。
2.  **类型收紧**： [DONE]
    *   在 `response.ts` 中定义标准的 `ApiResponse` 接口。
    *   在 `validateRequest.ts` 中利用泛型增强 `req.body` 和 `req.query` 的类型推断。
3.  **兼容性加固**： [DONE]
    *   在 TS 核心文件中添加 `module.exports` 以确保现有 JS 路由/控制器能够无缝调用。
    *   同步重构了 `order.mapper.ts` 的导出，解决了 `normalizeError.ts` 的引用依赖。

### 阶段二：物料模块重构与算法增强（业务价值提升） [DONE]
**目标**：将遗留的 `MaterialService.js` 升级为符合模式规范的 TS 模块，并补齐智能匹配缺项。

**已执行步骤**：
1.  **引入 Repository 模式**： [DONE]
    *   新建 `server/services/materials/material.repository.ts`。
    *   封装了支持事务透传的 `findById`, `findByCode`, `findOneExact`, `findByAlias`, `findFuzzy` 等数据访问逻辑。
2.  **Service 层 TS 迁移**： [DONE]
    *   将 `MaterialService.js` 彻底迁移至 `MaterialService.ts`。
    *   注入了 `MaterialRepository`，并对业务逻辑进行了全量 `transaction` 传播支持。
    *   引入了“更新后回读（Re-fetch after update）”机制，确保了领域对象的数据一致性。
3.  **三级梯度匹配实现 (Smart Match)**： [DONE]
    *   实现了 **[精确匹配] -> [别名匹配] -> [模糊搜索]** 的智能化匹配流程。
    *   别名匹配：利用 SQLite 的 `json_each` 函数实现了对 JSON 数组内元素的精准搜索。
    *   模糊搜索：引入了基于 SQL `CASE WHEN` 的权重排序逻辑，支持更鲁棒的模糊匹配。
4.  **自动化验证**： [DONE]
    *   编写并运行了 `tests/material-smart-match.test.ts` 专项测试。
    *   回归验证了 `materials-workflow` 和 `formula-lifecycle` 相关测试。


### 阶段三：架构模式解耦与导出一致性（可维护性增强） [DONE]
**目标**：重构巨型单体逻辑，统一服务层的导出风格。

**已执行步骤**：
1.  **错误处理解耦 (Strategy Pattern)**： [DONE]
    *   引入了 `ErrorResolverRegistry` 注册中心，支持基于领域（Orders, Inventory）的动态错误解析。
    *   实现了自动初始化机制（Lazy Init），确保在测试和生产环境下逻辑均能自动激活。
    *   加固了属性提取逻辑，解决了 Error 对象不可枚举属性导致的 `details` 丢失问题。
2.  **服务导出规范化**： [DONE]
    *   为 `orders`, `inventory`, `formulas` 建立了标准的 `index.ts` 导出入口。
    *   通过 `.ts` 兼容性桥接文件（`OrderService.ts` 等）保持了对现有 CJS `require` 路径的向下兼容。
3.  **代码精简**： [DONE]
    *   精简了核心 `normalizeError.ts` 的逻辑，实现了真正的关注点分离。

### 阶段四：API 边界加固（长期演进）
**目标**：打通控制器（Controller）与路由（Route）的类型链路。

**优化步骤**：
1.  **控制器基类抽象**：
    *   定义 `BaseController`，集成 `response.ts` 中的标准化发送方法。
2.  **核心控制器 TS 迁移**：
    *   优先迁移 `MaterialController` 和 `OrderController`。
    *   利用 `Shared Contracts`（共享契约）为 API 的输入和输出提供强类型保障。
3.  **路由定义类型化**：
    *   在 `routes/` 中使用 Express 的 `Router` 类型，并显式标注中间件链的类型流转。

---

## 3. 验证与验收标准
*   **编译检查**：运行 `tsc --noEmit` 无任何类型错误。
*   **模块一致性**：整个 `server/app` 和 `server/services` 目录不再出现 `require` 关键字（除必要的配置加载外）。
*   **性能基准**：重构后的 `findSmartMatch` 算法在万级物料数据下的响应时间应在 50ms 以内。
*   **测试覆盖**：重构涉及的业务逻辑必须通过现有的 `tests/` 目录下的相关回归测试。
