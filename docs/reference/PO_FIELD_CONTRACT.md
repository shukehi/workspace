# PO Field Contract

> 状态：现行参考文档。
> 当前采购字段语义或展示口径变化时，应优先同步更新本文档。

本文件定义采购订单从“ERP 原始字段”到“订单存储字段”再到“打印预览字段”的固定契约，目标是避免字段错位、语义混用和隐式回退造成的线上问题。

## 1. Core Rule

- `supplier`：供应商名称（采购对象）
- `internal_name`：内部名称（系统内部/ERP 原名）
- `external_name`：外协名称（对外显示名称）
- `type`：产品名称/型号（按业务类别解释）
- `spec`：规格尺寸
- `mb`：门边
- `eccentricity`：偏心（锁芯专用）
- `quantity_left` / `quantity_right`：左右数量（包装 / 拉手 / 锁具）
- `quantity`：总数量
- `metadata.aggregateSideQuantities`：数量展示开关；`true` 时预览/打印/PDF 优先显示总数量列
- `metadata.riskWarningDismissed`：订单级风险提示人工取消标记；仅影响 `!` 风险展示与筛选，不改变明细原始风险原因

禁止用 `remark` 承担结构化字段语义（仅允许人工备注和调试信息）。

## 2. Category Contract

### 2.1 包装（category = `包装`）

ERP 输入：

- `bz` -> `internal_name`
- `spec` -> `spec`
- `mb` -> `mb`
- `qty` -> `quantity_left/quantity_right/quantity`

订单项输出（OrderItem）：

- `supplier` = `packaging-mapping.json` 顶层 `supplierName`
- `internal_name` = ERP `bz`
- `external_name` = `packaging-mapping.mappings[bz]` 或 matcher 结果
- `name` = `external_name`
- `model` = `spec`
- `spec` = `spec`
- `mb` = `mb`
- `quantity_left/quantity_right/quantity`

打印预览读取：

- 内部名称：`internal_name`
- 外协名称：`external_name`
- 规格：`spec`
- 门边：`mb`
- `metadata.aggregateSideQuantities = false`：显示 `quantity_left/quantity_right`
- `metadata.aggregateSideQuantities = true`：显示 `quantity`

### 2.2 锁芯（category = `锁芯`）

提取层输入（extractCylinderData）：

- `type`（锁芯型号）
- `eccentricity`（偏心）
- `quantity`
- `supplier`
- `remark`

订单项输出（OrderItem）：

- `supplier`
- `type`
- `eccentricity`
- `name` = `type`
- `model/spec` = `type`
- `quantity`
- `remark`

打印预览读取：

- 锁芯型号：`type`
- 偏心：`eccentricity`
- 数量：`quantity`
- 备注：`remark`

### 2.3 锁叉（category = `锁叉`）

提取层输入（extractLockForkData）：

- `type`（产品名称）
- `spec`（规格）
- `quantity`
- `supplier`
- `remark`

订单项输出（OrderItem）：

- `supplier`
- `type`
- `spec`
- `name` = `type`
- `model` = `spec`
- `quantity`
- `remark`

打印预览读取：

- 产品名称：`type`
- 规格：`spec`
- 数量：`quantity`
- 备注：`remark`

### 2.4 锁具（category = `锁具`）

提取层输入（extractLockData）：

- `type`（产品名称）
- `spec`（主锁/副锁规格）
- `quantity_left`
- `quantity_right`
- `quantity`
- `supplier`
- `remark`

订单项输出（OrderItem）：

- `supplier`
- `type`
- `spec`
- `name` = `type`
- `model` = `spec`
- `quantity_left`
- `quantity_right`
- `quantity`
- `remark`

打印预览读取：

- 产品名称：`type`
- 规格：`spec`
- `metadata.aggregateSideQuantities = false`：显示 `quantity_left/quantity_right`
- `metadata.aggregateSideQuantities = true`：显示 `quantity`
- 备注：`remark`

规则说明：

- 锁具来源字段：ERP `sj / fssj`
- 数量来源：ERP `qty`
- 当 `spec` 第 3 段包含 `内开` 时，左右数量互换
- `unit` 来自 `lock-mapping.json.defaultUnit`
- `remark` 仅使用 `lock-mapping.json.mappings[*].remark`
- 未命中型号映射时，`supplier` 固定标记为 `待人工处理`

### 2.5 拉手（category = `拉手`）

提取层输入（extractHandleData）：

- `materialId`（优先来自 `handle` 映射配置中的 `materialCode`）
- `type`（产品名称）
- `spec`（规格）
- `quantity_left`
- `quantity_right`
- `quantity`
- `supplier`
- `remark`

订单项输出（OrderItem）：

- `material_id` = `materialId || type`
- `supplier`
- `type`
- `spec`
- `name` = `type`
- `model` = `spec`
- `quantity_left`
- `quantity_right`
- `quantity`
- `remark`

打印预览读取：

- 产品名称：`type`
- 规格：`spec`
- `metadata.aggregateSideQuantities = false`：显示 `quantity_left/quantity_right`
- `metadata.aggregateSideQuantities = true`：显示 `quantity`
- 备注：`remark`

## 3. Validation Requirement

生成订单时必须通过两层校验：

- 类别校验（按 category 的必填字段）
- 通用校验（`material_id/name/model/quantity/unit`）

手动录入采购单额外约束：

