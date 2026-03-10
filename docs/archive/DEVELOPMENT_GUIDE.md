# 开发指南

## 目录

1. [快速开始](#快速开始)
2. [架构概览](#架构概览)
3. [组件开发](#组件开发)
4. [事件总线使用](#事件总线使用)
5. [状态管理](#状态管理)
6. [API 调用](#api-调用)
7. [工具函数](#工具函数)
8. [代码规范](#代码规范)
9. [调试技巧](#调试技巧)
10. [常见问题](#常见问题)

---

## 快速开始

### 环境要求

- Node.js 18.x LTS
- 现代浏览器（支持 ES6+ 模块）

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 访问应用
open http://localhost:3000
```

### 项目结构

```
public/js/
├── core/               # 核心架构
│   ├── eventBus.js    # 事件总线
│   └── state.js       # 状态管理
├── components/         # 业务组件
│   ├── print/         # 打印模块
│   │   ├── printMerge.js
│   │   └── printGenerator.js
│   ├── purchaseOrder.js
│   └── SmartSidebar.js
├── pages/             # 页面逻辑
│   └── workbench.js   # 采购工作台
├── services/          # API 服务
│   └── api.js
├── utils/             # 工具函数
│   ├── dataExtractors.js
│   └── parsers.js
├── config/            # 配置管理
│   ├── index.js
│   └── mergeRules.js  # 合并规则
└── main.js            # 应用入口
```

---

## 架构概览

### 设计原则

本项目采用**事件驱动架构 + 集中状态管理**，遵循以下原则：

1. **组件解耦** - 组件通过事件通信，避免直接依赖
2. **单一数据源** - 所有状态集中在 `appState`
3. **零全局变量** - 使用 ES6 模块化，杜绝全局变量
4. **可测试性** - 每个模块独立，易于单元测试
5. **可扩展性** - 新增功能无需修改现有代码

### 通信流程

```
用户操作
  ↓
组件处理（search.js）
  ↓
API 请求（api.js）
  ↓
更新状态（appState.setState）
  ↓
触发事件（eventBus.emit）
  ↓
其他组件响应（eventBus.on）
  ↓
UI 更新
```

---

## 组件开发

### 组件模板

创建新组件时，遵循以下模板：

```javascript
/**
 * 组件名称
 * 功能描述
 *
 * ✨ 已重构：使用事件总线和状态管理
 */

import { eventBus } from '../core/eventBus.js';
import { appState } from '../core/state.js';

/**
 * 初始化组件
 */
export function initYourComponent() {
    // 1. 获取 DOM 元素
    const button = document.getElementById('yourButton');

    // 2. 绑定事件监听器
    button.addEventListener('click', handleClick);

    // 3. 订阅事件总线
    eventBus.on('some:event', handleEvent);

    // 4. 订阅状态变化
    appState.subscribe((state) => {
        if (state.yourData) {
            updateUI(state.yourData);
        }
    });

    console.log('✅ YourComponent 模块初始化完成');
}

/**
 * 处理点击事件
 */
function handleClick() {
    // 触发事件
    eventBus.emit('action:performed', { data: '...' });
}

/**
 * 处理事件
 * @param {Object} data - 事件数据
 */
function handleEvent(data) {
    console.log('接收到事件:', data);
}

/**
 * 更新 UI
 * @param {Object} data - 数据
 */
function updateUI(data) {
    // 渲染逻辑
}
```

### 注册组件

在 `main.js` 中注册新组件：

```javascript
import { initYourComponent } from './components/yourComponent.js';

document.addEventListener('DOMContentLoaded', async () => {
    // ... 其他初始化

    initYourComponent(); // 添加这行

    console.log('✅ 应用初始化完成');
});
```

---

## 事件总线使用

### 事件命名规范

使用 `模块:动作` 格式：

- `order:loaded` - 订单加载完成
- `order:updated` - 订单更新
- `order:deleted` - 订单删除
- `user:login` - 用户登录
- `error:occurred` - 错误发生

### 发布事件

```javascript
import { eventBus } from './core/eventBus.js';

// 简单事件
eventBus.emit('order:loaded', orderData);

// 复杂数据
eventBus.emit('action:completed', {
    type: 'update',
    data: {...},
    timestamp: new Date()
});
```

### 订阅事件

```javascript
// 持续订阅
eventBus.on('order:loaded', (orderData) => {
    console.log('订单已加载:', orderData);
});

// 一次性订阅
eventBus.once('init:complete', () => {
    console.log('初始化完成，只执行一次');
});

// 取消订阅
const unsubscribe = eventBus.on('some:event', handler);
unsubscribe(); // 手动取消
```

### 调试事件

```javascript
// 查看所有事件历史
console.log(eventBus.getHistory());

// 输出示例：
// [
//   { event: 'order:loaded', data: {...}, timestamp: '2024-12-31T...' },
//   { event: 'order:loaded', data: {...}, timestamp: '2024-12-31T...' }
// ]
```

---

## 状态管理

### 状态结构

```javascript
{
    // 订单相关
    currentOrder: null,      // 当前订单对象
    orderList: [],           // 订单列表

    // UI 状态
    loading: false,          // 加载中
    error: null,             // 错误信息

    // 用户信息（预留）
    user: null,

    // 打印预览
    mergeFlags: {}           // 合并标记
}
```

### 更新状态

```javascript
import { appState } from './core/state.js';

// 更新单个属性
appState.setState({ loading: true });

// 更新多个属性
appState.setState({
    currentOrder: orderData,
    loading: false,
    error: null
});

// 获取当前状态
const currentOrder = appState.get('currentOrder');
const fullState = appState.getState();
```

### 订阅状态变化

```javascript
// 订阅所有变化
appState.subscribe((state) => {
    console.log('状态已更新:', state);

    if (state.loading) {
        showLoadingSpinner();
    } else {
        hideLoadingSpinner();
    }

    if (state.error) {
        showError(state.error);
    }
});

// 取消订阅
const unsubscribe = appState.subscribe(listener);
unsubscribe();
```

### 调试状态

```javascript
// 查看状态历史
console.log(appState.getHistory());

// 回退到上一个状态（时间旅行）
appState.undo();

// 重置状态
appState.reset();
```

---

## API 调用

### 基本用法

```javascript
import { fetchOrderDetail } from './api.js';

try {
    const data = await fetchOrderDetail('202408120023');
    console.log('订单数据:', data);
} catch (error) {
    console.error('请求失败:', error);
}
```

### 自定义配置

```javascript
// 自定义超时时间
const data = await fetchOrderDetail('202408120023', {
    timeout: 5000  // 5秒超时
});

// 禁用重试
const data = await fetchOrderDetail('202408120023', {
    retry: false
});
```

### 添加新的 API 接口

```javascript
// api.js 中添加新方法
export async function fetchOrderList(params = {}) {
    const requestFn = async () => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/getOrderList?${queryString}`;

        console.log(`📡 API 请求: ${url}`);

        const response = await fetchWithTimeout(url);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ API 响应成功`);

        return data;
    };

    return fetchWithRetry(requestFn);
}
```

---

## 工具函数

### 数据验证

```javascript
import { validateOrderData, validateOrderCode } from './utils.js';

// 验证订单数据
const validation = validateOrderData(data);
if (!validation.valid) {
    console.error('数据验证失败:', validation.errors);
    return;
}

// 验证订单号格式
if (!validateOrderCode('202408120023')) {
    alert('订单号格式错误');
}
```

### 错误处理

```javascript
import { formatError } from './utils.js';

try {
    await fetchOrderDetail(code);
} catch (error) {
    // 格式化为用户友好的错误信息
    const message = formatError(error);
    alert(message); // "网络连接失败，请检查网络设置"
}
```

### 数据解析

```javascript
import { parseQuantityPair, parseQuantity } from './utils.js';

// 解析数量对
const qty = parseQuantityPair('3/3');
// { left: 3, right: 3 }

// 解析总数量
const total = parseQuantity('3/3');
// 6
```

### 包装名称映射

```javascript
import { mapPackagingName } from './utils.js';

const supplierName = mapPackagingName('内部名称');
// "供应商名称"
```

---

## 代码规范

### 命名约定

**变量和函数：**
- 使用驼峰命名：`orderData`, `fetchOrderDetail()`
- 布尔值使用 `is/has/should` 前缀：`isLoading`, `hasError`

**常量：**
- 使用大写字母和下划线：`API_CONFIG`, `MAX_RETRIES`

**组件初始化函数：**
- 使用 `init` 前缀：`initSearch()`, `initOrderDisplay()`

**事件名称：**
- 使用 `模块:动作` 格式：`order:loaded`, `user:login`

### 注释规范

```javascript
/**
 * 函数功能描述
 * @param {string} code - 参数描述
 * @param {Object} options - 可选参数
 * @param {number} options.timeout - 超时时间
 * @returns {Promise<Object>} 返回值描述
 */
export async function fetchOrderDetail(code, options = {}) {
    // 实现...
}
```

### 模块导入顺序

```javascript
// 1. 核心模块
import { eventBus } from '../core/eventBus.js';
import { appState } from '../core/state.js';

// 2. 工具函数
import { validateOrderData, formatError } from '../utils.js';

// 3. API 接口
import { fetchOrderDetail } from '../api.js';

// 4. 配置
import { PACKAGING_MAPPING } from '../config.js';
```

### 错误处理

```javascript
// ✅ 推荐：使用 try-catch 处理异步错误
try {
    const data = await fetchOrderDetail(code);
    // 处理数据
} catch (error) {
    console.error('查询错误:', error);
    const message = formatError(error);
    appState.setState({ error: message });
}

// ❌ 不推荐：不处理错误
const data = await fetchOrderDetail(code);
```

---

## 调试技巧

### 浏览器控制台

```javascript
// 查看事件历史
window.debugEvents = () => {
    return eventBus.getHistory();
};

// 查看状态历史
window.debugState = () => {
    return appState.getHistory();
};

// 查看当前状态
window.debugCurrentState = () => {
    return appState.getState();
};
```

在浏览器控制台中：
```javascript
debugEvents()    // 查看所有触发的事件
debugState()     // 查看状态变更历史
debugCurrentState()  // 查看当前状态
```

### 日志输出

应用已内置详细的日志输出：

```
🚀 开始初始化应用...
✅ 配置加载完成
✅ Search 模块初始化完成
✅ OrderDisplay 模块初始化完成
✅ PrintPreview 模块初始化完成
✅ 应用初始化完成 - 所有组件已就绪

📡 API 请求: /api/getOutContractDetail?code=202408120023
✅ API 响应成功: total=1
✅ 订单加载成功: 202408120023
📦 订单展示已更新: 202408120023
```

### 性能监控

```javascript
// 在 main.js 中添加性能监控
console.time('应用初始化');
// ... 初始化代码
console.timeEnd('应用初始化');
```

---

## 常见问题

### Q1: 如何添加新的功能模块（如库存管理）？

**A:** 遵循以下步骤：

1. **创建组件文件** `public/js/components/inventory.js`
2. **实现初始化函数** `export function initInventory()`
3. **订阅相关事件** 使用 `eventBus.on()`
4. **在 main.js 注册** 添加 `initInventory()`

示例：
```javascript
// inventory.js
export function initInventory() {
    eventBus.on('order:loaded', (order) => {
        checkInventory(order.items);
    });
}

// main.js
import { initInventory } from './components/inventory.js';
initInventory();
```

### Q2: 组件之间如何通信？

**A:** 使用事件总线：

```javascript
// 组件 A - 发布事件
eventBus.emit('data:updated', newData);

// 组件 B - 订阅事件
eventBus.on('data:updated', (data) => {
    handleUpdate(data);
});
```

### Q3: 如何处理表单输入验证？

**A:** 创建验证函数并在提交前调用：

```javascript
function validateForm(formData) {
    const errors = [];

    if (!formData.orderCode) {
        errors.push('订单号不能为空');
    }

    if (!validateOrderCode(formData.orderCode)) {
        errors.push('订单号格式错误');
    }

    return { valid: errors.length === 0, errors };
}

// 使用
const validation = validateForm(formData);
if (!validation.valid) {
    appState.setState({ error: validation.errors.join('；') });
    return;
}
```

### Q4: 如何调试网络请求问题？

**A:** 查看控制台日志和网络面板：

1. **控制台查看请求日志：**
   - 📡 API 请求: ... （请求发出）
   - ✅ API 响应成功 （请求成功）
   - ⚠️ 请求失败，重试中 （重试日志）

2. **Chrome DevTools -> Network 面板：**
   - 查看请求详情
   - 检查响应状态码
   - 查看响应数据

3. **模拟网络故障：**
   - DevTools -> Network -> Throttling -> Offline

### Q5: 如何优化性能？

**A:** 性能优化建议：

1. **事件订阅清理：** 组件销毁时取消订阅
2. **状态更新批量化：** 一次 `setState` 更新多个属性
3. **避免重复渲染：** 检查状态是否真正变化
4. **使用事件委托：** 减少事件监听器数量

```javascript
// ✅ 批量更新
appState.setState({
    currentOrder: data,
    loading: false,
    error: null
});

// ❌ 多次更新
appState.setState({ currentOrder: data });
appState.setState({ loading: false });
appState.setState({ error: null });
```

---

## 贡献指南

### 提交代码

1. 遵循代码规范
2. 添加必要的注释
3. 确保功能正常运行
4. 更新相关文档

### Git 提交规范

```
feat(模块): 功能描述
fix(模块): 修复描述
docs: 文档更新
refactor: 代码重构
perf: 性能优化
test: 测试相关
```

---

## 参考资料

- [JavaScript MDN 文档](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)
- [ES6 模块化](https://es6.ruanyifeng.com/#docs/module)
- [事件驱动编程](https://zh.wikipedia.org/wiki/事件驱动程序设计)
- [观察者模式](https://zh.wikipedia.org/wiki/观察者模式)

---

**文档版本：** v1.2.0
**最后更新：** 2024-12-31
**维护者：** Claude Code 🤖
