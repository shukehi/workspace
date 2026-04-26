export async function createMaterialForMappingTest(
  Material: any,
  code: string,
  overrides: Record<string, unknown> = {},
) {
  return Material.create({
    code,
    name: `${code} name`,
    unit: 'PCS',
    category: 'test',
    ...overrides,
  } as any) as any;
}

export async function createSupplierMasterForMappingTest(
  SupplierMaster: any,
  supplierName: string,
  overrides: Record<string, unknown> = {},
) {
  return SupplierMaster.create({
    supplier_name: supplierName,
    normalized_name: supplierName.trim().toLowerCase(),
    status: 'active',
    ...overrides,
  } as any) as any;
}
