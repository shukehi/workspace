export type ConfigProfileCode =
  | 'supplier_master'
  | 'material_master'
  | 'material_catalog'
  | 'packaging'
  | 'cylinder'
  | 'lock'
  | 'handle'
  | 'lock_fork'
  | 'formulas';

export type ConfigProfileDomain = 'catalog' | 'mapping' | 'formula';
export type ConfigProfileWorkflowKind = 'singleton' | 'collection';

export type ConfigProfileCapabilities = {
  detail: boolean;
  draft: boolean;
  publish: boolean;
  rollback: boolean;
  revisions: boolean;
  auditLogs: boolean;
};

export type ConfigProfileDefinition = {
  code: ConfigProfileCode;
  displayName: string;
  domain: ConfigProfileDomain;
  workflowKind: ConfigProfileWorkflowKind;
  capabilities: ConfigProfileCapabilities;
};

export type ConfigProfileSummary = ConfigProfileDefinition & {
  status: string;
  activeRevision: number | null;
};

export type ConfigProfileDetail = {
  profile: ConfigProfileSummary;
  latestRevision: Record<string, unknown> | null;
  draftRevision: Record<string, unknown> | null;
  publishedRevision: Record<string, unknown> | null;
  draftPayload: Record<string, unknown> | null;
  publishedPayload: Record<string, unknown> | null;
  collection?: Record<string, unknown>;
};

export type ConfigProfileWorkflowResult = {
  ok: boolean;
  status?: number;
  errors?: Array<{ field: string; code?: string; message: string }>;
  latestRevision?: number | null;
  revision?: Record<string, unknown> | null;
  activeRevision?: number | null;
  profile?: ConfigProfileSummary;
  detail?: ConfigProfileDetail;
  items?: Record<string, unknown>[];
};
