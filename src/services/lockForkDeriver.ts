type DimensionPair = {
  base1: number;
  base2: number;
};

type DimensionGroup = {
  upper: DimensionPair;
  lower: DimensionPair;
};

type LockTypeConfig = {
  category?: string;
  nameModifier?: string;
  upper?: string;
  lower?: string;
} | null;

export interface LockForkDerivationInput {
  baseName: string;
  dimensions: DimensionGroup;
  thickness: string;
  doorHeight: number;
  upperHeightAdjustment: number;
  lowerHeightAdjustment: number;
  hangingFeetAdjustment: number;
  flatBottomRail: string | null;
  hangingFeetValue: number | null;
  lockTypeConfig: LockTypeConfig;
}

export interface LockForkDerivedRow {
  type: string;
  spec: string;
  remark: string;
}

export interface LockForkDerivationResult {
  rows: [LockForkDerivedRow, LockForkDerivedRow];
  remark: string;
}

function formatDimension(base1: number, base2: number, adjustment = 0): string {
  const total = base1 + base2 + adjustment;
  if (adjustment === 0) {
    return `${base1}*${base2} = ${total}`;
  }
  if (adjustment > 0) {
    return `${base1}*${base2} + ${adjustment} = ${total}`;
  }
  return `${base1}*${base2} - ${Math.abs(adjustment)} = ${total}`;
}

export function deriveLockForkRows(input: LockForkDerivationInput): LockForkDerivationResult {
  const {
    baseName,
    dimensions,
    thickness,
    doorHeight,
    upperHeightAdjustment,
    lowerHeightAdjustment,
    hangingFeetAdjustment,
    flatBottomRail,
    hangingFeetValue,
    lockTypeConfig,
  } = input;

  const upperDimension = formatDimension(
    dimensions.upper.base1,
    dimensions.upper.base2,
    upperHeightAdjustment,
  );
  const lowerDimension = formatDimension(
    dimensions.lower.base1,
    dimensions.lower.base2,
    lowerHeightAdjustment + hangingFeetAdjustment,
  );

  const remarkParts = [`${thickness}CM ${doorHeight}`];
  if (flatBottomRail) {
    remarkParts.push(flatBottomRail);
  } else if (hangingFeetValue !== null) {
    remarkParts.push(`吊脚${hangingFeetValue}mm`);
  }
  const remark = remarkParts.join(', ');

  if (lockTypeConfig?.category === 'dual-head') {
    return {
      remark,
      rows: [
        {
          type: `${baseName} - 上头 ${lockTypeConfig.upper || ''}`.trim(),
          spec: upperDimension,
          remark,
        },
        {
          type: `${baseName} - 下头 ${lockTypeConfig.lower || ''}`.trim(),
          spec: lowerDimension,
          remark,
        },
      ],
    };
  }

  const lockSuffix = lockTypeConfig?.nameModifier && lockTypeConfig.category !== 'dual-head'
    ? lockTypeConfig.nameModifier
    : '';

  return {
    remark,
    rows: [
      {
        type: lockSuffix ? `${baseName} - 上头 ${lockSuffix}` : `${baseName} - 上头`,
        spec: upperDimension,
        remark,
      },
      {
        type: lockSuffix ? `${baseName} - 下头 ${lockSuffix}` : `${baseName} - 下头`,
        spec: lowerDimension,
        remark,
      },
    ],
  };
}
