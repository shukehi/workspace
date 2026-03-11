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

## 紧凑模式 (Compact Mode)
对于数据密集型后台页（如采购管理、库存管理），允许使用紧凑模式以提升操作效率：
- **Padding:** 容器内边距可从 `p-8` 降至 `p-4` 或 `p-6`。
- **Gaps:** 组件间距可从 `gap-8/6` 降至 `gap-4`。
- **Card Padding:** `CardContent` 内边距可使用 `p-2.5` 或 `p-3`。
- **Typography:** 辅助性标签允许使用 `text-[10px]` 或 `text-[11px]`。
- **Filtering:** 优先采用内联标签布局 (Inline Label Layout) 以节省垂直空间。

## 组件边界
- 页面层负责布局与组合。
- primitives (`src/components/ui/*`) 负责视觉规范。
- 新增视觉需求优先扩展组件 variant，不在业务页临时拼样式。
