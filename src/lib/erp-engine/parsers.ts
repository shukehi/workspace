/**
 * 数据解析工具
 * 提供数量字符串的解析功能
 */

/**
 * 解析数量字符串为左右数量对
 * @param {string} qtyStr - 数量字符串，如 "3/3"、"2+3" 或 "10"（单值按左右同量处理）
 * @returns {Object} { left: number, right: number }
 */
export function parseQuantityPair(qtyStr: string | number | null | undefined): { left: number; right: number } {
    if (!qtyStr) return { left: 0, right: 0 };

    const raw = qtyStr.toString().trim();
    if (!raw) return { left: 0, right: 0 };

    const parts = raw.includes('/')
        ? raw.split('/')
        : raw.includes('+')
            ? raw.split('+')
            : [raw];
    const leftVal = parseFloat(parts[0]) || 0;
    const hasExplicitRight = parts.length > 1;
    const parsedRight = hasExplicitRight ? parseFloat(parts[1]) : NaN;
    const rightVal = Number.isNaN(parsedRight) ? leftVal : parsedRight;

    return {
        left: leftVal,
        right: rightVal
    };
}

/**
 * 解析数量字符串并返回总和
 * @param {string} qtyStr - 数量字符串，如 "75/75"、"2+3" 或 "10"（单值按左右同量汇总）
 * @returns {number} 总数量
 */
export function parseQuantity(qtyStr: string | number | null | undefined): number {
    if (!qtyStr) return 0;
    const raw = qtyStr.toString().trim();
    if (!raw) return 0;

    const { left, right } = parseQuantityPair(raw);
    return left + right;
}

/**
 * 解析规格字符串中的门高
 * @param {string} spec - 规格字符串，如 "960*2050/10/内开外包"
 * @returns {number} 门高（毫米），默认 2050
 */
export function parseHeight(spec: string | null | undefined): number {
    if (!spec) return 2050;
    const match = spec.match(/\d+\*(\d+)/);
    return match ? parseInt(match[1], 10) : 2050;
}

/**
 * 解析规格字符串中的开向描述
 * @param {string} spec - 规格字符串，如 "960*2050/10/内开外包"
 * @returns {string} 开向段原文，缺失时返回空字符串
 */
export function parseOpenDirectionSegment(spec: string | null | undefined): string {
    if (!spec) return '';
    const parts = String(spec).split('/');
    if (parts.length < 3) return '';
    return String(parts[2] || '').trim();
}
