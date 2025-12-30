/**
 * 库存控制器
 * 处理库存入库、出库等操作
 */

const { Product, InventoryRecord } = require('../models');
const { sequelize } = require('../db');
const { Op } = require('sequelize');

/**
 * 商品入库
 * POST /api/inventory/in
 * Body: { productId, quantity, reason }
 */
exports.stockIn = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { productId, quantity, reason } = req.body;

        // 数据验证
        if (!productId || !quantity || quantity <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: '商品ID和数量必填，且数量必须大于0'
            });
        }

        // 查找商品
        const product = await Product.findByPk(productId, { transaction });

        if (!product) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: '商品不存在'
            });
        }

        // 记录变动前的库存
        const beforeQty = product.quantity;

        // 更新库存
        product.quantity += parseInt(quantity);
        await product.save({ transaction });

        // 创建库存记录
        const record = await InventoryRecord.create({
            productId,
            type: 'IN',
            quantity: parseInt(quantity),
            beforeQty,
            afterQty: product.quantity,
            reason: reason || '入库',
            operator: '系统'
        }, { transaction });

        await transaction.commit();

        res.json({
            success: true,
            data: {
                product,
                record
            },
            message: `入库成功，当前库存：${product.quantity}`
        });
    } catch (error) {
        await transaction.rollback();
        console.error('入库失败:', error);
        res.status(500).json({
            success: false,
            error: '入库失败',
            message: error.message
        });
    }
};

/**
 * 商品出库
 * POST /api/inventory/out
 * Body: { productId, quantity, reason }
 */
exports.stockOut = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { productId, quantity, reason } = req.body;

        // 数据验证
        if (!productId || !quantity || quantity <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: '商品ID和数量必填，且数量必须大于0'
            });
        }

        // 查找商品
        const product = await Product.findByPk(productId, { transaction });

        if (!product) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: '商品不存在'
            });
        }

        // 检查库存是否充足
        if (product.quantity < parseInt(quantity)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: `库存不足。当前库存：${product.quantity}，需要：${quantity}`
            });
        }

        // 记录变动前的库存
        const beforeQty = product.quantity;

        // 更新库存
        product.quantity -= parseInt(quantity);
        await product.save({ transaction });

        // 创建库存记录
        const record = await InventoryRecord.create({
            productId,
            type: 'OUT',
            quantity: parseInt(quantity),
            beforeQty,
            afterQty: product.quantity,
            reason: reason || '出库',
            operator: '系统'
        }, { transaction });

        await transaction.commit();

        // 检查是否低于预警值
        const isLowStock = product.quantity < product.minStock;

        res.json({
            success: true,
            data: {
                product,
                record
            },
            warning: isLowStock ? `库存已低于预警值（${product.minStock}）` : null,
            message: `出库成功，当前库存：${product.quantity}`
        });
    } catch (error) {
        await transaction.rollback();
        console.error('出库失败:', error);
        res.status(500).json({
            success: false,
            error: '出库失败',
            message: error.message
        });
    }
};

/**
 * 库存调整（盘点）
 * POST /api/inventory/adjust
 * Body: { productId, quantity, reason }
 */
exports.adjustStock = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { productId, quantity, reason } = req.body;

        // 数据验证
        if (!productId || quantity === undefined || quantity < 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: '商品ID和数量必填，且数量不能为负数'
            });
        }

        // 查找商品
        const product = await Product.findByPk(productId, { transaction });

        if (!product) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: '商品不存在'
            });
        }

        // 记录变动前的库存
        const beforeQty = product.quantity;
        const delta = parseInt(quantity) - beforeQty;

        // 更新库存为新的数量
        product.quantity = parseInt(quantity);
        await product.save({ transaction });

        // 创建库存记录
        const record = await InventoryRecord.create({
            productId,
            type: 'ADJUST',
            quantity: Math.abs(delta),
            beforeQty,
            afterQty: product.quantity,
            reason: reason || `库存调整（${delta > 0 ? '+' : ''}${delta}）`,
            operator: '系统'
        }, { transaction });

        await transaction.commit();

        res.json({
            success: true,
            data: {
                product,
                record,
                delta
            },
            message: `库存调整成功，${delta > 0 ? '增加' : '减少'} ${Math.abs(delta)} 个，当前库存：${product.quantity}`
        });
    } catch (error) {
        await transaction.rollback();
        console.error('库存调整失败:', error);
        res.status(500).json({
            success: false,
            error: '库存调整失败',
            message: error.message
        });
    }
};

/**
 * 获取库存记录
 * GET /api/inventory/records?productId=1&limit=50
 */
exports.getInventoryRecords = async (req, res) => {
    try {
        const { productId, limit = 50, type } = req.query;

        const where = {};
        if (productId) {
            where.productId = productId;
        }
        if (type) {
            where.type = type;
        }

        const records = await InventoryRecord.findAll({
            where,
            limit: parseInt(limit),
            order: [['createdAt', 'DESC']],
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'code', 'name', 'unit']
            }]
        });

        res.json({
            success: true,
            data: records,
            total: records.length
        });
    } catch (error) {
        console.error('获取库存记录失败:', error);
        res.status(500).json({
            success: false,
            error: '获取库存记录失败',
            message: error.message
        });
    }
};

/**
 * 获取库存统计
 * GET /api/inventory/statistics
 */
exports.getStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // 总商品数和总库存值
        const products = await Product.findAll({
            where: { status: 'active' },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalProducts'],
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
                [sequelize.fn('SUM', sequelize.literal('quantity * price')), 'totalValue']
            ]
        });

        // 低库存商品数量
        const lowStockCount = await Product.count({
            where: {
                quantity: {
                    [Op.lt]: sequelize.col('minStock')
                },
                status: 'active'
            }
        });

        // 近期库存变动统计
        const where = {};
        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const recordStats = await InventoryRecord.findAll({
            where,
            attributes: [
                'type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity']
            ],
            group: ['type']
        });

        res.json({
            success: true,
            data: {
                overview: products[0],
                lowStockCount,
                recordStatistics: recordStats
            }
        });
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json({
            success: false,
            error: '获取统计数据失败',
            message: error.message
        });
    }
};
