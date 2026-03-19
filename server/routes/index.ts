/**
 * 路由聚合
 * Routes Aggregator
 */

import { Router, Request, Response, NextFunction } from 'express';
import apiRoutes from './api';
import config from '../config';
import configDataRoutes from './configData';
import formulasConfigRoutes from './formulasConfig';
import mappingsConfigRoutes from './mappingsConfig';
import materialsConfigRoutes from './materialsConfig';
import { apiKeyAuth } from '../app/middleware/apiKeyAuth';

const router: Router = Router();

// API Key 认证 — 对所有 /api 前缀路由生效
router.use(config.api.prefix, apiKeyAuth);

// Config Data 路由
router.use('/api/config/formulas', formulasConfigRoutes);
router.use('/api/config/mappings', mappingsConfigRoutes);
router.use('/api/config/material-catalog', materialsConfigRoutes);
router.use('/api/config', configDataRoutes);

// API 路由 (包含代理，放在后面)
router.use(config.api.prefix, apiRoutes);

// 404 处理 - API 路由
router.use((req: Request, res: Response, next: NextFunction) => {
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

export default router;
