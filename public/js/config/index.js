/**
 * 包装映射配置模块
 * 负责加载和管理包装映射配置
 */

export let PACKAGING_MAPPING = {};
export let CYLINDER_MAPPING = {};

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
