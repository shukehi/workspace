/**
 * 数据格式化工具
 * 提供错误信息和日期的格式化功能
 */

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
