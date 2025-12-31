/**
 * API 请求模块
 * 封装所有后端 API 调用
 *
 * ✨ 已优化：添加超时控制、重试机制和增强错误处理
 */

// ==================== 配置 ====================

const API_CONFIG = {
    timeout: 10000,        // 默认超时时间 10 秒
    maxRetries: 2,         // 最大重试次数
    retryDelay: 1000,      // 重试延迟 1 秒
};

// ==================== 辅助函数 ====================

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带超时的 fetch 请求
 * @param {string} url - 请求 URL
 * @param {Object} options - fetch 选项
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = API_CONFIG.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
    }
}

/**
 * 带重试的请求
 * @param {Function} requestFn - 请求函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} retryDelay - 重试延迟
 * @returns {Promise<any>}
 */
async function fetchWithRetry(requestFn, maxRetries = API_CONFIG.maxRetries, retryDelay = API_CONFIG.retryDelay) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error) {
            lastError = error;

            // 不重试的错误类型（客户端错误）
            if (error.message.includes('API Error: 4')) {
                throw error;
            }

            // 最后一次尝试失败
            if (attempt === maxRetries) {
                console.warn(`❌ 请求失败，已重试 ${maxRetries} 次`);
                throw error;
            }

            // 等待后重试
            console.log(`⚠️ 请求失败，${retryDelay}ms 后重试 (${attempt + 1}/${maxRetries})...`);
            await delay(retryDelay);
        }
    }

    throw lastError;
}

// ==================== API 方法 ====================

/**
 * 获取订单详情
 * @param {string} code - 订单编号
 * @param {Object} options - 可选配置
 * @param {number} options.timeout - 超时时间
 * @param {boolean} options.retry - 是否启用重试
 * @returns {Promise<Object>} 订单数据
 */
export async function fetchOrderDetail(code, options = {}) {
    const {
        timeout = API_CONFIG.timeout,
        retry = true
    } = options;

    const requestFn = async () => {
        const url = `/api/getOutContractDetail?code=${encodeURIComponent(code)}`;

        console.log(`📡 API 请求: ${url}`);

        const response = await fetchWithTimeout(url, {}, timeout);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ API 响应成功: total=${data.total}`);

        return data;
    };

    if (retry) {
        return fetchWithRetry(requestFn);
    } else {
        return requestFn();
    }
}

/**
 * 取消所有进行中的请求（预留接口）
 * 使用 AbortController 可以实现请求取消
 */
export function cancelAllRequests() {
    console.log('🛑 取消所有 API 请求');
    // 实现可以使用全局 AbortController 管理
}
