import {
  FORMULA_BOM_MATERIAL_CATEGORIES,
  type FormulaBomMaterialCategory,
} from '@/shared/types/formulaBom';

export type FormulaValidationErrors = Record<string, string>;

export const BOM_MATERIAL_CATEGORIES = FORMULA_BOM_MATERIAL_CATEGORIES;

export type BomMaterialCategory = FormulaBomMaterialCategory;
