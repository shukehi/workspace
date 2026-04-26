import { Request, Response, Router } from 'express';
import materialService from '../services/MaterialService';
import { Material } from '../models';
import materialResolverService, { MaterialResolutionError } from '../services/materials/material-resolver.service';
import {
    createCodeMapping,
    createSupplierMapping,
    createUomConversion,
    listMaterialMappings,
    updateCodeMapping,
    updateSupplierMapping,
    updateUomConversion,
} from '../services/materials/material-mapping.repository';
import type { MaterialCodeMappingType, MaterialMappingPartyType } from '../models/types';

const router: Router = Router();

const CODE_MAPPING_TYPES = new Set(['alias', 'barcode', 'legacy_code', 'supplier_code', 'internal_code']);
const PARTY_TYPES = new Set(['supplier', 'customer', 'internal']);

function toPositiveId(value: unknown): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function optionalNumber(value: unknown): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}

function hasInvalidNumber(body: Record<string, unknown>, field: string): boolean {
    if (!Object.prototype.hasOwnProperty.call(body, field)) return false;
    const value = body[field];
    if (value === null || value === '') return false;
    return !Number.isFinite(Number(value));
}

function optionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
}

function optionalString(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return String(value);
}

function plain(instance: any) {
    return typeof instance?.get === 'function' ? instance.get({ plain: true }) : instance;
}

async function ensureMaterial(id: number, res: Response): Promise<boolean> {
    const exists = await Material.count({ where: { id } });
    if (!exists) {
        res.status(404).json({ success: false, code: 'MATERIAL_NOT_FOUND', error: 'Material not found' });
        return false;
    }
    return true;
}

function sendError(res: Response, error: any) {
    const status = Number(error?.status || (error instanceof MaterialResolutionError ? error.status : 500));
    res.status(Number.isFinite(status) ? status : 500).json({
        success: false,
        code: error?.code || 'INTERNAL_ERROR',
        error: error?.message || 'Unexpected material mapping error',
        details: error?.details,
    });
}

function supplierPayload(materialId: number, body: Record<string, unknown>) {
    return {
        material_id: materialId,
        supplier_master_id: optionalNumber(body.supplier_master_id) ?? null,
        supplier_code: String(body.supplier_code || '').trim(),
        supplier_name_snapshot: optionalString(body.supplier_name_snapshot),
        supplier_model: optionalString(body.supplier_model),
        purchase_unit: optionalString(body.purchase_unit),
        stock_unit: optionalString(body.stock_unit),
        conversion_factor: optionalNumber(body.conversion_factor) ?? 1,
        price: optionalNumber(body.price),
        currency: optionalString(body.currency),
        is_default: optionalBoolean(body.is_default) ?? false,
        is_active: optionalBoolean(body.is_active) ?? true,
        remark: optionalString(body.remark),
    };
}

function codePayload(materialId: number, body: Record<string, unknown>) {
    const mappingType = String(body.mapping_type || '').trim();
    const partyType = body.party_type == null ? null : String(body.party_type).trim();
    return {
        material_id: materialId,
        mapping_type: mappingType as MaterialCodeMappingType,
        party_type: partyType as MaterialMappingPartyType | null,
        party_id: optionalNumber(body.party_id) ?? null,
        external_code: String(body.external_code || '').trim(),
        is_active: optionalBoolean(body.is_active) ?? true,
        priority: optionalNumber(body.priority) ?? 100,
        metadata_json: typeof body.metadata_json === 'string'
            ? body.metadata_json
            : JSON.stringify(body.metadata_json ?? {}),
    };
}

function uomPayload(materialId: number, body: Record<string, unknown>) {
    return {
        material_id: materialId,
        from_unit: String(body.from_unit || '').trim(),
        to_unit: String(body.to_unit || '').trim(),
        factor: optionalNumber(body.factor) ?? 1,
        is_purchase_default: optionalBoolean(body.is_purchase_default) ?? false,
        is_sales_default: optionalBoolean(body.is_sales_default) ?? false,
        is_active: optionalBoolean(body.is_active) ?? true,
    };
}

