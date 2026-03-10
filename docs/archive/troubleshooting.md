# 故障排除指南

## 问题 1: renderPackagingSummary is not defined ❌

### 错误信息
```
ReferenceError: renderPackagingSummary is not defined
    at workbench.js:197:9
```

### 原因
这是**浏览器缓存问题**。您的浏览器缓存了旧版本的 `workbench.js` 文件。

### 解决方案

#### 方法一：硬刷新（推荐）
- **Windows/Linux**: `Ctrl + Shift + R` 或 `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

#### 方法二：清除缓存
1. 打开浏览器开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

#### 方法三：禁用缓存（开发时推荐）
1. 打开开发者工具（F12）
2. 进入 Network 标签页
3. 勾选 "Disable cache"
4. 刷新页面

### 验证修复
刷新后，错误应该消失。如果仍然出现，请检查：
```bash
# 确认文件已更新
git log --oneline -1 public/js/pages/workbench.js
```

---

## 问题 2: PDF 导出 400 错误 ✅ 已修复

### 错误信息
```
Failed to load resource: the server responded with a status of 400 (Bad Request)
PDF export failed: Error: PDF 生成失败
```

### 原因
PDF 导出请求体缺少 `list` 字段，后端无法正确处理。

### 修复内容
已在 commit `3624fb0` 中修复：

**修改前：**
```javascript
body: JSON.stringify({
    poNumber: po.poNumber,
    category: po.category,
    order: po.order  // ❌ 缺少 list 字段
})
```

**修改后：**
```javascript
body: JSON.stringify({
    poNumber: po.poNumber,
    category: po.category,
    order: {
        customerName: po.order.customerName,
        code: po.order.code,
        orderDate: po.order.orderDate,
        advanceDate: po.order.advanceDate,
        remark: po.order.remark,
        list: po.items  // ✅ 添加了 list 字段
    }
})
```

### 验证修复
1. 清除浏览器缓存
2. 刷新页面
3. 生成采购单
4. 点击"PDF"按钮
5. 应该能成功下载 PDF 文件

---

## 完整测试流程

### 1. 准备工作
```bash
# 确保在正确的分支
git checkout feature/workbench-plan-c

# 拉取最新代码
git pull

# 确认最新提交
git log --oneline -3
```

### 2. 启动服务器
```bash
# 启动后端服务
npm start
```

### 3. 测试步骤
1. ✅ 打开 `http://localhost:3000/index-workbench.html`
2. ✅ **清除浏览器缓存**（重要！）
3. ✅ 输入订单号并点击 FETCH
4. ✅ 点击"生成采购订单"按钮
5. ✅ 选择"包装"类别
6. ✅ 点击"生成"
7. ✅ 切换到 ORDERS Tab
8. ✅ 点击"查看"按钮
9. ✅ 点击"打印"按钮
10. ✅ 点击"PDF"按钮（应该成功下载）

### 4. 预期结果
- ❌ 不应该出现 `renderPackagingSummary is not defined` 错误
- ✅ PDF 应该成功下载
- ✅ 所有功能正常工作

---

## 如果问题仍然存在

### 检查清单
- [ ] 已执行硬刷新（Ctrl+Shift+R）
- [ ] 已清除浏览器缓存
- [ ] 已确认在 `feature/workbench-plan-c` 分支
- [ ] 已拉取最新代码
- [ ] 后端服务正在运行

### 获取帮助
如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整错误信息
2. Network 标签页中的请求详情
3. Git 分支和最新 commit ID
