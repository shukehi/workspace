/**
 * API 路由
 * API Routes - Handles all API endpoints
 */

import { Router, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import config from '../config';
import pdfRoutes from './pdf';
import printRoutes from './print';
import orderRoutes from './order';
import materialRoutes from './material';
import inventoryRoutes from './inventory';
import inventoryReceiptRoutes from './inventoryReceipts';
import contractRoutes from './contracts';
import contractCacheService from '../services/ContractCacheService';
import { createApiErrorResponse } from '../shared/contracts/api';

const router: Router = Router();

/**
 * Order Management API (SQLite)
 */
router.use('/orders', orderRoutes);
router.get('/contracts', async (req: Request, res: Response) => {
    try {
        const result = await contractCacheService.listContracts(req.query as any);
        // Preserve the legacy top-level rows/total shape until contract history
        // consumers are migrated to a unified { success, data } envelope.
        res.json({
            success: true,
            ...result
        });
    } catch (e: any) {
        console.error('List cached contracts failed', e);
        res.status(500).json(createApiErrorResponse('INTERNAL_ERROR', { message: e.message }));
    }
});
router.use('/contracts', contractRoutes);
router.use('/materials', materialRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/inventory-receipts', inventoryReceiptRoutes);
router.use('/print', printRoutes);

/**
 * PDF 生成 API
 * PDF Generation API
 */
router.use('/pdf', pdfRoutes);

/**
 * 订单查询 API（代理到外部 ERP 服务器）
 * Order Query API - Proxy to external ERP server
 */
router.use(
    config.api.endpoints.orderDetail,
    createProxyMiddleware({
        target: config.erp.baseUrl,
        changeOrigin: true,
        pathRewrite: {
            [`^${config.api.prefix}${config.api.endpoints.orderDetail}`]: config.api.endpoints.orderDetail
        },
        onProxyReq: (proxyReq: any, req: any, res: any) => {
            console.log(`代理请求: ${req.method} ${req.url}`);
        },
        onError: (err: any, req: any, res: any) => {
            console.error('代理错误:', err.message);
            (res as Response).status(502).json(createApiErrorResponse('ERP_PROXY_FAILED', {
                message: err.message,
                details: 'ERP 服务器连接失败'
            }));
        }
    })
);

export default router;