function assignPatchValue(
    payload: Record<string, unknown>,
    body: Record<string, unknown>,
    key: string,
    transform: (value: unknown) => unknown = (value) => value,
) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
        payload[key] = transform(body[key]);
    }
}

function supplierPatchPayload(body: Record<string, unknown>) {
    const payload: Record<string, unknown> = {};
    assignPatchValue(payload, body, 'supplier_master_id', optionalNumber);
    assignPatchValue(payload, body, 'supplier_code', (value) => String(value || '').trim());
    assignPatchValue(payload, body, 'supplier_name_snapshot', optionalString);
    assignPatchValue(payload, body, 'supplier_model', optionalString);
    assignPatchValue(payload, body, 'purchase_unit', optionalString);
    assignPatchValue(payload, body, 'stock_unit', optionalString);
    assignPatchValue(payload, body, 'conversion_factor', optionalNumber);
    assignPatchValue(payload, body, 'price', optionalNumber);
    assignPatchValue(payload, body, 'currency', optionalString);
    assignPatchValue(payload, body, 'is_default', optionalBoolean);
    assignPatchValue(payload, body, 'is_active', optionalBoolean);
    assignPatchValue(payload, body, 'remark', optionalString);
    return payload;
}

function codePatchPayload(body: Record<string, unknown>) {
    const payload: Record<string, unknown> = {};
    assignPatchValue(payload, body, 'mapping_type', (value) => String(value || '').trim());
    assignPatchValue(payload, body, 'party_type', (value) => value == null ? null : String(value).trim());
    assignPatchValue(payload, body, 'party_id', optionalNumber);
    assignPatchValue(payload, body, 'external_code', (value) => String(value || '').trim());
    assignPatchValue(payload, body, 'is_active', optionalBoolean);
    assignPatchValue(payload, body, 'priority', optionalNumber);
    assignPatchValue(payload, body, 'metadata_json', (value) => typeof value === 'string' ? value : JSON.stringify(value ?? {}));
    return payload;
}

function uomPatchPayload(body: Record<string, unknown>) {
    const payload: Record<string, unknown> = {};
    assignPatchValue(payload, body, 'from_unit', (value) => String(value || '').trim());
    assignPatchValue(payload, body, 'to_unit', (value) => String(value || '').trim());
    assignPatchValue(payload, body, 'factor', optionalNumber);
    assignPatchValue(payload, body, 'is_purchase_default', optionalBoolean);
    assignPatchValue(payload, body, 'is_sales_default', optionalBoolean);
    assignPatchValue(payload, body, 'is_active', optionalBoolean);
    return payload;
}

function validateNumericFields(body: Record<string, unknown>, fields: string[], res: Response): boolean {
    const invalidField = fields.find((field) => hasInvalidNumber(body, field));
    if (invalidField) {
        res.status(400).json({
            success: false,
            code: 'MATERIAL_MAPPING_INVALID',
            error: `${invalidField} must be a finite number`,
        });
        return false;
    }
    return true;
}

function validateSupplierPayload(payload: ReturnType<typeof supplierPayload>, res: Response): boolean {
    if (!payload.supplier_code) {
        res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: 'supplier_code is required' });
        return false;
    }
    return true;
}

function validateSupplierBody(body: Record<string, unknown>, res: Response): boolean {
    return validateNumericFields(body, ['supplier_master_id', 'conversion_factor', 'price'], res);
}

function validateSupplierPatchPayload(payload: Record<string, unknown>, res: Response): boolean {
    if (Object.prototype.hasOwnProperty.call(payload, 'supplier_code') && !String(payload.supplier_code || '').trim()) {
        res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: 'supplier_code cannot be blank' });
        return false;
    }
    return true;
}

function validateCodePayload(payload: ReturnType<typeof codePayload>, res: Response): boolean {
    if (!CODE_MAPPING_TYPES.has(payload.mapping_type)) {
        res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: 'mapping_type is invalid' });
        return false;
    }
    if (payload.party_type != null && !PARTY_TYPES.has(payload.party_type)) {
        res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: 'party_type is invalid' });
        return false;
    }
    if (!payload.external_code) {
        res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: 'external_code is required' });
        return false;
    }
    return true;
}

