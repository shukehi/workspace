export type LockForkAuditOptions = {
  json: boolean;
  jsonClean: boolean;
  includeAligned: boolean;
};

export function readLockForkAuditOptions(argv: string[]): LockForkAuditOptions {
  const options: LockForkAuditOptions = {
    json: false,
    jsonClean: false,
    includeAligned: false,
  };

  for (const token of argv) {
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--json-clean') {
      options.json = true;
      options.jsonClean = true;
      continue;
    }
    if (token === '--include-aligned') {
      options.includeAligned = true;
    }
  }

  return options;
}

export function shouldMuteLockForkAuditBootstrapLogs(options: LockForkAuditOptions) {
  return options.jsonClean;
}
