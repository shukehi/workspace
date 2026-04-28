import type { Transaction, WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import {
  Material,
  MaterialCodeMapping,
  MaterialSupplierMapping,
  MaterialUomConversion,
  SupplierMaster,
} from '../../models';
import type {
  MaterialCodeMappingAttributes,
  MaterialCodeMappingCreationAttributes,
  MaterialCodeMappingType,
  MaterialMappingPartyType,
  MaterialSupplierMappingAttributes,
  MaterialSupplierMappingCreationAttributes,
  MaterialUomConversionAttributes,
  MaterialUomConversionCreationAttributes,
} from '../../models/types';

export function normalizeMaterialExternalCode(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeMaterialUnit(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

export type CodeMappingLookup = {
  code: string;
  mappingType?: MaterialCodeMappingType;
  partyType?: MaterialMappingPartyType | null;
  partyId?: number | null;
  transaction?: Transaction | null;
};

export type SupplierMappingLookup = {
  supplierMasterId: number;
  supplierCode: string;
  transaction?: Transaction | null;
};

type MappingUpdate<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;
type SupplierMappingUpdate = MappingUpdate<MaterialSupplierMappingAttributes>;
type CodeMappingUpdate = MappingUpdate<MaterialCodeMappingAttributes>;
type UomConversionUpdate = MappingUpdate<MaterialUomConversionAttributes>;

function notFoundError(message: string) {
  const error = new Error(message) as Error & { code?: string; status?: number };
  error.code = 'MATERIAL_MAPPING_NOT_FOUND';
  error.status = 404;
  return error;
}

function codeMappingConflictError(conflictingMaterialId: number, mappingType: MaterialCodeMappingType, normalizedCode: string) {
  const error = new Error('Active material code mapping already exists for another material') as Error & {
    code?: string;
    status?: number;
    details?: Record<string, unknown>;
  };
  error.code = 'MATERIAL_CODE_MAPPING_CONFLICT';
  error.status = 409;
  error.details = {
    conflictingMaterialId,
    mappingType,
    normalizedCode,
  };
  return error;
}

function plain<T>(instance: any): T {
  return typeof instance?.get === 'function' ? instance.get({ plain: true }) : instance;
}

function assignIfPresent<T extends Record<string, unknown>, K extends string>(
  target: T,
  source: Record<string, unknown>,
  key: K,
) {
  if (Object.prototype.hasOwnProperty.call(source, key)) {
    target[key as keyof T] = source[key] as T[keyof T];
  }
}

async function assertNoActiveCodeMappingConflict(
  materialId: number,
  mappingType: MaterialCodeMappingType,
  normalizedCode: string,
  excludeMappingId?: number | null,
  transaction?: Transaction | null,
) {
  if (!materialId || !mappingType || !normalizedCode) return;

  const where: WhereOptions = {
    mapping_type: mappingType,
    normalized_code: normalizedCode,
    is_active: true,
    material_id: { [Op.ne]: materialId },
    ...(excludeMappingId ? { id: { [Op.ne]: excludeMappingId } } : {}),
  };
  const existing = await MaterialCodeMapping.findOne({
    where,
    transaction: transaction ?? undefined,
    order: [['id', 'ASC']],
  });
  if (existing) {
    throw codeMappingConflictError(plain<MaterialCodeMappingAttributes>(existing).material_id, mappingType, normalizedCode);
  }
}

export async function listMaterialMappings(materialId: number, transaction?: Transaction | null) {
  return {
    supplierMappings: (await MaterialSupplierMapping.findAll({
      where: { material_id: materialId },
      transaction: transaction ?? undefined,
      order: [['is_default', 'DESC'], ['id', 'ASC']],
    })).map((item) => plain<MaterialSupplierMappingAttributes>(item)),
    codeMappings: (await MaterialCodeMapping.findAll({
      where: { material_id: materialId },
      transaction: transaction ?? undefined,
      order: [['priority', 'ASC'], ['id', 'ASC']],
    })).map((item) => plain<MaterialCodeMappingAttributes>(item)),
    uomConversions: (await MaterialUomConversion.findAll({
      where: { material_id: materialId },
      transaction: transaction ?? undefined,
      order: [['is_purchase_default', 'DESC'], ['id', 'ASC']],
    })).map((item) => plain<MaterialUomConversionAttributes>(item)),
  };
}

export async function findActiveSupplierMappings(
  lookup: SupplierMappingLookup,
) {
  const normalized = normalizeMaterialExternalCode(lookup.supplierCode);
  if (!lookup.supplierMasterId || !normalized) return [];

  return MaterialSupplierMapping.findAll({
    where: {
      supplier_master_id: lookup.supplierMasterId,
      normalized_supplier_code: normalized,
      is_active: true,
    },
    include: [
      { model: Material, as: 'material', required: true },
      { model: SupplierMaster, as: 'supplierMaster', required: false },
    ],
    transaction: lookup.transaction ?? undefined,
    order: [['is_default', 'DESC'], ['id', 'ASC']],
  });
}

export async function findActiveCodeMappings(lookup: CodeMappingLookup) {
  const normalized = normalizeMaterialExternalCode(lookup.code);
  if (!normalized) return [];

  const where: WhereOptions = {
    normalized_code: normalized,
    is_active: true,
    ...(lookup.mappingType ? { mapping_type: lookup.mappingType } : {}),
    ...(lookup.partyType !== undefined ? { party_type: lookup.partyType } : {}),
    ...(lookup.partyId !== undefined ? { party_id: lookup.partyId } : {}),
  };

  return MaterialCodeMapping.findAll({
    where,
    include: [{ model: Material, as: 'material', required: true }],
    transaction: lookup.transaction ?? undefined,
    order: [['priority', 'ASC'], ['id', 'ASC']],
  });
}

export async function findUomConversion(
  materialId: number,
  fromUnit: unknown,
  toUnit: unknown,
  transaction?: Transaction | null,
) {
  const from = normalizeMaterialUnit(fromUnit);
  const to = normalizeMaterialUnit(toUnit);
  if (!materialId || !from || !to) return null;

  return MaterialUomConversion.findOne({
    where: {
      material_id: materialId,
      from_unit: from,
      to_unit: to,
      is_active: true,
    },
    transaction: transaction ?? undefined,
    order: [['is_purchase_default', 'DESC'], ['id', 'ASC']],
  });
}

export async function createSupplierMapping(
  payload: Omit<MaterialSupplierMappingCreationAttributes, 'normalized_supplier_code'> & { normalized_supplier_code?: string },
  transaction?: Transaction | null,
) {
  const conversionFactor = Number(payload.conversion_factor ?? 1);
  if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
    const error = new Error('Material supplier mapping conversion factor must be greater than zero') as Error & { code?: string; status?: number };
    error.code = 'MATERIAL_UOM_INVALID';
    error.status = 400;
    throw error;
  }

  return MaterialSupplierMapping.create({
    ...payload,
    normalized_supplier_code: payload.normalized_supplier_code || normalizeMaterialExternalCode(payload.supplier_code),
    conversion_factor: conversionFactor,
    is_default: payload.is_default ?? false,
    is_active: payload.is_active ?? true,
  }, { transaction: transaction ?? undefined });
}

export async function createCodeMapping(
  payload: Omit<MaterialCodeMappingCreationAttributes, 'normalized_code'> & { normalized_code?: string },
  transaction?: Transaction | null,
) {
  const normalizedCode = payload.normalized_code || normalizeMaterialExternalCode(payload.external_code);
  const isActive = payload.is_active ?? true;
  if (isActive) {
    await assertNoActiveCodeMappingConflict(
      payload.material_id,
      payload.mapping_type,
      normalizedCode,
      null,
      transaction,
    );
  }

  return MaterialCodeMapping.create({
    ...payload,
    normalized_code: normalizedCode,
    is_active: isActive,
    priority: payload.priority ?? 100,
    metadata_json: payload.metadata_json ?? '{}',
  }, { transaction: transaction ?? undefined });
}

export async function createUomConversion(
  payload: MaterialUomConversionCreationAttributes,
  transaction?: Transaction | null,
) {
  const factor = Number(payload.factor ?? 1);
  if (!Number.isFinite(factor) || factor <= 0) {
    const error = new Error('Material UOM conversion factor must be greater than zero') as Error & { code?: string; status?: number };
    error.code = 'MATERIAL_UOM_INVALID';
    error.status = 400;
    throw error;
  }

  return MaterialUomConversion.create({
    ...payload,
    from_unit: normalizeMaterialUnit(payload.from_unit),
    to_unit: normalizeMaterialUnit(payload.to_unit),
    factor,
    is_purchase_default: payload.is_purchase_default ?? false,
    is_sales_default: payload.is_sales_default ?? false,
    is_active: payload.is_active ?? true,
  }, { transaction: transaction ?? undefined });
}

export async function updateSupplierMapping(
  materialId: number,
  mappingId: number,
  payload: SupplierMappingUpdate,
  transaction?: Transaction | null,
) {
  const row = await MaterialSupplierMapping.findOne({
    where: { id: mappingId, material_id: materialId },
    transaction: transaction ?? undefined,
  });
  if (!row) throw notFoundError('Material supplier mapping not found');

  const input = payload as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const key of [
    'supplier_master_id',
    'supplier_name_snapshot',
    'supplier_model',
    'purchase_unit',
    'stock_unit',
    'price',
    'currency',
    'is_default',
    'is_active',
    'remark',
  ]) {
    assignIfPresent(next, input, key);
  }
  if (payload.supplier_code !== undefined) {
    next.supplier_code = payload.supplier_code;
    next.normalized_supplier_code = normalizeMaterialExternalCode(payload.supplier_code);
  }
  if (payload.conversion_factor !== undefined) {
    const conversionFactor = Number(payload.conversion_factor);
    if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
      const error = new Error('Material supplier mapping conversion factor must be greater than zero') as Error & { code?: string; status?: number };
      error.code = 'MATERIAL_UOM_INVALID';
      error.status = 400;
      throw error;
    }
    next.conversion_factor = conversionFactor;
  }

  await row.update(next, { transaction: transaction ?? undefined });
  return row;
}