function validateCodeBody(body: Record<string, unknown>, res: Response): boolean {
    return validateNumericFields(body, ['party_id', 'priority'], res);
}

function validateCodePatchPayload(payload: Record<string, unknown>, res: Response): boolean {
    if (Object.prototype.hasOwnProperty.call(payload, 'mapping_type') && !CODE_MAPPING_TYPES.has(String(payload.mapping_type))) {
        res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: 'mapping_type is invalid' });
        return false;
    }
    if (payload.party_type != null && !PARTY_TYPES.has(String(payload.party_type))) {
        res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: 'party_type is invalid' });
        return false;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'external_code') && !String(payload.external_code || '').trim()) {
        res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: 'external_code cannot be blank' });
        return false;
    }
    return true;
}

function validateUomPayload(payload: ReturnType<typeof uomPayload>, res: Response): boolean {
    if (!payload.from_unit || !payload.to_unit) {
        res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: 'from_unit and to_unit are required' });
        return false;
    }
    return true;
}

function validateUomBody(body: Record<string, unknown>, res: Response): boolean {
    return validateNumericFields(body, ['factor'], res);
}

function validateUomPatchPayload(payload: Record<string, unknown>, res: Response): boolean {
    for (const key of ['from_unit', 'to_unit']) {
        if (Object.prototype.hasOwnProperty.call(payload, key) && !String(payload[key] || '').trim()) {
            res.status(400).json({ success: false, code: 'MATERIAL_MAPPING_INVALID', error: `${key} cannot be blank` });
            return false;
        }
    }
    return true;
}

// GET /api/materials/resolve?code=...
router.get('/resolve', async (req: Request, res: Response) => {
    try {
        if (req.query.supplier_master_id !== undefined && !toPositiveId(req.query.supplier_master_id)) {
            res.status(400).json({
                success: false,
                code: 'MATERIAL_MAPPING_INVALID',
                error: 'supplier_master_id must be a positive integer',
            });
            return;
        }

        const resolved = await materialResolverService.resolve({
            code: String(req.query.code || ''),
            supplierMasterId: toPositiveId(req.query.supplier_master_id) ?? undefined,
            transactionUnit: optionalString(req.query.transaction_unit) ?? undefined,
            stockUnit: optionalString(req.query.stock_unit) ?? undefined,
            allowLegacyFallback: req.query.allow_legacy_fallback === undefined
                ? undefined
                : req.query.allow_legacy_fallback !== 'false',
        });
        res.json({ success: true, resolution: resolved });
    } catch (e: any) {
        sendError(res, e);
    }
});

