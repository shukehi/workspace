> 历史治理文档。
> 当前运行时 legacy bridge 已移除；请优先参考：
> - `docs/governance/CONFIG_CENTER_REFACTOR_HANDOFF_2026-04-21.md`
> - `docs/progress/BRANCH_PROGRESS_CONFIG_CENTER_REFACTOR_FINAL_SUMMARY_2026-04-21.md`

# Legacy materials POST external caller audit runbook (2026-04-21)

## Target endpoint
- `POST /api/config/materials`
- current flag: `ENABLE_LEGACY_CONFIG_MATERIALS_POST`

## Goal
Determine whether any repo-external caller still depends on the legacy materials POST compatibility endpoint.

## Known internal result
- `src/` callers: none
- repo tests: isolated to `tests/materials-config-compatibility-route.test.ts`
- internal codebase alone is **not** the blocking factor

## External evidence to collect
### 1. API gateway / reverse proxy logs
Search for requests matching:
- `POST /api/config/materials`

Record:
- timestamp range searched
- request count
- caller IP / auth identity / user-agent
- whether traffic is still active

### 2. Deployment / automation jobs
Check:
- CI/CD jobs
- cron jobs
- server-side scheduled tasks
- operations scripts outside this repo

Record:
- job name
- owner
- whether it still posts to the legacy endpoint
- replacement status

### 3. Human-operated tools
Check:
- Postman collections
- curl snippets
- internal runbooks
- low-code / integration platforms

Record:
- tool name
- owner
- still used? yes/no
- migration status

## Decision rules
### Safe to move to controlled disable when all are true
- no active gateway traffic in the agreed observation window
- no active automation still posting to the endpoint
- no required manual workflow still depends on the legacy POST shape

### Not safe yet if any are true
- any active traffic remains unexplained
- an owned integration still posts to the endpoint
- an operator workflow has no validated replacement

## Controlled-disable action
If audit clears the endpoint:
1. set `ENABLE_LEGACY_CONFIG_MATERIALS_POST=false`
2. verify `POST /api/config/materials` returns `404`
3. monitor logs for regressions
4. if stable, proceed to deletion
