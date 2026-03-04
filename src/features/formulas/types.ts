export type FormulaValidationErrors = Record<string, string>;

export const BOM_MATERIAL_CATEGORIES = ['转印纸', '油漆', '塑粉'] as const;

export type BomMaterialCategory = typeof BOM_MATERIAL_CATEGORIES[number];
