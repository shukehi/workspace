export type SourceOrderItemBase = {
  qty?: string | number | null;
  spec?: string | null;
  mshd?: unknown;
  xsbz?: unknown;
  remark?: unknown;
  [key: string]: unknown;
};

export type SourceOrderInfo = Record<string, unknown> & {
  customerName?: string | null;
  remark?: string | null;
};

export type RuleTrace = {
  matchedRules: string[];
  winningRules: string[];
};

export type RuleDetectionResult<T> = RuleTrace & {
  value: T;
};
