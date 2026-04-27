export type FormulaBomRecommendationSource = {
  type: 'published_formula' | 'none';
  formulaKey?: string;
  displayName?: string;
};

export type FormulaBomRecommendationWarningCode =
  | 'NO_SOURCE'
  | 'SOURCE_NOT_FOUND'
  | 'EMPTY_SOURCE_BOM'
  | 'MATERIAL_NOT_FOUND';

export type FormulaBomRecommendationWarning = {
  code: FormulaBomRecommendationWarningCode;
  message: string;
  field?: string;
};

export type FormulaBomRecommendation<TRow> = {
  rows: TRow[];
  source: FormulaBomRecommendationSource;
  confidence: number;
  explanation: string;
  warnings: FormulaBomRecommendationWarning[];
  readOnly: true;
  sideEffect: 'none';
};

export type FormulaBomRecommendationResponse<TRow> = {
  success: true;
  recommendation: FormulaBomRecommendation<TRow>;
};
