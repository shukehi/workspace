const ORDER_SNAPSHOT_KEY = 'source_current_order_snapshot';

export function loadSourceOrderSnapshot() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(ORDER_SNAPSHOT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.list)) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function persistSourceOrderSnapshot(orderData: any) {
    if (typeof window === 'undefined') return;
    try {
        if (!orderData || !Array.isArray(orderData.list)) {
            window.localStorage.removeItem(ORDER_SNAPSHOT_KEY);
            return;
        }
        window.localStorage.setItem(ORDER_SNAPSHOT_KEY, JSON.stringify(orderData));
    } catch (error) {
        console.warn('[SourceOrderSnapshot] persist failed:', error);
    }
}

export function clearSourceOrderSnapshot() {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(ORDER_SNAPSHOT_KEY);
    } catch {}
}
