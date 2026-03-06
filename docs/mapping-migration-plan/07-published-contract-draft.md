# 锁芯 / 锁叉 Published Contract Draft

## 目的

冻结进入里程碑 B 之前的 `published` API 草案，避免在迁移脚本、后端 `/published` 实现、前端 `configLoader` 接入时反复改语义。

本稿只定义：

1. `GET /api/config/mappings/cylinder/published`
2. `GET /api/config/mappings/lock_fork/published`

本稿不包含管理台草稿接口，也不包含正式实现。

## 证据来源

运行时字段依赖不是凭文档猜测，而是基于当前代码：

1. 锁芯提取直接消费：
   - [dataExtractors.ts](/Users/aries/Dve/workspace/src/lib/erp-engine/dataExtractors.ts)
2. 锁叉提取直接消费：
   - [dataExtractors.ts](/Users/aries/Dve/workspace/src/lib/erp-engine/dataExtractors.ts)
3. 锁芯采购分组只依赖 extractor 结果：
   - [cylinderRule.ts](/Users/aries/Dve/workspace/src/services/po-rules/cylinderRule.ts)
4. 锁叉采购分组只依赖 extractor 结果：
   - [lockForkRule.ts](/Users/aries/Dve/workspace/src/services/po-rules/lockForkRule.ts)
5. 打印链路只依赖采购行字段，不再回读 mapping：
   - [poContractUtils.ts](/Users/aries/Dve/workspace/src/services/poContractUtils.ts)
   - [printDocBuilder.ts](/Users/aries/Dve/workspace/src/features/procurement/printDocBuilder.ts)

## 统一 Envelope 草案

建议 `published` API 与现有 mapping routes 风格保持一致，统一返回：

```json
{
  "success": true,
  "mapping": {
    "profileCode": "cylinder",
    "revision": 12,
    "schemaVersion": 1,
    "updatedAt": "2026-03-06T12:34:56.000Z",
    "payload": {}
  }
}
```

其中：

1. `success`
   - 固定为 `true`
2. `mapping.profileCode`
   - API profile code
   - 允许值：`cylinder` / `lock_fork`
3. `mapping.revision`
   - 当前 published revision
4. `mapping.schemaVersion`
   - payload schema 版本
5. `mapping.updatedAt`
   - published revision 的创建时间或发布时间
6. `mapping.payload`
   - 当前 published 的运行时 payload

## 锁芯 Published Payload 草案

### 响应结构

```json
{
  "success": true,
  "mapping": {
    "profileCode": "cylinder",
    "revision": 12,
    "schemaVersion": 1,
    "updatedAt": "2026-03-06T12:34:56.000Z",
    "payload": {
      "dimensions": {},
      "specialRules": [],
      "secondaryDimensions": {},
      "secondarySpecialRules": [],
      "mappings": {},
      "customLogos": []
    }
  }
}
```

### payload 字段

1. `dimensions`
   - 主锁芯门厚尺寸规则
2. `specialRules`
   - 主锁芯特殊规则
3. `secondaryDimensions`
   - 副锁门厚尺寸规则
4. `secondarySpecialRules`
   - 副锁特殊规则
5. `mappings`
   - 锁芯型号 -> `{ supplier, template }`
6. `customLogos`
   - 客户 / 备注中的 Logo 关键字

### 当前运行时硬依赖字段

当前 extractor 真正读取的字段是：

1. `dimensions[*].code`
2. `dimensions[*].eccentricity`
3. `dimensions[*].remark`
4. `dimensions[*].variants[*].code`
5. `dimensions[*].variants[*].eccentricity`
6. `dimensions[*].variants[*].remark`
7. `specialRules[*].keyword`
8. `specialRules[*].thickness`
9. `specialRules[*].variants[*].code`
10. `specialRules[*].variants[*].eccentricity`
11. `specialRules[*].variants[*].remark`
12. `secondaryDimensions` 同上
13. `secondarySpecialRules` 同上
14. `mappings[*].supplier`
15. `mappings[*].template`
16. `customLogos[*]`

### 契约建议

1. published payload 继续保留当前 canonical DTO 结构，不为 B 阶段引入额外变形。
2. `conditionField` 保留在 payload 中，原因：
   - 当前 extractor 事实上没有消费它
   - 但 draft / validator / 历史回放仍可能需要它
   - 先保留，比在 B 阶段额外做一次草稿 -> published 的语义裁剪更低风险
3. 当前运行时硬依赖字段只是 payload 的子集；后续若真的要裁剪，再升级 `schemaVersion`

## 锁叉 Published Payload 草案

### 响应结构

```json
{
  "success": true,
  "mapping": {
    "profileCode": "lock_fork",
    "revision": 7,
    "schemaVersion": 1,
    "updatedAt": "2026-03-06T12:34:56.000Z",
    "payload": {
      "baseDimensions": {},
      "lockTypes": {},
      "edgeTypes": {},
      "hangingFeet": {
        "standard": 35,
        "keywords": ["吊脚", "diaojiao"]
      },
      "heightReference": 2050,
      "suppliers": {
        "default": "应志友"
      }
    }
  }
}
```

### payload 字段

1. `baseDimensions`
   - 按门厚区分基础尺寸
2. `lockTypes`
   - 锁具类型修饰和单双头模式
3. `edgeTypes`
   - 边型修饰
4. `hangingFeet`
   - 吊脚标准值与关键字
5. `heightReference`
   - 门高基准
6. `suppliers`
   - 当前运行时只读取 `default`

### 当前运行时硬依赖字段

当前 extractor 真正读取的字段是：

1. `baseDimensions[thickness].standard.upper.base1/base2`
2. `baseDimensions[thickness].standard.lower.base1/base2`
3. `baseDimensions[thickness].withHangingFeet.upper.base1/base2`
4. `baseDimensions[thickness].withHangingFeet.lower.base1/base2`
5. `lockTypes[*].category`
6. `lockTypes[*].nameModifier`
7. `lockTypes[*].upper`
8. `lockTypes[*].lower`
9. `edgeTypes[*].nameModifier`
10. `hangingFeet.standard`
11. `hangingFeet.keywords`
12. `heightReference`
13. `suppliers.default`

### 契约建议

1. published payload 保持和当前 canonical DTO 一致。
2. `suppliers` 继续保留对象形态，而不是提前收窄成单个 `defaultSupplier` 字段。
3. 原因：
   - 当前运行时只硬依赖 `default`
   - 但对象形态向后扩展成本最低
   - B 阶段先不要在 payload 上做不可逆的收窄

## 与 B / C 阶段的接口约束

1. B 阶段导入脚本直接把 canonical DTO 落为 published payload，不做字段裁剪。
2. C 阶段 `configLoader` 接 `published` API 时，只读取 `mapping.payload`。
3. C 阶段若需要缓存版本信息，则使用：
   - `mapping.revision`
   - `mapping.schemaVersion`
   - `mapping.updatedAt`

## 当前仍未冻结的事项

1. `secondarySpecialRules` 的最终业务语义仍需拍板。
2. 如果未来要把 `conditionField` 从 runtime payload 移除，应当升级 `schemaVersion`，不要在 v1 静默删字段。
3. 当前草案足够支撑 B 阶段迁移和 C 阶段 loader 接入，但还不包含 unmatched 事件或健康检查扩展字段。
