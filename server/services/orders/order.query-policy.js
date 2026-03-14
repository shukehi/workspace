const { ORDER_PENDING_STATUSES } = require('../../shared/constants/order');

function normalizeQueryText(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function isPendingOrderStatus(status) {
    return ORDER_PENDING_STATUSES.includes(status);
}

function resolveBackendPrintCategory(category) {
    const raw = String(category || '').toLowerCase();
    if (raw === 'packaging' || raw.includes('包装')) return 'packaging';
    if (raw === 'cylinder' || raw.includes('锁芯')) return 'cylinder';
    if (raw === 'lockset' || raw.includes('锁具')) return 'lockset';
    if (raw === 'handle' || raw.includes('拉手')) return 'handle';
    if (raw === 'lock' || raw.includes('锁叉')) return 'lock';
    if (raw === 'hardware' || raw.includes('五金') || raw.includes('配件')) return 'hardware';
    return 'packaging';
}

function resolveBackendOrderRiskLevel(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    const hasHighRisk = items.some((item) => {
        const supplier = String(item?.supplier || '');
        const type = String(item?.type || item?.name || '');
        const remark = String(item?.remark || '');
        return supplier.includes('待人工处理')
            || type.includes('未匹配')
            || remark.includes('待人工处理');
    });
    if (hasHighRisk) return 'high';

    const hasMediumRisk = items.some((item) => {
        const type = String(item?.type || item?.name || '');
        const remark = String(item?.remark || '');
        return type.includes('待确认')
            || remark.includes('待确认')
            || remark.includes('未识别');
    });
    if (hasMediumRisk) return 'medium';
    return null;
}

function filterOrders(orders, query = {}) {
    const status = normalizeQueryText(query.status);
    const category = normalizeQueryText(query.category);
    const risk = normalizeQueryText(query.risk);
    const createdDate = normalizeQueryText(query.createdDate);
    const keyword = normalizeQueryText(query.keyword || query.search).toLowerCase();
    const orderNo = normalizeQueryText(query.orderNo).toLowerCase();

    return orders.filter((order) => {
        if (status) {
            if (status === 'PENDING') {
                if (!isPendingOrderStatus(order.status)) return false;
            } else if (status !== 'ALL' && order.status !== status) {
                return false;
            }
        }

        if (category && category !== 'ALL' && resolveBackendPrintCategory(order.category) !== category) {
            return false;
        }

        if (risk && risk !== 'ALL') {
            const riskLevel = resolveBackendOrderRiskLevel(order);
            if (risk === 'MANUAL' && riskLevel !== 'high') return false;
            if (risk === 'RISK' && riskLevel === null) return false;
        }

        if (createdDate && !String(order.created_at || '').startsWith(createdDate)) {
            return false;
        }

        if (orderNo && !String(order.order_no || '').toLowerCase().includes(orderNo)) {
            return false;
        }

        if (keyword) {
            const matches = String(order.order_no || '').toLowerCase().includes(keyword)
                || String(order.supplier || '').toLowerCase().includes(keyword)
                || (Array.isArray(order.items) && order.items.some((item) => `${item.name || ''}${item.model || ''}`.toLowerCase().includes(keyword)));
            if (!matches) return false;
        }

        return true;
    });
}

function buildOrderSummary(orders) {
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const pendingCount = orders.filter((order) => isPendingOrderStatus(order.status)).length;
    const completedCount = orders.filter((order) => order.status === 'completed').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = orders.filter((order) => String(order.created_at || '').startsWith(today)).length;

    return { totalAmount, pendingCount, completedCount, todayCount };
}

function buildOrderFacets(orders) {
    const statusCounts = { ALL: orders.length };
    const categoryCounts = { ALL: orders.length };
    const riskCounts = { ALL: orders.length, RISK: 0, MANUAL: 0 };

    orders.forEach((order) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        const categoryKey = resolveBackendPrintCategory(order.category);
        categoryCounts[categoryKey] = (categoryCounts[categoryKey] || 0) + 1;
        const riskLevel = resolveBackendOrderRiskLevel(order);
        if (riskLevel !== null) riskCounts.RISK += 1;
        if (riskLevel === 'high') riskCounts.MANUAL += 1;
    });

    return { statusCounts, categoryCounts, riskCounts };
}

module.exports = {
    resolveBackendPrintCategory,
    resolveBackendOrderRiskLevel,
    filterOrders,
    buildOrderSummary,
    buildOrderFacets,
    isPendingOrderStatus,
};
