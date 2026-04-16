import { parseQuantityPair } from '../parsers';
import {
  adaptCylinderAccessoryPackRulesToRuleSet,
  adaptCylinderMapping,
  collectRuleExecution,
  executeRuleSet,
} from '@/services/mappings';

type CylinderOrderItem = {
  spec?: string | null;
  qty?: string | number | null;
  xsbz?: unknown;
  sx?: unknown;
  sxhz?: unknown;
  fssx?: unknown;
  fshz?: unknown;
  mshd?: unknown;
  [key: string]: unknown;
};

type CylinderOrderInfo = Record<string, unknown> & {
  customerName?: string | null;
  remark?: string | null;
};

type CylinderResultRow = {
  supplier: string;
  type: string;
  eccentricity: string;
  remark: string;
  quantity: number;
};

type HardwareAccessoryResultRow = {
  materialId: string;
  supplier: string;
  type: string;
  spec: string;
  remark: string;
  unit: string;
  quantity: number;
  matchedRules: string[];
  winningRules: string[];
};

type CylinderMappingEntry = {
  supplier?: unknown;
  template?: unknown;
};

type CylinderDimensionVariant = {
  code?: unknown;
  eccentricity?: unknown;
  remark?: unknown;
};

type CylinderDimensionRule = CylinderDimensionVariant & {
  variants?: Partial<Record<'内开' | '外开', CylinderDimensionVariant>>;
};

type CylinderSpecialRule = {
  thickness?: unknown;
  keyword?: unknown;
  variants?: Partial<Record<'内开' | '外开', CylinderDimensionVariant>>;
};

type CylinderMappingConfig = Record<string, unknown> & {
  customLogos?: unknown[];
  excludedCylinders?: unknown[];
  mappings?: Record<string, CylinderMappingEntry | undefined>;
  specialRules?: CylinderSpecialRule[];
  secondarySpecialRules?: CylinderSpecialRule[];
  dimensions?: Record<string, CylinderDimensionRule | undefined>;
  secondaryDimensions?: Record<string, CylinderDimensionRule | undefined>;
};

function mergeRuleNames(current: string[], incoming: string[]): string[] {
  const merged = new Set<string>(current);
  incoming.forEach((item) => {
    const normalized = String(item || '').trim();
    if (normalized) merged.add(normalized);
  });
  return Array.from(merged);
}

/**
 * 提取锁芯采购数据
 * @param {Array} orderList - 原始订单列表
 * @param {Object} orderInfo - 订单汇总信息（包含 customerName, remark 等）
 * @param {Object} CYLINDER_MAPPING - 注入的配置
 */
