/**
 * 路由聚合
 * Routes Aggregator
 */

const express = require('express');
const apiRoutes = require('./api');
const config = require('../config');
const configDataRoutes = require('./configData');
const formulasConfigRoutes = require('./formulasConfig');
const mappingsConfigRoutes = require('./mappingsConfig');
const materialsConfigRoutes = require('./materialsConfig');

const router = express.Router();

// Config Data 路由
router.use('/api/config/formulas', formulasConfigRoutes);
router.use('/api/config/mappings', mappingsConfigRoutes);
router.use('/api/config/material-catalog', materialsConfigRoutes);
router.use('/api/config', configDataRoutes);

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
