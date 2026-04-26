import type { Transaction } from 'sequelize';
import {
  Material,
  MaterialCodeMapping,
  MaterialSupplierMapping,
  MaterialUomConversion,
  initDB,
  sequelize,
} from '../models';
import type {
  MaterialCodeMappingCreationAttributes,
  MaterialSupplierMappingCreationAttributes,
  MaterialUomConversionCreationAttributes,
} from '../models/types';
import {
  createCodeMapping,
  createSupplierMapping,
  createUomConversion,
  mappingExists,
  normalizeMaterialExternalCode,
  normalizeMaterialUnit,
} from '../services/materials/material-mapping.repository';

type Options = {
  apply: boolean;
  json: boolean;
  includeSupplierCodeFallback: boolean;
};

type PlannedCodeMappingInsert = {
  table: 'material_code_mappings';
  material_id: number;
  reason: string;
  payload: MaterialCodeMappingCreationAttributes;
};

type PlannedSupplierMappingInsert = {
  table: 'material_supplier_mappings';
  material_id: number;
  reason: string;
  payload: MaterialSupplierMappingCreationAttributes;
};

type PlannedUomConversionInsert = {
  table: 'material_uom_conversions';
  material_id: number;
  reason: string;
  payload: MaterialUomConversionCreationAttributes;
};

type PlannedInsert = PlannedCodeMappingInsert | PlannedSupplierMappingInsert | PlannedUomConversionInsert;

type Conflict = {
  material_id: number;
  table: string;
  reason: string;
  payload: Record<string, unknown>;
};

type SupplierLinkCandidate = {
  material_id: number;
  supplier_master_id: number;
  material_code: string;
  supplier_name_snapshot: string | null;
  note: string;
};

function readOptions(argv: string[]): Options {
  return {
    apply: argv.includes('--apply'),
    json: argv.includes('--json'),
    includeSupplierCodeFallback: argv.includes('--include-supplier-code-fallback'),
  };
}

function parseAliases(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseAliases(parsed);
    } catch {
      return [trimmed];
    }
  }
  return [];
}

function toPlain(instance: any): Record<string, any> {
  return typeof instance?.get === 'function' ? instance.get({ plain: true }) : instance;
}

async function planCodeMapping(
  planned: PlannedInsert[],
  conflicts: Conflict[],
  material: Record<string, any>,
  mappingType: 'internal_code' | 'alias' | 'legacy_code',
  externalCode: string,
  reason: string,
  priority: number,
) {
  const normalized = normalizeMaterialExternalCode(externalCode);
  if (!normalized) return;

  const existingForCode = await MaterialCodeMapping.findAll({
    where: {
      mapping_type: mappingType,
      normalized_code: normalized,
      is_active: true,
    },
    raw: true,
  }) as unknown as Array<{ material_id: number }>;
  const pointsToOtherMaterial = existingForCode.some((row) => Number(row.material_id) !== Number(material.id));
  if (pointsToOtherMaterial) {
    conflicts.push({
      material_id: Number(material.id),
      table: 'material_code_mappings',
      reason: 'active normalized code already maps to another material',
      payload: { mapping_type: mappingType, external_code: externalCode, normalized_code: normalized },
    });
    return;
  }

  const exists = await mappingExists('code', {
    material_id: material.id,
    mapping_type: mappingType,
    normalized_code: normalized,
  });
  if (exists) return;

  planned.push({
    table: 'material_code_mappings',
    material_id: Number(material.id),
    reason,
    payload: {
      material_id: Number(material.id),
      mapping_type: mappingType,
      external_code: externalCode,
      normalized_code: normalized,
      priority,
      is_active: true,
      metadata_json: JSON.stringify({ backfilled_from: reason }),
    },
  });
}