export function extractCylinderData(orderList: CylinderOrderItem[], orderInfo: CylinderOrderInfo = {}, CYLINDER_MAPPING: CylinderMappingConfig = {}): CylinderResultRow[] {
  const customLogos = Array.isArray(CYLINDER_MAPPING.customLogos) ? CYLINDER_MAPPING.customLogos : [];
  const cylinderMap: Record<string, CylinderResultRow> = {};
  const unmatchedCylinderMap: Record<string, { count: number; samples: Set<string> }> = {};

  const detectLogo = (text: unknown): string | undefined => {
    if (!text || typeof text !== 'string') return undefined;
    const upperText = text.toUpperCase();
    return customLogos
      .map((logo) => String(logo || '').trim())
      .find((logo) => logo && upperText.includes(logo.toUpperCase()));
  };

  const determineKeyConfig = (cylinderName: string, customerName: string) => {
    if (customerName) {
      if (customerName.includes('三部')) {
        if (cylinderName === 'ZH-微珠锌合金MAN') {
          return '钥匙 1+5 英文说明书';
        }
        return '钥匙 2+5 英文说明书';
      }
      if (customerName.includes('一部') || customerName.includes('二部') || customerName.includes('六部')) {
        return '钥匙 2+5 中文说明书';
      }
    }

    return '【待确认】钥匙配置';
  };

  const normalizeCylinderName = (value: unknown) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[（【［]/g, '(')
    .replace(/[）】］]/g, ')')
    .replace(/\s+/g, '');

  const hasExcludedCylinders = Object.prototype.hasOwnProperty.call(CYLINDER_MAPPING, 'excludedCylinders');
  const rawExcludedList = hasExcludedCylinders
    ? (Array.isArray(CYLINDER_MAPPING.excludedCylinders) ? CYLINDER_MAPPING.excludedCylinders : [])
    : ['指纹锁配套锁芯'];
  const excludedCylinders = new Set<string>(
    rawExcludedList
      .map((item) => normalizeCylinderName(item))
      .filter(Boolean),
  );

  const isBuiltInCylinder = (value: unknown) => excludedCylinders.has(normalizeCylinderName(value));

  orderList.forEach((item) => {
    const parts = String(item.spec || '').split('/');
    let thickness = '7';
    let openDirection: '内开' | '外开' = '内开';

    if (parts.length >= 2) thickness = parts[1].trim();
    if (parts.length >= 3) {
      const dirPart = parts[2];
      if (dirPart.includes('外开')) openDirection = '外开';
      else if (dirPart.includes('内开')) openDirection = '内开';
    }

    const process = (cylinderName: string, shieldValue: string, mode: 'primary' | 'secondary') => {
      if (!cylinderName || cylinderName === '-' || cylinderName === '无') return;
      if (isBuiltInCylinder(cylinderName)) return;

      let dimensionRule: CylinderDimensionVariant | null = null;
      let specialRemark = '';

      const specialRules = (mode === 'secondary'
        ? CYLINDER_MAPPING.secondarySpecialRules
        : CYLINDER_MAPPING.specialRules) || [];

      const standardDimensions = mode === 'secondary'
        ? CYLINDER_MAPPING.secondaryDimensions
        : CYLINDER_MAPPING.dimensions;

      for (const rule of specialRules) {
        if (String(rule.thickness || '') && String(rule.thickness) !== thickness) continue;
        if (shieldValue && String(rule.keyword || '') && shieldValue.includes(String(rule.keyword))) {
          const variant = rule.variants?.[openDirection];
          if (variant) {
            dimensionRule = variant;
            specialRemark = String(variant.remark || '');
            break;
          }
        }
      }

      if (!dimensionRule && standardDimensions) {
        const standard = standardDimensions[thickness];
        if (standard) {
          if (standard.variants) {
            const variant = standard.variants[openDirection];
            if (variant) {
              dimensionRule = variant;
              specialRemark = String(variant.remark || '');
            }
          } else {
            dimensionRule = standard;
          }
        }
      }

      if (!dimensionRule) return;

      const logo = detectLogo(item.xsbz)
        || detectLogo(orderInfo.remark)
        || detectLogo(orderInfo.customerName);

      const mappingFromConfig = CYLINDER_MAPPING.mappings?.[cylinderName];
      const mapping: CylinderMappingEntry = mappingFromConfig || {
        supplier: '未知供应商',
        template: `{code}${cylinderName}`,
      };

      if (!mappingFromConfig) {
        if (!unmatchedCylinderMap[cylinderName]) {
          unmatchedCylinderMap[cylinderName] = {
            count: 0,
            samples: new Set(),
          };
        }
        unmatchedCylinderMap[cylinderName].count += 1;
        if (item.spec) unmatchedCylinderMap[cylinderName].samples.add(String(item.spec));
      }

      let externalName = String(mapping.template || '').replace('{code}', String(dimensionRule.code || ''));
      let finalRemark = specialRemark;

      if (mode === 'secondary') {
        const keySuffix = '5A钥匙';
        finalRemark = finalRemark ? `${finalRemark}, ${keySuffix}` : keySuffix;
        externalName = `(副) ${externalName}`;
      } else {
        const keySuffix = determineKeyConfig(cylinderName, String(orderInfo.customerName || ''));
        finalRemark = finalRemark ? `${finalRemark}, ${keySuffix}` : keySuffix;
      }

      if (logo) {
        finalRemark = finalRemark ? `${finalRemark}, (刻 ${logo} 标)` : `(刻 ${logo} 标)`;
      }

      const qtyPair = parseQuantityPair(item.qty);
      const totalQty = qtyPair.left + qtyPair.right;

      const key = `${String(mapping.supplier || '')}|${externalName}|${String(dimensionRule.eccentricity || '')}|${finalRemark}`;

      if (cylinderMap[key]) {
        cylinderMap[key].quantity += totalQty;
      } else {
        cylinderMap[key] = {
          supplier: String(mapping.supplier || ''),
          type: externalName,
          eccentricity: String(dimensionRule.eccentricity || ''),
          remark: finalRemark,
          quantity: totalQty,
        };
      }
    };

    process(String(item.sx || ''), String(item.sxhz || ''), 'primary');
    process(String(item.fssx || ''), String(item.fshz || ''), 'secondary');
  });

  const unmatchedEntries = Object.entries(unmatchedCylinderMap);
  if (unmatchedEntries.length > 0) {
    const summary = unmatchedEntries
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, info]) => ({
        cylinderName: name,
        count: info.count,
        sampleSpecs: Array.from(info.samples).slice(0, 3),
      }));
    console.warn('⚠️ [CylinderMapping] 未命中锁芯映射（TOP 10）:', summary);
  }

  return Object.values(cylinderMap);
}

