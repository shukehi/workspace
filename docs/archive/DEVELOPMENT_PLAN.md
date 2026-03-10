# 库存管理模块开发计划

## 项目信息

**项目名称**：订单查询与库存管理系统 - 库存管理模块
**开发者**：个人开发
**开发周期**：3-4 周
**开始日期**：2024年12月29日
**技术栈**：Vue.js 3 (CDN) + Express.js + SQLite + Sequelize

---

## 项目目标

### 核心目标
1. 在现有订单查询系统基础上，添加库存管理功能
2. 实现商品的增删改查（CRUD）操作
3. 实时更新库存数量
4. 提供简单的库存统计功能

### 非目标（暂不实现）
- ❌ 用户认证和权限管理
- ❌ 复杂的库存预警系统
- ❌ 与订单系统的自动集成
- ❌ 移动端适配

---

## 功能需求

### 必须实现（MVP）

#### 1. 商品管理
- ✅ 商品列表展示（表格形式）
- ✅ 添加新商品
- ✅ 编辑商品信息
- ✅ 删除商品（带确认）
- ✅ 商品搜索/过滤

#### 2. 库存管理
- ✅ 库存数量显示
- ✅ 库存数量更新（入库/出库）
- ✅ 库存变动记录

#### 3. 用户界面
- ✅ 响应式设计（适配桌面浏览器）
- ✅ 与订单查询系统的导航切换
- ✅ 数据加载状态提示
- ✅ 操作成功/失败提示

### 可选扩展（V1.1+）
- 🔄 库存低位预警
- 🔄 数据导入导出（Excel）
- 🔄 库存统计图表
- 🔄 批量操作

---

## 开发阶段

## 第1周：环境准备和后端基础

### Day 1-2：项目重构
**目标**：创建清晰的后端结构

**任务清单：**
- [x] 创建技术选型文档
- [x] 创建开发计划文档
- [ ] 安装依赖包
- [ ] 创建后端目录结构
- [ ] 配置数据库连接

**详细步骤：**

1. **安装依赖**
```bash
cd /Users/aries/Dve/workspace
npm install sequelize sqlite3 cors body-parser
```

2. **创建目录结构**
```bash
mkdir -p server/{routes,controllers,services,models}
```

3. **创建数据库配置文件** `server/config/database.js`
```javascript
const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../data/runtime/database.sqlite'),
  logging: console.log, // 开发环境显示 SQL
});

module.exports = sequelize;
```

### Day 3-4：数据库设计和模型
**目标**：设计并创建数据库模型

**数据模型设计：**

#### 商品表 (Product)
| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | INTEGER | 主键 | PRIMARY KEY, AUTO_INCREMENT |
| code | STRING(50) | 商品编号 | UNIQUE, NOT NULL |
| name | STRING(100) | 商品名称 | NOT NULL |
| category | STRING(50) | 分类 | - |
| unit | STRING(20) | 单位（个/箱/件） | DEFAULT '个' |
| price | DECIMAL(10,2) | 单价 | - |
| quantity | INTEGER | 当前库存 | DEFAULT 0 |
| minStock | INTEGER | 最低库存预警 | DEFAULT 10 |
| description | TEXT | 描述 | - |
| createdAt | DATE | 创建时间 | AUTO |
| updatedAt | DATE | 更新时间 | AUTO |

#### 库存记录表 (InventoryRecord)
| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | INTEGER | 主键 | PRIMARY KEY, AUTO_INCREMENT |
| productId | INTEGER | 关联商品 | FOREIGN KEY |
| type | ENUM | 类型（IN/OUT/ADJUST） | NOT NULL |
| quantity | INTEGER | 数量（正负） | NOT NULL |
| beforeQty | INTEGER | 变动前库存 | - |
| afterQty | INTEGER | 变动后库存 | - |
| reason | STRING(100) | 原因/备注 | - |
| createdAt | DATE | 记录时间 | AUTO |

**任务清单：**
- [ ] 创建 `server/models/Product.js`
- [ ] 创建 `server/models/InventoryRecord.js`
- [ ] 创建模型关联关系
- [ ] 编写数据库初始化脚本
- [ ] 测试数据库连接

### Day 5-7：后端 API 开发
**目标**：开发完整的 REST API

**API 端点设计：**

#### 商品 API
| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | /api/products | 获取商品列表 | ?search=关键词 |
| GET | /api/products/:id | 获取单个商品 | - |
| POST | /api/products | 添加商品 | JSON Body |
| PUT | /api/products/:id | 更新商品 | JSON Body |
| DELETE | /api/products/:id | 删除商品 | - |

