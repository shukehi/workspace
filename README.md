# 订单查询系统

一个基于 Express.js 和原生 JavaScript 的订单查询与管理系统，采用事件驱动架构和模块化设计。

## 项目简介

本项目是一个轻量级的全栈 Web 应用，提供订单查询、库存管理、采购管理和统计分析等功能。后端作为 API 代理服务器，前端使用原生 JavaScript 实现了现代化的事件驱动架构。

## 功能特性

- **订单查询**：通过 ERP 系统代理查询订单详情
- **库存管理**：库存信息管理界面
- **采购管理**：采购流程管理
- **统计分析**：数据统计与分析展示
- **事件驱动架构**：前端采用 EventBus 实现组件解耦
- **状态管理**：集中式状态管理，支持观察者模式

## 技术栈

### 后端
- **Node.js** (v18+)
- **Express.js** (v4.18.2) - Web 框架
- **http-proxy-middleware** (v2.0.6) - API 代理
- **Sequelize** (v6.37.7) - ORM（预留）
- **SQLite3** (v5.1.7) - 数据库（预留）

### 前端
- **原生 JavaScript** (ES6+ 模块)
- **EventBus** - 事件总线（发布-订阅模式）
- **StateManager** - 状态管理（观察者模式）
- **组件化架构** - 模块化 UI 组件

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd workspace

# 安装依赖
npm install
```

### 配置

复制 `.env.example` 为 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
```

主要配置项：
- `PORT`: 服务器端口（默认 3000）
- `ERP_BASE_URL`: ERP 服务器地址
- `NODE_ENV`: 运行环境（development/production）

### 运行

```bash
# 启动开发服务器
npm start

# 服务器将运行在 http://localhost:3000
```

### 访问应用

- 订单查询：http://localhost:3000/
- 库存管理：http://localhost:3000/inventory.html
- 采购管理：http://localhost:3000/procurement.html
- 统计分析：http://localhost:3000/statistics.html

## 项目结构

```
workspace/
├── server/                  # 后端代码
│   ├── index.js            # 服务器主入口
│   ├── config/             # 配置管理
│   │   ├── index.js        # 配置聚合
│   │   └── env.js          # 环境变量配置
│   ├── routes/             # 路由层
│   │   ├── index.js        # 路由聚合
│   │   └── api.js          # API 路由
│   ├── services/           # 业务逻辑层
│   │   └── erpService.js   # ERP 服务
│   ├── models/             # 数据模型（预留）
│   └── db.js               # 数据库配置
├── public/                 # 前端静态文件
│   ├── js/                 # JavaScript 代码
│   │   ├── core/           # 核心架构
│   │   │   ├── eventBus.js    # 事件总线
│   │   │   └── state.js       # 状态管理
│   │   ├── components/     # UI 组件
│   │   │   ├── print/         # 打印相关组件
│   │   │   │   ├── printGenerator.js
│   │   │   │   └── printMerge.js
│   │   │   ├── navigation.js
│   │   │   ├── purchaseOrder.js
│   │   │   └── SmartSidebar.js
│   │   ├── pages/          # 页面控制器
│   │   │   └── workbench.js   # 采购工作台逻辑
│   │   ├── config/         # 配置模块
│   │   │   ├── index.js       # 配置入口
│   │   │   └── mergeRules.js  # 合并规则配置
│   │   ├── services/       # 服务层
│   │   │   └── api.js         # API 通信
│   │   ├── utils/          # 工具库
│   │   │   ├── dataExtractors.js
│   │   │   ├── formatters.js
│   │   │   ├── parsers.js
│   │   │   └── dom.js
│   │   └── main.js         # 应用入口
│   ├── css/                # 样式文件
│   │   ├── common.css      # 通用样式
│   │   ├── workbench.css   # 工作台样式
│   │   └── style.css       # 主样式
│   └── *.html              # HTML 页面
├── data/                   # 数据存储
│   └── database.sqlite     # SQLite 数据库
├── docs/                   # 文档
│   ├── DEVELOPMENT_GUIDE.md
│   ├── DEVELOPMENT_PLAN.md
│   ├── TECH_STACK.md
│   ├── GIT_GUIDE.md
│   └── api.md
├── .gitignore
├── package.json
└── README.md
```

## API 文档

### 订单查询 API

**端点**: `GET /api/getOutContractDetail`

**说明**: 代理到外部 ERP 系统查询订单详情

**请求参数**: 根据 ERP 系统要求

**响应**: JSON 格式的订单详情

详细 API 文档请参考 [docs/api.md](docs/api.md)

## 开发指南

### 代码规范

- 使用 ES6+ 语法
- 采用模块化设计
- 遵循单一职责原则
- 保持代码简洁清晰

### 前端架构

项目采用**事件驱动架构**：

1. **EventBus（事件总线）**
   - 实现发布-订阅模式
   - 组件间解耦通信
   - 统一事件管理

2. **StateManager（状态管理）**
   - 集中式状态存储
   - 观察者模式
   - 自动 UI 更新

3. **组件化设计**
   - 每个组件独立封装
   - 通过事件通信
   - 易于测试和维护

### 后端架构

采用 **MVC 分层架构**：

- **Routes（路由层）**: 处理 HTTP 请求路由
- **Services（服务层）**: 业务逻辑处理
- **Models（模型层）**: 数据模型定义（预留）
- **Config（配置层）**: 集中配置管理

详细开发指南请参考 [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)

## 版本历史

当前版本：**v1.2.0**

主要更新：
- 重构为 MVC 架构
- 优化目录结构
- 增强安全性配置
- 改进配置管理

详细技术栈演进请参考 [docs/TECH_STACK.md](docs/TECH_STACK.md)

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。

---

**更多文档**:
- [开发指南](docs/DEVELOPMENT_GUIDE.md)
- [开发计划](docs/DEVELOPMENT_PLAN.md)
- [技术栈](docs/TECH_STACK.md)
- [Git 工作流](docs/GIT_GUIDE.md)
- [设计规范](DESIGN_GUIDES.md)
