# 📦 订单管理系统 - 视觉设计与开发指南 (V2.0)

> 状态：历史设计方向文档。
> 本文档描述的是较早期的 “Terminal Aesthetic” 方案，不作为当前页面视觉实现的唯一依据。现行页面约束请优先参考 `docs/governance/STYLE_CONSTRAINTS_NEW_YORK.md`。

本指南旨在确保所有开发者在扩展系统功能时，能够保持一致的 **“技术极简主义 / 终端美学” (Terminal Aesthetic)** 风格。

---

## 📐 核心设计原则
1. **去装饰化 (Utilitarian)**：移除了所有不必要的阴影、圆角和渐变。
2. **数据感 (Data-Centric)**：信息密度高于视觉装饰，一切为了快速阅读和比对数据。
3. **高对比度 (High Contrast)**：以黑白灰为主，强调清晰的边界。

---

## 🎨 色彩规范 (Colors)
必须使用 `css/style.css` 中定义的变量：
- **背景/表面**：`--bg-color` (#FFFFFF), `--card-bg` (#FFFFFF)
- **文字**：`--text-primary` (#000000), `--text-secondary` (#4B5563)
- **边框**：`--border-color` (#000000) —— 所有容器必须有显式的黑色边框。
- **重点/动作**：`--accent-color` (#2563EB) —— 仅用于关键点击指引。

---

## 🔠 字法规范 (Typography)
- **技术数据 (必须)**：订单号、规格尺寸、数量、ID。
  - 使用字体：`var(--font-mono)` (IBM Plex Mono)
  - 理由：等宽字体能确保竖向对齐，便于尺寸比对。
- **一般叙述**：标题、说明文字、按钮文字。
  - 使用字体：`var(--font-sans)` (IBM Plex Sans / Inter)

---

## 🧱 组件开发规范

### 1. 形状与布局 (Layout)
- **摒弃卡片 (Anti-Card)**：严禁使用带阴影、带外边距的悬浮盒子（Cards）。
- **水平切片 (Slab/Slice)**：页面由全宽的水平板块组成，每个板块通过 `border-top: 2px solid #000` 分割。
- **技术网格 (Grid Matrix)**：信息展示应采用类似技术图纸的网格形式，使用实线分割单元格。

### 2. 标题条 (Section Headers)
- 标题不应悬浮，而是作为板块的“技术标签”。
- 建议风格：黑底白字、全大写、Mono 字体、贴合板块左上角。

### 3. 按钮 (Buttons)
- **风格**：全大写文字、加粗、直角。
- **交互**：悬浮时执行反色切换。

### 4. 表格 (Tables)
- **工业化**：表头加粗，单元格使用 1px 实线。
- **数据对齐**：金额和尺寸必须使用等宽字体并保持严格对齐。

---

## 🚫 样式禁忌 (Don'ts)
- ❌ **严禁使用 Emoji 图标** 作为导航或业务标识。
- ❌ **严禁使用 `border-radius > 0`**。
- ❌ **严禁使用各种形式的渐变色**。
- ❌ **严禁使用模糊的卡片阴影**。

---

## 💻 示例代码
新建一个标准化卡片：
```html
<div class="order-summary-card">
    <div class="card-header">
        <h2>标题文字</h2>
    </div>
    <div class="summary-grid">
        <div class="summary-item">
            <label>规格尺寸</label>
            <span>2050x960</span> <!-- 自动应用等宽字体 -->
        </div>
    </div>
</div>
```
