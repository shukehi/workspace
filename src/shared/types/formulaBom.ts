export const FORMULA_BOM_MATERIAL_CATEGORIES = ['转印纸', '油漆', '塑粉'] as const;

export type FormulaBomMaterialCategory = typeof FORMULA_BOM_MATERIAL_CATEGORIES[number];

export const FORMULA_BOM_MATERIAL_CATEGORY_LABEL = FORMULA_BOM_MATERIAL_CATEGORIES.join('/');

export type FormulaBomMetadata = {
  materialCategories: readonly FormulaBomMaterialCategory[];
  materialCategoryLabel: string;
  readOnly: true;
  sideEffect: 'none';
};

export type FormulaBomMetadataResponse = {
  success: true;
  metadata: FormulaBomMetadata;
};
