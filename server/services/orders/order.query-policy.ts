export {};

const { ORDER_PENDING_STATUSES } = require('../../shared/constants/order');

type PlainRecord = Record<string, any>;

function normalizeQueryText(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function isPendingOrderStatus(status: string): boolean {
    return ORDER_PENDING_STATUSES.includes(status);
}

function resolveBackendPrintCategory(category: unknown): string {
    const raw = String(category || '').toLowerCase();
    if (raw === 'packaging' || raw.includes('包装')) return 'packaging';
    if (raw === 'cylinder' || raw.includes('锁芯')) return 'cylinder';
    if (raw === 'lockset' || raw.includes('锁具')) return 'lockset';
    if (raw === 'handle' || raw.includes('拉手')) return 'handle';
    if (raw === 'lock' || raw.includes('锁叉')) return 'lock';
    if (raw === 'hardware' || raw.includes('五金') || raw.includes('配件')) return 'hardware';
    return 'packaging';
}

function resolveBackendOrderRiskLevel(order: PlainRecord): 'high' | 'medium' | null {
    const items = Array.isArray(order?.items) ? order.items : [];
    const hasHighRisk = items.some((item: PlainRecord) => {
        const supplier = String(item?.supplier || '');
        const type = String(item?.type || item?.name || '');
        const remark = String(item?.remark || '');
        return supplier.includes('待人工处理')
            || type.includes('未匹配')
            || remark.includes('待人工处理');
    });
    if (hasHighRisk) return 'high';

    const hasMediumRisk = items.some((item: PlainRecord) => {
        const type = String(item?.type || item?.name || '');
        const remark = String(item?.remark || '');
        return type.includes('待确认')
            || remark.includes('待确认')
            || remark.includes('未识别');
    });
    if (hasMediumRisk) return 'medium';
    return null;
}

function filterOrders(orders: PlainRecord[], query: PlainRecord = {}): PlainRecord[] {
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
                || (Array.isArray(order.items) && order.items.some((item: PlainRecord) => `${item.name || ''}${item.model || ''}`.toLowerCase().includes(keyword)));
            if (!matches) return false;
        }

        return true;
    });
}

function buildOrderSummary(orders: PlainRecord[]) {
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const pendingCount = orders.filter((order) => isPendingOrderStatus(order.status)).length;
    const completedCount = orders.filter((order) => order.status === 'completed').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = orders.filter((order) => String(order.created_at || '').startsWith(today)).length;

    return { totalAmount, pendingCount, completedCount, todayCount };
}

function buildOrderFacets(orders: PlainRecord[]) {
    const statusCounts: Record<string, number> = { ALL: orders.length };
    const categoryCounts: Record<string, number> = { ALL: orders.length };
    const riskCounts: Record<string, number> = { ALL: orders.length, RISK: 0, MANUAL: 0 };

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