export async function updateCodeMapping(
  materialId: number,
  mappingId: number,
  payload: CodeMappingUpdate,
  transaction?: Transaction | null,
) {
  const row = await MaterialCodeMapping.findOne({
    where: { id: mappingId, material_id: materialId },
    transaction: transaction ?? undefined,
  });
  if (!row) throw notFoundError('Material code mapping not found');

  const input = payload as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const key of [
    'mapping_type',
    'party_type',
    'party_id',
    'is_active',
    'priority',
    'metadata_json',
  ]) {
    assignIfPresent(next, input, key);
  }
  if (payload.external_code !== undefined) {
    next.external_code = payload.external_code;
    next.normalized_code = normalizeMaterialExternalCode(payload.external_code);
  }
  if (payload.metadata_json !== undefined && typeof payload.metadata_json !== 'string') {
    next.metadata_json = JSON.stringify(payload.metadata_json);
  }

  const current = plain<MaterialCodeMappingAttributes>(row);
  const nextIsActive = next.is_active === undefined ? current.is_active : Boolean(next.is_active);
  if (nextIsActive) {
    await assertNoActiveCodeMappingConflict(
      materialId,
      (next.mapping_type ?? current.mapping_type) as MaterialCodeMappingType,
      (next.normalized_code ?? current.normalized_code) as string,
      mappingId,
      transaction,
    );
  }

  await row.update(next, { transaction: transaction ?? undefined });
  return row;
}

