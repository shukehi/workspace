/**
 * 配置管理中心
 * Configuration Management
 */

const env = require('./env');

module.exports = {
    ...env,

    // API 端点配置
    api: {
        prefix: '/api',
        endpoints: {
            orderDetail: '/getOutContractDetail'
        }
    },

    // 静态文件配置
    static: {
        public: 'public',
        // 不再将 data 目录作为静态文件服务
        // data: 'data'  // 已移除，增强安全性
    }
};
