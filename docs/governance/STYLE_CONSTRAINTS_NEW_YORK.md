# New-York 风格约束（前端）

## 页面层禁止项
- 禁止手写 `border-2`, `border-black`, `rounded-none`, `shadow-[...]` 这类重描边/硬阴影样式。
- 禁止页面层对按钮输入框直接覆写品牌色方案（例如强制黑底白字）。
- 禁止使用全大写 + 强跟踪字距作为默认标题风格。

## 推荐用法
- 页面容器优先用 `bg-muted/20` + `Card` 组合。
- 操作区统一使用 `Button` variants（`default/outline/ghost/destructive`）。
- 列表页统一 `Card + Toolbar + DataTable + Pagination`。
- 文本颜色优先语义 token：`text-foreground` / `text-muted-foreground`。

## 替换映射
- `border-2 border-black` -> `border border-border`
- `rounded-none` -> `rounded-md` 或 `rounded-lg`
- `shadow-[...]` -> `shadow-sm` 或移除
- `bg-black text-white` -> `bg-primary text-primary-foreground`
- `text-slate-*` -> `text-foreground` / `text-muted-foreground`
- `bg-slate-*` -> `bg-background` / `bg-muted`

## 组件边界
- 页面层负责布局与组合。
- primitives (`src/components/ui/*`) 负责视觉规范。
- 新增视觉需求优先扩展组件 variant，不在业务页临时拼样式。
