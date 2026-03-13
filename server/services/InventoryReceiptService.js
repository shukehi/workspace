const { InventoryReceipt, Material } = require('../models');

function normalizeReceiptDate(value) {
    if (!value) return new Date().toISOString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('INVALID_RECEIPT_DATE');
    }
    return parsed.toISOString();
}

function resolveMaterialLookupCandidates(rawMaterialId) {
    const normalized = String(rawMaterialId || '').trim();
    if (!normalized) return { code: '', numericId: null };
    const numericId = Number(normalized);
    return {
        code: normalized,
        numericId: Number.isInteger(numericId) && numericId > 0 ? numericId : null
    };
}

async function findMaterialForItem(item, transaction) {
    const { code, numericId } = resolveMaterialLookupCandidates(item?.material_id);
    if (!code && !numericId) {
        const error = new Error('MATERIAL_ID_REQUIRED');
        error.code = 'MATERIAL_ID_REQUIRED';
        error.item = item;
        throw error;
    }

    let material = null;
    if (code) {
        material = await Material.findOne({ where: { code }, transaction });
    }
    if (!material && numericId) {
        material = await Material.findByPk(numericId, { transaction });
    }
    if (!material) {
        const error = new Error('MATERIAL_NOT_FOUND');
        error.code = 'MATERIAL_NOT_FOUND';
        error.materialId = code || String(numericId);
        throw error;
    }
    return material;
}

class InventoryReceiptService {
    async createFromOrder(order, payload = {}, transaction) {
        const receiptDate = normalizeReceiptDate(payload.stocked_in_at || payload.receipt_date);
        const operator = payload.operator ? String(payload.operator).trim() : '';
        const remark = payload.remark ? String(payload.remark) : '';
        const items = Array.isArray(order?.items) ? order.items : [];
        if (items.length === 0) {
            const error = new Error('ORDER_ITEMS_REQUIRED');
            error.code = 'ORDER_ITEMS_REQUIRED';
            throw error;
        }

        const created = [];
        for (const item of items) {
            const material = await findMaterialForItem(item, transaction);
            const quantity = Number(item?.quantity || 0);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                const error = new Error('INVALID_RECEIPT_QUANTITY');
                error.code = 'INVALID_RECEIPT_QUANTITY';
                error.materialId = String(item?.material_id || '');
                throw error;
            }

            await material.update({
                stock_quantity: Number(material.stock_quantity || 0) + quantity
            }, { transaction });

            const receipt = await InventoryReceipt.create({
                order_id: order.id,
                order_no: order.order_no,
                order_item_id: item.id || null,
                material_id: String(item.material_id || material.code || material.id),
                item_name: item.name || item.type || item.model || '-',
                supplier: item.supplier || order.supplier || '',
                quantity,
                unit: item.unit || material.unit || '',
                receipt_date: receiptDate,
                operator: operator || null,
                remark,
            }, { transaction });

            created.push(receipt);
        }

        return created;
    }

    async list(query = {}) {
        const where = {};
        if (query.orderId) where.order_id = Number(query.orderId);
        if (query.orderNo) where.order_no = String(query.orderNo).trim();

        const receipts = await InventoryReceipt.findAll({
            where,
            order: [['receipt_date', 'DESC'], ['created_at', 'DESC']]
        });

        return receipts.map((receipt) => {
            const plain = typeof receipt.get === 'function' ? receipt.get({ plain: true }) : { ...receipt };
            return {
                ...plain,
                quantity: Number(plain.quantity || 0),
                receipt_date: plain.receipt_date ? new Date(plain.receipt_date).toISOString() : null,
                created_at: plain.created_at ? new Date(plain.created_at).toISOString() : null,
                updated_at: plain.updated_at ? new Date(plain.updated_at).toISOString() : null,
            };
        });
    }
}

module.exports = new InventoryReceiptService();
