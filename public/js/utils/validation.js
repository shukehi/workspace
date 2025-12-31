/**
 * 数据验证工具
 * 提供订单数据和订单号的验证功能
 */

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
