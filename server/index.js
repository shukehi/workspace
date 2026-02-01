/**
 * 服务器主入口
 * Server Main Entry Point
 *
 * 订单查询系统 - 基于 Express 的后端服务
 * Order Query System - Express Backend Service
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const { sequelize, testConnection, initDatabase, closeConnection } = require('./db');

const app = express();

// ==================== 中间件配置 ====================

// CORS 支持
app.use(cors(config.cors));

// 解析 JSON 请求体 (调大限制以支持大型配方库保存)
app.use(express.json({ limit: '50mb' }));

// 解析 URL 编码的请求体
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 请求日志（开发环境）
if (config.server.env === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });
}

// ==================== 静态文件服务 ====================

// 服务前端静态文件
app.use(express.static(path.join(__dirname, '..', config.static.public)));

// 注意：不再将 data 目录作为静态文件服务，增强安全性
// app.use('/data', express.static('data'));  // 已移除

// ==================== 路由配置 ====================

app.use(routes);

// SPA Fallback: Serve index.html for any unknown routes (must be after API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', config.static.public, 'index.html'));
});

// ==================== 错误处理 ====================

// 全局错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
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
async function startServer() {
    try {
        // 数据库配置保留但暂不初始化（订单查询系统使用外部 API）
        // const connected = await testConnection();
        // if (!connected) {
        //     console.error('❌ 数据库连接失败，服务器启动终止');
        //     process.exit(1);
        // }
        // await initDatabase(false);

        // 启动 HTTP 服务器
        app.listen(config.server.port, () => {
            console.log('='.repeat(60));
            console.log(`✅ 服务器运行中: http://localhost:${config.server.port}`);
            console.log(`📌 运行环境: ${config.server.env}`);
            console.log('='.repeat(60));
            console.log('📋 可用的功能:');
            console.log(`  - 订单查询系统: http://localhost:${config.server.port}/`);
            console.log(`  - 库存管理: http://localhost:${config.server.port}/inventory.html`);
            console.log(`  - 采购管理: http://localhost:${config.server.port}/procurement.html`);
            console.log(`  - 统计分析: http://localhost:${config.server.port}/statistics.html`);
            console.log('\n📡 API 端点:');
            console.log(`  - ${config.api.prefix}${config.api.endpoints.orderDetail} - 查询订单详情（代理到 ERP）`);
            console.log('\n🔧 配置信息:');
            console.log(`  - ERP 服务器: ${config.erp.baseUrl}`);
            console.log('='.repeat(60));
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
}

// ==================== 进程信号处理 ====================

// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('\n收到 SIGTERM 信号，正在关闭服务器...');
    await closeConnection();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n收到 SIGINT 信号，正在关闭服务器...');
    await closeConnection();
    process.exit(0);
});

// ==================== 启动应用 ====================

startServer();

module.exports = app;
