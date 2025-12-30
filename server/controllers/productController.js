/**
 * 商品控制器
 * 处理商品相关的 HTTP 请求
 */

const { Product, InventoryRecord } = require('../models');
const { Op } = require('sequelize');

/**
 * 获取所有商品列表
 * GET /api/products?search=关键词&status=active
 */
exports.getAllProducts = async (req, res) => {
    try {
        const { search, status } = req.query;
        const where = {};

        // 搜索条件
        if (search) {
            where[Op.or] = [
                { code: { [Op.like]: `%${search}%` } },
                { name: { [Op.like]: `%${search}%` } },
                { category: { [Op.like]: `%${search}%` } }
            ];
        }

        // 状态过滤
        if (status) {
            where.status = status;
        } else {
            where.status = 'active'; // 默认只显示启用的商品
        }

        const products = await Product.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: products,
            total: products.length
        });
    } catch (error) {
        console.error('获取商品列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取商品列表失败',
            message: error.message
        });
    }
};

/**
 * 获取单个商品详情
 * GET /api/products/:id
 */
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id, {
            include: [{
                model: InventoryRecord,
                as: 'records',
                limit: 10,
                order: [['createdAt', 'DESC']]
            }]
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                error: '商品不存在'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('获取商品详情失败:', error);
        res.status(500).json({
            success: false,
            error: '获取商品详情失败',
            message: error.message
        });
    }
};

/**
 * 创建新商品
 * POST /api/products
 */
exports.createProduct = async (req, res) => {
    try {
        const {
            code,
            name,
            category,
            unit,
            price,
            quantity,
            minStock,
            description
        } = req.body;

        // 数据验证
        if (!code || !name) {
            return res.status(400).json({
                success: false,
                error: '商品编号和名称不能为空'
            });
        }

        // 检查商品编号是否已存在
        const existingProduct = await Product.findOne({ where: { code } });
        if (existingProduct) {
            return res.status(409).json({
                success: false,
                error: '商品编号已存在'
            });
        }

        // 创建商品
        const product = await Product.create({
            code,
            name,
            category,
            unit: unit || '个',
            price: price || 0,
            quantity: quantity || 0,
            minStock: minStock || 10,
            description
        });

        // 如果初始库存大于0，创建入库记录
        if (quantity > 0) {
            await InventoryRecord.create({
                productId: product.id,
                type: 'IN',
                quantity: quantity,
                beforeQty: 0,
                afterQty: quantity,
                reason: '初始库存',
                operator: '系统'
            });
        }

        res.status(201).json({
            success: true,
            data: product,
            message: '商品创建成功'
        });
    } catch (error) {
        console.error('创建商品失败:', error);

        // 处理 Sequelize 验证错误
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                error: '数据验证失败',
                details: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            error: '创建商品失败',
            message: error.message
        });
    }
};

/**
 * 更新商品信息
 * PUT /api/products/:id
 */
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            name,
            category,
            unit,
            price,
            minStock,
            description,
            status
        } = req.body;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: '商品不存在'
            });
        }

        // 如果要修改商品编号，检查是否重复
        if (code && code !== product.code) {
            const existingProduct = await Product.findOne({ where: { code } });
            if (existingProduct) {
                return res.status(409).json({
                    success: false,
                    error: '商品编号已存在'
                });
            }
        }

        // 更新商品信息（注意：不允许直接更新 quantity，需要通过入库/出库操作）
        await product.update({
            code: code || product.code,
            name: name || product.name,
            category: category !== undefined ? category : product.category,
            unit: unit || product.unit,
            price: price !== undefined ? price : product.price,
            minStock: minStock !== undefined ? minStock : product.minStock,
            description: description !== undefined ? description : product.description,
            status: status || product.status
        });

        res.json({
            success: true,
            data: product,
            message: '商品更新成功'
        });
    } catch (error) {
        console.error('更新商品失败:', error);

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                error: '数据验证失败',
                details: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            error: '更新商品失败',
            message: error.message
        });
    }
};

/**
 * 删除商品
 * DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: '商品不存在'
            });
        }

        // 检查是否有库存
        if (product.quantity > 0) {
            return res.status(400).json({
                success: false,
                error: '商品还有库存，无法删除。请先清空库存或改为禁用状态。'
            });
        }

        // 软删除：将状态改为 inactive
        await product.update({ status: 'inactive' });

        // 如果真的要硬删除，使用以下代码：
        // await product.destroy();

        res.json({
            success: true,
            message: '商品已禁用'
        });
    } catch (error) {
        console.error('删除商品失败:', error);
        res.status(500).json({
            success: false,
            error: '删除商品失败',
            message: error.message
        });
    }
};

/**
 * 获取低库存商品
 * GET /api/products/low-stock
 */
exports.getLowStockProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            where: {
                quantity: {
                    [Op.lt]: Product.sequelize.col('minStock')
                },
                status: 'active'
            },
            order: [['quantity', 'ASC']]
        });

        res.json({
            success: true,
            data: products,
            total: products.length
        });
    } catch (error) {
        console.error('获取低库存商品失败:', error);
        res.status(500).json({
            success: false,
            error: '获取低库存商品失败',
            message: error.message
        });
    }
};

/**
 * 批量导入商品（可选功能）
 * POST /api/products/batch
 */
exports.batchCreateProducts = async (req, res) => {
    try {
        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                error: '商品数据格式错误'
            });
        }

        const createdProducts = await Product.bulkCreate(products, {
            validate: true,
            ignoreDuplicates: true
        });

        res.status(201).json({
            success: true,
            data: createdProducts,
            total: createdProducts.length,
            message: `成功导入 ${createdProducts.length} 个商品`
        });
    } catch (error) {
        console.error('批量导入商品失败:', error);
        res.status(500).json({
            success: false,
            error: '批量导入失败',
            message: error.message
        });
    }
};