export async function updateUomConversion(
  materialId: number,
  conversionId: number,
  payload: UomConversionUpdate,
  transaction?: Transaction | null,
) {
  const row = await MaterialUomConversion.findOne({
    where: { id: conversionId, material_id: materialId },
    transaction: transaction ?? undefined,
  });
  if (!row) throw notFoundError('Material UOM conversion not found');

  const input = payload as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const key of ['is_purchase_default', 'is_sales_default', 'is_active']) {
    assignIfPresent(next, input, key);
  }
  if (payload.from_unit !== undefined) next.from_unit = normalizeMaterialUnit(payload.from_unit);
  if (payload.to_unit !== undefined) next.to_unit = normalizeMaterialUnit(payload.to_unit);
  if (payload.factor !== undefined) {
    const factor = Number(payload.factor);
    if (!Number.isFinite(factor) || factor <= 0) {
      const error = new Error('Material UOM conversion factor must be greater than zero') as Error & { code?: string; status?: number };
      error.code = 'MATERIAL_UOM_INVALID';
      error.status = 400;
      throw error;
    }
    next.factor = factor;
  }

  await row.update(next, { transaction: transaction ?? undefined });
  return row;
}

export async function mappingExists(table: 'supplier' | 'code' | 'uom', where: WhereOptions, transaction?: Transaction | null): Promise<boolean> {
  if (table === 'supplier') {
    return await MaterialSupplierMapping.count({ where, transaction: transaction ?? undefined }) > 0;
  }
  if (table === 'code') {
    return await MaterialCodeMapping.count({ where, transaction: transaction ?? undefined }) > 0;
  }
  return await MaterialUomConversion.count({ where, transaction: transaction ?? undefined }) > 0;
}

export async function findDuplicateCodeMappings(transaction?: Transaction | null) {
  return MaterialCodeMapping.findAll({
    attributes: ['mapping_type', 'party_type', 'party_id', 'normalized_code'],
    where: {
      is_active: true,
      normalized_code: { [Op.ne]: '' },
    },
    group: ['mapping_type', 'party_type', 'party_id', 'normalized_code'],
    having: MaterialCodeMapping.sequelize!.literal('COUNT(DISTINCT material_id) > 1'),
    transaction: transaction ?? undefined,
    raw: true,
  });
}

export async function findDuplicateSupplierMappings(transaction?: Transaction | null) {
  return MaterialSupplierMapping.findAll({
    attributes: ['supplier_master_id', 'normalized_supplier_code'],
    where: {
      is_active: true,
      supplier_master_id: { [Op.ne]: null },
      normalized_supplier_code: { [Op.ne]: '' },
    },
    group: ['supplier_master_id', 'normalized_supplier_code'],
    having: MaterialSupplierMapping.sequelize!.literal('COUNT(DISTINCT material_id) > 1'),
    transaction: transaction ?? undefined,
    raw: true,
  });
}
