import * as MappingService from '../mappings';
import * as MaterialCatalogService from '../materials';
import * as FormulaService from '../formulas';
import { CONFIG_PROFILE_DEFINITIONS, getConfigProfileDefinition } from './profile.registry';
import type { ConfigProfileCode, ConfigProfileDetail, ConfigProfileSummary, ConfigProfileWorkflowResult } from './profile.types';
import { getSupplierMasterDetail } from './supplier-master';
import { getMaterialMasterDetail } from './material-master';
import { listSupplierMasterAuditLogs } from './supplier-master.audit';
import { listMaterialMasterAuditLogs } from './material-master.audit';
import { getMasterDataWorkflowDetail, listMasterDataRevisions, publishMasterDataProfile, rollbackMasterDataProfile } from './master-data.lifecycle';

function unsupportedWorkflow(code: string, action: string): ConfigProfileWorkflowResult {
  return {
    ok: false,
    status: 405,
    errors: [{ field: action, code: 'unsupported', message: `${code} does not support ${action}` }],
  };
}

function notFound(code: string): ConfigProfileWorkflowResult {
  return {
    ok: false,
    status: 404,
    errors: [{ field: 'code', code: 'not-found', message: `Config profile not found: ${code}` }],
  };
}

function toSummaryFromDefinition(code: ConfigProfileCode, status = 'active', activeRevision: unknown = null): ConfigProfileSummary {
  const definition = getConfigProfileDefinition(code)!;
  const numeric = Number(activeRevision);
  return {
    ...definition,
    status,
    activeRevision: Number.isInteger(numeric) && numeric > 0 ? numeric : null,
  };
}

function normalizeWorkflowErrors(result: any): ConfigProfileWorkflowResult {
  if (!result) return { ok: false, status: 500, errors: [{ field: '$', message: 'Unknown workflow error' }] };
  return {
    ok: false,
    status: Number(result.status) || 500,
    errors: Array.isArray(result.errors) ? result.errors.map((item: any) => ({
      field: String(item.field || item.path || '$'),
      code: item.code,
      message: String(item.message || 'Workflow error'),
    })) : [{ field: '$', message: String(result.error || result.message || 'Workflow error') }],
    latestRevision: Number.isInteger(Number(result.latestRevision)) ? Number(result.latestRevision) : null,
  };
}

async function getMappingDetail(code: ConfigProfileCode): Promise<ConfigProfileWorkflowResult> {
  const detail = await MappingService.getMappingDetail(code);
  if (!detail) return notFound(code);
  if (!detail.ok) return normalizeWorkflowErrors(detail);

  const mapping = detail.mapping;
  const result: ConfigProfileDetail = {
    profile: toSummaryFromDefinition(code, String(mapping.profile?.status || 'active'), mapping.profile?.activeRevision),
    latestRevision: mapping.latestRevision || null,
    draftRevision: mapping.draftRevision || null,
    publishedRevision: mapping.publishedRevision || null,
    draftPayload: mapping.draftPayload || null,
    publishedPayload: mapping.publishedPayload || null,
  };

  return { ok: true, detail: result, profile: result.profile };
}

async function getMaterialCatalogDetail(): Promise<ConfigProfileWorkflowResult> {
  const detail = await MaterialCatalogService.getMaterialsCatalogDetail();
  const profile = detail.profile || {};
  const result: ConfigProfileDetail = {
    profile: toSummaryFromDefinition('material_catalog', String(profile.status || 'active'), profile.activeRevision),
    latestRevision: detail.latestRevision || null,
    draftRevision: detail.draftRevision || null,
    publishedRevision: detail.publishedRevision || null,
    draftPayload: detail.draftPayload || null,
    publishedPayload: detail.publishedPayload || null,
  };

  return { ok: true, detail: result, profile: result.profile };
}

async function getSupplierMasterProfileDetail(): Promise<ConfigProfileWorkflowResult> {
  const [detail, workflow] = await Promise.all([
    getSupplierMasterDetail(),
    getMasterDataWorkflowDetail('supplier_master'),
  ]);
  const result: ConfigProfileDetail = {
    profile: toSummaryFromDefinition('supplier_master', workflow.profile.status, workflow.profile.activeRevision),
    latestRevision: workflow.latestRevision,
    draftRevision: workflow.draftRevision,
    publishedRevision: workflow.publishedRevision,
    draftPayload: workflow.draftPayload as any,
    publishedPayload: workflow.publishedPayload as any,
    collection: {
      total: Number(detail.total || 0),
      page: 1,
      pageSize: Number(detail.total || 0),
      previewItems: detail.items || [],
      runtimeReadiness: detail.runtimeReadiness,
      runtimeNotReady: detail.runtimeNotReady,
      degradedProfiles: detail.degradedProfiles,
    },
  };
  return { ok: true, detail: result, profile: result.profile };
}