export function extractCylinderAccessoryPackData(orderList: CylinderOrderItem[], CYLINDER_MAPPING: CylinderMappingConfig = {}): HardwareAccessoryResultRow[] {
  const accessoryMap: Record<string, HardwareAccessoryResultRow> = {};
  const ruleSet = adaptCylinderAccessoryPackRulesToRuleSet(adaptCylinderMapping(CYLINDER_MAPPING));
  if (ruleSet.rules.length === 0) return [];

  const toText = (value: unknown) => (typeof value === 'string' ? value.trim() : String(value || '').trim());
  const resolveThickness = (item: Pick<CylinderOrderItem, 'mshd' | 'spec'>) => {
    const directThickness = toText(item.mshd);
    if (directThickness) return directThickness;
    const parts = toText(item.spec).split('/');
    return parts.length >= 2 ? parts[1].trim() : '';
  };

  orderList.forEach((item) => {
    const thickness = resolveThickness(item);
    const qtyPair = parseQuantityPair(item.qty);
    const totalQty = qtyPair.left + qtyPair.right;
    if (totalQty <= 0) return;

    const inputSnapshot = {
      ...item,
      thickness,
      qtyLeft: qtyPair.left,
      qtyRight: qtyPair.right,
      qtyTotal: totalQty,
    };
    const execution = collectRuleExecution(ruleSet, inputSnapshot);

    execution.matchedRules.forEach((rule) => {
      const ruleResult = executeRuleSet(
        {
          metadata: ruleSet.metadata,
          defaults: ruleSet.defaults,
          rules: [rule],
        },
        inputSnapshot,
      );

      const packName = toText(ruleResult.output.spec || ruleResult.output.accessoryPack);
      const materialId = toText(ruleResult.output.code);
      if (!packName || !materialId) return;

      const supplier = toText(ruleResult.output.supplier) || '待人工处理';
      const sourceField = toText(rule.then.extra?.sourceField);
      const type = toText(ruleResult.output.type) || toText(sourceField ? item[sourceField] : '');
      const remark = toText(ruleResult.output.remark);
      const unit = toText(ruleResult.output.unit) || '个';
      const key = `${materialId}|${supplier}|${type}|${packName}|${remark}|${unit}`;

      if (accessoryMap[key]) {
        accessoryMap[key].quantity += totalQty;
        accessoryMap[key].matchedRules = mergeRuleNames(accessoryMap[key].matchedRules, ruleResult.matchedRules);
        accessoryMap[key].winningRules = mergeRuleNames(accessoryMap[key].winningRules, ruleResult.winningRules);
      } else {
        accessoryMap[key] = {
          materialId,
          supplier,
          type,
          spec: packName,
          remark,
          unit,
          quantity: totalQty,
          matchedRules: [...ruleResult.matchedRules],
          winningRules: [...ruleResult.winningRules],
        };
      }
    });
  });

  return Object.values(accessoryMap);
}