// GET /api/materials?q=...
router.get('/', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string | undefined;
        const materials = await materialService.searchMaterials(query);
        res.json(materials);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/materials/:id/mappings
router.get('/:id/mappings', async (req: Request, res: Response) => {
    try {
        const materialId = toPositiveId(req.params.id);
        if (!materialId) {
            res.status(400).json({ success: false, code: 'MATERIAL_INVALID_ID', error: 'Invalid material id' });
            return;
        }
        if (!await ensureMaterial(materialId, res)) return;
        res.json({ success: true, mappings: await listMaterialMappings(materialId) });
    } catch (e: any) {
        sendError(res, e);
    }
});

// POST /api/materials/:id/supplier-mappings
router.post('/:id/supplier-mappings', async (req: Request, res: Response) => {
    try {
        const materialId = toPositiveId(req.params.id);
        if (!materialId) {
            res.status(400).json({ success: false, code: 'MATERIAL_INVALID_ID', error: 'Invalid material id' });
            return;
        }
        if (!await ensureMaterial(materialId, res)) return;
        const body = req.body || {};
        if (!validateSupplierBody(body, res)) return;
        const payload = supplierPayload(materialId, body);
        if (!validateSupplierPayload(payload, res)) return;
        const mapping = await createSupplierMapping(payload);
        res.status(201).json({ success: true, mapping: plain(mapping) });
    } catch (e: any) {
        sendError(res, e);
    }
});

// PATCH /api/materials/:id/supplier-mappings/:mappingId
router.patch('/:id/supplier-mappings/:mappingId', async (req: Request, res: Response) => {
    try {
        const materialId = toPositiveId(req.params.id);
        const mappingId = toPositiveId(req.params.mappingId);
        if (!materialId || !mappingId) {
            res.status(400).json({ success: false, code: 'MATERIAL_INVALID_ID', error: 'Invalid material or mapping id' });
            return;
        }
        const body = req.body || {};
        if (!validateSupplierBody(body, res)) return;
        const payload = supplierPatchPayload(body);
        if (!validateSupplierPatchPayload(payload, res)) return;
        const mapping = await updateSupplierMapping(materialId, mappingId, payload);
        res.json({ success: true, mapping: plain(mapping) });
    } catch (e: any) {
        sendError(res, e);
    }
});

// POST /api/materials/:id/code-mappings
router.post('/:id/code-mappings', async (req: Request, res: Response) => {
    try {
        const materialId = toPositiveId(req.params.id);
        if (!materialId) {
            res.status(400).json({ success: false, code: 'MATERIAL_INVALID_ID', error: 'Invalid material id' });
            return;
        }
        if (!await ensureMaterial(materialId, res)) return;
        const body = req.body || {};
        if (!validateCodeBody(body, res)) return;
        const payload = codePayload(materialId, body);
        if (!validateCodePayload(payload, res)) return;
        const mapping = await createCodeMapping(payload);
        res.status(201).json({ success: true, mapping: plain(mapping) });
    } catch (e: any) {
        sendError(res, e);
    }
});

// PATCH /api/materials/:id/code-mappings/:mappingId
router.patch('/:id/code-mappings/:mappingId', async (req: Request, res: Response) => {
    try {
        const materialId = toPositiveId(req.params.id);
        const mappingId = toPositiveId(req.params.mappingId);
        if (!materialId || !mappingId) {
            res.status(400).json({ success: false, code: 'MATERIAL_INVALID_ID', error: 'Invalid material or mapping id' });
            return;
        }
        const body = req.body || {};
        if (!validateCodeBody(body, res)) return;
        const payload = codePatchPayload(body);
        if (!validateCodePatchPayload(payload, res)) return;
        const mapping = await updateCodeMapping(materialId, mappingId, payload);
        res.json({ success: true, mapping: plain(mapping) });
    } catch (e: any) {
        sendError(res, e);
    }
});

// POST /api/materials/:id/uom-conversions
router.post('/:id/uom-conversions', async (req: Request, res: Response) => {
    try {
        const materialId = toPositiveId(req.params.id);
        if (!materialId) {
            res.status(400).json({ success: false, code: 'MATERIAL_INVALID_ID', error: 'Invalid material id' });
            return;
        }
        if (!await ensureMaterial(materialId, res)) return;
        const body = req.body || {};
        if (!validateUomBody(body, res)) return;
        const payload = uomPayload(materialId, body);
        if (!validateUomPayload(payload, res)) return;
        const conversion = await createUomConversion(payload);
        res.status(201).json({ success: true, conversion: plain(conversion) });
    } catch (e: any) {
        sendError(res, e);
    }
});

// PATCH /api/materials/:id/uom-conversions/:conversionId
router.patch('/:id/uom-conversions/:conversionId', async (req: Request, res: Response) => {
    try {
        const materialId = toPositiveId(req.params.id);
        const conversionId = toPositiveId(req.params.conversionId);
        if (!materialId || !conversionId) {
            res.status(400).json({ success: false, code: 'MATERIAL_INVALID_ID', error: 'Invalid material or conversion id' });
            return;
        }
        const body = req.body || {};
        if (!validateUomBody(body, res)) return;
        const payload = uomPatchPayload(body);
        if (!validateUomPatchPayload(payload, res)) return;
        const conversion = await updateUomConversion(materialId, conversionId, payload);
        res.json({ success: true, conversion: plain(conversion) });
    } catch (e: any) {
        sendError(res, e);
    }
});

// POST /api/materials
router.post('/', async (req: Request, res: Response) => {
    try {
        const material = await materialService.createMaterial(req.body);
        res.json(material);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/materials/:id
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const material = await materialService.updateMaterial(Number(req.params.id), req.body);
        res.json(material);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
