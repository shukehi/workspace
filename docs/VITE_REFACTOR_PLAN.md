# Vite 重构方案 (Vite Refactoring Plan)

## 1. 目标与收益
本方案旨在将现有的 **No-Build (原生 ESM)** 项目架构平滑迁移到 **Vite + Vue SFC (单文件组件)** 架构。

### 收益
*   **开发体验**: 支持 `.vue` 单文件组件，逻辑与模版内聚，HMR (热更新) 极大提升开发效率。
*   **性能优化**: 生产环境代码压缩、Tree-shaking、资源哈希处理。
*   **未来扩展**: 易于引入 TypeScript、Sass/Less、PostCSS 等生态工具。

---

## 2. 架构变更对比

| 特性 | 当前架构 (Current) | 目标架构 (Vite) |
| :--- | :--- | :--- |
| **入口** | `public/index.html` (Script Tags) | `index.html` (Module Script) -> `src/main.js` |
| **组件** | HTML 字符串模版 (`<script type="text/x-template">`) + JS 文件 | `.vue` 文件 (Template + Script + Style) |
| **依赖** | 浏览器全局变量 (`Vue.computed`) | NPM 模块导入 (`import { computed } from 'vue'`) |
| **路由** | N/A (SPA via Dynamic Components) | N/A (保持现状，或引入 Vue Router) |
| **构建** | 无 (即时运行) | `npm run build` -> `dist/` |

---

## 3. 详细实施步骤

### 3.1 环境准备
在项目根目录下安装必要的开发依赖：

```bash
# 1. 初始化 package.json (如果尚未完成)
npm install

# 2. 安装 Vite 及 Vue 插件
npm install -D vite @vitejs/plugin-vue

# 3. 安装 Vue (替换 CDN 引用)
npm install vue
```

### 3.2 目录结构调整
建议采用标准的 Vite 目录结构：

```text
root/
├── public/                 # 静态资源 (原 public/data 移至此处)
│   └── data/               # 保持数据文件路径不变 -> /data/xxx.json
├── src/                    # 源代码
│   ├── assets/             # 原 public/css, public/assets
│   ├── components/         # 原 public/js/components-vue (转换为 .vue)
│   ├── config/             # 原 public/js/config
│   ├── store/              # 原 public/js/store
│   ├── utils/              # 原 public/js/utils
│   ├── App.vue             # 根组件 (原 WorkbenchApp.js)
│   └── main.js             # 入口文件 (原 workbench.js)
├── index.html              # 移至根目录，清理模版代码
└── vite.config.js          # Vite 配置文件
```

### 3.3 配置文件 (vite.config.js)
创建 `vite.config.js` 以配置 Vue 插件和开发服务器代理：

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 如果保留 Web Component (app-navigation)，需跳过解析
          isCustomElement: (tag) => tag.includes('app-')
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    // 代理 API 请求到后端 Express 服务器
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist', // 输出目录
    emptyOutDir: true
  }
})
```

### 3.4 代码迁移指南

#### 1. 迁移 `index.html`
*   将 `public/index.html` 移动到根目录。
*   **删除**所有 `<link rel="stylesheet">` (改为在 `main.js` 中 import)。
*   **删除**所有 `CDN` 引用 (`vue.global.js`)。
*   **删除**所有 `<script type="text/x-template">` 块 (迁移到 `.vue` 文件)。
*   **修改**入口脚本引用：
    ```html
    <!-- 之前 -->
    <script type="module" src="js/pages/workbench.js"></script>
    <!-- 之后 -->
    <script type="module" src="/src/main.js"></script>
    ```

#### 2. 组件迁移 (示例: SourceTab)
将 `public/js/components-vue/SourceTab.js` 和 `index.html` 中的 `#source-tab-template` 合并为 `src/components/SourceTab.vue`。

**SourceTab.vue:**
```vue
<template>
  <!-- 从 index.html 复制原来的 HTML 内容 -->
  <div class="hub-panel active">
     <!-- ... -->
  </div>
</template>

<script>
import { computed } from 'vue'; // 替换 const { computed } = Vue
import { useOrderStore } from '../store/orderStore.js';

export default {
  // name: 'SourceTab', // 可选
  props: ['orders'], // 根据需要定义 props
  emits: ['generate'],
  setup(props, { emit }) {
    // 原 setup 逻辑保持不变
    const store = useOrderStore();
    const items = computed(() => store.mergedItems.value);
    // ...
    return { items, ... };
  }
}
</script>

<style scoped>
/* 可选：将相关 CSS 移入此处 */
</style>
```

#### 3. Store 迁移
修改 `src/store/orderStore.js`：
*   **删除**: `const { reactive, computed, watch } = Vue;`
*   **添加**: `import { reactive, computed, watch } from 'vue';`

#### 4. 后端适配
修改 `server/config/index.js` 以适配生产环境构建：

```javascript
// server/config/index.js
// ...
static: {
    // 开发环境由 Vite 提供服务，生产环境指向 dist
    public: process.env.NODE_ENV === 'production' ? '../dist' : '../public'
}
```

---

## 4. 实施清单
- [ ] 备份当前代码 (Git Commit)。
- [ ] 安装 NPM 依赖 (`vite`, `vue`, `@vitejs/plugin-vue`)。
- [ ] 移动 `index.html` 到根目录。
- [ ] 创建 `src` 目录并移动 JS/CSS 文件。
- [ ] 配置 `vite.config.js`。
- [ ] **重构重点**: 将 10 个核心组件 (`ConfigPanel`, `OrdersTab`, `SourceTab` 等) 拆分为 `.vue` 文件。
- [ ] 更新 `orderStore.js` 和 `utils` 中的 Vue 引用方式。
- [ ] 验证 `dev` 模式下页面功能正常。
- [ ] 运行 `npm run build` 测试生产构建。

## 5. 常见问题 (FAQ)
*   **静态资源路径**: 代码中引用 `/data/foo.json` 是否需要改？
    *   不需要。Vite 将 `public` 目录作为根服务，`/data/foo.json` 依然有效。
*   **Web Component**: `app-navigation` 还能用吗？
    *   可以。在 `vite.config.js` 中配置 `isCustomElement` 即可避免 Vue 报警告。
