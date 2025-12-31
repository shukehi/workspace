/**
 * 工具函数模块
 * 提供通用的辅助函数
 *
 * ✨ 已优化：添加验证、错误处理和数据映射函数
 */

import { PACKAGING_MAPPING } from './config.js';

// ==================== 数据验证 ====================

/**
 * 验证订单数据结构
 * @param {Object} data - API 返回的订单数据
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateOrderData(data) {
    const errors = [];

    if (!data) {
        errors.push('订单数据为空');
        return { valid: false, errors };
    }

    if (data.total === 0) {
        errors.push('未找到订单数据');
    }

    if (!data.rows || !Array.isArray(data.rows)) {
        errors.push('订单数据格式错误：缺少 rows 字段');
    } else if (data.rows.length === 0) {
        errors.push('订单明细为空');
    } else {
        const order = data.rows[0];

        if (!order.code) errors.push('订单号缺失');
        if (!order.customerName) errors.push('客户名称缺失');
        if (!order.list || !Array.isArray(order.list)) {
            errors.push('商品明细格式错误');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 验证订单号格式
 * @param {string} code - 订单号
 * @returns {boolean}
 */
export function validateOrderCode(code) {
    if (!code || typeof code !== 'string') return false;
    // 订单号通常是数字，至少6位
    return /^\d{6,}$/.test(code.trim());
}

// ==================== 错误处理 ====================

/**
 * 格式化错误信息为用户友好的文本
 * @param {Error|string} error - 错误对象或消息
 * @returns {string}
 */
export function formatError(error) {
    if (typeof error === 'string') return error;

    if (error instanceof Error) {
        // 网络错误
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return '网络连接失败，请检查网络设置';
        }

        // 超时错误
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            return '请求超时，请稍后重试';
        }

        // API 错误
        if (error.message.includes('API Error')) {
            const match = error.message.match(/API Error: (\d+)/);
            if (match) {
                const status = parseInt(match[1]);
                if (status === 404) return '订单不存在或已删除';
                if (status === 500) return '服务器错误，请稍后重试';
                if (status === 403) return '无权访问该订单';
            }
            return '服务器响应异常';
        }

        return error.message || '未知错误';
    }

    return '操作失败，请重试';
}

// ==================== 数据映射 ====================

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

// ==================== 数据解析 ====================

/**
 * 解析数量字符串为左右数量对
 * @param {string} qtyStr - 数量字符串，如 "3/3" 或 "10"
 * @returns {Object} { left: number, right: number }
 */
export function parseQuantityPair(qtyStr) {
    if (!qtyStr) return { left: 0, right: 0 };

    const parts = qtyStr.toString().split('/');
    const leftVal = parseFloat(parts[0]) || 0;
    const rightVal = parseFloat(parts[1]) || leftVal; // If no right value, use left value

    return {
        left: leftVal,
        right: rightVal
    };
}

/**
 * 解析数量字符串并返回总和
 * @param {string} qtyStr - 数量字符串，如 "75/75" 或 "3/3" 或 "10"
 * @returns {number} 总数量
 */
export function parseQuantity(qtyStr) {
    if (!qtyStr) return 0;
    const parts = qtyStr.toString().split('/');
    let sum = 0;
    parts.forEach(part => {
        const num = parseFloat(part);
        if (!isNaN(num)) {
            sum += num;
        }
    });
    return sum;
}

/**
 * 格式化日期字符串
 * @param {string} dateStr - 日期字符串，如 "2024年08月12日"
 * @returns {string|null} ISO 格式日期 "2024-08-12" 或原字符串
 */
export function formatDateToISO(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
        const y = match[1];
        const m = match[2].padStart(2, '0');
        const d = match[3].padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return dateStr; // Return original if already standard or unmatched
}

/**
 * 设置元素文本内容
 * @param {string} id - 元素 ID
 * @param {string} value - 文本值
 */
export function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '-';
}
