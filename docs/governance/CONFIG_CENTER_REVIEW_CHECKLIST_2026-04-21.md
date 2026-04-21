## Review Checklist

### Runtime / bootstrap
- [ ] App starts without bootstrap failure
- [ ] Runtime config loading still succeeds
- [ ] Unified snapshot/profile loading path is intact
- [ ] No runtime dependency on removed legacy config endpoints remains

### Backend routes
- [ ] `/api/runtime/config-snapshot` works
- [ ] `/api/config/profiles/*` works
- [ ] `/api/config/masters/*` works
- [ ] No legacy config bridge mount remains in `server/routes/index.ts`
- [ ] Removed legacy route files are not referenced by runtime code

### Frontend config center
- [ ] Config center shell renders correctly
- [ ] Profile host renders correctly
- [ ] Formula host renders correctly
- [ ] Config pages still load/save/publish correctly
- [ ] Diff / impact / replay / reference-check panels still render where expected

### Master data
#### Supplier master
- [ ] Supplier list renders
- [ ] Create/edit/archive works
- [ ] Audit info renders
- [ ] Relationship health panels render

#### Material master
- [ ] Material list renders
- [ ] Create/edit works
- [ ] Supplier link display is correct
- [ ] Diagnostics panels render
- [ ] Audit info renders

### Legacy retirement
- [ ] Removed legacy runtime surfaces are truly gone
- [ ] No code path depends on removed `/api/config/*` runtime endpoints
- [ ] No compatibility shim files remain mounted at runtime
- [ ] No remaining tests imply active support for removed legacy routes

### Tests / static checks
- [ ] `npm run type-check`
- [ ] `npm run type-check:server`
- [ ] Targeted regression tests relevant to config/master-data pass

### Docs
- [ ] Active reference docs describe unified platform, not legacy paths
- [ ] Handoff / final summary docs match actual code state
- [ ] Historical governance/progress docs are clearly labeled historical

### Final diff sanity
- [ ] Diff matches stated goal: unified platform + legacy bridge removal
- [ ] No suspicious accidental deletions outside intended scope
- [ ] No dead imports / stale references remain
