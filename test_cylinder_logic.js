
// 模拟的映射配置 (cylinder-mapping.json)
const MAPPING_CONFIG = {
    "dimensions": {
        "5": { "code": "70AB", "eccentricity": "30*40/中心孔偏心" },
        "7": { "code": "90AB", "eccentricity": "34.5*55.5/中心孔偏心" },
        "9": { "code": "110AB", "eccentricity": "40*70/中心孔偏心" },
        "10": { "code": "120AB", "eccentricity": "41*79/中心孔偏心" }
    },

    "presets": {
        "common_keys": "钥匙 2+5 英文说明书",
        "cn_keys": "钥匙 1+5 中文说明书"
    },

    "products": [
        {
            "matchKeywords": ["锌合金", "P35"],
            "supplier": "忠恒",
            "template": "{code}微珠锌合金 {marking}",
            "marking": "ORIGINAL-SED标（TURKEY）",
            "requirements": "{preset:common_keys}"
        },
        {
            "matchKeywords": ["塑2铜"],
            "supplier": "劲佳",
            "template": "{code}塑2铜锁芯",
            "marking": "",
            "requirements": "{preset:common_keys}"
        }
    ]
};

// 模拟的订单数据 (输入)
const TEST_CASES = [
    {
        name: "测试案例 1: 9cm门厚 + 锌合金锁",
        spec: "1200*2400/9/内开外包",
        internalName: "90P35锌合金锁芯扣封"
        // 注意：这里内部名称虽写着90P35，但实际尺寸应由 spec 的 '9' 决定是否升级为 110AB
    },
    {
        name: "测试案例 2: 7cm门厚 + 锌合金锁",
        spec: "1200*2400/7/内开外包",
        internalName: "90P35锌合金锁芯扣封"
    },
    {
        name: "测试案例 3: 5cm门厚 + 塑2铜锁",
        spec: "960*2050/5/外开",
        internalName: "90AB塑2铜锁芯"
    }
];

// ================== 核心逻辑实现 ==================

function processCylinder(item) {
    console.log(`\n🔹 处理: ${item.name}`);
    console.log(`   输入: 规格=[${item.spec}], 内部名称=[${item.internalName}]`);

    // 1. 提取门厚 (从规格字符串中)
    // 假设格式为: 宽*高/厚/...
    const parts = item.spec.split('/');
    let thickness = "7"; // 默认值
    if (parts.length >= 2) {
        thickness = parts[1].trim();
    }
    console.log(`   -> 提取门厚: ${thickness}`);

    // 2. 查尺寸表
    const dimensionRule = MAPPING_CONFIG.dimensions[thickness];
    if (!dimensionRule) {
        console.error(`   ❌ 错误: 未找到门厚 [${thickness}] 的尺寸定义`);
        return null;
    }
    console.log(`   -> 匹配尺寸: 代码=[${dimensionRule.code}], 偏心=[${dimensionRule.eccentricity}]`);

    // 3. 匹配产品规则
    // 简单逻辑：看 internalName 是否包含 matchKeywords 中的所有词
    const productRule = MAPPING_CONFIG.products.find(prod => {
        return prod.matchKeywords.every(kw => item.internalName.includes(kw));
    });

    if (!productRule) {
        console.error(`   ❌ 错误: 未找到名称 [${item.internalName}] 的产品匹配规则`);
        return null;
    }
    console.log(`   -> 匹配产品: 供应商=[${productRule.supplier}], 模板=[${productRule.template}]`);

    // 4. 解析预设要求 (Requirements)
    let requirements = productRule.requirements;
    if (requirements.startsWith("{preset:") && requirements.endsWith("}")) {
        const presetKey = requirements.slice(8, -1);
        requirements = MAPPING_CONFIG.presets[presetKey] || requirements;
    }

    // 5. 生成最终数据 (替换模板变量)
    const externalName = productRule.template
        .replace("{code}", dimensionRule.code)
        .replace("{marking}", productRule.marking || "");

    const result = {
        supplier: productRule.supplier,
        externalName: externalName.trim(), // 去除可能多余的空格
        marking: productRule.marking,
        eccentricity: dimensionRule.eccentricity,
        requirements: requirements
    };

    console.log("   ✅ 生成结果:", JSON.stringify(result, null, 2));
    return result;
}

// ================== 运行测试 ==================

TEST_CASES.forEach(processCylinder);
