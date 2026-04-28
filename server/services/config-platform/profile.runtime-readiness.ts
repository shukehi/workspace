export type RuntimeReadiness = {
  ready: boolean;
  runtimeNotReady: boolean;
  degradedProfiles: string[];
  message?: string;
};

export function runtimeReady(degradedProfiles: unknown = []): RuntimeReadiness {
  return {
    ready: true,
    runtimeNotReady: false,
    degradedProfiles: Array.isArray(degradedProfiles)
      ? degradedProfiles.map((item) => String(item)).filter(Boolean).sort()
      : [],
  };
}

export function runtimeNotReady(error: unknown): RuntimeReadiness {
  return {
    ready: false,
    runtimeNotReady: true,
    degradedProfiles: [],
    message: error instanceof Error ? error.message : String(error || 'Runtime config snapshot is not ready'),
  };
}
