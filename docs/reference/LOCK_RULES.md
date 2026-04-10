# 锁具采购订单自动化规则说明

> 状态：现行参考文档。
> 当前规则变更应同步更新对应测试与本文档。

## 概述

系统会从 ERP 订单中的锁具字段提取锁具采购需求：

- 主锁来源：`sj`
- 副锁来源：`fssj`
- 数量来源：`qty`
- 开向来源：`spec` 第 3 段

锁具采购单在系统中的业务类别为：

- 中文类别：`锁具`
- 内部打印类别：`lockset`

---

## 提取规则

### 1. 提取字段

每条订单行会分别检查：

- `sj`：生成主锁需求
- `fssj`：生成副锁需求

以下值会被跳过，不生成采购需求：

- 空字符串
- `-`
- `无`

### 2. 数量规则

锁具使用左右数量拆分：

- `quantity_left`
- `quantity_right`
- `quantity`

其中：

- `quantity_left/quantity_right` 来自 ERP `qty`
- `quantity = quantity_left + quantity_right`

示例：

```text
qty = 15/20

默认结果：
左 = 15
右 = 20
总 = 35
```

### 3. 内开左右互换规则

当 `spec` 的第 3 段包含 `内开` 时，锁具左右数量互换。

示例：

```text
spec = 970*2040/10/内开外包
qty = 15/20

结果：
左 = 20
右 = 15
总 = 35
```

说明：

- 只检查 `spec` 的第 3 段开向文本
- 不会因为别的备注文本里出现“内开”而误触发

反例：

```text
spec = 970*2040/10/外开外包/备注内开字样
qty = 15/20

结果：
左 = 15
右 = 20
总 = 35
```

---

## 映射规则

### 配置文件

运行时真源：

- `GET /api/config/mappings/lock/published`

兼容基线文件：

- `/data/config/lock-mapping.json`

当前支持字段：

```json
{
  "defaultUnit": "套",
  "primaryLabel": "主锁",
  "secondaryLabel": "副锁",
  "mappings": {
    "SD-9030（6607大锁）": {
      "supplier": "汇成",
      "vendorName": "6607大锁",
      "primarySpec": "主锁体",
      "remark": "标准锁具"
    },
    "F02-A副锁": {
      "supplier": "汇成",
      "vendorName": "F02-A副锁",
      "secondarySpec": "副锁体"
    }
  }
}
```

### 字段含义

- `supplier`：采购供应商
- `vendorName`：采购单上的产品名称
- `primarySpec`：主锁规格
- `secondarySpec`：副锁规格
- `remark`：直接写入采购单行备注的说明

### 无默认供应商

锁具配置不提供“默认供应商”。

原因：

- 锁具采购要求必须明确到型号映射
- 未命中型号时，不应该自动落给某个供应商

因此未命中规则时，系统会固定标记为：

- `supplier = 待人工处理`

---

## Normalize 匹配规则

锁具型号匹配会做 normalize 处理：

- 去掉首尾空格
- 转小写
- 全角括号统一为半角括号
- 去掉中间空白

因此以下文本会视为同一个型号：

```text
SD-9030（6607大锁）
SD-9030 (6607大锁)
SD-9030 ( 6607大锁 )
```

---

## 订单项输出契约

锁具订单项输出字段：

- `supplier`
- `type`
- `spec`
- `quantity_left`
- `quantity_right`
- `quantity`
- `unit`
- `remark`

其中：

- `name = type`
- `model = spec`
- `unit` 默认来自 `lock-mapping.json` 的 `defaultUnit`
- `remark` 仅使用命中映射里的 `remark`

### 备注规则

锁具采购单的单行备注只保留 `lock-mapping.json` 命中项中的 `remark`：

- 如果 mapping 配了 `remark`，采购单备注就写这个值
- 如果 mapping 没配 `remark`，采购单备注为空

系统不会再自动把以下信息拼进锁具备注：

- `主锁/副锁`
- ERP `spec`
- 客户名称

---

## 配置页面

系统提供锁具配置页：

- 路由：`/config/lock`
- 页面：`src/views/LockConfig.vue`

说明：

- 页面保存走 workflow `detail -> draft -> publish`
- legacy `/api/config/lock` 当前仅作为兼容桥接，不再读写本地 JSON

页面支持：

- 编辑型号映射
- 测试 `sj/fssj` 文本命中结果
- 查看 normalize 后的匹配键

---

## 维护建议

新增锁具型号时，建议同时补齐：

1. `supplier`
2. `vendorName`
3. `primarySpec` 或 `secondarySpec`
4. 必要时补 `remark`

如果 ERP 原文有轻微空格或括号差异，优先先用配置页里的“测试匹配”验证 normalize 结果，再决定是否新增规则。
