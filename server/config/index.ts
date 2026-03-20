/**
 * 配置管理中心
 * Configuration Management
 */

import envConfig from './env';

interface ApiConfig {
    prefix: string;
    endpoints: {
        orderDetail: string;
    };
}

interface StaticConfig {
    public: string;
    data: string;
}

interface AppConfig {
    server: typeof envConfig.server;
    erp: typeof envConfig.erp;
    database: typeof envConfig.database;
    cors: typeof envConfig.cors;
    api: ApiConfig;
    static: StaticConfig;
}

const config: AppConfig = {
    ...envConfig,

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

export default config;