- 仅当 `metadata.order_source = manual` 时生效
- 订单头至少要求：`order_no`、`supplier`、`metadata.customer_name`、`delivery_date`
- 明细至少保留 1 条有效行；纯空白占位行不得作为有效明细落库
- 有效明细必须满足：
  - 产品名称有效
  - 规格有效
  - 数量大于 0
- 对包装 / 锁具 / 拉手这类支持左右数量的采购单，数量校验优先使用 `quantity_left + quantity_right`，无左右数量时才回退 `quantity`

更新约束：

- `draft / submitted / processing` 状态下，手动单更新沿用完整录入校验
- `arrived / completed` 状态下，订单明细、供应商、客户名称等字段已锁定；此时只允许校验当前仍可编辑的字段（如 `delivery_date`、整单备注），不得因为历史脏数据阻断合法更新

当前实现位置：

- 前端手动录入校验：`/src/features/procurement/manualOrderValidation.ts`
- 前端录入/编辑弹窗：`/src/components/procurement/EditOrderDialog.vue`
- 后端创建/更新校验：`/server/services/orders/order-create.validation.ts`
- 后端订单更新入口：`/server/services/orders/order.service.ts`

## 4. Header Display Contract

订单头部的 `customer_name` 需要区分“存储值”和“显示值”：

- 存储值：始终保存完整客户名称，例如 `外贸马其顿Orient（三部）`
- 编辑模式：显示完整客户名称
- 预览模式：显示完整客户名称
- 打印和导出 PDF：若客户名称包含销售部门括号，则只显示括号中的部门，例如 `三部`

说明：

- 打印格式化只影响展示，不得回写或覆盖订单存储中的 `metadata.customer_name`
- 预览/编辑与打印/PDF 的显示规则不同，修改客户名称展示时必须分别检查

当前实现位置：

- 完整名称展示：`/src/components/procurement/OrderSheetView.vue`
- 打印/PDF 部门提取：`/src/features/procurement/customerName.ts`
- 打印页入口：`/src/views/PrintDocument.vue`

## 5. Risk Display Contract

采购订单风险提示需要区分“风险检测结果”和“人工处理状态”：

- 风险检测结果来自明细命中规则后的实时判断，不得写回覆盖原始明细字段
- `metadata.riskWarningDismissed = true` 时，采购列表、编辑页、风险筛选与风险计数都应视为“已人工取消 ! 警告”
- 若订单后续已不再命中风险条件，允许在保存时自动清掉 `riskWarningDismissed`

当前实现位置：

- 风险判断：`/src/features/procurement/orderRisk.ts`
- 编辑页人工取消入口：`/src/components/procurement/EditOrderDialog.vue`
- 列表服务端筛选：`/server/services/orders/order.repository.ts`

## 6. Date Display Contract

订单日期字段在采购管理列表、预览、打印/PDF 中都必须按同一“业务日期”口径展示：

- `created_at` / `delivery_date` 的展示值统一使用 `YYYY-MM-DD`
- 展示时优先保留源值中的日期部分，不允许因为浏览器本地时区转换出现前后一天偏移
- 采购管理列表与预览模式必须显示一致的 `交货日期`

当前实现位置：

- 采购管理列表：`/src/components/procurement/ProcurementColumns.ts`
- 预览/编辑展示：`/src/components/procurement/OrderSheetView.vue`
- 日期归一化：`/src/features/procurement/docModel.ts`

## 7. Title Display Contract

采购订单相关页面的主标题必须统一使用：

- `颐家工贸 (  总厂  ) 采购订单`

适用范围：

- 预览/编辑主视图：`/src/components/procurement/OrderSheetView.vue`
- 预览弹窗标题：`/src/components/procurement/ProcurementPreviewModal.vue`
- 编辑/手动录入弹窗标题：`/src/components/procurement/EditOrderDialog.vue`
- 打印页与浏览器标题：`/src/views/PrintDocument.vue`

说明：

- 不允许按物料类别显示不同的“包装采购订单 / 锁芯采购订单 / 锁具采购订单”等主标题
- 分类信息应继续通过类别徽标、字段内容或文件名表达，不再混入主标题

## 8. Known Anti-Patterns

- 把包装映射 `mappings[bz]` 当供应商使用（错误）
- 锁芯/锁叉只写 `name/model` 不写 `type/spec/eccentricity`
- 锁具已拆左右数量，却仍按单数量列读取或打印
- `metadata.aggregateSideQuantities = true` 时仍打印左右数量列，或只在编辑页合并数量而未同步到打印/PDF
- 锁具左右互换规则不区分 `spec` 第 3 段，直接全文搜索“内开”
- 锁具备注自动拼接 `主锁/副锁`、`spec` 或 `customerName`
- 预览层通过 `remark` 反解析结构化数据
- 把打印/PDF 的客户名称脱敏规则错误应用到预览或编辑模式
- 人工取消 `!` 警告后只隐藏图标，但列表风险筛选/风险计数仍把订单算作风险单
- 列表页使用浏览器本地时区格式化日期，导致与预览/PDF 差一天
- Mock 返回结构和真实后端不一致

## 9. Change Checklist

修改任何 PO 字段前，必须同时检查：

1. 提取层（`dataExtractors`）
2. 生成层（`poGenerator`）
3. 存储类型（`types/order.ts`）
4. 预览/编辑层（`OrderSheetView`）
5. 打印/PDF 层（`PrintDocument` / `printDocBuilder`）
6. Mock 契约（`src/lib/mock.ts`）
