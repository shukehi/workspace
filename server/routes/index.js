/**
 * 路由聚合
 * Routes Aggregator
 */

const express = require('express');
const apiRoutes = require('./api');
const config = require('../config');

const router = express.Router();

// API 路由
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
