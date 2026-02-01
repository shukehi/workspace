# Vite + Shadcn-vue 重构方案 (Premium Design)

该方案采用 **Vite + Vue 3 + Tailwind CSS + Shadcn-vue** 的技术栈，旨在构建一个高性能、高颜值且完全可控的采购与库存管理系统。

## 1. 技术栈概览

| 模块 | 技术选型 | 理由 |
| :--- | :--- | :--- |
| **构建/开发** | **Vite** | 极速冷启动与热更新 (HMR)。 |
| **核心框架** | **Vue 3** (Script Setup) | Composition API 更适合复杂业务逻辑复用。 |
| **UI 基础** | **Shadcn-vue** | 极简、现代的代码所有权模式，基于 Radix Vue 保证无障碍。 |
| **样式引擎** | **Tailwind CSS** | 原子化 CSS，配合 Shadcn 实现极致定制。 |
| **表格核心** | **TanStack Table** | "无头"表格逻辑库，处理排序、筛选、分页等复杂需求。 |
| **表单验证** | **Zod + Vee-Validate** | 类型安全的 Schema 验证。 |

---

## 2. 目录结构设计

```text
root/
├── public/                 # 静态资源
├── src/
│   ├── assets/             # 全局样式 (Tailwind)
│   ├── components/
│   │   ├── ui/             # [Shadcn] 原子组件 (Button, Input...)
│   │   ├── data-table/     # [核心] 二次封装的表格组件
│   │   └── business/       # 业务组件
│   ├── lib/
│   │   └── utils.js        # Shadcn 工具
│   ├── layout/             # 布局组件
│   ├── App.vue             # 根组件
│   └── main.js             # 入口
├── index.html
├── vite.config.mjs         # Vite 配置 (ESM)
└── tailwind.config.js      # Tailwind 配置
```

---

## 3. 实施步骤

## 3. 详细实施步骤 (Step-by-Step Guide)

### 阶段 0: 准备工作 (Pre-check)
- [ ] **备份代码**: 提交所有未提交的更改至 Git。
- [ ] **清理环境**: 确保根目录整洁，了解现有 `server/` 目录结构。
- [ ] **字体准备**: 确认 `IBM Plex Mono` 和 `IBM Plex Sans` 的引入方式 (将在 `index.html` 中通过 Google Fonts 引入)。

### 阶段 1: 环境与基础设施搭建 (Infrastucture)
**目标**: 建立 **Vite + TypeScript** 开发环境，并配置 Tailwind 以符合 "Terminal Aesthetic" 设计规范。

### 阶段 1: 环境与基础设施搭建 (Infrastucture)
**目标**: 建立 **Vite + TypeScript** 开发环境，并配置 Tailwind 以符合 "Terminal Aesthetic" 设计规范。

1.  **安装核心依赖 (含 TypeScript & Pinia)**:
    ```bash
    npm install -D vite @vitejs/plugin-vue vue typescript vue-tsc tailwindcss postcss autoprefixer
    npm install pinia axios
    npx tailwindcss init -p
    ```
2.  **初始化 TypeScript 配置**:
    (保持 `tsconfig.json` 配置不变)

3.  **配置 Tailwind (设计核心)**:
    (保持 `tailwind.config.js` 配置不变，确保直角风格)

4.  **配置 Vite (TypeScript)**:
    (保持 `vite.config.ts` 配置不变)

5.  **初始化入口文件**:
    *   创建 `src/main.ts`: 引入 `createPinia()` 并挂载。
    *   创建 `src/App.vue` (`<script setup lang="ts">`)。
    *   `index.html` 引用修改为 `/src/main.ts`。

### 阶段 2: UI 系统构建 (UI System)
**目标**: 安装 Shadcn (TS版) 并魔改为“工业风”。

1.  **初始化 Shadcn**:
    *   `TypeScript`: **Yes**
    *   `Style`: Default (Slate)
    *   `CSS Variables`: Yes
2.  **样式覆盖 (Global CSS)**:
    `src/assets/index.css` 配置保持不变 (直角变量)。
3.  **安装基础组件**:
    ```bash
    npx shadcn-vue@latest add button input table sheet dialog form select card separator
    ```

### 阶段 2.5: 数据与类型层搭建 (Data & Types)
**目标**: 构建强类型的数据交互层。

1.  **类型定义**:
    创建 `src/types/` 目录，建立核心领域模型：
    *   `src/types/order.ts`: 定义 `interface Order`, `interface OrderItem`。
    *   `src/types/inventory.ts`: 定义 `interface InventoryItem`。
2.  **API 封装**:
    创建 `src/lib/api.ts` (基于 Axios)，配置拦截器处理后端错误，并定义泛型响应结构 `ApiResponse<T>`。
3.  **状态管理**:
    创建 `src/stores/` 目录：
    *   `useOrderStore.ts`: 管理采购单状态。
    *   `useInventoryStore.ts`: 管理库存缓存。

### 阶段 3: 核心功能组件封装 (Core Components)

1.  **DataTable (泛型组件)**:
    创建 `src/components/data-table/DataTable.vue`。
    *   **TypeScript 重点**: 组件需接收泛型 `TData`，确保传入 `data` 和 `columns` 类型一致。
        ```ts
        // 示例 Props 定义
        interface Props<TData, TValue> {
          columns: ColumnDef<TData, TValue>[]
          data: TData[]
        }
        ```
    *   **样式**: 强制应用 `border-black` 网格线。
2.  **AppLayout (布局)**:
    创建 `src/layout/MainLayout.vue`。
    *   侧边栏: (桌面端) 固定宽度的侧边栏; (移动端) 使用 `Sheet` 组件触发的侧滑菜单。

### 阶段 4: 业务模块迁移 (Migration)

**迁移策略**: 定义 Type -> 封装已有的 API -> 重写组件。

1.  **试运行 (Pilot): 颜色配方模块 (Color Formula)**
    *   定义 `interface ColorFormula`。
    *   创建 `src/api/formula.ts`。
    *   使用 `DataTable<ColorFormula>` 重构列表。
2.  **核心迁移: 采购与库存 (Procurement & Inventory)**
    *   定义 Zod Schema (`schemas/order.js`) 与 TS 类型同步。
    *   使用 Shadcn Form 重写录入表单，绑定 `useOrderStore`。
    *   使用 DataTable 展示千万级库存数据，实现服务端分页接口对接。

### 阶段 5: 构建与部署 (Build)
1.  运行 `npm run build` 生成 `dist/` 目录。
2.  修改 `server/index.js`，在生产环境 (`NODE_ENV=production`) 下指向 `dist/` 静态资源。

---

## 4. 关键配置 (vite.config.mjs)

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 适配现有后端
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
```
