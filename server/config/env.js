const { RUNTIME_FILES } = require('./paths');

/**
 * 环境变量配置
 * Environment Configuration
 */

module.exports = {
    // 服务器配置
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },

    // ERP API 配置
    erp: {
        baseUrl: process.env.ERP_BASE_URL || 'http://47.98.198.45:8802',
        timeout: process.env.ERP_TIMEOUT || 30000
    },

    // 数据库配置
    database: {
        dialect: 'sqlite',
        storage: process.env.DB_STORAGE || RUNTIME_FILES.database,
        logging: process.env.NODE_ENV === 'development' ? console.log : false
    },

    // CORS 配置
    cors: {
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
            : 'http://localhost:5173',
        credentials: true
    }
};
