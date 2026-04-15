/**
 * 服务器主入口
 * Server Main Entry Point
 *
 * 订单查询系统 - 基于 Express 的后端服务
 * Order Query System - Express Backend Service
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import config from './config';
import routes from './routes';
import { initDB, sequelize } from './models';
import { initErrorSystem } from './app/errors/init';
import { logger } from './app/logger';
import { prewarmPdfRenderer, shutdownPdfRenderer } from './services/pdfGenerator';

// 初始化错误处理系统策略
initErrorSystem();

const app: Express = express();

// ==================== 中间件配置 ====================

// CORS 支持
app.use(cors(config.cors));

// 解析 JSON 请求体 (调大限制以支持大型配方库保存)
app.use(express.json({ limit: '50mb' }));

// 解析 URL 编码的请求体
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 请求日志（全环境，生产输出 JSON，开发输出格式化文本）
app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info({ method: req.method, url: req.url }, 'request');
    next();
});

// ==================== 静态文件服务 ====================

// Serve unified config data before the built bundle so `/data/*` never resolves to stale copied assets.
app.use('/data', express.static(path.join(__dirname, '..', config.static.data)));

// 服务前端静态文件
app.use(express.static(path.join(__dirname, '..', config.static.public)));

// ==================== 路由配置 ====================

app.use(routes);

// SPA Fallback: Serve index.html for any unknown routes (must be after API routes)
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', config.static.public, 'index.html'));
});

// ==================== 错误处理 ====================

// 全局错误处理中间件
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, '服务器未捕获错误');
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        message: config.server.env === 'development' ? err.message : undefined
    });
});

// ==================== 服务器启动 ====================

/**
 * 启动服务器
 */
async function startServer(): Promise<void> {
    try {
        // Initialize SQLite Database
        await initDB();

        // 启动 HTTP 服务器
        app.listen(config.server.port, () => {
            logger.info(
                { port: config.server.port, env: config.server.env, erp: config.erp.baseUrl },
                '服务器已启动'
            );

            void prewarmPdfRenderer().then(() => {
                logger.info('PDF renderer prewarmed');
            }).catch((error) => {
                logger.warn({ err: error }, 'PDF renderer prewarm failed');
            });
        });
    } catch (error) {
        logger.error({ err: error }, '服务器启动失败');
        process.exit(1);
    }
}

// ==================== 进程信号处理 ====================

// 优雅关闭
process.on('SIGTERM', async () => {
    logger.info('收到 SIGTERM 信号，正在关闭服务器...');
    await shutdownPdfRenderer();
    await sequelize.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('收到 SIGINT 信号，正在关闭服务器...');
    await shutdownPdfRenderer();
    await sequelize.close();
    process.exit(0);
});

// ==================== 启动应用 ====================

startServer();

export default app;
