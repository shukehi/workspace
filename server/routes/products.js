/**
 * 商品路由
 * 定义商品相关的 API 端点
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// 获取所有商品列表
// GET /api/products?search=关键词&status=active
router.get('/', productController.getAllProducts);

// 获取低库存商品
// GET /api/products/low-stock
router.get('/low-stock', productController.getLowStockProducts);

// 批量导入商品
// POST /api/products/batch
router.post('/batch', productController.batchCreateProducts);

// 获取单个商品详情
// GET /api/products/:id
router.get('/:id', productController.getProductById);

// 创建新商品
// POST /api/products
router.post('/', productController.createProduct);

// 更新商品信息
// PUT /api/products/:id
router.put('/:id', productController.updateProduct);

// 删除商品（软删除）
// DELETE /api/products/:id
router.delete('/:id', productController.deleteProduct);

module.exports = router;
