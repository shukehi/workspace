import type { Transaction } from 'sequelize';
import MaterialRepository from './material.repository';
import {
  findActiveCodeMappings,
  findActiveSupplierMappings,
  findUomConversion,
  normalizeMaterialExternalCode,
  normalizeMaterialUnit,
} from './material-mapping.repository';
import type { MaterialAttributes } from '../../models/types';

export type MaterialResolveSource = 'internal_code' | 'supplier_mapping' | 'code_mapping' | 'legacy_alias' | 'legacy_exact';

export type ResolveMaterialInput = {
  code: string;
  supplierMasterId?: number | null;
  transactionUnit?: string | null;
  stockUnit?: string | null;
  allowLegacyFallback?: boolean;
  transaction?: Transaction | null;
};

export type ResolvedMaterial = {
  material: MaterialAttributes;
  materialId: number;
  materialCode: string;
  materialName: string;
  stockUnit: string;
  transactionUnit: string;
  conversionFactor: number;
  supplierMasterId?: number | null;
  supplierCode?: string | null;
  source: MaterialResolveSource;
};

export class MaterialResolutionError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MaterialResolutionError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function plainMaterial(instance: any): MaterialAttributes {
  return typeof instance?.get === 'function' ? instance.get({ plain: true }) : instance;
}

function getCandidateMaterialId(candidate: any): number | null {
  const rawId = candidate.material_id ?? candidate.material?.id;
  if (rawId == null) return null;
  const id = Number(rawId);
  return Number.isFinite(id) ? id : null;
}

function assertSingleCandidate<T>(candidates: T[], code: string, source: MaterialResolveSource): T | null {
  if (candidates.length === 0) return null;
  const materialIds = new Set(
    candidates
      .map(getCandidateMaterialId)
      .filter((id): id is number => id !== null),
  );
  if (materialIds.size > 1) {
    throw new MaterialResolutionError('MATERIAL_RESOLUTION_AMBIGUOUS', 'Material code resolves to multiple materials', 409, {
      code,
      source,
      materialIds: Array.from(materialIds),
    });
  }
  return candidates[0];
}

export class MaterialResolverService {
  async resolveForPurchase(input: ResolveMaterialInput): Promise<ResolvedMaterial> {
    return this.resolve(input);
  }

  async resolveForInventory(input: ResolveMaterialInput): Promise<ResolvedMaterial> {
    return this.resolve(input);
  }

  async resolve(input: ResolveMaterialInput): Promise<ResolvedMaterial> {
    const rawCode = String(input.code || '').trim();
    if (!rawCode) {
      throw new MaterialResolutionError('MATERIAL_NOT_RESOLVED', 'Material code is required', 404);
    }

    const transaction = input.transaction ?? undefined;
    const exact = await MaterialRepository.findByCode(rawCode, transaction);
    if (exact) {
      return this.buildResolved(plainMaterial(exact), {
        source: 'internal_code',
        input,
      });
    }

    if (input.supplierMasterId) {
      const supplierCandidates = await findActiveSupplierMappings({
        supplierMasterId: input.supplierMasterId,
        supplierCode: rawCode,
        transaction,
      });
      const supplierMatch = assertSingleCandidate(supplierCandidates, rawCode, 'supplier_mapping') as any;
      if (supplierMatch) {
        const material = plainMaterial(supplierMatch.material);
        return this.buildResolved(material, {
          source: 'supplier_mapping',
          input,
          supplierCode: supplierMatch.supplier_code,
          supplierMasterId: Number(supplierMatch.supplier_master_id ?? input.supplierMasterId),
          transactionUnit: supplierMatch.purchase_unit || input.transactionUnit,
          stockUnit: supplierMatch.stock_unit || input.stockUnit,
          conversionFactor: supplierMatch.conversion_factor == null ? null : Number(supplierMatch.conversion_factor),
        });
      }
    }

    const codeCandidates = await findActiveCodeMappings({ code: rawCode, transaction });
    const codeMatch = assertSingleCandidate(codeCandidates, rawCode, 'code_mapping') as any;
    if (codeMatch) {
      return this.buildResolved(plainMaterial(codeMatch.material), {
        source: 'code_mapping',
        input,
      });
    }

    if (input.allowLegacyFallback !== false) {
      const alias = await MaterialRepository.findByAlias(rawCode, transaction);
      if (alias) {
        return this.buildResolved(plainMaterial(alias), {
          source: 'legacy_alias',
          input,
        });
      }

      const exactLegacy = await MaterialRepository.findOneExact(rawCode, transaction);
      if (exactLegacy) {
        return this.buildResolved(plainMaterial(exactLegacy), {
          source: 'legacy_exact',
          input,
        });
      }
    }

    throw new MaterialResolutionError('MATERIAL_NOT_RESOLVED', 'Material code could not be resolved', 404, {
      code: rawCode,
      normalizedCode: normalizeMaterialExternalCode(rawCode),
    });
  }

  private async buildResolved(material: MaterialAttributes, options: {
    source: MaterialResolveSource;
    input: ResolveMaterialInput;
    supplierMasterId?: number | null;
    supplierCode?: string | null;
    transactionUnit?: string | null;
    stockUnit?: string | null;
    conversionFactor?: number | null;
  }): Promise<ResolvedMaterial> {
    const stockUnit = normalizeMaterialUnit(options.stockUnit || options.input.stockUnit || material.unit || 'PCS') || 'PCS';
    const transactionUnit = normalizeMaterialUnit(options.transactionUnit || options.input.transactionUnit || stockUnit) || stockUnit;
    let conversionFactor = options.conversionFactor == null ? null : Number(options.conversionFactor);
    if (conversionFactor != null && (!Number.isFinite(conversionFactor) || conversionFactor <= 0)) {
      throw new MaterialResolutionError('MATERIAL_UOM_INVALID', 'Material unit conversion factor must be greater than zero', 400, {
        materialId: material.id,
        transactionUnit,
        stockUnit,
        conversionFactor,
      });
    }

    if (conversionFactor == null) {
      if (transactionUnit === stockUnit) {
        conversionFactor = 1;
      } else {
        const conversion = await findUomConversion(material.id, transactionUnit, stockUnit, options.input.transaction ?? null) as any;
        const mappedFactor = Number(conversion?.factor);
        if (!Number.isFinite(mappedFactor) || mappedFactor <= 0) {
          throw new MaterialResolutionError('MATERIAL_UOM_INVALID', 'No active material unit conversion exists for the requested transaction unit', 400, {
            materialId: material.id,
            transactionUnit,
            stockUnit,
          });
        }
        conversionFactor = mappedFactor;
      }
    }

    return {
      material,
      materialId: Number(material.id),
      materialCode: material.code,
      materialName: material.name,
      stockUnit,
      transactionUnit,
      conversionFactor,
      supplierMasterId: options.supplierMasterId ?? options.input.supplierMasterId ?? null,
      supplierCode: options.supplierCode ?? null,
      source: options.source,
    };
  }
}

const materialResolverService = new MaterialResolverService();
export default materialResolverService;
