const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

// 导入数据库配置和路由
const { sequelize, testConnection, initDatabase } = require('./server/db');
const productsRouter = require('./server/routes/products');
const inventoryRouter = require('./server/routes/inventory');

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

// 库存管理 API（本地）
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);

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
        // 测试数据库连接
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ 数据库连接失败，服务器启动终止');
            process.exit(1);
        }

        // 同步数据库（不强制重建）
        await initDatabase(false);

        // 启动服务器
        app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log(`✅ 服务器运行中: http://localhost:${PORT}`);
            console.log('='.repeat(50));
            console.log('📋 可用的功能:');
            console.log(`  - 订单查询: http://localhost:${PORT}/`);
            console.log(`  - 库存管理: http://localhost:${PORT}/inventory.html`);
            console.log('\n📡 API 端点:');
            console.log('  - GET    /api/products          - 获取商品列表');
            console.log('  - POST   /api/products          - 创建商品');
            console.log('  - GET    /api/products/:id      - 获取商品详情');
            console.log('  - PUT    /api/products/:id      - 更新商品');
            console.log('  - DELETE /api/products/:id      - 删除商品');
            console.log('  - POST   /api/inventory/in      - 商品入库');
            console.log('  - POST   /api/inventory/out     - 商品出库');
            console.log('  - GET    /api/inventory/records - 库存记录');
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