async function getMaterialMasterProfileDetail(): Promise<ConfigProfileWorkflowResult> {
  const [detail, workflow] = await Promise.all([
    getMaterialMasterDetail(),
    getMasterDataWorkflowDetail('material_master'),
  ]);
  const result: ConfigProfileDetail = {
    profile: toSummaryFromDefinition('material_master', workflow.profile.status, workflow.profile.activeRevision),
    latestRevision: workflow.latestRevision,
    draftRevision: workflow.draftRevision,
    publishedRevision: workflow.publishedRevision,
    draftPayload: workflow.draftPayload as any,
    publishedPayload: workflow.publishedPayload as any,
    collection: {
      total: Number(detail.total || 0),
      page: 1,
      pageSize: Number(detail.total || 0),
      previewItems: detail.items || [],
    },
  };
  return { ok: true, detail: result, profile: result.profile };
}

async function getFormulasCollectionDetail(): Promise<ConfigProfileWorkflowResult> {
  const [list, publishedMap] = await Promise.all([
    FormulaService.listFormulas({ page: 1, pageSize: 20 }),
    FormulaService.getPublishedFormulasMap(),
  ]);

  const result: ConfigProfileDetail = {
    profile: toSummaryFromDefinition('formulas', 'active', null),
    latestRevision: null,
    draftRevision: null,
    publishedRevision: null,
    draftPayload: null,
    publishedPayload: (publishedMap && typeof publishedMap === 'object' ? publishedMap : {}) as Record<string, unknown>,
    collection: {
      total: Number(list?.total || 0),
      page: Number(list?.page || 1),
      pageSize: Number(list?.pageSize || 20),
      previewItems: Array.isArray(list?.items) ? list.items : [],
    },
  };

  return { ok: true, detail: result, profile: result.profile };
}

export async function listConfigProfiles() {
  const results = await Promise.all(CONFIG_PROFILE_DEFINITIONS.map(async (definition) => {
    if (definition.code === 'formulas') {
      return toSummaryFromDefinition('formulas');
    }
    if (definition.code === 'supplier_master') {
      return toSummaryFromDefinition('supplier_master');
    }
    if (definition.code === 'material_master') {
      return toSummaryFromDefinition('material_master');
    }
    if (definition.code === 'material_catalog') {
      const detail = await getMaterialCatalogDetail();
      return detail.profile!;
    }
    const detail = await getMappingDetail(definition.code);
    return detail.profile || toSummaryFromDefinition(definition.code);
  }));

  return results;
}

export async function getConfigProfileDetail(code: string): Promise<ConfigProfileWorkflowResult> {
  const definition = getConfigProfileDefinition(code);
  if (!definition) return notFound(code);

  if (code === 'formulas') return await getFormulasCollectionDetail();
  if (code === 'supplier_master') return await getSupplierMasterProfileDetail();
  if (code === 'material_master') return await getMaterialMasterProfileDetail();
  if (code === 'material_catalog') return await getMaterialCatalogDetail();
  return await getMappingDetail(code as ConfigProfileCode);
}

export async function updateConfigProfileDraft(code: string, params: Record<string, unknown>): Promise<ConfigProfileWorkflowResult> {
  const definition = getConfigProfileDefinition(code);
  if (!definition) return notFound(code);
  if (!definition.capabilities.draft) return unsupportedWorkflow(code, 'draft');

  if (code === 'material_catalog') {
    const result = await MaterialCatalogService.updateDraft({
      revision: params.revision as number | string | null,
      payload: (params.payload || {}) as Record<string, unknown>,
      changeNote: params.changeNote as string | undefined,
      operator: params.operator as string | undefined,
    });
    return result.ok ? { ok: true, revision: result.revision || null } : normalizeWorkflowErrors(result);
  }

  const result = await MappingService.updateDraft(code, {
    revision: params.revision as number | string | null,
    payload: (params.payload || {}) as Record<string, unknown>,
    changeNote: params.changeNote as string | undefined,
    schemaVersion: params.schemaVersion as number | string | null,
    operator: params.operator as string | undefined,
  });
  return result.ok ? { ok: true, revision: result.revision || null, profile: result.profile || undefined } : normalizeWorkflowErrors(result);
}

