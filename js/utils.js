/**
 * 工具函数模块
 * 提供通用的辅助函数
 */

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
