# 锁芯数据问题修复报告

> 状态：历史问题分析。
> 本文档记录的是旧 `public/js` 时代的锁芯问题修复背景，仅用于追溯历史缺陷来源。

> 注：本文档记录的是 `public/js` / `public/data` 时代的问题排查。当前实现已迁移到 `src/**`，锁芯配置当前以 `data/config/cylinder-mapping.json` 为准。

## 问题描述

用户反馈在锁芯采购订单中：
1. ❌ "内部名称"和"外协名称"显示为 `-`
2. ❌ 表格中没有任何数据（所有字段都是 `-` 或 `0`）

## 问题根本原因分析

### 问题 1：内部名称和外协名称未保存

**位置**: `public/js/utils/dataExtractors.js` - `extractCylinderData` 函数

**原因**: 
- 虽然函数从 `cylinder-mapping.json` 读取了映射配置
- 但在构建返回数据结构时，**没有保存 `internalName` 字段**
- 只保存了 `type`（外协名称）

**原始代码**:
```javascript
cylinderMap[key] = {
    type: externalName,          // ✅ 有外协名称
    supplier: mapping.supplier,
    eccentricity: dimensionRule.eccentricity,
    grade: '标准',
    quantity: 0,
    remark: requirements
    // ❌ 缺少 internalName！
};
```

### 问题 2：打印页面硬编码为 `-`

**位置**: `public/js/components/print/printGenerator.js` - `generatePrintPages` 函数

**原因**:
对于锁芯等非包装类别，代码直接将内部名称和外协名称设置为 `'-'`

**原始代码**:
```javascript
} else {
    // For other categories
    clone.querySelector('.p-supplier').textContent = group.supplier || groupKey;
    clone.querySelector('.p-int-pkg').textContent = '-';  // ❌ 硬编码
    clone.querySelector('.p-ext-pkg').textContent = '-';  // ❌ 硬编码
}
```

### 问题 3：表格使用了错误的数据源

**位置**: `public/js/components/purchaseOrder.js` - `generatePurchaseOrder` 函数

**原因**:
- 对于**包装类别**，使用 `orderData.list`（原始订单数据）是正确的
- 但对于**锁芯类别**，也使用了 `orderData.list`，导致表格显示的是原始订单字段（如 productModelName, spec, mb），而不是提取后的锁芯字段（如 type, supplier, eccentricity）

**原始代码**:
```javascript
items: orderData.list ? orderData.list.map((item, idx) => ({
    ...item,
    _allowMerge: mergeFlags[idx] || false
})) : [],
```

这导致打印页面尝试访问 `item.type`、`item.supplier` 等锁芯特有字段时，全部返回 `undefined`

## 修复方案

### 修复 1：在提取器中添加 `internalName` 字段

**文件**: `public/js/utils/dataExtractors.js`

**修改**:
```javascript
cylinderMap[key] = {
    internalName: internalName,  // ✅ 添加：内部名称（订单中的锁芯名称）
    type: externalName,           // 外协名称（生成的采购名称）
    supplier: mapping.supplier,
    eccentricity: dimensionRule.eccentricity,
    grade: '标准',
    quantity: 0,
    remark: requirements
};
```

**受影响行**: 第 53-61 行（默认值情况）、第 77-87 行（正常映射情况）

### 修复 2：打印页面读取锁芯的内部/外协名称

**文件**: `public/js/components/print/printGenerator.js`

**修改**:
```javascript
if (category === 'packaging') {
    // 包装类别
    clone.querySelector('.p-supplier').textContent = PACKAGING_MAPPING.supplierName || '默认供应商';
    clone.querySelector('.p-int-pkg').textContent = group.internalName || groupKey;
    clone.querySelector('.p-ext-pkg').textContent = group.externalName || groupKey;
} else if (category === 'cylinder') {
    // ✅ 锁芯类别：从提取的数据中读取
    clone.querySelector('.p-supplier').textContent = group.supplier || groupKey;
    const firstItem = group.items[0];
    clone.querySelector('.p-int-pkg').textContent = firstItem?.internalName || '-';
    clone.querySelector('.p-ext-pkg').textContent = firstItem?.type || '-';
} else {
    // 其他类别（五金、边锁等）
    clone.querySelector('.p-supplier').textContent = group.supplier || groupKey;
    clone.querySelector('.p-int-pkg').textContent = '-';
    clone.querySelector('.p-ext-pkg').textContent = '-';
}
```

