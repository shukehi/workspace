import type { ConfigProfileDefinition } from './profile.types';

export const CONFIG_PROFILE_DEFINITIONS: ConfigProfileDefinition[] = [
  {
    code: 'supplier_master',
    displayName: '供应商主数据',
    domain: 'catalog',
    workflowKind: 'collection',
    capabilities: { detail: true, draft: false, publish: true, rollback: true, revisions: true, auditLogs: true },
  },
  {
    code: 'material_master',
    displayName: '物料主数据',
    domain: 'catalog',
    workflowKind: 'collection',
    capabilities: { detail: true, draft: false, publish: true, rollback: true, revisions: true, auditLogs: true },
  },
  {
    code: 'material_catalog',
    displayName: '物料目录配置',
    domain: 'catalog',
    workflowKind: 'singleton',
    capabilities: { detail: true, draft: true, publish: true, rollback: false, revisions: true, auditLogs: true },
  },
  {
    code: 'packaging',
    displayName: '包装映射',
    domain: 'mapping',
    workflowKind: 'singleton',
    capabilities: { detail: true, draft: true, publish: true, rollback: true, revisions: true, auditLogs: true },
  },
  {
    code: 'cylinder',
    displayName: '锁芯映射',
    domain: 'mapping',
    workflowKind: 'singleton',
    capabilities: { detail: true, draft: true, publish: true, rollback: true, revisions: true, auditLogs: true },
  },
  {
    code: 'lock',
    displayName: '锁具映射',
    domain: 'mapping',
    workflowKind: 'singleton',
    capabilities: { detail: true, draft: true, publish: true, rollback: true, revisions: true, auditLogs: true },
  },
  {
    code: 'handle',
    displayName: '拉手映射',
    domain: 'mapping',
    workflowKind: 'singleton',
    capabilities: { detail: true, draft: true, publish: true, rollback: true, revisions: true, auditLogs: true },
  },
  {
    code: 'lock_fork',
    displayName: '锁叉映射',
    domain: 'mapping',
    workflowKind: 'singleton',
    capabilities: { detail: true, draft: true, publish: true, rollback: true, revisions: true, auditLogs: true },
  },
  {
    code: 'formulas',
    displayName: '配方配置',
    domain: 'formula',
    workflowKind: 'collection',
    capabilities: { detail: true, draft: false, publish: false, rollback: false, revisions: false, auditLogs: false },
  },
];

export function getConfigProfileDefinition(code: string) {
  return CONFIG_PROFILE_DEFINITIONS.find((item) => item.code === code) || null;
}
