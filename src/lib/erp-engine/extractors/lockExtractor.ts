import { parseOpenDirectionSegment, parseQuantityPair } from '../parsers';
import {
  adaptLockMapping,
  adaptLockMappingsToRuleSet,
  executeRuleSet,
  normalizeLockMappingKey,
} from '@/services/mappings';
import type { RuleTrace, SourceOrderInfo, SourceOrderItemBase } from '../extractorTypes';

type LockOrderItem = SourceOrderItemBase & {
  sj?: unknown;
  fssj?: unknown;
};

type LockOrderInfo = SourceOrderInfo;
type LockMappingConfig = Record<string, unknown> & {
  defaultUnit?: unknown;
  primaryLabel?: unknown;
  secondaryLabel?: unknown;
};

type LockResultRow = RuleTrace & {
  supplier: string;
  type: string;
  spec: string;
  remark: string;
  unit: string;
  quantityLeft: number;
  quantityRight: number;
  quantity: number;
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
 * 提取锁具采购数据
 * 规则：
 * - 主锁读取 `sj`，副锁读取 `fssj`
 * - 最小可用版本按 `供应商 + 型号 + 主/副锁 + 备注` 聚合
 */
export function extractLockData(orderList: LockOrderItem[], orderInfo: LockOrderInfo = {}, LOCK_MAPPING: LockMappingConfig = {}): LockResultRow[] {
  void orderInfo;
  const lockMap: Record<string, LockResultRow> = {};
  const adaptedLockMapping = adaptLockMapping(LOCK_MAPPING);
  const unmatchedSupplier = '待人工处理';
  const defaultUnit = String(adaptedLockMapping.defaultUnit || '套').trim() || '套';
  const primaryLabel = String(adaptedLockMapping.primaryLabel || '主锁').trim();
  const secondaryLabel = String(adaptedLockMapping.secondaryLabel || '副锁').trim();
  const primaryRuleSet = adaptLockMappingsToRuleSet(adaptedLockMapping, 'primary', normalizeLockMappingKey);
  const secondaryRuleSet = adaptLockMappingsToRuleSet(adaptedLockMapping, 'secondary', normalizeLockMappingKey);

  const normalizeLockName = (value: unknown) => String(value || '').trim();
  const isEmptyLock = (value: unknown) => {
    const raw = normalizeLockName(value);
    return !raw || raw === '-' || raw === '无';
  };

  const buildRemark = (extraRemark = '') => String(extraRemark || '').trim();

  const resolveLockQtyPair = (item: Pick<LockOrderItem, 'qty' | 'spec'>) => {
    const qtyPair = parseQuantityPair(item.qty);
    const openDirection = parseOpenDirectionSegment(item.spec);
    if (!openDirection.includes('内开')) {
      return qtyPair;
    }
    return {
      left: qtyPair.right,
      right: qtyPair.left,
    };
  };

  orderList.forEach((item) => {
    const qtyPair = resolveLockQtyPair(item);
    const totalQty = qtyPair.left + qtyPair.right;
    if (totalQty <= 0) return;

    const candidates: Array<{ rawName: unknown; modeLabel: string; mode: 'primary' | 'secondary' }> = [
      { rawName: item.sj, modeLabel: primaryLabel, mode: 'primary' },
      { rawName: item.fssj, modeLabel: secondaryLabel, mode: 'secondary' },
    ];

    candidates.forEach(({ rawName, modeLabel, mode }) => {
      if (isEmptyLock(rawName)) return;

      const rawType = normalizeLockName(rawName);
      const execution = executeRuleSet(
        mode === 'primary' ? primaryRuleSet : secondaryRuleSet,
        {
          model: rawType,
          meta: {
            normalizedModel: normalizeLockMappingKey(rawType),
          },
        },
      );
      const supplier = String(execution.output.supplier || unmatchedSupplier).trim();
      const type = String(execution.output.type || rawType).trim();
      const spec = String(execution.output.spec || modeLabel).trim();
      const remark = buildRemark(String(execution.output.remark || '').trim());
      const unit = String(execution.output.unit || defaultUnit).trim() || defaultUnit;
      const key = `${supplier}|${type}|${spec}|${remark}`;

      if (lockMap[key]) {
        lockMap[key].quantityLeft += qtyPair.left;
        lockMap[key].quantityRight += qtyPair.right;
        lockMap[key].quantity += totalQty;
        lockMap[key].matchedRules = mergeRuleNames(lockMap[key].matchedRules, execution.matchedRules);
        lockMap[key].winningRules = mergeRuleNames(lockMap[key].winningRules, execution.winningRules);
      } else {
        lockMap[key] = {
          supplier,
          type,
          spec,
          remark,
          unit,
          quantityLeft: qtyPair.left,
          quantityRight: qtyPair.right,
          quantity: totalQty,
          matchedRules: [...execution.matchedRules],
          winningRules: [...execution.winningRules],
        };
      }
    });
  });

  return Object.values(lockMap);
}
