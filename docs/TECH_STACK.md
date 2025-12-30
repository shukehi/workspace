# 技术栈文档

## 项目概述

**项目名称**：订单查询与库存管理系统
**开发模式**：个人开发
**架构模式**：单体应用 + 职责分离
**开发时间**：2024年12月 - 持续迭代

---

## 技术选型原则

作为个人开发者，技术选型遵循以下原则：

1. **简单优先** - 选择学习曲线平缓的技术
2. **稳定第一** - 选择成熟稳定的技术栈
3. **文档完善** - 优先选择中文文档丰富的技术
4. **渐进式** - 支持逐步升级，避免推倒重来
5. **低维护** - 减少依赖，降低维护成本

---

## 核心技术栈

### 前端技术

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| **HTML5** | - | 页面结构 | 标准技术，无需学习 |
| **CSS3** | - | 样式设计 | 原生 CSS，无预处理器 |
| **JavaScript (ES6+)** | ES2020 | 业务逻辑 | 原生 JS，支持模块化 |
| **Vue.js 3** | 3.4+ (CDN) | 响应式框架 | 轻量级，渐进式，无需构建 |

**前端架构特点：**
- ✅ 无构建工具（开发即生产）
- ✅ CDN 引入 Vue.js（无需 npm 安装）
- ✅ ES6 模块化（import/export）
- ✅ 响应式数据管理（Vue 3 Composition API）

### 后端技术

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| **Node.js** | 18.x LTS | 运行环境 | 长期支持版本 |
| **Express.js** | ^4.18.2 | Web 框架 | 成熟稳定，中间件丰富 |
| **Sequelize** | ^6.35.0 | ORM 框架 | 支持多数据库，文档完善 |
| **SQLite** | ^3.45.0 | 数据库 | 零配置，单文件存储 |

**后端架构特点：**
- ✅ 分层架构（Routes → Controllers → Services → Models）
- ✅ RESTful API 设计
- ✅ 异步/等待模式（async/await）
- ✅ 错误处理中间件

### 开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **Git** | 2.x | 版本控制 |
| **VS Code** | Latest | 代码编辑器 |
| **Postman** | Latest | API 测试 |
| **Chrome DevTools** | - | 前端调试 |

---

## 依赖包详情

### 生产依赖（package.json）

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6",
    "sequelize": "^6.35.0",
    "sqlite3": "^5.1.7",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2"
  }
}
```

**依赖说明：**

1. **express** - Web 服务器框架
   - 静态文件服务
   - API 路由管理
   - 中间件支持

2. **http-proxy-middleware** - API 代理（现有）
   - 代理外部 API 请求
   - CORS 处理

3. **sequelize** - ORM 框架
   - 数据模型定义
   - 数据库迁移
   - 关系管理

4. **sqlite3** - SQLite 数据库驱动
   - 轻量级数据库
   - 单文件存储
   - 支持 SQL 完整功能

5. **cors** - 跨域资源共享
   - 允许前端跨域请求
   - 配置安全策略

6. **body-parser** - 请求体解析
   - 解析 JSON 请求
   - 解析表单数据

### 开发依赖

暂无（保持简单，生产环境直接运行）

---

## 数据库设计

### 数据库选择：SQLite

**为什么选择 SQLite？**

✅ **零配置** - 无需安装数据库服务
✅ **单文件** - 数据库就是一个文件，易于备份
✅ **足够性能** - 支持 10 万级数据，满足中小型应用
✅ **完整 SQL** - 支持事务、索引、外键
✅ **易迁移** - 将来可轻松迁移到 PostgreSQL/MySQL

**数据库文件位置：**
```
/data/database.sqlite
```

### 数据表设计（预览）

#### 1. 商品表 (products)
- 商品基本信息（名称、编号、分类等）

#### 2. 库存记录表 (inventory_records)
- 库存变动记录（入库、出库、盘点）

#### 3. 订单关联（未来扩展）
- 订单与库存的关联关系

---

## 前端技术细节

### Vue.js 使用方式

**引入方式：CDN**

```html
<!-- 开发环境 -->
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>

<!-- 生产环境 -->
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
```

**为什么选择 CDN 而不是构建工具？**

✅ **零配置** - 无需 Webpack/Vite
✅ **快速开发** - 改代码刷新即可
✅ **简单部署** - 复制文件即可
✅ **易于调试** - 源码可读
✅ **渐进式** - 可与原生 JS 共存

### 前端架构模式

```javascript
// 使用 Vue 3 Composition API
const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    // 响应式数据
    const items = ref([]);
    const searchQuery = ref('');

    // 计算属性
    const filteredItems = computed(() => {
      return items.value.filter(item =>
        item.name.includes(searchQuery.value)
      );
    });

    // 生命周期
    onMounted(async () => {
      const response = await fetch('/api/inventory');
      items.value = await response.json();
    });

    return { items, searchQuery, filteredItems };
  }
}).mount('#app');
```

---

## 后端架构设计

### 分层架构

```
server/
├── app.js              # Express 应用配置
├── db.js               # 数据库连接
├── routes/             # 路由层（URL 映射）
│   ├── inventory.js
│   └── order.js
├── controllers/        # 控制器层（请求处理）
│   └── inventoryController.js
├── services/          # 服务层（业务逻辑）
│   └── inventoryService.js
└── models/            # 模型层（数据结构）
    ├── Product.js
    └── InventoryRecord.js
```

### API 设计规范

**RESTful API 风格：**

| 方法 | 路径 | 功能 | 请求体 |
|------|------|------|--------|
| GET | /api/inventory | 获取库存列表 | - |
| GET | /api/inventory/:id | 获取单个商品 | - |
| POST | /api/inventory | 添加商品 | JSON |
| PUT | /api/inventory/:id | 更新商品 | JSON |
| DELETE | /api/inventory/:id | 删除商品 | - |

**响应格式统一：**

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**错误响应：**

```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

---

## 部署方案

### 开发环境

```bash
# 启动服务器
npm start

# 服务器自动运行在
http://localhost:3000
```

### 生产环境（未来）

**选项1：单机部署**
- 服务器上运行 Node.js
- 使用 PM2 进程管理
- Nginx 反向代理

**选项2：Electron 桌面应用**
- 打包成独立应用
- 无需服务器
- 跨平台支持

---

## 技术演进路线

### 当前阶段（V1.0）
- ✅ Vue.js CDN
- ✅ SQLite 数据库
- ✅ 无构建工具
- ✅ 单体应用

### 未来升级（V2.0）
- 🔄 Vite 构建工具
- 🔄 TypeScript 支持
- 🔄 PostgreSQL 数据库
- 🔄 Electron 桌面应用

### 长期规划（V3.0）
- ⏭ 前后端完全分离
- ⏭ 微服务架构
- ⏭ 移动端 APP

---

## 版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2024-12-29 | 初始版本，确定技术栈 |

---

## 参考资料

**Vue.js：**
- 官方文档：https://cn.vuejs.org/
- API 参考：https://cn.vuejs.org/api/

**Express.js：**
- 官方文档：https://expressjs.com/
- 中文文档：https://www.expressjs.com.cn/

**Sequelize：**
- 官方文档：https://sequelize.org/
- 中文文档：https://www.sequelize.cn/

**SQLite：**
- 官方文档：https://www.sqlite.org/docs.html
- 教程：https://www.runoob.com/sqlite/sqlite-tutorial.html
