/**
 * API 路由
 * API Routes - Handles all API endpoints
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');
const pdfRoutes = require('./pdf');
const printRoutes = require('./print');
const orderRoutes = require('./order');
const materialRoutes = require('./material');
const inventoryRoutes = require('./inventory');
const inventoryReceiptRoutes = require('./inventoryReceipts');
const contractRoutes = require('./contracts');
const contractCacheService = require('../services/ContractCacheService');

const router = express.Router();

/**
 * Order Management API (SQLite)
 */
router.use('/orders', orderRoutes);
router.get('/contracts', async (req, res) => {
    try {
        const result = await contractCacheService.listContracts(req.query);
        res.json({
            success: true,
            ...result
        });
    } catch (e) {
        console.error('List cached contracts failed', e);
        res.status(500).json({ success: false, error: e.message });
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
        onProxyReq: (proxyReq, req, res) => {
            console.log(`代理请求: ${req.method} ${req.url}`);
        },
        onError: (err, req, res) => {
            console.error('代理错误:', err.message);
            res.status(502).json({
                success: false,
                error: 'ERP 服务器连接失败',
                message: err.message
            });
        }
    })
);

module.exports = router;
