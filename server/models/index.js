/**
 * 模型索引文件
 * 统一导出所有数据模型并定义关联关系
 */

const Product = require('./Product');
const InventoryRecord = require('./InventoryRecord');

// 定义模型之间的关联关系

// 1. Product 与 InventoryRecord 的关系
// 一个商品可以有多条库存记录
Product.hasMany(InventoryRecord, {
    foreignKey: 'productId',
    as: 'records',
    onDelete: 'CASCADE' // 删除商品时级联删除相关记录
});

// 一条库存记录属于一个商品
InventoryRecord.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

module.exports = {
    Product,
    InventoryRecord
};
