# Git 版本管理指南

## 当前提交记录

最新提交已创建：
```
commit 35620e9
refactor: 重构为 ES Modules 架构
```

## 常用 Git 命令

### 查看状态
```bash
git status              # 查看当前工作区状态
git log --oneline -10   # 查看最近 10 条提交记录
git diff                # 查看未暂存的修改
```

### 提交变更
```bash
git add .               # 添加所有修改到暂存区
git add <file>          # 添加指定文件
git commit -m "message" # 提交暂存区的修改
```

### 分支管理
```bash
git branch              # 查看所有分支
git branch <name>       # 创建新分支
git checkout <name>     # 切换分支
git checkout -b <name>  # 创建并切换到新分支
```

### 撤销操作
```bash
git restore <file>      # 撤销工作区的修改
git restore --staged <file>  # 取消暂存
git reset --soft HEAD~1 # 撤销上一次提交（保留修改）
```

## 推荐工作流

### 功能开发流程
1. 创建功能分支: `git checkout -b feature/new-feature`
2. 开发并提交: `git add . && git commit -m "feat: 添加新功能"`
3. 合并到主分支: `git checkout main && git merge feature/new-feature`
4. 删除功能分支: `git branch -d feature/new-feature`

### 提交信息规范 (Conventional Commits)

```
<type>: <subject>

<body>

<footer>
```

**常用 type:**
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构代码
- `docs`: 文档更新
- `style`: 代码格式调整
- `test`: 测试相关
- `chore`: 构建/工具配置

**示例:**
```bash
git commit -m "feat: 添加订单导出功能"
git commit -m "fix: 修复打印预览日期显示错误"
git commit -m "refactor: 优化包装汇总算法性能"
```

## 当前项目结构

```
workspace/
├── .git/                   # Git 仓库
├── js/                     # 模块化代码 (已提交)
├── index.html              # 主页面 (已修改并提交)
├── style.css               # 样式文件
├── packaging-mapping.json  # 配置文件
├── script.js.backup        # 原代码备份 (已提交)
└── server.js               # 开发服务器
```

## 下一步建议

### 1. 添加 .gitignore
创建 `.gitignore` 文件排除不必要的文件：
```
node_modules/
.DS_Store
*.log
.env
```

### 2. 创建开发分支
```bash
git checkout -b develop
```

### 3. 定期推送到远程仓库 (如果有)
```bash
git remote add origin <repository-url>
git push -u origin main
```
