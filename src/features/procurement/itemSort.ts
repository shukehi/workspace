import { normalizePrintCategory } from '@/features/procurement/docModel';

type LockForkLikeItem = {
  type?: string;
  name?: string;
  spec?: string;
  model?: string;
  remark?: string;
};

function resolveLockForkType(item: LockForkLikeItem) {
  return String(item.type || item.name || '').trim();
}

function stripLockForkHeadSuffix(type: string) {
  return type.replace(/\s*-\s*(上头|下头).*$/u, '').trim();
}

function resolveLockForkHeadRank(type: string) {
  if (type.includes('上头')) return 0;
  if (type.includes('下头')) return 1;
  return 9;
}

function resolveLockForkDoorHeight(remark: string) {
  const cmMatch = remark.match(/CM\s*(\d{3,4})/i);
  if (cmMatch) return Number(cmMatch[1]);

  const fallback = remark.match(/(?:^|[,\s])(\d{3,4})(?=$|[,\s])/);
  if (fallback) return Number(fallback[1]);

  return Number.POSITIVE_INFINITY;
}

function resolveLockForkDoorThickness(remark: string) {
  const match = remark.match(/(\d{1,2})\s*CM/i);
  if (match) return Number(match[1]);
  return Number.POSITIVE_INFINITY;
}

function resolveLockForkRemarkTail(remark: string) {
  const parts = remark.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.slice(1).join(', ');
}

function resolveLockForkSpecSortValue(spec: string) {
  const equalMatch = spec.match(/=\s*(-?\d+(?:\.\d+)?)/);
  if (equalMatch) return Number(equalMatch[1]);

  const numbers = Array.from(spec.matchAll(/-?\d+(?:\.\d+)?/g), (match) => Number(match[0]));
  if (numbers.length >= 2) return numbers[0] + numbers[1];
  if (numbers.length === 1) return numbers[0];
  return Number.POSITIVE_INFINITY;
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, 'zh-Hans-CN');
}

function compareLockForkItems<T extends LockForkLikeItem>(a: T, b: T) {
  const typeA = resolveLockForkType(a);
  const typeB = resolveLockForkType(b);

  const baseTypeA = stripLockForkHeadSuffix(typeA);
  const baseTypeB = stripLockForkHeadSuffix(typeB);
  const baseTypeCompare = compareText(baseTypeA, baseTypeB);
  if (baseTypeCompare !== 0) return baseTypeCompare;

  const remarkA = String(a.remark || '').trim();
  const remarkB = String(b.remark || '').trim();
  const thicknessCompare = resolveLockForkDoorThickness(remarkA) - resolveLockForkDoorThickness(remarkB);
  if (thicknessCompare !== 0) return thicknessCompare;

  const heightCompare = resolveLockForkDoorHeight(remarkA) - resolveLockForkDoorHeight(remarkB);
  if (heightCompare !== 0) return heightCompare;

  const tailCompare = compareText(resolveLockForkRemarkTail(remarkA), resolveLockForkRemarkTail(remarkB));
  if (tailCompare !== 0) return tailCompare;

  const headCompare = resolveLockForkHeadRank(typeA) - resolveLockForkHeadRank(typeB);
  if (headCompare !== 0) return headCompare;

  const specA = String(a.spec || a.model || '').trim();
  const specB = String(b.spec || b.model || '').trim();
  const specValueCompare = resolveLockForkSpecSortValue(specA) - resolveLockForkSpecSortValue(specB);
  if (specValueCompare !== 0) return specValueCompare;

  const specCompare = compareText(specA, specB);
  if (specCompare !== 0) return specCompare;

  return compareText(typeA, typeB);
}

export function sortProcurementItems<T extends LockForkLikeItem>(category: string | undefined, items: T[]) {
  const normalizedCategory = normalizePrintCategory(category);
  if (!Array.isArray(items) || items.length <= 1) return Array.isArray(items) ? [...items] : [];
  if (normalizedCategory !== 'lock') return [...items];
  return [...items].sort(compareLockForkItems);
}

export function resolveProcurementItems<T extends LockForkLikeItem>(
  category: string | undefined,
  items: T[],
  options?: { preserveManualOrder?: boolean }
) {
  if (!Array.isArray(items) || items.length <= 1) return Array.isArray(items) ? [...items] : [];
  if (options?.preserveManualOrder) return [...items];
  return sortProcurementItems(category, items);
}
