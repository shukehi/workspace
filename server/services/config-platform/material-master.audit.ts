import { MaterialMasterAuditLog } from '../../models';
import type { MaterialMasterAuditLogInstance } from '../../models';

function parseMeta(value: unknown) {
  if (!value) return {};
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

export async function createMaterialMasterAuditLog(payload: {
  materialId: number;
  action: string;
  operator?: string;
  meta?: Record<string, unknown>;
}) {
  return await MaterialMasterAuditLog.create({
    material_id: payload.materialId,
    action: payload.action,
    operator: payload.operator || 'system-admin',
    meta_json: JSON.stringify(payload.meta || {}),
  }) as MaterialMasterAuditLogInstance;
}

export async function listMaterialMasterAuditLogs() {
  const rows = await MaterialMasterAuditLog.findAll({ order: [['id', 'DESC']], limit: 50 }) as MaterialMasterAuditLogInstance[];
  return rows.map((row) => {
    const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
    return {
      id: Number((plain as any).id),
      materialId: Number((plain as any).material_id),
      action: String((plain as any).action || ''),
      operator: String((plain as any).operator || ''),
      meta: parseMeta((plain as any).meta_json),
      createdAt: (plain as any).created_at || null,
    };
  });
}
