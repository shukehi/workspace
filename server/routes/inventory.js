/**
 * 库存路由
 * 定义库存操作相关的 API 端点
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// 商品入库
// POST /api/inventory/in
// Body: { productId, quantity, reason }
router.post('/in', inventoryController.stockIn);

// 商品出库
// POST /api/inventory/out
// Body: { productId, quantity, reason }
router.post('/out', inventoryController.stockOut);

// 库存调整（盘点）
// POST /api/inventory/adjust
// Body: { productId, quantity, reason }
router.post('/adjust', inventoryController.adjustStock);

// 获取库存记录
// GET /api/inventory/records?productId=1&limit=50&type=IN
router.get('/records', inventoryController.getInventoryRecords);

// 获取库存统计
// GET /api/inventory/statistics
router.get('/statistics', inventoryController.getStatistics);

module.exports = router;
