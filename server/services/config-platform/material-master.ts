import materialService from '../MaterialService';

export async function getMaterialMasterDetail() {
  const items = await materialService.getAllMaterials();
  return {
    profile: {
      code: 'material_master',
      displayName: '物料主数据',
      domain: 'catalog',
      workflowKind: 'collection',
      status: 'active',
      activeRevision: null,
    },
    total: items.length,
    items,
  };
}

export async function listMaterialMasterItems(query?: string) {
  return query
    ? await materialService.searchMaterials(query)
    : await materialService.getAllMaterials();
}
