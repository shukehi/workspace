/**
 * 商品模型（Product Model）
 * 定义商品的数据结构和验证规则
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Product = sequelize.define('Product', {
    // 主键ID（自动生成）
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    // 商品编号（唯一）
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: {
            msg: '商品编号已存在'
        },
        validate: {
            notEmpty: {
                msg: '商品编号不能为空'
            },
            len: {
                args: [1, 50],
                msg: '商品编号长度必须在1-50之间'
            }
        }
    },

    // 商品名称
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: '商品名称不能为空'
            },
            len: {
                args: [1, 100],
                msg: '商品名称长度必须在1-100之间'
            }
        }
    },

    // 商品分类
    category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: '未分类'
    },

    // 单位（个/箱/件/吨等）
    unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '个',
        validate: {
            notEmpty: {
                msg: '单位不能为空'
            }
        }
    },

    // 单价
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        validate: {
            min: {
                args: [0],
                msg: '单价不能为负数'
            }
        },
        get() {
            const value = this.getDataValue('price');
            return value ? parseFloat(value) : 0;
        }
    },

    // 当前库存数量
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: {
                args: [0],
                msg: '库存数量不能为负数'
            }
        }
    },

    // 最低库存预警值
    minStock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        validate: {
            min: {
                args: [0],
                msg: '最低库存值不能为负数'
            }
        }
    },

    // 商品描述
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    // 商品状态（启用/禁用）
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }

    // createdAt 和 updatedAt 由 Sequelize 自动管理
}, {
    tableName: 'products',
    timestamps: true,
    indexes: [
        // 为常用查询字段创建索引
        {
            name: 'idx_code',
            fields: ['code']
        },
        {
            name: 'idx_category',
            fields: ['category']
        },
        {
            name: 'idx_status',
            fields: ['status']
        }
    ]
});

/**
 * 实例方法：检查库存是否低于预警值
 */
Product.prototype.isLowStock = function() {
    return this.quantity < this.minStock;
};

/**
 * 实例方法：更新库存数量
 * @param {number} delta - 库存变动量（正数为入库，负数为出库）
 * @param {string} reason - 变动原因
 * @returns {Promise<Product>}
 */
Product.prototype.updateStock = async function(delta, reason = '') {
    const beforeQty = this.quantity;
    this.quantity += delta;

    if (this.quantity < 0) {
        throw new Error('库存不足，无法出库');
    }

    await this.save();

    // 创建库存记录
    const InventoryRecord = require('./InventoryRecord');
    await InventoryRecord.create({
        productId: this.id,
        type: delta > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(delta),
        beforeQty,
        afterQty: this.quantity,
        reason
    });

    return this;
};

/**
 * 类方法：搜索商品
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Product[]>}
 */
Product.search = async function(keyword) {
    const { Op } = require('sequelize');
    return await Product.findAll({
        where: {
            [Op.or]: [
                { code: { [Op.like]: `%${keyword}%` } },
                { name: { [Op.like]: `%${keyword}%` } },
                { category: { [Op.like]: `%${keyword}%` } }
            ],
            status: 'active'
        },
        order: [['createdAt', 'DESC']]
    });
};

/**
 * 类方法：获取低库存商品
 * @returns {Promise<Product[]>}
 */
Product.getLowStockProducts = async function() {
    return await Product.findAll({
        where: {
            quantity: {
                [sequelize.Op.lt]: sequelize.col('minStock')
            },
            status: 'active'
        },
        order: [['quantity', 'ASC']]
    });
};

module.exports = Product;