**受影响行**: 第 128-145 行

### 修复 3：根据类别选择正确的数据源

**文件**: `public/js/components/purchaseOrder.js`

**修改**:
```javascript
// 根据类别决定使用哪个数据源
let items;
if (category === 'packaging') {
    // 包装类别：使用原始订单数据（因为需要规格、门板等原始字段）
    items = orderData.list ? orderData.list.map((item, idx) => ({
        ...item,
        _allowMerge: mergeFlags[idx] || false
    })) : [];
} else {
    // ✅ 其他类别（锁芯、五金、边锁）：使用提取后的数据
    items = Array.isArray(itemsData) ? itemsData : [];
}

const snapshot = {
    poNumber,
    category,
    createdAt: timestamp,
    status: 'generated',
    order: { ... },
    items: items,  // ✅ 使用正确的数据源
    data: itemsData,
    metadata: { ... }
};
```

**受影响行**: 第 54-92 行

## 数据流向图

```
订单原始数据 (orderData.list)
    ↓
extractCylinderData(orderList, orderInfo)
    ↓
读取 cylinder-mapping.json
    ↓
提取数据结构:
{
    internalName: "90AB塑2铜锁芯",    // ✅ 从 item.sx 获取
    type: "90AB塑2铜锁芯",            // ✅ 从 mapping.template 生成
    supplier: "劲佳",                 // ✅ 从 mapping.supplier 获取
    eccentricity: "34.5*55.5/中心孔偏心",
    quantity: 10,
    remark: "钥匙 2+5 英文说明书"
}
    ↓
generatePurchaseOrder(orderData, itemsData, mergeFlags, 'cylinder')
    ↓
保存到 items: itemsData  // ✅ 使用提取后的数据
    ↓
打印页面读取 po.items
    ↓
显示表格数据:
- 序号、锁芯型号(type)、供应商(supplier)、偏心(eccentricity)、数量(quantity)、备注(remark)
- 内部名称(internalName)、外协名称(type)
```

## 验证步骤

1. **加载订单数据**
   - 访问 `/index.html`
   - 输入订单编号并查询

2. **生成锁芯采购订单**
   - 点击"生成采购单"
   - 选择"锁芯"类别
   - 点击"确认生成"

3. **检查采购订单列表**
   - 切换到"采购订单"标签
   - 确认有新的锁芯采购订单

4. **查看打印预览**
   - 点击"查看"按钮
   - 验证以下内容：
     - ✅ "内部名称"应显示订单中的锁芯名称（如 "90AB塑2铜锁芯"）
     - ✅ "外协名称"应显示映射后的名称（如 "90AB塑2铜锁芯"）
     - ✅ 表格中应有数据行
     - ✅ 锁芯型号、供应商、偏心、数量、备注都有正确的值

## 已修改的文件

1. ✅ `public/js/utils/dataExtractors.js` - 添加 internalName 字段
2. ✅ `public/js/components/print/printGenerator.js` - 显示锁芯的内部/外协名称
3. ✅ `public/js/components/purchaseOrder.js` - 根据类别使用正确的数据源

## 注意事项

- **向后兼容性**: 包装类别的逻辑保持不变
- **扩展性**: 其他类别（五金、边锁）将来也会使用提取后的数据
- **调试**: 保留了 `data` 字段用于调试和引用原始提取数据

## 相关配置文件

- `public/data/cylinder-mapping.json`（历史路径，当前为 `data/config/cylinder-mapping.json`）- 锁芯映射配置（尺寸规则和产品映射）
- `public/js/config/mergeRules.js` - 合并规则配置

---

**修复完成时间**: 2026-01-05  
**修复者**: Antigravity AI Assistant