export async function publishConfigProfile(code: string, params: Record<string, unknown>): Promise<ConfigProfileWorkflowResult> {
  const definition = getConfigProfileDefinition(code);
  if (!definition) return notFound(code);
  if (!definition.capabilities.publish) return unsupportedWorkflow(code, 'publish');

  if (code === 'supplier_master') {
    const result = await publishMasterDataProfile('supplier_master', {
      fromRevision: params.fromRevision as number | string,
      changeNote: params.changeNote as string | undefined,
      operator: params.operator as string | undefined,
    });
    return result.ok ? { ok: true, revision: result.revision || null } : normalizeWorkflowErrors(result);
  }

  if (code === 'material_master') {
    const result = await publishMasterDataProfile('material_master', {
      fromRevision: params.fromRevision as number | string,
      changeNote: params.changeNote as string | undefined,
      operator: params.operator as string | undefined,
    });
    return result.ok ? { ok: true, revision: result.revision || null } : normalizeWorkflowErrors(result);
  }

  if (code === 'material_catalog') {
    const result = await MaterialCatalogService.publish({
      fromRevision: params.fromRevision as number | string,
      changeNote: params.changeNote as string | undefined,
      operator: params.operator as string | undefined,
    });
    return result.ok ? { ok: true, revision: result.revision || null } : normalizeWorkflowErrors(result);
  }

  const result = await MappingService.publish(code, {
    fromRevision: params.fromRevision as number | string,
    changeNote: params.changeNote as string | undefined,
    operator: params.operator as string | undefined,
  });
  return result.ok ? { ok: true, revision: result.revision || null } : normalizeWorkflowErrors(result);
}

export async function rollbackConfigProfile(code: string, params: Record<string, unknown>): Promise<ConfigProfileWorkflowResult> {
  const definition = getConfigProfileDefinition(code);
  if (!definition) return notFound(code);
  if (!definition.capabilities.rollback) return unsupportedWorkflow(code, 'rollback');

  if (code === 'supplier_master') {
    const result = await rollbackMasterDataProfile('supplier_master', {
      targetRevision: params.targetRevision as number | string,
      reason: params.reason as string | undefined,
      operator: params.operator as string | undefined,
    });
    return result.ok ? { ok: true, revision: result.revision || null, activeRevision: result.activeRevision ?? null } : normalizeWorkflowErrors(result);
  }

  if (code === 'material_master') {
    const result = await rollbackMasterDataProfile('material_master', {
      targetRevision: params.targetRevision as number | string,
      reason: params.reason as string | undefined,
      operator: params.operator as string | undefined,
    });
    return result.ok ? { ok: true, revision: result.revision || null, activeRevision: result.activeRevision ?? null } : normalizeWorkflowErrors(result);
  }

  const result = await MappingService.rollback(code, {
    targetRevision: params.targetRevision as number | string,
    reason: params.reason as string | undefined,
    operator: params.operator as string | undefined,
  });
  return result.ok ? { ok: true, revision: result.revision || null, activeRevision: result.activeRevision ?? null } : normalizeWorkflowErrors(result);
}

export async function listConfigProfileRevisions(code: string): Promise<ConfigProfileWorkflowResult> {
  const definition = getConfigProfileDefinition(code);
  if (!definition) return notFound(code);
  if (!definition.capabilities.revisions) return unsupportedWorkflow(code, 'revisions');

  if (code === 'supplier_master') {
    return { ok: true, items: await listMasterDataRevisions('supplier_master') as any };
  }

  if (code === 'material_master') {
    return { ok: true, items: await listMasterDataRevisions('material_master') as any };
  }

  if (code === 'material_catalog') {
    const items = await MaterialCatalogService.listRevisions();
    return { ok: true, items };
  }

  const result = await MappingService.listRevisions(code);
  if (!result) return notFound(code);
  return result.ok ? { ok: true, items: result.revisions || [] } : normalizeWorkflowErrors(result);
}

export async function listConfigProfileAuditLogs(code: string): Promise<ConfigProfileWorkflowResult> {
  const definition = getConfigProfileDefinition(code);
  if (!definition) return notFound(code);
  if (!definition.capabilities.auditLogs) return unsupportedWorkflow(code, 'audit-logs');

  if (code === 'material_catalog') {
    const items = await MaterialCatalogService.listAuditLogs();
    return { ok: true, items };
  }

  if (code === 'supplier_master') {
    const items = await listSupplierMasterAuditLogs();
    return { ok: true, items };
  }

  if (code === 'material_master') {
    const items = await listMaterialMasterAuditLogs();
    return { ok: true, items };
  }

  const result = await MappingService.listAuditLogs(code);
  if (!result) return notFound(code);
  return result.ok ? { ok: true, items: result.items || [] } : normalizeWorkflowErrors(result);
}
