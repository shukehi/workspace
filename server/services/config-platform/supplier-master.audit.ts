import { SupplierMasterAuditLog } from '../../models';
import type { SupplierMasterAuditLogInstance } from '../../models';

function parseMeta(value: unknown) {
  if (!value) return {};
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

export async function createSupplierMasterAuditLog(payload: {
  supplierMasterId: number;
  action: string;
  operator?: string;
  meta?: Record<string, unknown>;
}) {
  return await SupplierMasterAuditLog.create({
    supplier_master_id: payload.supplierMasterId,
    action: payload.action,
    operator: payload.operator || 'system-admin',
    meta_json: JSON.stringify(payload.meta || {}),
  }) as SupplierMasterAuditLogInstance;
}

export async function listSupplierMasterAuditLogs() {
  const rows = await SupplierMasterAuditLog.findAll({
    order: [['id', 'DESC']],
    limit: 50,
  }) as SupplierMasterAuditLogInstance[];

  return rows.map((row) => {
    const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
    return {
      id: Number((plain as any).id),
      supplierMasterId: Number((plain as any).supplier_master_id),
      action: String((plain as any).action || ''),
      operator: String((plain as any).operator || ''),
      meta: parseMeta((plain as any).meta_json),
      createdAt: (plain as any).created_at || null,
    };
  });
}
