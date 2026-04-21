/**
 * 路由聚合
 * Routes Aggregator
 */

import { Router, Request, Response, NextFunction } from 'express';
import apiRoutes from './api';
import config from '../config';
import configProfilesRoutes from './configProfiles';
import configMastersRoutes from './configMasters';
import { apiKeyAuth } from '../app/middleware/apiKeyAuth';

const router: Router = Router();

// API Key 认证 — 对所有 /api 前缀路由生效
router.use(config.api.prefix, apiKeyAuth);

// Config Data 路由
router.use('/api/config/profiles', configProfilesRoutes);
router.use('/api/config/masters', configMastersRoutes);

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
