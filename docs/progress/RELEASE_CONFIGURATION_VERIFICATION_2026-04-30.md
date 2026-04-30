# Release Configuration Verification (2026-04-30)

> 状态：现行发布配置核对清单。
> 用于回答 System Optimization stale-check 后是否还需要继续改前端或后端配置代码。

## Executive answer

The release configuration contract is **documented and statically guarded**. Do not reopen frontend/backend implementation for `API_KEY`, `VITE_API_KEY`, `CORS_ORIGIN`, or `PRINT_RENDER_BASE_URL` unless a release smoke run produces fresh failing evidence.

This pass does **not** use production secrets and does **not** contact external production services. It verifies the repository contract that release operators must supply matching backend/frontend API keys, explicit CORS origins, and a production print/PDF render base URL.

## Required release values

| Variable | Required where | Contract | Evidence |
| --- | --- | --- | --- |
| `API_KEY` | Backend production runtime | Required when `NODE_ENV=production`; missing key is a server misconfiguration and all `/api` requests require matching `x-api-key` when set. | `.env.example`, `server/app/middleware/apiKeyAuth.ts`, `tests/api-key-auth.test.ts`, `tests/config-profile-auth-boundary.test.ts` |
| `VITE_API_KEY` | Frontend build/runtime config | Must match backend `API_KEY` for production-like smoke; omitted only for permissive local development. | `.env.example`, `src/lib/api.ts`, `src/vite-env.d.ts`, `tests/release-env-contract.test.ts` |
| `CORS_ORIGIN` | Backend runtime | Must be explicit for production/LAN; comma-separated allowlist is supported. Default remains `http://localhost:5173`, not `*`, while credentials stay enabled. | `.env.example`, `server/config/env.ts`, `tests/env-config-cors.test.ts` |
| `PRINT_RENDER_BASE_URL` | Backend production runtime | Required in production for PDF/print rendering; should point at the deployed frontend render origin. | `.env.example`, `server/services/renderBaseUrl.ts`, `tests/pdf-route.test.ts`, `docs/reference/RUNTIME_CONTRACT_2026-04-16.md` |

## Static verification added

`tests/release-env-contract.test.ts` guards that:

- `.env.example` continues to document all release-critical variable names;
- example `API_KEY` and `VITE_API_KEY` values stay aligned;
- runtime docs continue to name production `API_KEY` and `PRINT_RENDER_BASE_URL` boundaries;
- server CORS parsing keeps explicit allowlist behavior and `credentials: true`;
- frontend API client and Vite types continue to expose `VITE_API_KEY` / `x-api-key`.

## Manual release-smoke checklist

Before a production-like smoke run, operators should verify:

1. `NODE_ENV=production` is paired with non-empty `API_KEY`.
2. The frontend build/runtime receives the same value as `VITE_API_KEY`.
3. `CORS_ORIGIN` includes every browser origin that will call the backend and does not rely on `*`.
4. `PRINT_RENDER_BASE_URL` points to the browser-renderable frontend origin used by PDF/print.
5. Existing config-center prerequisites still hold: required mapping profiles are published before `/api/runtime/config-snapshot` smoke.

Recommended smoke commands remain environment-specific because real secrets and deployed origins must not be committed. The repository-level contract is covered by static tests; release operators provide real values outside git.

## Next recommendation

Stop this lane after static guard + docs. The only remaining next step is an environment-specific release smoke with real deployment values. If that smoke fails, open a new narrow defect using the failing endpoint, response, and configured origin/key evidence.
