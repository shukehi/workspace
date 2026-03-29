import { Op, type WhereOptions } from 'sequelize';
import { InventoryLocation, InventoryMovement, Material, Warehouse } from '../../models';
import type { InventoryMovementAttributes } from '../../models/types';

function normalizeText(value: unknown): string {
    return String(value || '').trim();
}

function readPositiveInteger(value: unknown): number | null {
    const numeric = Number(String(value ?? '').trim());
    return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}

function toMovementRow(movement: any) {
    const plain = typeof movement?.get === 'function' ? movement.get({ plain: true }) : movement;
    const material = plain.material || {};
    const warehouse = plain.warehouse || {};
    const location = plain.location || {};
    return {
        id: Number(plain.id),
        source_type: plain.source_type || '',
        source_id: plain.source_id || '',
        source_line_key: plain.source_line_key || '',
        material_id: Number(plain.material_id || 0),
        material_code: material.code || '',
        material_name: material.name || '',
        warehouse_id: Number(plain.warehouse_id || 0),
        warehouse_name: warehouse.name || '',
        location_id: Number(plain.location_id || 0),
        location_code: location.code || '',
        location_name: location.name || '',
        delta_quantity: Number(plain.delta_quantity || 0),
        balance_after: Number(plain.balance_after || 0),
        stock_after: Number(plain.stock_after || 0),
        reason: plain.reason || '',
        operator: plain.operator || '',
        remark: plain.remark || '',
        occurred_at: plain.occurred_at ? new Date(plain.occurred_at).toISOString() : null,
        created_at: plain.created_at ? new Date(plain.created_at).toISOString() : null,
    };
}

class InventoryMovementQueryService {
    async list(query: Record<string, unknown> = {}) {
        const page = Math.max(1, readPositiveInteger(query.page) || 1);
        const pageSize = Math.min(200, Math.max(1, readPositiveInteger(query.pageSize) || 50));
        const materialId = readPositiveInteger(query.materialId);
        const warehouseId = readPositiveInteger(query.warehouseId);
        const locationId = readPositiveInteger(query.locationId);
        const sourceType = normalizeText(query.sourceType);
        const keyword = normalizeText(query.keyword);
        const startDate = normalizeText(query.startDate);
        const endDate = normalizeText(query.endDate);

        const where: WhereOptions<any> = {};
        if (materialId) where.material_id = materialId;
        if (warehouseId) where.warehouse_id = warehouseId;
        if (locationId) where.location_id = locationId;
        if (sourceType) where.source_type = sourceType as InventoryMovementAttributes['source_type'];
        if (startDate || endDate) {
            where.occurred_at = {
                ...(startDate ? { [Op.gte]: new Date(`${startDate}T00:00:00.000Z`) } : {}),
                ...(endDate ? { [Op.lte]: new Date(`${endDate}T23:59:59.999Z`) } : {}),
            };
        }
        if (keyword) {
            const likeKeyword = `%${escapeLikePattern(keyword)}%`;
            Object.assign(where, {
                [Op.or]: [
                    { reason: { [Op.like]: likeKeyword } },
                    { operator: { [Op.like]: likeKeyword } },
                    { '$material.code$': { [Op.like]: likeKeyword } },
                    { '$material.name$': { [Op.like]: likeKeyword } },
                    { '$warehouse.name$': { [Op.like]: likeKeyword } },
                    { '$location.code$': { [Op.like]: likeKeyword } },
                    { '$location.name$': { [Op.like]: likeKeyword } },
                ],
            } satisfies WhereOptions<any>);
        }

        const result = await InventoryMovement.findAndCountAll({
            where,
            include: [
                { model: Material, as: 'material', required: false },
                { model: Warehouse, as: 'warehouse', required: false },
                { model: InventoryLocation, as: 'location', required: false },
            ],
            distinct: true,
            order: [['occurred_at', 'DESC'], ['id', 'DESC']],
            offset: (page - 1) * pageSize,
            limit: pageSize,
        });

        const rows = result.rows.map(toMovementRow);

        return {
            rows,
            total: Number(result.count || 0),
            page,
            pageSize,
        };
    }
}

const inventoryMovementQueryService = new InventoryMovementQueryService();

export default inventoryMovementQueryService;
