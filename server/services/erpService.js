/**
 * ERP 服务层
 * ERP Service - Business logic for interacting with external ERP system
 */

const axios = require('axios');
const config = require('../config');

class ErpService {
    constructor() {
        this.baseUrl = config.erp.baseUrl;
        this.timeout = config.erp.timeout;
    }

    /**
     * 查询订单详情
     * Query order detail
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 订单详情
     */
    async getOrderDetail(params) {
        try {
            const response = await axios.get(`${this.baseUrl}${config.api.endpoints.orderDetail}`, {
                params,
                timeout: this.timeout
            });
            return response.data;
        } catch (error) {
            console.error('ERP API 调用失败:', error.message);
            throw new Error(`ERP 服务调用失败: ${error.message}`);
        }
    }
}

module.exports = new ErpService();
