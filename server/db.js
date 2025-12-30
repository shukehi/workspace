/**
 * 数据库连接配置
 * 使用 Sequelize ORM + SQLite 数据库
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// 创建 Sequelize 实例
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../data/database.sqlite'),
    logging: console.log, // 开发环境：显示 SQL 日志
    // logging: false,    // 生产环境：关闭 SQL 日志

    // 连接池配置（SQLite 不需要，但保留配置结构）
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },

    // 定义全局配置
    define: {
        // 自动添加 createdAt 和 updatedAt 字段
        timestamps: true,
        // 使用驼峰命名
        underscored: false,
        // 禁止Sequelize自动复数化表名
        freezeTableName: true
    }
});

/**
 * 测试数据库连接
 */
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ 数据库连接成功');
        return true;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error);
        return false;
    }
}

/**
 * 初始化数据库（创建表）
 * @param {boolean} force - 是否强制重建表（会删除现有数据）
 */
async function initDatabase(force = false) {
    try {
        // 同步所有模型到数据库
        await sequelize.sync({ force });

        if (force) {
            console.log('⚠️  数据库表已重建（数据已清空）');
        } else {
            console.log('✅ 数据库表同步成功');
        }

        return true;
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error);
        return false;
    }
}

/**
 * 关闭数据库连接
 */
async function closeConnection() {
    try {
        await sequelize.close();
        console.log('✅ 数据库连接已关闭');
    } catch (error) {
        console.error('❌ 关闭数据库连接失败:', error);
    }
}

module.exports = {
    sequelize,
    testConnection,
    initDatabase,
    closeConnection
};
