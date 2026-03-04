# PO Field Contract

本文件定义采购订单从“ERP 原始字段”到“订单存储字段”再到“打印预览字段”的固定契约，目标是避免字段错位、语义混用和隐式回退造成的线上问题。

## 1. Core Rule

- `supplier`：供应商名称（采购对象）
- `internal_name`：内部名称（系统内部/ERP 原名）
- `external_name`：外协名称（对外显示名称）
- `type`：产品名称/型号（按业务类别解释）
- `spec`：规格尺寸
- `mb`：门边
- `eccentricity`：偏心（锁芯专用）
- `quantity_left` / `quantity_right`：左右数量（包装专用）
- `quantity`：总数量

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
- 左右数量：`quantity_left/quantity_right`

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

## 3. Validation Requirement

生成订单时必须通过两层校验：

- 类别校验（按 category 的必填字段）
- 通用校验（`material_id/name/model/quantity/unit`）

当前实现位置：

- `/src/services/poGenerator.ts`

## 4. Known Anti-Patterns

- 把包装映射 `mappings[bz]` 当供应商使用（错误）
- 锁芯/锁叉只写 `name/model` 不写 `type/spec/eccentricity`
- 预览层通过 `remark` 反解析结构化数据
- Mock 返回结构和真实后端不一致

## 5. Change Checklist

修改任何 PO 字段前，必须同时检查：

1. 提取层（`dataExtractors`）
2. 生成层（`poGenerator`）
3. 存储类型（`types/order.ts`）
4. 预览层（`printPreviewGenerator`）
5. Mock 契约（`src/lib/mock.ts`）

