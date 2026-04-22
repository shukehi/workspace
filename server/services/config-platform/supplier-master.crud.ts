import { Op } from 'sequelize';
import { SupplierMaster } from '../../models';
import type { SupplierMasterInstance } from '../../models';
import { createSupplierMasterAuditLog } from './supplier-master.audit';
import { syncMasterDataDraft } from './master-data.lifecycle';

function normalize(value: unknown) {
  return String(value || '').trim();
}

function normalizeStatus(value: unknown): 'active' | 'inactive' {
  return normalize(value).toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function toItem(entry: SupplierMasterInstance) {
  const plain = typeof entry.get === 'function' ? entry.get({ plain: true }) : entry;
  return {
    id: Number((plain as any).id),
    supplierName: String((plain as any).supplier_name || ''),
    normalizedName: String((plain as any).normalized_name || ''),
    status: String((plain as any).status || 'active'),
    sourceNote: String((plain as any).source_note || ''),
    createdAt: (plain as any).created_at || null,
    updatedAt: (plain as any).updated_at || null,
  };
}

export async function createSupplierMasterItem(payload: Record<string, unknown>) {
  const supplierName = normalize(payload.supplierName);
  if (!supplierName) {
    return { ok: false, status: 422, errors: [{ field: 'supplierName', code: 'required', message: 'supplierName is required' }] };
  }
  const normalizedName = supplierName.toLowerCase();
  const existing = await SupplierMaster.findOne({
    where: {
      [Op.or]: [
        { supplier_name: supplierName },
        { normalized_name: normalizedName },
      ],
    },
  }) as SupplierMasterInstance | null;
  if (existing) {
    return { ok: false, status: 409, errors: [{ field: 'supplierName', code: 'duplicate', message: 'supplier already exists' }] };
  }

  const created = await SupplierMaster.create({
    supplier_name: supplierName,
    normalized_name: normalizedName,
    status: normalizeStatus(payload.status),
    source_note: normalize(payload.sourceNote) || null,
  }) as SupplierMasterInstance;

  await createSupplierMasterAuditLog({
    supplierMasterId: Number((created.get({ plain: true }) as any).id),
    action: 'create',
    meta: {
      supplierName,
      status: normalizeStatus(payload.status),
    },
  });
  await syncMasterDataDraft('supplier_master', 'supplier master item create');

  return { ok: true, item: toItem(created) };
}

export async function updateSupplierMasterItem(idInput: unknown, payload: Record<string, unknown>) {
  const id = Number(idInput);
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, status: 422, errors: [{ field: 'id', code: 'invalid', message: 'id must be a positive integer' }] };
  }
  const existing = await SupplierMaster.findByPk(id) as SupplierMasterInstance | null;
  if (!existing) {
    return { ok: false, status: 404, errors: [{ field: 'id', code: 'not-found', message: 'supplier not found' }] };
  }

  const nextName = payload.supplierName === undefined ? normalize((existing as any).supplier_name) : normalize(payload.supplierName);
  if (!nextName) {
    return { ok: false, status: 422, errors: [{ field: 'supplierName', code: 'required', message: 'supplierName is required' }] };
  }
  const nextNormalized = nextName.toLowerCase();
  const duplicate = await SupplierMaster.findOne({
    where: {
      id: { [Op.ne]: id },
      [Op.or]: [
        { supplier_name: nextName },
        { normalized_name: nextNormalized },
      ],
    },
  }) as SupplierMasterInstance | null;
  if (duplicate) {
    return { ok: false, status: 409, errors: [{ field: 'supplierName', code: 'duplicate', message: 'supplier already exists' }] };
  }

  await existing.update({
    supplier_name: nextName,
    normalized_name: nextNormalized,
    status: payload.status === undefined ? (existing as any).status : normalizeStatus(payload.status),
    source_note: payload.sourceNote === undefined ? (existing as any).source_note : normalize(payload.sourceNote) || null,
  });

  await createSupplierMasterAuditLog({
    supplierMasterId: id,
    action: 'update',
    meta: {
      supplierName: nextName,
      status: payload.status === undefined ? (existing as any).status : normalizeStatus(payload.status),
    },
  });
  await syncMasterDataDraft('supplier_master', 'supplier master item update');

  return { ok: true, item: toItem(existing) };
}

export async function archiveSupplierMasterItem(idInput: unknown) {
  const result = await updateSupplierMasterItem(idInput, { status: 'inactive' });
  if (result.ok) {
    const id = Number(idInput);
    if (Number.isInteger(id) && id > 0) {
      await createSupplierMasterAuditLog({
        supplierMasterId: id,
        action: 'archive',
        meta: {},
      });
    }
  }
  return result;
}
