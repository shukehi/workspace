/**
 * 库存记录模型（Inventory Record Model）
 * 记录所有库存变动历史
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const InventoryRecord = sequelize.define('InventoryRecord', {
    // 主键ID（自动生成）
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    // 关联的商品ID
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        validate: {
            notEmpty: {
                msg: '商品ID不能为空'
            }
        }
    },

    // 变动类型（入库/出库/调整）
    type: {
        type: DataTypes.ENUM('IN', 'OUT', 'ADJUST'),
        allowNull: false,
        validate: {
            isIn: {
                args: [['IN', 'OUT', 'ADJUST']],
                msg: '类型必须是 IN, OUT 或 ADJUST'
            }
        }
    },

    // 变动数量（绝对值）
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: {
                args: [1],
                msg: '数量必须大于0'
            }
        }
    },

    // 变动前库存
    beforeQty: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    // 变动后库存
    afterQty: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    // 变动原因/备注
    reason: {
        type: DataTypes.STRING(200),
        allowNull: true,
        defaultValue: ''
    },

    // 操作人（可选，未来扩展）
    operator: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: '系统'
    }

    // createdAt 自动记录操作时间
}, {
    tableName: 'inventory_records',
    timestamps: true,
    updatedAt: false, // 库存记录不需要更新时间
    indexes: [
        // 为常用查询字段创建索引
        {
            name: 'idx_product',
            fields: ['productId']
        },
        {
            name: 'idx_type',
            fields: ['type']
        },
        {
            name: 'idx_created',
            fields: ['createdAt']
        }
    ]
});

/**
 * 定义模型关联关系
 */
InventoryRecord.associate = function(models) {
    // 一个库存记录属于一个商品
    InventoryRecord.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
    });
};

/**
 * 类方法：获取商品的库存历史
 * @param {number} productId - 商品ID
 * @param {number} limit - 返回记录数限制
 * @returns {Promise<InventoryRecord[]>}
 */
InventoryRecord.getHistory = async function(productId, limit = 50) {
    return await InventoryRecord.findAll({
        where: { productId },
        order: [['createdAt', 'DESC']],
        limit,
        include: [{
            model: require('./Product'),
            as: 'product',
            attributes: ['code', 'name']
        }]
    });
};

/**
 * 类方法：获取最近的库存记录
 * @param {number} limit - 返回记录数限制
 * @returns {Promise<InventoryRecord[]>}
 */
InventoryRecord.getRecentRecords = async function(limit = 100) {
    return await InventoryRecord.findAll({
        order: [['createdAt', 'DESC']],
        limit,
        include: [{
            model: require('./Product'),
            as: 'product',
            attributes: ['code', 'name', 'category']
        }]
    });
};

/**
 * 类方法：按类型统计库存变动
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Promise<Object>}
 */
InventoryRecord.getStatistics = async function(startDate, endDate) {
    const { Op } = require('sequelize');
    const where = {};

    if (startDate && endDate) {
        where.createdAt = {
            [Op.between]: [startDate, endDate]
        };
    }

    return await InventoryRecord.findAll({
        where,
        attributes: [
            'type',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity']
        ],
        group: ['type']
    });
};

module.exports = InventoryRecord;
