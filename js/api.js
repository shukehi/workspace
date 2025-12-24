/**
 * API 请求模块
 * 封装所有后端 API 调用
 */

/**
 * 获取订单详情
 * @param {string} code - 订单编号
 * @returns {Promise<Object>} 订单数据
 */
export async function fetchOrderDetail(code) {
    const response = await fetch(`/api/getOutContractDetail?code=${code}`);

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}
