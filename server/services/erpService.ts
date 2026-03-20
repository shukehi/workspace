/**
 * ERP 服务层
 * ERP Service - Business logic for interacting with external ERP system
 */

import axios from 'axios';
import config from '../config';

class ErpService {
    private baseUrl: string;
    private timeout: string | number;

    constructor() {
        this.baseUrl = config.erp.baseUrl;
        this.timeout = config.erp.timeout;
    }

    /**
     * 查询订单详情
     * Query order detail
     * @param params - 查询参数
     * @returns 订单详情
     */
    async getOrderDetail(params: Record<string, unknown>): Promise<unknown> {
        try {
            const response = await axios.get(`${this.baseUrl}${config.api.endpoints.orderDetail}`, {
                params,
                timeout: Number(this.timeout)
            });
            return response.data;
        } catch (error: any) {
            console.error('ERP API 调用失败:', error.message);
            throw new Error(`ERP 服务调用失败: ${error.message}`);
        }
    }
}

export default new ErpService();