#### 库存 API
| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| POST | /api/inventory/in | 入库 | {productId, quantity, reason} |
| POST | /api/inventory/out | 出库 | {productId, quantity, reason} |
| GET | /api/inventory/records | 库存记录 | ?productId=ID |

**任务清单：**
- [ ] 创建路由文件 `server/routes/product.js`
- [ ] 创建控制器 `server/controllers/productController.js`
- [ ] 创建服务层 `server/services/productService.js`
- [ ] 实现所有 CRUD 操作
- [ ] 添加数据验证
- [ ] 添加错误处理
- [ ] 使用 Postman 测试所有 API

---

## 第2周：前端开发

### Day 8-9：页面结构和 Vue 集成
**目标**：创建库存管理页面基础结构

**任务清单：**
- [ ] 创建 `public/inventory.html`
- [ ] 引入 Vue.js CDN
- [ ] 创建基础布局（头部、搜索、表格、表单）
- [ ] 添加导航链接（订单查询 ↔ 库存管理）
- [ ] 复用现有 CSS 样式

**页面结构：**
```html
<!DOCTYPE html>
<html>
<head>
    <title>库存管理 - 订单查询系统</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/inventory.css">
</head>
<body>
    <div id="app">
        <!-- 导航栏 -->
        <nav>
            <a href="/">订单查询</a>
            <a href="/inventory.html" class="active">库存管理</a>
        </nav>

        <!-- 搜索和操作区 -->
        <div class="toolbar">
            <input v-model="searchQuery" placeholder="搜索商品...">
            <button @click="showAddModal">添加商品</button>
        </div>

        <!-- 商品列表 -->
        <table>
            <thead>
                <tr>
                    <th>商品编号</th>
                    <th>商品名称</th>
                    <th>分类</th>
                    <th>库存数量</th>
                    <th>单位</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="product in filteredProducts" :key="product.id">
                    <td>{{ product.code }}</td>
                    <td>{{ product.name }}</td>
                    <td>{{ product.category }}</td>
                    <td :class="{ 'low-stock': product.quantity < product.minStock }">
                        {{ product.quantity }}
                    </td>
                    <td>{{ product.unit }}</td>
                    <td>
                        <button @click="editProduct(product)">编辑</button>
                        <button @click="stockIn(product)">入库</button>
                        <button @click="stockOut(product)">出库</button>
                        <button @click="deleteProduct(product)">删除</button>
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- 添加/编辑模态框 -->
        <div v-if="showModal" class="modal">
            <!-- 表单内容 -->
        </div>
    </div>

    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="js/inventory.js"></script>
</body>
</html>
```

### Day 10-11：商品 CRUD 功能
**目标**：实现商品的增删改查

**任务清单：**
- [ ] 创建 `public/js/inventory.js`（Vue 应用）
- [ ] 实现商品列表加载
- [ ] 实现搜索过滤功能
- [ ] 实现添加商品表单
- [ ] 实现编辑商品表单
- [ ] 实现删除确认对话框
- [ ] 添加加载状态和错误处理

**Vue 应用示例：**
```javascript
const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    // 状态
    const products = ref([]);
    const searchQuery = ref('');
    const showModal = ref(false);
    const currentProduct = ref(null);
    const loading = ref(false);

    // 计算属性
    const filteredProducts = computed(() => {
      return products.value.filter(p =>
        p.name.includes(searchQuery.value) ||
        p.code.includes(searchQuery.value)
      );
    });

    // 方法
    const loadProducts = async () => {
      loading.value = true;
      try {
        const res = await fetch('/api/products');
        products.value = await res.json();
      } catch (error) {
        alert('加载商品失败：' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const addProduct = async (productData) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      if (res.ok) {
        await loadProducts();
        showModal.value = false;
      }
    };

    // 生命周期
    onMounted(() => {
      loadProducts();
    });

    return {
      products,
      searchQuery,
      filteredProducts,
      showModal,
      loadProducts,
      addProduct,
      // ... 其他方法
    };
  }
}).mount('#app');
```

### Day 12-14：库存操作和样式优化
**目标**：完成库存入库/出库功能和界面优化

**任务清单：**
- [ ] 实现入库功能（模态框）
- [ ] 实现出库功能（模态框）
- [ ] 创建 `public/css/inventory.css`
- [ ] 优化表格样式
- [ ] 优化表单样式
- [ ] 添加库存低位高亮显示
- [ ] 添加操作成功提示（Toast）

---

## 第3周：测试和优化

