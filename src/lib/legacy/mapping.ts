// @ts-nocheck
/**
 * 数据映射工具
 * 提供包装名称映射功能
 */

import { PACKAGING_MAPPING } from '../config/index.js';

/**
 * 映射包装内部名称到供应商名称
 * @param {string} internalName - 内部包装名称
 * @returns {string} 供应商名称
 */
export function mapPackagingName(internalName) {
    if (!internalName) return '未知包装';

    const mappings = PACKAGING_MAPPING.mappings || PACKAGING_MAPPING;
    return mappings[internalName] || `${internalName} (未匹配)`;
}
