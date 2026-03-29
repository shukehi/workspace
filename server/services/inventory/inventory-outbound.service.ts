import type { Transaction } from 'sequelize';
import { sequelize } from '../../models';
import type {
    MaterialInstance,
} from '../../models';
import type { InventoryOutboundItemCreationAttributes } from '../../models/types';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import { ensureDefaultWarehouseAndLocation } from './inventory-defaults';
import { resolveWarehouseAndLocation } from './inventory-location.service';
import { applyInventoryMovement } from './inventory-movement.service';
import * as repository from './inventory-outbound.repository';

function normalizeText(value: unknown): string {
    return String(value || '').trim();
}

function normalizeDate(value: unknown): string {
    if (!value) return new Date().toISOString();
    const parsed = new Date(value as string | number | Date);
    if (Number.isNaN(parsed.getTime())) {
        throw new AppError({
            code: ERROR_CODES.INVALID_RECEIPT_DATE,
            status: 400,
            details: { value },
        });
    }
    return parsed.toISOString();
}

function normalizeQuantity(value: unknown) {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new AppError({
            code: ERROR_CODES.INVALID_RECEIPT_QUANTITY,
            status: 400,
            details: { value },
        });
    }
    return quantity;
}

function generateOutboundNo(direction: 'out' | 'reversal' = 'out') {
    const prefix = direction === 'out' ? 'OUT' : 'OUT-R';
    return `${prefix}-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function isOutboundReverseConflict(error: unknown) {
    const record = (error || {}) as Record<string, unknown>;
    const message = String(record.message || '');
    const fields = typeof record.fields === 'object' && record.fields !== null
        ? Object.keys(record.fields as Record<string, unknown>)
        : [];

    if (String(record.name || '') === 'SequelizeUniqueConstraintError') {
        return fields.includes('source_outbound_id') || message.includes('source_outbound_id');
    }

    return message.includes('inventory_outbounds.source_outbound_id')
        && message.includes('inventory_outbounds.direction');
}

type SerializedOutboundItem = {
    id: number;
    outbound_id: number;
    material_id: number;
    material_code: string;
    item_name: string;
    unit: string;
    quantity: number;
};

type SerializedOutbound = {
    id: number;
    outbound_no: string;
    direction: 'out' | 'reversal';
    source_outbound_id: number | null;
    warehouse_id: number;
    warehouse_name: string;
    location_id: number;
    location_code: string;
    location_name: string;
    operator: string;
    reason: string;
    remark: string;
    status: string;
    outbound_date: string | null;
    created_at: string | null;
    updated_at: string | null;
    can_reverse: boolean;
    items: SerializedOutboundItem[];
};

function serializeOutbound(outbound: any): SerializedOutbound {
    const plain = typeof outbound?.get === 'function' ? outbound.get({ plain: true }) : { ...outbound };
    const warehouse = plain.warehouse || {};
    const location = plain.location || {};
    const items = Array.isArray(plain.items) ? plain.items : [];
    const reversed = String(plain.status || '') === 'reversed';

    return {
        id: Number(plain.id),
        outbound_no: plain.outbound_no || '',
        direction: plain.direction || 'out',
        source_outbound_id: plain.source_outbound_id ?? null,
        warehouse_id: Number(plain.warehouse_id || warehouse.id || 0),
        warehouse_name: warehouse.name || '',
        location_id: Number(plain.location_id || location.id || 0),
        location_code: location.code || '',
        location_name: location.name || '',
        operator: plain.operator || '',
        reason: plain.reason || '',
        remark: plain.remark || '',
        status: plain.status || 'posted',
        outbound_date: plain.outbound_date ? new Date(plain.outbound_date).toISOString() : null,
        created_at: plain.created_at ? new Date(plain.created_at).toISOString() : null,
        updated_at: plain.updated_at ? new Date(plain.updated_at).toISOString() : null,
        can_reverse: plain.direction === 'out' && !reversed,
        items: items.map((item: any) => ({
            id: Number(item.id),
            outbound_id: Number(item.outbound_id),
            material_id: Number(item.material_id),
            material_code: item.material?.code || '',
            item_name: item.item_name || '',
            unit: item.unit || '',
            quantity: Number(item.quantity || 0),
        })),
    };
}

function matchesQuery(outbound: SerializedOutbound, query: Record<string, unknown>) {
    const outboundNo = normalizeText(query.outboundNo).toLowerCase();
    const keyword = normalizeText(query.keyword).toLowerCase();
    const operator = normalizeText(query.operator).toLowerCase();
    const warehouseId = Number(query.warehouseId);
    const locationId = Number(query.locationId);
    const startDate = normalizeText(query.startDate);
    const endDate = normalizeText(query.endDate);

    if (outboundNo && !outbound.outbound_no.toLowerCase().includes(outboundNo)) return false;
    if (operator && !String(outbound.operator || '').toLowerCase().includes(operator)) return false;
    if (Number.isInteger(warehouseId) && warehouseId > 0 && outbound.warehouse_id !== warehouseId) return false;
    if (Number.isInteger(locationId) && locationId > 0 && outbound.location_id !== locationId) return false;
    if (startDate && outbound.outbound_date && outbound.outbound_date.slice(0, 10) < startDate) return false;
    if (endDate && outbound.outbound_date && outbound.outbound_date.slice(0, 10) > endDate) return false;
    if (!keyword) return true;

    return [
        outbound.outbound_no,
        outbound.reason,
        outbound.operator,
        outbound.location_name,
        outbound.location_code,
        outbound.warehouse_name,
        ...outbound.items.flatMap((item) => [item.item_name, item.material_code]),
    ].some((candidate) => String(candidate || '').toLowerCase().includes(keyword));
}

class InventoryOutboundService {
    async list(query: Record<string, unknown> = {}) {
        await ensureDefaultWarehouseAndLocation();
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 50));
        const rows = (await repository.listOutbounds())
            .map(serializeOutbound)
            .filter((item) => matchesQuery(item, query));

        return {
            rows: rows.slice((page - 1) * pageSize, page * pageSize),
            total: rows.length,
            page,
            pageSize,
        };
    }

    async getById(id: number | string) {
        const outbound = await repository.findOutboundById(Number(id));
        if (!outbound) {
            throw new AppError({
                code: ERROR_CODES.OUTBOUND_NOT_FOUND,
                status: 404,
                details: { outboundId: id },
            });
        }
        return serializeOutbound(outbound);
    }

    async create(payload: Record<string, unknown> = {}) {
        const items = Array.isArray(payload.items) ? payload.items : [];
        if (items.length === 0) {
            throw new AppError({
                code: ERROR_CODES.OUTBOUND_ITEMS_REQUIRED,
                status: 400,
            });
        }

        const reason = normalizeText(payload.reason);
        if (!reason) {
            throw new AppError({
                code: ERROR_CODES.OUTBOUND_REASON_REQUIRED,
                status: 400,
            });
        }

        const transaction = await sequelize.transaction();
        try {
            const { warehouse, location } = await resolveWarehouseAndLocation(payload.warehouse_id, payload.location_id, transaction);
            const outbound = await repository.createOutbound({
                outbound_no: generateOutboundNo('out'),
                direction: 'out',
                source_outbound_id: null,
                warehouse_id: warehouse.id,
                location_id: location.id,
                operator: normalizeText(payload.operator) || null,
                reason,
                remark: normalizeText(payload.remark),
                status: 'posted',
                outbound_date: normalizeDate(payload.outbound_date),
            }, transaction);

            const rows: InventoryOutboundItemCreationAttributes[] = [];
            for (const rawItem of items as Array<Record<string, unknown>>) {
                const material = await repository.findMaterial(rawItem.material_id, transaction);
                if (!material) {
                    throw new AppError({
                        code: ERROR_CODES.NOT_FOUND,
                        status: 404,
                        details: { materialId: rawItem.material_id },
                    });
                }

                const quantity = normalizeQuantity(rawItem.quantity);
                await applyInventoryMovement({
                    material,
                    warehouseId: warehouse.id,
                    locationId: location.id,
                    sourceType: 'outbound',
                    sourceId: String(outbound.id),
                    sourceLineKey: String(material.id),
                    deltaQuantity: -quantity,
                    reason,
                    operator: normalizeText(payload.operator) || null,
                    remark: normalizeText(payload.remark),
                    occurredAt: normalizeDate(payload.outbound_date),
                    metadata: {
                        outbound_id: outbound.id,
                        direction: 'out',
                    },
                    insufficientBalanceCode: ERROR_CODES.OUTBOUND_INSUFFICIENT_BALANCE,
                    transaction,
                });
                rows.push({
                    outbound_id: outbound.id,
                    material_id: material.id,
                    item_name: normalizeText(rawItem.item_name) || material.name || material.model || material.code,
                    unit: normalizeText(rawItem.unit) || material.unit || '',
                    quantity,
                });
            }

            await repository.createOutboundItems(rows, transaction);
            await transaction.commit();
            return await this.getById(outbound.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async reverse(id: number | string, payload: Record<string, unknown> = {}) {
        const transaction = await sequelize.transaction();
        try {
            const source = await repository.findOutboundById(Number(id), transaction);
            if (!source) {
                throw new AppError({
                    code: ERROR_CODES.OUTBOUND_NOT_FOUND,
                    status: 404,
                    details: { outboundId: id },
                });
            }
            if (String(source.direction) !== 'out') {
                throw new AppError({
                    code: ERROR_CODES.OUTBOUND_NOT_FOUND,
                    status: 404,
                    details: { outboundId: id },
                });
            }

            const claimed = await repository.markOutboundReversedIfPosted(Number(source.id), transaction);
            if (claimed === 0) {
                throw new AppError({
                    code: ERROR_CODES.OUTBOUND_ALREADY_REVERSED,
                    status: 400,
                    details: { outboundId: id },
                });
            }

            const reason = normalizeText(payload.reason) || '出库冲销';
            const reversal = await repository.createOutbound({
                outbound_no: generateOutboundNo('reversal'),
                direction: 'reversal',
                source_outbound_id: source.id,
                warehouse_id: source.warehouse_id,
                location_id: source.location_id,
                operator: normalizeText(payload.operator) || null,
                reason,
                remark: normalizeText(payload.remark),
                status: 'posted',
                outbound_date: normalizeDate(payload.outbound_date),
            }, transaction);

            const sourcePlain = serializeOutbound(source);
            const rows: InventoryOutboundItemCreationAttributes[] = [];
            for (const item of sourcePlain.items) {
                const material = await repository.findMaterial(item.material_id, transaction);
                if (!material) {
                    throw new AppError({
                        code: ERROR_CODES.NOT_FOUND,
                        status: 404,
                        details: { materialId: item.material_id },
                    });
                }
                await applyInventoryMovement({
                    material,
                    warehouseId: sourcePlain.warehouse_id,
                    locationId: sourcePlain.location_id,
                    sourceType: 'outbound_reversal',
                    sourceId: String(reversal.id),
                    sourceLineKey: String(item.material_id),
                    deltaQuantity: Number(item.quantity || 0),
                    reason,
                    operator: normalizeText(payload.operator) || null,
                    remark: normalizeText(payload.remark),
                    occurredAt: normalizeDate(payload.outbound_date),
                    metadata: {
                        outbound_id: reversal.id,
                        source_outbound_id: source.id,
                        direction: 'reversal',
                    },
                    insufficientBalanceCode: ERROR_CODES.OUTBOUND_INSUFFICIENT_BALANCE,
                    transaction,
                });
                rows.push({
                    outbound_id: reversal.id,
                    material_id: item.material_id,
                    item_name: item.item_name,
                    unit: item.unit,
                    quantity: Number(item.quantity || 0),
                });
            }

            await repository.createOutboundItems(rows, transaction);
            await transaction.commit();
            return await this.getById(reversal.id);
        } catch (error) {
            await transaction.rollback();
            if (isOutboundReverseConflict(error)) {
                throw new AppError({
                    code: ERROR_CODES.OUTBOUND_ALREADY_REVERSED,
                    status: 400,
                    details: { outboundId: id },
                    originalError: error,
                });
            }
            throw error;
        }
    }
}

const inventoryOutboundService = new InventoryOutboundService();

export default inventoryOutboundService;
