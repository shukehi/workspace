# Trial TODO — Packaging-first simplification

## Goal
在不破坏现有保存/发布/runtime 刷新链路的前提下，验证“后端默认 + 字典化 + 前端例外维护”模式。

## Scope
Primary files likely involved:
- `src/views/PackagingConfig.vue`
- `src/services/mappingConfigApi.ts`
- `src/services/configRuntime.ts`
- backend packaging profile / runtime snapshot provider (to be confirmed in implementation branch)

## Trial checklist
- [ ] 明确 packaging 中哪些映射属于标准字典，哪些属于异常项
- [ ] 定义后端默认供应商承接方式
- [ ] 设计前端“例外映射”保留形态
- [ ] 明确保存后 diff / impact / replay / reference-check 是否继续可用
- [ ] 为试点定义 rollback/回退方式

## Acceptance criteria for the trial branch
- [ ] 页面主要编辑对象从“完整映射表”收敛为“例外项”
- [ ] 默认供应商不再要求用户频繁显式输入
- [ ] 现有 workflow 发布链路仍可工作
- [ ] 仍可对特殊包装名做人工补录
- [ ] 试点方案可复制到 lock / handle

## Suggested branch
- `feat/config-center-simplification-packaging`
