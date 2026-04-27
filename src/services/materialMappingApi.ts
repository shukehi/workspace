import { api } from '@/lib/api';

export type MaterialCodeMappingType = 'internal_code' | 'alias' | 'barcode' | 'legacy_code' | 'supplier_code';
export type MaterialMappingPartyType = 'supplier' | 'customer';

export interface MaterialSupplierMappingRecord {
  id: number;
  material_id: number;
  supplier_master_id: number | null;
  supplier_code: string;
  normalized_supplier_code: string;
  supplier_name_snapshot?: string | null;
  supplier_model?: string | null;
  purchase_unit?: string | null;
  stock_unit?: string | null;
  conversion_factor: number;
  price?: number | null;
  currency?: string | null;
  is_default: boolean;
  is_active: boolean;
  remark?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialCodeMappingRecord {
  id: number;
  material_id: number;
  mapping_type: MaterialCodeMappingType;
  party_type?: MaterialMappingPartyType | null;
  party_id?: number | null;
  external_code: string;
  normalized_code: string;
  is_active: boolean;
  priority: number;
  metadata_json?: unknown;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialUomConversionRecord {
  id: number;
  material_id: number;
  from_unit: string;
  to_unit: string;
  factor: number;
  is_purchase_default: boolean;
  is_sales_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialMappingsPayload {
  supplierMappings: MaterialSupplierMappingRecord[];
  codeMappings: MaterialCodeMappingRecord[];
  uomConversions: MaterialUomConversionRecord[];
}

export type MaterialResolveSource = 'internal_code' | 'supplier_mapping' | 'code_mapping' | 'legacy_alias' | 'legacy_exact';

export interface ResolvedMaterialPayload {
  material: Record<string, unknown>;
  materialId: number;
  materialCode: string;
  materialName: string;
  stockUnit: string;
  transactionUnit: string;
  conversionFactor: number;
  supplierMasterId?: number | null;
  supplierCode?: string | null;
  source: MaterialResolveSource;
}

export interface ResolveMaterialParams {
  code: string;
  supplierMasterId?: number | null;
  transactionUnit?: string | null;
  stockUnit?: string | null;
  allowLegacyFallback?: boolean;
}

export type CreateSupplierMappingPayload = Partial<MaterialSupplierMappingRecord> & {
  supplier_master_id?: number | null;
  supplier_code: string;
  conversion_factor?: number;
};

export type UpdateSupplierMappingPayload = Partial<Omit<CreateSupplierMappingPayload, 'supplier_code'>> & {
  supplier_code?: string;
  is_active?: boolean;
};

export type CreateCodeMappingPayload = Partial<MaterialCodeMappingRecord> & {
  mapping_type: MaterialCodeMappingType;
  external_code: string;
};

export type UpdateCodeMappingPayload = Partial<CreateCodeMappingPayload> & {
  is_active?: boolean;
};

export type CreateUomConversionPayload = Partial<MaterialUomConversionRecord> & {
  from_unit: string;
  to_unit: string;
  factor: number;
};

export type UpdateUomConversionPayload = Partial<CreateUomConversionPayload> & {
  is_active?: boolean;
};

function emptyMappings(): MaterialMappingsPayload {
  return { supplierMappings: [], codeMappings: [], uomConversions: [] };
}

export const materialMappingApi = {
  async resolve(params: ResolveMaterialParams): Promise<ResolvedMaterialPayload> {
    const res = await api.get<{ success: boolean; resolution: ResolvedMaterialPayload }>('/materials/resolve', {
      params: {
        code: params.code,
        supplier_master_id: params.supplierMasterId ?? undefined,
        transaction_unit: params.transactionUnit || undefined,
        stock_unit: params.stockUnit || undefined,
        allow_legacy_fallback: params.allowLegacyFallback === undefined ? undefined : String(params.allowLegacyFallback),
      },
    });
    return res.resolution;
  },

  async list(materialId: number): Promise<MaterialMappingsPayload> {
    const res = await api.get<{ success: boolean; mappings?: MaterialMappingsPayload }>(`/materials/${materialId}/mappings`);
    return res.mappings || emptyMappings();
  },

  async createSupplierMapping(materialId: number, payload: CreateSupplierMappingPayload): Promise<MaterialSupplierMappingRecord> {
    const res = await api.post<{ success: boolean; mapping: MaterialSupplierMappingRecord }>(`/materials/${materialId}/supplier-mappings`, payload);
    return res.mapping;
  },

  async updateSupplierMapping(materialId: number, mappingId: number, payload: UpdateSupplierMappingPayload): Promise<MaterialSupplierMappingRecord> {
    const res = await api.patch<{ success: boolean; mapping: MaterialSupplierMappingRecord }>(`/materials/${materialId}/supplier-mappings/${mappingId}`, payload);
    return res.mapping;
  },

  async createCodeMapping(materialId: number, payload: CreateCodeMappingPayload): Promise<MaterialCodeMappingRecord> {
    const res = await api.post<{ success: boolean; mapping: MaterialCodeMappingRecord }>(`/materials/${materialId}/code-mappings`, payload);
    return res.mapping;
  },

  async updateCodeMapping(materialId: number, mappingId: number, payload: UpdateCodeMappingPayload): Promise<MaterialCodeMappingRecord> {
    const res = await api.patch<{ success: boolean; mapping: MaterialCodeMappingRecord }>(`/materials/${materialId}/code-mappings/${mappingId}`, payload);
    return res.mapping;
  },

  async createUomConversion(materialId: number, payload: CreateUomConversionPayload): Promise<MaterialUomConversionRecord> {
    const res = await api.post<{ success: boolean; conversion: MaterialUomConversionRecord }>(`/materials/${materialId}/uom-conversions`, payload);
    return res.conversion;
  },

  async updateUomConversion(materialId: number, conversionId: number, payload: UpdateUomConversionPayload): Promise<MaterialUomConversionRecord> {
    const res = await api.patch<{ success: boolean; conversion: MaterialUomConversionRecord }>(`/materials/${materialId}/uom-conversions/${conversionId}`, payload);
    return res.conversion;
  },
};
