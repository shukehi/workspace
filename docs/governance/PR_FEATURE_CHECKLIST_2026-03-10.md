# PR 功能开发检查清单（2026-03-10）

提交功能、重构或修复前，至少快速检查以下项目。

## 1. 结构边界

- [ ] 页面是否只做装配，没有继续堆业务转换、弹窗状态机或导出流程
- [ ] store 是否没有同时承担主状态、历史列表、分析计算、页面交互等多类职责
- [ ] 可复用或可测试逻辑是否已下沉到 helper / composable / service
- [ ] 浏览器副作用是否没有继续直接堆进核心 store / manager

## 2. HTTP 契约

- [ ] 新增或改造的写接口是否有明确请求校验落点
- [ ] 成功返回结构是否没有继续引入新的 payload 形态
- [ ] 错误结构是否保持 `code/message/details` 语义稳定

## 3. 配置接入

- [ ] 新功能是否优先使用 workflow 主接口，而不是 legacy `/api/config/*`
- [ ] 页面和业务逻辑是否没有直接依赖 `/data/*.json`
- [ ] fallback 逻辑是否只留在 repository / facade 内部

## 4. 兼容层

- [ ] 是否没有给 legacy 兼容接口继续叠加新语义
- [ ] 如果改动了兼容层，是否明确说明了兼容目的和后续退场方向
- [ ] 兼容壳文件是否只保留转发，不承载新逻辑

## 5. 测试

- [ ] 是否补了最小逻辑测试、route 测试或 guard test
- [ ] 如果新增了结构边界，是否补了防回退检查
- [ ] 是否跑过本次改动对应的关键测试集合
- [ ] 如果新增了请求校验、legacy 退场规则或 runtime adapter，是否补了对应测试

## 6. 文档

- [ ] 如果改动了真源、边界或接入方式，是否同步更新规范或阶段总结文档
- [ ] 如果是迁移/兼容改动，是否记录了迁移顺序或退场策略
- [ ] 如果新增了计划、迁移、issue 或草案文档，是否补了状态说明并放到正确目录

## 7. 合并前自问

- [ ] 这次改动会不会让某个页面重新变成“大页面”
- [ ] 这次改动会不会让某个 store 重新变成“大 store”
- [ ] 这次改动会不会让请求校验、错误结构或副作用边界再次散掉
- [ ] 两个月后再加同类功能时，这个边界还是否清晰

## 关联文档

- [功能开发与配置接入规范](/Users/aries/Dve/workspace/docs/governance/FEATURE_DEVELOPMENT_GOVERNANCE_2026-03-10.md)
- [文档状态标注规范](/Users/aries/Dve/workspace/docs/governance/DOCUMENT_STATUS_CONVENTIONS.md)
- [Legacy 配置接口退场策略](/Users/aries/Dve/workspace/docs/governance/LEGACY_CONFIG_ENDPOINT_RETIREMENT_PLAN_2026-03-10.md)
- [Source/配置重构阶段性总结](/Users/aries/Dve/workspace/docs/progress/SOURCE_CONFIG_REFACTOR_PROGRESS_2026-03-10.md)
