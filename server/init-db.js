/**
 * 数据库初始化脚本
 * 用于创建数据库表和初始化示例数据
 */

const { sequelize, testConnection, initDatabase } = require('./db');
const { Product, InventoryRecord } = require('./models');

/**
 * 创建示例数据
 */
async function createSampleData() {
    console.log('📦 开始创建示例数据...');

    try {
        // 创建示例商品
        const products = await Product.bulkCreate([
            {
                code: 'P001',
                name: '罗曼蒂克包装盒',
                category: '包装材料',
                unit: '个',
                price: 5.50,
                quantity: 150,
                minStock: 50,
                description: '3层黄卡美+C单瓦纸箱'
            },
            {
                code: 'P002',
                name: '标准纸箱',
                category: '包装材料',
                unit: '个',
                price: 3.20,
                quantity: 200,
                minStock: 100,
                description: '5层瓦楞纸箱'
            },
            {
                code: 'P003',
                name: '气泡膜',
                category: '包装材料',
                unit: '卷',
                price: 25.00,
                quantity: 30,
                minStock: 10,
                description: '宽度50cm，长度100m'
            },
            {
                code: 'P004',
                name: '封箱胶带',
                category: '包装材料',
                unit: '卷',
                price: 2.50,
                quantity: 80,
                minStock: 30,
                description: '宽度48mm，长度50m'
            },
            {
                code: 'P005',
                name: '珍珠棉',
                category: '包装材料',
                unit: '片',
                price: 1.20,
                quantity: 5,
                minStock: 20,
                description: '厚度2mm，尺寸可定制'
            }
        ]);

        console.log(`✅ 已创建 ${products.length} 个示例商品`);

        // 创建示例库存记录
        const records = await InventoryRecord.bulkCreate([
            {
                productId: products[0].id,
                type: 'IN',
                quantity: 100,
                beforeQty: 50,
                afterQty: 150,
                reason: '初始入库'
            },
            {
                productId: products[1].id,
                type: 'IN',
                quantity: 200,
                beforeQty: 0,
                afterQty: 200,
                reason: '初始入库'
            },
            {
                productId: products[2].id,
                type: 'IN',
                quantity: 30,
                beforeQty: 0,
                afterQty: 30,
                reason: '初始入库'
            }
        ]);

        console.log(`✅ 已创建 ${records.length} 条示例库存记录`);

        return true;
    } catch (error) {
        console.error('❌ 创建示例数据失败:', error);
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('='.repeat(50));
    console.log('🚀 开始初始化数据库...');
    console.log('='.repeat(50));

    // 1. 测试连接
    const connected = await testConnection();
    if (!connected) {
        console.error('数据库连接失败，初始化终止');
        process.exit(1);
    }

    // 2. 提示用户
    console.log('\n⚠️  警告：此操作将删除所有现有数据！');
    console.log('按 Ctrl+C 取消，或等待 3 秒后自动继续...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. 初始化数据库（force: true 会删除现有表）
    const initialized = await initDatabase(true);
    if (!initialized) {
        console.error('数据库初始化失败');
        process.exit(1);
    }

    // 4. 创建示例数据
    const dataCreated = await createSampleData();
    if (!dataCreated) {
        console.error('示例数据创建失败');
        process.exit(1);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ 数据库初始化完成！');
    console.log('='.repeat(50));
    console.log('\n数据库位置:', require('path').join(__dirname, '../data/database.sqlite'));
    console.log('示例商品数量:', 5);
    console.log('示例记录数量:', 3);
    console.log('\n可以运行以下命令启动服务器:');
    console.log('  npm start');
    console.log('');

    process.exit(0);
}

// 执行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('初始化过程出错:', error);
        process.exit(1);
    });
}

module.exports = { createSampleData };