### Day 15-17：功能测试
**目标**：全面测试所有功能

**测试清单：**
- [ ] 商品添加功能测试
- [ ] 商品编辑功能测试
- [ ] 商品删除功能测试
- [ ] 商品搜索功能测试
- [ ] 入库功能测试
- [ ] 出库功能测试
- [ ] 库存数量正确性测试
- [ ] 错误处理测试（网络错误、数据验证）
- [ ] 浏览器兼容性测试

### Day 18-19：数据备份和文档
**目标**：完善数据备份和使用文档

**任务清单：**
- [ ] 创建数据库备份脚本
- [ ] 创建数据导出功能（可选）
- [ ] 更新 README.md
- [ ] 创建用户使用手册
- [ ] 添加代码注释

### Day 20-21：优化和收尾
**目标**：性能优化和最后调整

**任务清单：**
- [ ] 代码重构和优化
- [ ] 添加数据验证增强
- [ ] 优化用户体验（加载动画、错误提示）
- [ ] 性能测试（大量数据下的表现）
- [ ] 准备演示数据
- [ ] 项目总结文档

---

## 第4周：部署和扩展（可选）

### Day 22-24：部署准备
- [ ] 配置生产环境
- [ ] 数据库优化（索引）
- [ ] 错误日志记录
- [ ] 性能监控

### Day 25-28：Electron 集成（如需要）
- [ ] 安装 Electron
- [ ] 创建主进程文件
- [ ] 集成现有 Web 应用
- [ ] 打包桌面应用

---

## 技术要点

### 关键技术难点

#### 1. 库存数量的原子性更新
**问题**：并发入库/出库可能导致数量不一致

**解决方案**：
```javascript
// 使用事务确保原子性
const transaction = await sequelize.transaction();
try {
  const product = await Product.findByPk(id, { transaction });
  const beforeQty = product.quantity;
  product.quantity += quantity;
  await product.save({ transaction });

  await InventoryRecord.create({
    productId: id,
    type: 'IN',
    quantity,
    beforeQty,
    afterQty: product.quantity
  }, { transaction });

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

#### 2. 前端状态管理
**问题**：多个组件共享商品列表状态

**解决方案**：
- 使用 Vue 3 Composition API 的 `ref` 和 `computed`
- 保持状态在根组件，通过 props 传递

#### 3. 数据验证
**问题**：确保输入数据的有效性

**解决方案**：
```javascript
// 后端 Sequelize 模型验证
const Product = sequelize.define('Product', {
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
});
```

---

## 风险和对策

### 潜在风险

| 风险 | 影响 | 概率 | 对策 |
|------|------|------|------|
| 数据库文件损坏 | 高 | 低 | 定期备份，添加数据恢复功能 |
| Vue.js CDN 不可用 | 高 | 低 | 本地缓存 Vue.js 文件 |
| 库存数据不一致 | 高 | 中 | 使用事务，添加数据校验 |
| 学习曲线陡峭 | 中 | 中 | 阅读官方文档，逐步学习 |
| 时间不足 | 中 | 高 | 聚焦 MVP，砍掉非必要功能 |

### 应对策略
1. **MVP 优先** - 先实现核心功能，再添加扩展功能
2. **增量开发** - 每天完成小目标，持续验证
3. **及时备份** - 每天提交代码到 Git
4. **文档记录** - 记录学习笔记和问题解决方案

---

## 成功标准

### MVP 完成标准
- ✅ 所有商品 CRUD 功能正常工作
- ✅ 库存入库/出库功能正常
- ✅ 数据持久化到 SQLite
- ✅ 前端界面友好，无明显 bug
- ✅ 与订单查询系统集成（导航切换）

### 额外加分项
- 🌟 代码结构清晰，有注释
- 🌟 错误处理完善
- 🌟 有使用文档
- 🌟 数据备份功能
- 🌟 界面美观

---

## 下一步行动

**立即开始**：
1. 安装依赖包
2. 创建后端目录结构
3. 配置数据库连接

**本周完成**：
- 后端 API 全部开发完成
- 数据库模型创建并测试通过

---

## 附录

### 学习资源
- Vue.js 3 文档：https://cn.vuejs.org/guide/
- Sequelize 文档：https://www.sequelize.cn/
- Express.js 教程：https://www.expressjs.com.cn/

### 示例代码仓库
- (待添加项目 GitHub 链接)

---

**最后更新**：2024年12月29日
**文档版本**：v1.0
> 注：本文档为早期开发计划记录，当前实现以 `README.md` 和 `server/config/database.js` 为准。
