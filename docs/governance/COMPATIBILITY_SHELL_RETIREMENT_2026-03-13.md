# Compatibility Shell 退场清单（2026-03-13）

> 用途：盘点当前仍保留的 compatibility shell 文件，明确“为什么还在、什么时候可以删、删之前需要满足什么条件”。

## 1. 当前保留的 compatibility shell

### 1.1 `server/services/OrderService.js`

- 当前定位：旧订单服务入口的兼容壳
- 当前实现：仅转发到 `server/services/orders`
- 保留原因：
  - 订单域已完成模块化拆分，但仓库内外仍可能存在旧入口引用
- 退场条件：
  - 仓库内不再有 `OrderService.js` 的旧入口引用
  - 外部脚本、测试夹具或手工运维脚本已迁移到 `server/services/orders`
  - `server/services/orders/index.js` 已作为唯一稳定入口被文档确认
- 最晚处理阶段：Week 8 后的 legacy 清理阶段

### 1.2 `server/services/InventoryReceiptService.js`

- 当前定位：旧 inventory receipt 服务入口的兼容壳
- 当前实现：仅转发到 `server/services/inventory`
- 保留原因：
  - inventory receipt 已迁入 `server/services/inventory/*`，但旧入口名仍可能被使用
- 退场条件：
  - 仓库内 inventory receipt 相关引用统一切到 `server/services/inventory`
  - inventory route / controller / tests 不再依赖旧服务入口名
- 最晚处理阶段：inventory 域二次清理阶段

### 1.3 `server/services/FormulaService.js`

- 当前定位：旧 formulas 服务入口的兼容壳
- 当前实现：仅转发到 `server/services/formulas`
- 保留原因：
  - formulas 后端已模块化，但仍保留旧入口，避免迁移阶段改动过大
- 退场条件：
  - 仓库内 formulas 相关引用全部切到 `server/services/formulas`
  - 文档、测试和脚本不再使用 `FormulaService.js` 作为入口名
- 最晚处理阶段：formulas 后端入口统一阶段

## 2. 统一退场规则

所有 compatibility shell 在删除前都必须满足：

1. 文件内容仅保留转发，不承载任何新逻辑。
2. 新代码不得继续引用旧入口。
3. 文档中必须明确新的唯一入口。
4. 删除前至少补一次 `rg` 级别的仓库内引用检查。
5. 删除后需要补最小回归验证，确认新入口链路仍可用。

## 3. 自动守护范围

当前自动守护只覆盖两件事：

1. compatibility shell 文件名单不被静默扩大。
2. 已登记的 compatibility shell 文件继续保持“单行转发”形态。

这份文档和 guard test 只用于“防扩散”，不代表这些壳文件可以长期保留。
