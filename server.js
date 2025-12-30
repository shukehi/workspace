const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

// 导入数据库配置（保留以备将来使用）
const { sequelize, testConnection, initDatabase } = require('./server/db');

const app = express();
const PORT = 3000;

// ==================== 中间件配置 ====================

// CORS 支持
app.use(cors());

// 解析 JSON 请求体
app.use(express.json());

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));

// 请求日志（开发环境）
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ==================== 静态文件服务 ====================

// Host static files from public directory
app.use(express.static('public'));

// Host data files
app.use('/data', express.static('data'));

// ==================== API 路由 ====================

// 订单查询 API（代理到外部服务器）
app.use('/api/getOutContractDetail', createProxyMiddleware({
    target: 'http://47.98.198.45:8802',
    changeOrigin: true,
    pathRewrite: {
        '^/api/getOutContractDetail': '/getOutContractDetail'
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log('代理请求:', req.method, req.url);
    }
}));

// ==================== 错误处理 ====================

// 404 处理
app.use((req, res, next) => {
    // 如果请求的是 API 但没有匹配到路由
    if (req.url.startsWith('/api/')) {
        res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.url
        });
    } else {
        next();
    }
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        message: err.message
    });
});

// ==================== 启动服务器 ====================

async function startServer() {
    try {
        // 数据库配置保留但暂不初始化（订单查询系统使用外部 API）
        // const connected = await testConnection();
        // if (!connected) {
        //     console.error('❌ 数据库连接失败，服务器启动终止');
        //     process.exit(1);
        // }
        // await initDatabase(false);

        // 启动服务器
        app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log(`✅ 服务器运行中: http://localhost:${PORT}`);
            console.log('='.repeat(50));
            console.log('📋 可用的功能:');
            console.log(`  - 订单查询系统: http://localhost:${PORT}/`);
            console.log('\n📡 API 端点:');
            console.log('  - GET /api/getOutContractDetail - 查询订单详情（代理）');
            console.log('='.repeat(50));
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
}

// 启动服务器
startServer();

// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('\n收到 SIGTERM 信号，正在关闭服务器...');
    const { closeConnection } = require('./server/db');
    await closeConnection();
    process.exit(0);
});
