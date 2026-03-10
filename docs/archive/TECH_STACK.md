# 技术栈文档

> 注：本文档主要保留早期架构记录。当前运行结构、目录职责与数据库路径以 `README.md` 为准。

## 项目概述

**项目名称**：订单查询系统
**开发模式**：个人开发
**架构模式**：轻量级单页应用 + API 代理
**开发时间**：2024年12月 - 持续迭代

**当前版本**：v1.2.0（事件驱动架构重构完成）

---

## 技术选型原则

作为个人开发者，技术选型遵循以下原则：

1. **简单优先** - 选择学习曲线平缓的技术
2. **稳定第一** - 选择成熟稳定的技术栈
3. **文档完善** - 优先选择中文文档丰富的技术
4. **渐进式** - 支持逐步升级，避免推倒重来
5. **低维护** - 减少依赖，降低维护成本
6. **可扩展** - 架构支持未来功能模块扩展（✨ 新增）

---

## 核心技术栈

### 前端技术

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| **HTML5** | - | 页面结构 | 标准技术，无需学习 |
| **CSS3** | - | 样式设计 | 原生 CSS，无预处理器 |
| **JavaScript (ES6+)** | ES2020 | 业务逻辑 | 原生 JS，支持模块化 |

**前端架构特点：**
- ✅ 无构建工具（开发即生产）
- ✅ ES6 模块化（import/export）
- ✅ 组件化设计（search.js, orderDisplay.js 等）
- ✅ 响应式布局（移动端适配）
- ✨ **事件驱动架构**（EventBus 发布-订阅模式）
- ✨ **集中状态管理**（StateManager 观察者模式）
- ✨ **零全局变量污染**（完全模块化）

### 后端技术

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| **Node.js** | 18.x LTS | 运行环境 | 长期支持版本 |
| **Express.js** | ^4.18.2 | Web 框架 | 成熟稳定，中间件丰富 |
| **http-proxy-middleware** | ^2.0.6 | API 代理 | 转发请求到外部 ERP |

**后端架构特点：**
- ✅ 轻量级架构（主要用于代理和静态文件服务）
- ✅ API 代理模式（转发到外部系统）
- ✅ CORS 支持（跨域访问）
- ✅ 错误处理中间件

**数据库配置（当前已启用）：**
| 技术 | 版本 | 状态 | 说明 |
|------|------|------|------|
| **Sequelize** | ^6.x | 启用 | ORM 框架，当前用于采购与配置等本地数据 |
| **SQLite** | ^3.x | 启用 | 默认数据库位于 `data/runtime/database.sqlite` |

### 开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **Git** | 2.x | 版本控制 |
| **VS Code** | Latest | 代码编辑器 |
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
    "cors": "^2.8.5"
  }
}
```

**依赖说明：**

1. **express** - Web 服务器框架
   - 静态文件服务（/public 目录）
   - API 代理路由管理
   - 中间件支持

2. **http-proxy-middleware** - API 代理
   - 代理外部 ERP API 请求
   - CORS 处理
   - 路径重写

3. **sequelize** & **sqlite3** - 数据库相关
   - 当前已启用
   - 默认配置入口为 `server/config/database.js`
   - 默认数据库文件位于 `data/runtime/database.sqlite`

4. **cors** - 跨域资源共享
   - 允许前端跨域请求
   - 配置安全策略

### 开发依赖

暂无（保持简单，生产环境直接运行）

---

## 数据库设计

### 数据库状态：已启用

**当前数据库文件位置：**
```
/data/runtime/database.sqlite
/server/config/database.js
```

**为什么保留统一数据库配置？**

✅ **未来扩展** - 可能需要存储订单查询历史
✅ **用户数据** - 可能需要保存用户偏好设置
✅ **离线功能** - 可能需要本地缓存订单数据
✅ **统一入口** - 开发、测试、生产通过同一配置解析数据库位置

---

## 前端技术细节

### 模块化架构

**文件组织：**
```
public/
├── index.html              # 订单查询主页
├── css/
│   └── style.css          # 全局样式
├── js/
│   ├── main.js            # 应用入口
│   ├── api.js             # API 请求封装（超时+重试）
│   ├── config.js          # 配置管理
│   ├── utils.js           # 工具函数（验证+格式化）
│   ├── core/              # 核心架构 ✨ 新增
│   │   ├── eventBus.js           # 事件总线（发布-订阅）
│   │   └── state.js              # 状态管理（观察者模式）
│   └── components/        # 功能组件
│       ├── search.js              # 订单搜索
│       ├── orderDisplay.js        # 订单展示
│       ├── packagingTable.js      # 包装汇总
│       └── printPreview.js        # 打印预览
└── data/
    └── packaging-mapping.json     # 包装映射配置
