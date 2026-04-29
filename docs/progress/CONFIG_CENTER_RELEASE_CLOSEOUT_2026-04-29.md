# Config Center Release Closeout (2026-04-29)

> 状态：阶段完成记录。
> 当前发布前 smoke 仍以本文的 API key / published mapping 前置条件为准。

## Scope

This note closes the Config Center simplification release path after the UI and
production runtime smoke passes completed on 2026-04-29.

Merged PRs in this closeout path:

- #56 — Clarify rule exception editor intent
- #58 — Surface Config Center intent groups in navigation
- #59 — Reduce Config Center review panel noise
- #61 — Guide mapping editors toward exceptions last
- #62 — Remove duplicate Config Center operator guide

## Closeout result

The release path is ready for normal handoff with no further code changes from
this closeout.

Validated outcomes:

- Config Center navigation groups render by operator intent.
- Rule-exception mapping pages keep exactly one first-screen guide card:
  `首屏操作指南`.
- The legacy duplicate guide title `首屏维护顺序` is no longer rendered on the
  five mapping pages.
- Production runtime config snapshot responds successfully when production auth
  is configured and the request includes the configured API key.
- Required runtime config profiles remain fail-closed when published mappings
  are missing.

## Release-smoke prerequisites

Production-like smoke must include both prerequisites below.

### 1. API key is required in production

Start the server with `API_KEY` set and send the same value in the request
header:

```bash
NODE_ENV=production API_KEY=<key> PORT=<port> npm run server:prod
curl -H "x-api-key: <key>" \
  http://127.0.0.1:<port>/api/runtime/config-snapshot
```

Expected auth boundaries:

- `NODE_ENV=production` without `API_KEY` is a server misconfiguration.
- With `API_KEY` configured, requests without `x-api-key` are rejected.
- A matching `x-api-key` is required for `/api/runtime/*` and `/api/config/*`
  endpoints.

### 2. Published mappings are required

`/api/runtime/config-snapshot` intentionally fails closed if required published
mapping profiles are missing. A fresh or temp DB is not a valid runtime snapshot
smoke target until required profiles are seeded and published.

Before release smoke against a fresh DB, publish or verify:

- `packaging`
- `cylinder`
- `lock`
- `handle`
- `lock_fork`
- material catalog / formula runtime data as needed by the environment

Useful check:

```bash
npm run mapping:check:published
```

## Verification evidence

Commands run during closeout:

```bash
node --require tsx/cjs --test --test-concurrency=1 tests/config-table-guard.test.ts
npm run type-check
npm run lint:css
npm run build
npm run type-check:server
node --require tsx/cjs --test --test-concurrency=1 \
  tests/runtime-config-route.test.ts \
  tests/config-profile-auth-boundary.test.ts \
  tests/api-key-auth.test.ts
```

Production smoke evidence with `API_KEY` configured:

- `/api/runtime/config-snapshot` returned HTTP 200.
- Snapshot profile keys included `material_catalog`, `formulas`, `packaging`,
  `cylinder`, `lock`, `handle`, and `lock_fork`.
- `meta.degradedProfiles` was empty (`[]`).
- Representative detail endpoints returned HTTP 200:
  - `/api/config/profiles/packaging/detail`
  - `/api/config/profiles/lock/detail`
  - `/api/config/profiles/handle/detail`
  - `/api/config/profiles/cylinder/detail`
  - `/api/config/profiles/lock_fork/detail`

## Do not treat these as regressions

These failures are expected guardrails unless the release target is supposed to
self-seed configuration:

- Production smoke without `API_KEY`.
- Requests missing or using the wrong `x-api-key` after `API_KEY` is configured.
- Runtime snapshot requests against a fresh DB with no published mapping
  profiles.

If any of the above should become supported in a future deployment flow, create a
separate change for the deployment/bootstrap contract rather than weakening the
runtime snapshot fail-closed behavior.
