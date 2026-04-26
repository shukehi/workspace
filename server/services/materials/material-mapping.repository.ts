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
  MaterialCodeMappingCreationAttributes,
  MaterialCodeMappingType,
  MaterialMappingPartyType,
  MaterialSupplierMappingCreationAttributes,
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
  };

  if (lookup.mappingType) {
    Object.assign(where, { mapping_type: lookup.mappingType });
  }
  if (lookup.partyType !== undefined) {
    Object.assign(where, { party_type: lookup.partyType });
  }
  if (lookup.partyId !== undefined) {
    Object.assign(where, { party_id: lookup.partyId });
  }

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
  return MaterialCodeMapping.create({
    ...payload,
    normalized_code: payload.normalized_code || normalizeMaterialExternalCode(payload.external_code),
    is_active: payload.is_active ?? true,
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
