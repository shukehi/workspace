/**
 * DOM 操作工具
 * 提供常用的 DOM 操作辅助函数
 */

/**
 * 设置元素文本内容
 * @param {string} id - 元素 ID
 * @param {string} value - 文本值
 */
export function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '-';
}
