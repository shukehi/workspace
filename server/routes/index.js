/**
 * 路由聚合
 * Routes Aggregator
 */

const express = require('express');
const apiRoutes = require('./api');
const config = require('../config');

const router = express.Router();

// Config Data 路由 (轻后端) - 优先匹配
router.use('/api/config', require('./configData'));

// API 路由 (包含代理，放在后面)
router.use(config.api.prefix, apiRoutes);

// 404 处理 - API 路由
router.use((req, res, next) => {
    if (req.url.startsWith(config.api.prefix)) {
        res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.url
        });
    } else {
        next();
    }
});

module.exports = router;
