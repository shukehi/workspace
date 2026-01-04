/**
 * 采购订单合并规则配置
 * 
 * 这里定义了不同采购类别（Packaging, Cylinder等）的合并逻辑。
 * 
 * 格式说明：
 * key: 采购类别标识 (如 'packaging', 'cylinder')
 * fields: 参与合并判断的字段列表。只有这些字段都相同的商品才会被合并。
 * 
 * 常用字段：
 * - spec: 规格 (如 1200*2400/9/内开外包)
 * - mb:   门板/门边 (如 高人一等)
 * - sx:   锁具/锁芯配置 (如 大屏C1指纹锁配套锁芯)
 * - productModelName: 产品型号名称
 */
export const MERGE_STRATEGIES = {
    // 包装: 只看 '规格' 和 '门板'，忽略锁具差异
    packaging: { fields: ['spec', 'mb'] },

    // 锁芯: 必须 '规格' + '门板' + '锁具' 全部一致才合并
    cylinder: { fields: ['spec', 'mb', 'sx'] },

    // 五金 (示例): 通常只看规格
    hardware: { fields: ['spec', 'mb'] },

    // 默认保底规则: 全匹配
    default: { fields: ['spec', 'mb', 'sx'] }
};
