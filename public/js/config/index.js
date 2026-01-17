/**
 * 包装映射配置模块
 * 负责加载和管理包装映射配置
 */

export let PACKAGING_MAPPING = {};
export let CYLINDER_MAPPING = {};
export let LOCK_FORK_MAPPING = {};
export let MATERIALS_CATALOG = {};
export let COLOR_FORMULAS = {};

/**
 * 加载包装映射配置
 * 从 JSON 文件加载配置，失败时使用默认配置
 */
export async function loadPackagingMapping() {
    try {
        const response = await fetch('/data/packaging-mapping.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        PACKAGING_MAPPING = await response.json();
        console.log('✅ 包装映射配置加载成功:', Object.keys(PACKAGING_MAPPING).length, '个映射');

    } catch (error) {
        console.warn('⚠️ 加载包装映射配置失败，使用默认配置:', error.message);

        // Fallback to default mapping
        PACKAGING_MAPPING = {
            supplierName: "默认供应商",
            mappings: {
                "罗曼蒂克": "美+C单",
                "3层黄卡美+C单瓦纸箱": "美+C单"
            }
        };
    }
}

/**
 * 加载锁芯映射配置
 * 从 JSON 文件加载配置，失败时使用默认配置
 */
export async function loadCylinderMapping() {
    try {
        const response = await fetch('/data/cylinder-mapping.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        CYLINDER_MAPPING = await response.json();
        console.log('✅ 锁芯映射配置加载成功');

    } catch (error) {
        console.warn('⚠️ 加载锁芯映射配置失败，使用默认配置:', error.message);

        // Fallback to default mapping
        CYLINDER_MAPPING = {
            dimensions: {},
            products: []
        };
    }
}

/**
 * 加载锁叉映射配置
 * 从 JSON 文件加载配置，失败时使用默认配置
 */
export async function loadLockForkMapping() {
    try {
        const response = await fetch('/data/lock-fork-mapping.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        LOCK_FORK_MAPPING = await response.json();
        console.log('✅ 锁叉映射配置加载成功');

    } catch (error) {
        console.warn('⚠️ 加载锁叉映射配置失败，使用默认配置:', error.message);

        // Fallback to default mapping
        LOCK_FORK_MAPPING = {
            baseDimensions: {},
            lockTypes: {},
            heightReference: 2050
        };
    }
}

/**
 * 加载材料目录配置
 * 从 JSON 文件加载配置，失败时使用默认配置
 */
export async function loadMaterialsCatalog() {
    try {
        const response = await fetch('/data/materials-catalog.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        MATERIALS_CATALOG = await response.json();
        console.log('✅ 材料目录配置加载成功:', Object.keys(MATERIALS_CATALOG).length, '种材料');

    } catch (error) {
        console.warn('⚠️ 加载材料目录配置失败:', error.message);
        MATERIALS_CATALOG = {};
    }
}

/**
 * 加载颜色配方配置
 * 从 JSON 文件加载配置，失败时使用默认配置
 */
export async function loadColorFormulas() {
    try {
        const response = await fetch('/data/color-formulas.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        COLOR_FORMULAS = await response.json();
        console.log('✅ 颜色配方配置加载成功:', Object.keys(COLOR_FORMULAS).length, '种颜色');

    } catch (error) {
        console.warn('⚠️ 加载颜色配方配置失败:', error.message);
        COLOR_FORMULAS = {};
    }
}
