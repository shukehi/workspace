import { normalizeLockMappingKey } from '@/services/mappings';
import type { MappingValidationIssue } from '@/types/mapping';

export interface LockEditorValidationRow {
  id: string;
  model: string;
  supplier: string;
  vendorName: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function collectLockMappingRowIssues(rows: LockEditorValidationRow[]): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = [];
  const normalizedSeen = new Set<string>();

  rows.forEach((row, index) => {
    const model = row.model.trim();
    if (!model) {
      issues.push({ path: `rows[${index}].model`, code: 'required', message: '型号不能为空' });
      return;
    }

    const normalized = normalizeLockMappingKey(model);
    if (normalizedSeen.has(normalized)) {
      issues.push({ path: `rows[${index}].model`, code: 'duplicate', message: '型号 normalize 后重复' });
    } else {
      normalizedSeen.add(normalized);
    }

    if (!row.supplier.trim()) {
      issues.push({ path: `rows[${index}].supplier`, code: 'required', message: '供应商不能为空' });
    }

    if (!row.vendorName.trim()) {
      issues.push({ path: `rows[${index}].vendorName`, code: 'required', message: '采购名称不能为空' });
    }
  });

  return issues;
}

export function collectLockMappingPayloadIssues(value: unknown): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = [];
  const record = asRecord(value);
  const mappings = asRecord(record.mappings);

  Object.entries(mappings).forEach(([rawModel, rawEntry]) => {
    const model = toTrimmedString(rawModel);
    if (!model) return;

    const entry = asRecord(rawEntry);
    if (!toTrimmedString(entry.supplier)) {
      issues.push({
        path: `mappings[${JSON.stringify(model)}].supplier`,
        code: 'required',
        message: 'supplier 不能为空',
      });
    }

    if (!toTrimmedString(entry.vendorName) && !toTrimmedString(entry.name)) {
      issues.push({
        path: `mappings[${JSON.stringify(model)}].vendorName`,
        code: 'required',
        message: 'vendorName 不能为空',
      });
    }
  });

  return issues;
}
