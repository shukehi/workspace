# 前后端协同 Git 开发规范指南

本文档旨在规范项目在**全栈单体代码库（Monorepo）**架构下的前后端分离协同开发流程。明确版本控制、分支管理、接口协商沟通以及代码提交的规范，以提高团队并行开发的效率与代码质量。

---

## 1. 核心协作理念：契约优先 (API First)

在前后端分离架构中，**禁止在没有接口契约的前提下直接并行开发或互相等待**。
任何需要前后端联调的新功能，必须先通过 Issue 定下接口文档（URL路径、请求参数、返回 JSON 格式）。
契约一旦制定，前端使用 Mock 数据开发 UI 逻辑，后端专注于接口实现与数据库业务。

---

## 2. 需求沟通与任务分配：基于 Issue 驱动

Issue 是 Git 系统（如 GitHub / GitLab / Gitee）提供的任务追踪方式，它不仅是代码之外的逻辑交流阵地，也是后续分支追踪的源头。

> 💡 注意：原生的 `git` 命令行程序本身是**没有**创建 Issue 功能的。Issue 属于 Git 托管平台的拓展业务。

### 方式一：使用官方命令行工具 (以 GitHub CLI `gh` 为例)

假如您的开发平台是 GitHub，推荐安装 `gh` CLI 工具。您可以在终端中直接使用命令创建 Issue 并指定模板：

```bash
# 进入交互式创建 Issue 模式
gh issue create

# 或者：使用纯命令静默创建，分配给后端的同事 (@backend_dev)
gh issue create --title "新增物料筛选接口" --body "需要 GET /api/materials 增加 keyword 参数" --assignee backend_dev --label "backend,enhancement"
```

### 方式二：团队最常用的可视化界面 (Web UI)
通常团队会在托管平台的 Web 界面新建 Issue：
1. 打开网页版仓库代码页，进入 `Issues` 面板。
2. 点击 `New Issue`。
3. 遵循约定的沟通模板填写**契约内容**：
   - 【描述】：前端界面哪里需要使用这个接口
   - 【请求体】：传入什么参数结构（类型与是否必填）
   - 【返回体】：预期下发给前端的完整 JSON 树状结构

---

## 3. 分支命名规范 (Branching)

一旦 Issue 确立（比如生成的 Issue 编号为 `#12`），前、后端人员应各自从主分支切出子分支进行开发。为了防止代码冲突，请严格遵循分支命令前缀规则：

```bash
# 格式规范：<动作前缀>/<issue编号>-<简短描述>

# 前端开发的正确切支姿势 (假设目前他在做仪表盘)：
git checkout -b feat/12-frontend-dashboard-ui

# 后端开发的正确切支姿势：
git checkout -b feat/12-backend-materials-api
```

常见分支动作前缀表：
*   `feat/`: 业务新需求或新功能 (`feature`)
*   `fix/`: 修复联调或测试出来的 Bug
*   `refactor/`: 不改变功能的前后台代码重构
*   `docs/`: 专属于 README 或是 API 文档的更新

---

## 4. 提交规范 (Commit Message Conventions)

无论是前端还是后端，代码提交必须言之有物。采用业界通用的 Angular 规范：

```bash
# 格式：<type>(<scope>): <subject>

# 前端正确示范：
git commit -m "feat(ui): 添加物料选择下拉框并使用mock数据渲染 (#12)"

# 后端正确示范：
git commit -m "feat(api): 实现按名称模糊搜索物料接口模型与路由 (#12)"
```

这样，如果别人想看前端的进度，只要搜 `(ui)` 或 `(view)` 前缀；如果看后端的进度，只需搜 `(api)` 前缀，一目了然。

---

## 5. 联调与合并流程 (Pull Request)

当后端完成接口、前端完成组件 Mock 测试后：

1. **推送各自的分支到远端**：
   ```bash
   git push origin feat/12-backend-materials-api
   ```
2. **在平台上发起合并请求 (PR / MR)**：
   提交 Pull Request 请求合意到 `main` (或 `develop`)。在 PR 的正文中，必须附带关闭关键词，例如 `Closes #12`。这样在代码合入主干后，该沟通 Issue 会自动关闭。
3. **代码 Review (互相审查)**：
   * 前端 review 后端：只需确保接口路径正确、返回的 JSON 严格遵循了当初 Issue 里的“契约”。
   * 后端 review 前端：只需确保没有往后台乱发送高频脏请求等。
4. **测试并合并**：
   通过审查后，即可 `Merge` 到主干主线。
5. **本地清理与联调**：
   前端在本地运行 `git pull` 拉取最新代码，把前端组件里临时写的 Mock JSON 对象删除，换成真实的 `axios` 异步请求接口，完成真实联调通信！

---

## 6. 其他后端规范约束禁忌

为了保证前后端的平滑协作，请务必让后端同事遵守以下准则：
- **永远返回 JSON**：不准在 Express 里的任何 API 路由(`server/routes/api.js`) 中使用 `res.render()` 或 `res.send(HTML)`。必须坚决使用 `res.json()`，哪怕只返回成功状态码。
- **状态码要标准**：成功应返回 2XX，前端验证失败应该返回标准 HTTP `400`，未登录鉴权使用 `401`/`403`，而不是无论什么错误都返回 `200` 再用一个自定义 code 值包裹错误。
- **数据库同步**：在全栈结构下，如果后端同事对 SQLite 的表结构（Schema）进行了增加字段操作，必须随从 PR 提交明确的建表 SQL / ORM Migration 脚本文件给前端。
