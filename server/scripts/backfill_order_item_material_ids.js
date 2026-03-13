const { Op } = require('sequelize');
const { Order, OrderItem, sequelize } = require('../models');

function normalizeText(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function resolveMaterialId(category, item) {
    const normalizedCategory = normalizeText(category);
    const candidatesByCategory = {
        '包装': [
            item.spec,
            item.internal_name,
            item.external_name,
            item.name,
            item.model
        ],
        '锁芯': [item.type, item.name, item.model, item.spec],
        '锁具': [item.type, item.name, item.model, item.spec],
        '拉手': [item.type, item.name, item.model, item.spec],
        '锁叉': [item.type, item.name, item.model, item.spec],
        '颜色': [item.material_id, item.name, item.type, item.model, item.spec]
    };

    const candidates = candidatesByCategory[normalizedCategory] || [
        item.material_id,
        item.type,
        item.name,
        item.model,
        item.spec
    ];

    for (const candidate of candidates) {
        const normalized = normalizeText(candidate);
        if (normalized) return normalized;
    }
    return '';
}

async function backfillOrderItemMaterialIds() {
    try {
        await sequelize.authenticate();

        const orders = await Order.findAll({
            include: [{
                model: OrderItem,
                as: 'items',
                where: {
                    [Op.or]: [
                        { material_id: null },
                        { material_id: '' },
                        sequelize.where(sequelize.fn('trim', sequelize.col('items.material_id')), '')
                    ]
                },
                required: true
            }],
            order: [['created_at', 'DESC']]
        });

        const autoOrders = orders.filter((order) => order?.metadata?.order_source === 'auto');

        let updatedItems = 0;
        let skippedItems = 0;

        for (const order of autoOrders) {
            for (const item of order.items || []) {
                const materialId = resolveMaterialId(order.category, item);
                if (!materialId) {
                    skippedItems += 1;
                    console.warn('[backfill_order_item_material_ids] skipped item with no resolvable material_id', {
                        order_id: order.id,
                        order_no: order.order_no,
                        category: order.category,
                        item_id: item.id,
                        name: item.name,
                        type: item.type,
                        model: item.model,
                        spec: item.spec
                    });
                    continue;
                }

                await item.update({ material_id: materialId });
                updatedItems += 1;
            }
        }

        console.log('[backfill_order_item_material_ids] completed', {
            orders: autoOrders.length,
            updatedItems,
            skippedItems
        });
    } catch (error) {
        console.error('[backfill_order_item_material_ids] failed', error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

backfillOrderItemMaterialIds();