```

### 前端架构模式

**✨ 事件驱动架构（V1.2.0 新增）：**

```javascript
// 1. 事件总线（EventBus）- 发布-订阅模式
import { eventBus } from './core/eventBus.js';

// 发布事件
eventBus.emit('order:loaded', orderData);

// 订阅事件
eventBus.on('order:loaded', (orderData) => {
    console.log('订单已加载:', orderData);
});

// 2. 状态管理（StateManager）- 观察者模式
import { appState } from './core/state.js';

// 更新状态
appState.setState({
    currentOrder: orderData,
    loading: false
});

// 订阅状态变化
appState.subscribe((state) => {
    if (state.currentOrder) {
        updateUI(state.currentOrder);
    }
});

// 3. 组件初始化示例
export function initOrderDisplay() {
    // 订阅事件
    eventBus.on('order:loaded', (order) => {
        renderOrder(order);
    });
}
```

**架构优势：**
- 🔌 **组件解耦** - 通过事件通信，无直接依赖
- 📦 **状态集中** - 单一数据源，便于调试
- 🧪 **易于测试** - 模块独立，可单独测试
- 🔄 **可扩展性** - 新增功能只需订阅事件
- 🚫 **零污染** - 无全局变量，命名空间清晰

---

## 后端架构设计

### 简化架构（V1.1.0）

```
项目根目录/
├── server.js               # Express 应用主文件
├── server/
│   └── db.js              # 数据库配置（保留）
├── public/                # 前端静态文件
└── data/                  # 配置文件
```

### API 设计规范

**当前 API 端点：**

| 方法 | 路径 | 功能 | 代理目标 |
|------|------|------|---------|
| GET | /api/getOutContractDetail | 查询订单详情 | http://47.98.198.45:8802 |

**响应格式：**

外部 ERP 系统返回的原始 JSON 数据，包含：
- 订单基本信息（客户名、订单号、交期等）
- 商品明细列表
- 包装信息
- 其他扩展字段

---

## 部署方案

### 开发环境

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 服务器运行在
http://localhost:3000
```

### 生产环境

**部署步骤：**
1. 克隆代码到服务器
2. 安装 Node.js 依赖：`npm install --production`
3. 使用 PM2 管理进程：`pm2 start server.js --name order-query`
4. 配置 Nginx 反向代理（可选）

**推荐配置：**
- Node.js 18.x LTS
- PM2 进程管理器
- Nginx 反向代理（HTTPS 支持）

---

## 技术演进路线

### 当前阶段（V1.2.0）
- ✅ 订单查询系统（单一功能）
- ✅ API 代理模式
- ✅ 无数据库依赖
- ✅ 轻量级部署
- ✨ **事件驱动架构**
- ✨ **集中状态管理**
- ✨ **增强 API 层（超时+重试）**

### 版本历史

**V1.2.0（2024-12-31）** - 架构重构
- ✨ 引入事件总线（EventBus）和状态管理（StateManager）
- ✨ 重构所有组件使用事件驱动架构
- ✨ 优化工具函数（数据验证、错误格式化）
- ✨ 增强 API 层（超时控制、自动重试）
- 🚫 移除全局变量污染
- 📚 完善技术文档和开发指南

**V1.1.0（2024-12-30）** - 功能简化
- 移除库存管理模块，专注订单查询
- 保留数据库配置以备未来扩展

**V1.0.0（2024-12-29）** - 初始版本
- 订单查询 + 库存管理双模块

### 未来升级（V2.0）
- 🔄 新增功能模块（库存管理/采购管理）
- 🔄 订单查询历史记录（启用数据库）
- 🔄 用户偏好设置存储
- 🔄 打印模板自定义
- 🔄 数据导出功能（Excel/PDF）

### 长期规划（V3.0）
- ⏭ 多用户权限管理
- ⏭ 订单数据统计分析
- ⏭ 移动端适配优化
- ⏭ 离线模式支持
- ⏭ PWA（渐进式 Web 应用）

---

## 版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2024-12-29 | 初始版本，订单查询 + 库存管理 |
| 1.1.0 | 2024-12-30 | 移除库存管理模块，保留数据库配置以备未来扩展 |
| 1.2.0 | 2024-12-31 | 事件驱动架构重构，增强 API 层，优化工具函数 |

---

## 参考资料

**Express.js：**
- 官方文档：https://expressjs.com/
- 中文文档：https://www.expressjs.com.cn/

**http-proxy-middleware：**
- GitHub：https://github.com/chimurai/http-proxy-middleware

**Sequelize（保留技术）：**
- 官方文档：https://sequelize.org/
- 中文文档：https://www.sequelize.cn/

**SQLite（保留技术）：**
- 官方文档：https://www.sqlite.org/docs.html
- 教程：https://www.runoob.com/sqlite/sqlite-tutorial.html
