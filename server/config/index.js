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
        public: 'dist',
        data: 'data/config'
    }
};