async function planSupplierMapping(
  planned: PlannedInsert[],
  conflicts: Conflict[],
  supplierLinkCandidates: SupplierLinkCandidate[],
  material: Record<string, any>,
  includeSupplierCodeFallback: boolean,
) {
  const supplierMasterId = Number(material.supplier_master_id || 0);
  const supplierCode = String(material.code || '').trim();
  const normalized = normalizeMaterialExternalCode(supplierCode);
  if (!supplierMasterId || !normalized) return;

  if (!includeSupplierCodeFallback) {
    supplierLinkCandidates.push({
      material_id: Number(material.id),
      supplier_master_id: supplierMasterId,
      material_code: supplierCode,
      supplier_name_snapshot: String(material.supplier || '').trim() || null,
      note: 'Legacy data links the material to a supplier master but has no dedicated supplier part number; rerun with --include-supplier-code-fallback only after accepting material.code as the supplier_code seed.',
    });
    return;
  }

  const existingForSupplierCode = await MaterialSupplierMapping.findAll({
    where: {
      supplier_master_id: supplierMasterId,
      normalized_supplier_code: normalized,
      is_active: true,
    },
    raw: true,
  }) as unknown as Array<{ material_id: number }>;
  const pointsToOtherMaterial = existingForSupplierCode.some((row) => Number(row.material_id) !== Number(material.id));
  if (pointsToOtherMaterial) {
    conflicts.push({
      material_id: Number(material.id),
      table: 'material_supplier_mappings',
      reason: 'active supplier code already maps to another material',
      payload: { supplier_master_id: supplierMasterId, supplier_code: supplierCode, normalized_supplier_code: normalized },
    });
    return;
  }

  const exists = await mappingExists('supplier', {
    material_id: material.id,
    supplier_master_id: supplierMasterId,
    normalized_supplier_code: normalized,
  });
  if (exists) return;

  planned.push({
    table: 'material_supplier_mappings',
    material_id: Number(material.id),
    reason: 'legacy supplier_master_id + material code',
    payload: {
      material_id: Number(material.id),
      supplier_master_id: supplierMasterId,
      supplier_code: supplierCode,
      normalized_supplier_code: normalized,
      supplier_name_snapshot: String(material.supplier || '').trim() || null,
      purchase_unit: material.unit || null,
      stock_unit: material.unit || null,
      conversion_factor: 1,
      is_default: true,
      is_active: true,
      remark: 'Backfilled from legacy material link; verify actual supplier part number before relying on supplier-specific ordering.',
    },
  });
}

async function planUomConversion(planned: PlannedInsert[], material: Record<string, any>) {
  // Phase 1 seeds only identity conversions from legacy material units. Non-identity
  // purchase/stock conversions are added later when supplier part data is verified.
  const unit = normalizeMaterialUnit(material.unit || 'PCS') || 'PCS';
  const exists = await mappingExists('uom', {
    material_id: material.id,
    from_unit: unit,
    to_unit: unit,
  });
  if (exists) return;

  planned.push({
    table: 'material_uom_conversions',
    material_id: Number(material.id),
    reason: 'legacy material unit identity conversion',
    payload: {
      material_id: Number(material.id),
      from_unit: unit,
      to_unit: unit,
      factor: 1,
      is_purchase_default: true,
      is_sales_default: false,
      is_active: true,
    },
  });
}

async function applyInsert(insert: PlannedInsert, transaction: Transaction) {
  if (insert.table === 'material_code_mappings') {
    await createCodeMapping(insert.payload, transaction);
  } else if (insert.table === 'material_supplier_mappings') {
    await createSupplierMapping(insert.payload, transaction);
  } else {
    await createUomConversion(insert.payload, transaction);
  }
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  await initDB();

  try {
    const materials = await Material.findAll({ order: [['id', 'ASC']] });
    const planned: PlannedInsert[] = [];
    const conflicts: Conflict[] = [];
    const supplierLinkCandidates: SupplierLinkCandidate[] = [];

    for (const instance of materials) {
      const material = toPlain(instance);
      await planCodeMapping(planned, conflicts, material, 'internal_code', material.code, 'legacy material code', 10);
      if (material.model) {
        await planCodeMapping(planned, conflicts, material, 'legacy_code', material.model, 'legacy material model', 80);
      }
      for (const alias of parseAliases(material.aliases)) {
        if (normalizeMaterialExternalCode(alias) === normalizeMaterialExternalCode(material.code)) continue;
        await planCodeMapping(planned, conflicts, material, 'alias', alias, 'legacy aliases json', 100);
      }
      await planSupplierMapping(planned, conflicts, supplierLinkCandidates, material, options.includeSupplierCodeFallback);
      await planUomConversion(planned, material);
    }

    if (options.apply) {
      await sequelize.transaction(async (transaction) => {
        for (const insert of planned) {
          await applyInsert(insert, transaction);
        }
      });
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      mode: options.apply ? 'apply' : 'dry-run',
      scannedMaterials: materials.length,
      plannedInsertCount: planned.length,
      conflictCount: conflicts.length,
      supplierLinkCandidateCount: supplierLinkCandidates.length,
      plannedByTable: planned.reduce<Record<string, number>>((acc, item) => {
        acc[item.table] = (acc[item.table] || 0) + 1;
        return acc;
      }, {}),
      plannedPreview: planned.slice(0, 50),
      supplierLinkCandidatePreview: supplierLinkCandidates.slice(0, 50),
      conflicts,
    };

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log('[backfill_material_mappings] summary', {
        mode: summary.mode,
        scannedMaterials: summary.scannedMaterials,
        plannedInsertCount: summary.plannedInsertCount,
        conflictCount: summary.conflictCount,
        supplierLinkCandidateCount: summary.supplierLinkCandidateCount,
        plannedByTable: summary.plannedByTable,
      });
      for (const conflict of conflicts.slice(0, 20)) {
        console.log('[backfill_material_mappings] conflict', conflict);
      }
    }
  } catch (error) {
    console.error('[backfill_material_mappings] failed', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

void main();
