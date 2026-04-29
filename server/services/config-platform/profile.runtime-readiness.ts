export type RuntimeReadiness = {
  ready: boolean;
  runtimeNotReady: boolean;
  degradedProfiles: string[];
  message?: string;
};

export function normalizeRuntimeDegradedProfiles(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item)).filter(Boolean))].sort()
    : [];
}

export function runtimeReady(degradedProfiles: unknown = []): RuntimeReadiness {
  return {
    ready: true,
    runtimeNotReady: false,
    degradedProfiles: normalizeRuntimeDegradedProfiles(degradedProfiles),
  };
}

export function runtimeNotReady(error: unknown): RuntimeReadiness {
  const errorRecord = (error || {}) as {
    degradedProfiles?: unknown;
    runtimeReadiness?: { degradedProfiles?: unknown };
  };
  return {
    ready: false,
    runtimeNotReady: true,
    degradedProfiles: normalizeRuntimeDegradedProfiles(
      errorRecord.degradedProfiles ?? errorRecord.runtimeReadiness?.degradedProfiles,
    ),
    message: error instanceof Error ? error.message : String(error || 'Runtime config snapshot is not ready'),
  };
}
