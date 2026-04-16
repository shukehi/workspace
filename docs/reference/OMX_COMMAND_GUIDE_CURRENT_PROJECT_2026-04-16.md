# OMX 命令完整使用文档（当前项目）

> 适用仓库：`/Users/aries/Dve/workspace`
>
> 文档生成依据：当前本地安装的 `omx` CLI 帮助输出、当前仓库 `.omx/` 运行结构、当前仓库 `AGENTS.md` 约束。
>
> 当前版本：`oh-my-codex v0.12.6`
>
> 当前 setup scope：`user`（来自 `.omx/setup-scope.json`）

---

## 1. OMX 是什么

OMX（oh-my-codex）是 Codex CLI 之上的一层多代理编排与运行时增强工具。

在这个项目里，它主要承担几类事情：

1. **启动 Codex 会话并注入仓库级 AGENTS/运行时约束**
2. **提供规划/持久执行/团队协同运行时**，例如 `omx ralph`、`omx team`
3. **提供仓库辅助能力**，例如：
   - 会话检索：`omx session`
   - HUD：`omx hud`
   - 状态管理：`omx state`
   - notepad / project-memory / trace / wiki / code-intel CLI parity
4. **提供只读探索与 shell 辅助**
   - `omx explore`
   - `omx sparkshell`

当前仓库的 `AGENTS.md` 明确偏好：

- 简单只读仓库查找优先用 `omx explore`
- 噪声较大的只读 shell 任务优先用 `omx sparkshell`
- 团队级持久协同用 `omx team`
- 持续执行/单 owner 完成链路用 `omx ralph`

---

## 2. 当前项目里的 OMX 运行约定

### 2.1 仓库内的重要 OMX 目录

当前仓库下已存在：

- `.omx/state/`：模式状态、session 状态
- `.omx/logs/`：日志
- `.omx/plans/`：计划产物
- `.omx/context/`：上下文快照
- `.omx/notepad.md`：运行便签（按工具写入）
- `.omx/project-memory.json`：跨会话项目记忆
- `.omx/tmux-hook.json`：tmux hook 配置

### 2.2 当前仓库推荐的命令使用顺序

按这个项目的使用习惯，通常建议：

1. **进入仓库根目录**
   ```bash
   cd /Users/aries/Dve/workspace
   ```
2. **检查 OMX 是否正常**
   ```bash
   omx doctor
   omx status
   ```
3. **只读查结构时优先**
   ```bash
   omx explore --prompt "找出订单服务入口与调用链"
   ```
4. **需要持续执行时**
   ```bash
   omx ralph "修复库存相关失败测试"
   ```
5. **需要多人/多 worker 并行时**
   ```bash
   omx team 3:executor "修复 type-check:server 并归零失败测试"
   ```

---

## 3. 最常用命令速查表

| 场景 | 推荐命令 |
|---|---|
| 启动普通 OMX 会话 | `omx` |
| 启动高推理会话 | `omx --high` / `omx --xhigh` |
| 直接进入持久执行模式 | `omx ralph "任务"` |
| 启动团队并行执行 | `omx team 3:executor "任务"` |
| 只读代码探索 | `omx explore --prompt "问题"` |
| 运行只读 shell 辅助 | `omx sparkshell rg -n "OrderService" server` |
| 检查安装 | `omx doctor` |
| 清理残留进程/临时目录 | `omx cleanup` |
| 查看活跃模式 | `omx status` |
| 取消当前执行模式 | `omx cancel` |
| 查看/设置 reasoning | `omx reasoning` |
| 恢复上一会话 | `omx resume --last` |
| 搜历史 session | `omx session search "关键词"` |
| 查看 HUD | `omx hud --watch` |
| 读写状态 | `omx state ...` |
| 读写 notepad | `omx notepad ...` |
| 读写 project memory | `omx project-memory ...` |
| 查 trace | `omx trace ...` |
| 代码智能查询 | `omx code-intel ...` |
| 管 wiki | `omx wiki ...` |

---

## 4. 顶层启动命令

## 4.1 `omx`

### 作用
启动交互式 Codex CLI，并自动带上 OMX 运行时能力。

### 基本用法
```bash
omx
```

### 常见变体
```bash
omx --high
omx --xhigh
omx --tmux
omx --notify-temp
omx --discord
omx --slack
omx --telegram
omx --custom my-gateway
omx -w
omx --worktree=fix-inventory
```

### 当前仓库推荐示例
```bash
cd /Users/aries/Dve/workspace
omx --high
```

### 顶层常见选项
这些选项来自 `omx --help`，常用于 launcher：

- `--yolo`：启动 yolo 模式
- `--high`：高推理
- `--xhigh`：超高推理
- `--madmax`：危险模式，跳过审批与沙箱
- `--spark`：团队 worker 使用 spark 模型
- `--madmax-spark`：`--spark + --madmax`
- `--notify-temp`：临时启用通知路由
- `--tmux`：在 detached tmux 中启动 leader 会话
- `--discord` / `--slack` / `--telegram` / `--custom <name>`：临时通知通道
- `-w, --worktree[=<name>]`：在 git worktree 中启动
- `--force` / `--dry-run` / `--keep-config` / `--purge` / `--verbose`
- `--scope user|project`：主要用于 `omx setup`
- `--skill-target codex-home`：主要用于 `omx setup`

> 注意：不是所有子命令都支持这些 launcher 选项；它们主要出现在顶层/启动类命令帮助里。

---

## 5. 安装、健康检查与清理

## 5.1 `omx setup`

### 作用
安装 OMX 的 skills、prompts、MCP servers，以及 scope 对应的 `AGENTS.md` 能力。

### 用法
```bash
omx setup
omx setup --force
omx setup --scope user
omx setup --scope project
omx setup --dry-run
```

### 当前项目建议
当前仓库已经完成 OMX 运行时接入，平时**不需要频繁重跑**。只在以下场景使用：

- 重新安装/升级 OMX 后重新布置能力
- 想从 `user` scope 切换到 `project` scope
- 发现 skills/prompts/agents 注入异常

---

## 5.2 `omx doctor`

### 作用
检查安装健康状态。

### 用法
```bash
omx doctor
omx doctor --team
```

### 当前项目建议
进入仓库后第一步可执行：
```bash
omx doctor
omx status
```

---

## 5.3 `omx uninstall`

### 作用
移除 OMX 配置并清理安装产物。

### 用法
```bash
omx uninstall
omx uninstall --keep-config
omx uninstall --purge
```

### 说明
- `--keep-config`：卸载时保留配置
- `--purge`：同时清理 `.omx/` 缓存目录

> 当前项目通常不建议在仓库内随意执行，除非你明确在做 OMX 环境重置。

---

## 5.4 `omx cleanup`

### 作用
杀掉孤儿 OMX MCP server 进程，并删除陈旧的 OMX 临时目录。

### 用法
```bash
omx cleanup
omx cleanup --dry-run
```

### 推荐场景
- 之前的 Codex App / OMX 会话异常退出
- tmux / hook / MCP 残留
- 本机资源异常占用时

---

## 6. 会话与交互控制

## 6.1 `omx exec`

### 作用
非交互方式执行 Codex 任务。

### 用法
```bash
omx exec "生成库存模块评估报告"
omx exec -C /Users/aries/Dve/workspace "检查 server/services/orders 的问题"
omx exec --json "输出 JSON 结果"
```

### 主要参数
- `-c, --config <key=value>`：覆盖配置
- `--enable/--disable <FEATURE>`：开关特性
- `-i, --image <FILE>`：附图
- `-m, --model <MODEL>`：模型
- `--oss` / `--local-provider`：本地 provider
- `-s, --sandbox <mode>`：沙箱模式
- `-p, --profile <CONFIG_PROFILE>`：配置 profile
- `--full-auto`
- `--dangerously-bypass-approvals-and-sandbox`
- `-C, --cd <DIR>`
- `--skip-git-repo-check`
- `--add-dir <DIR>`
- `--ephemeral`
- `--output-schema <FILE>`
- `--json`
- `-o, --output-last-message <FILE>`

### 适合这个项目的例子
```bash
omx exec -C /Users/aries/Dve/workspace \
  "审查 src/views/Inventory.vue 与 useInventoryStore.ts 的边界问题"
```

---

## 6.2 `omx resume`

### 作用
恢复历史交互会话。

### 用法
```bash
omx resume
omx resume --last
omx resume <SESSION_ID>
omx resume --all
omx resume --include-non-interactive
```

### 主要参数
- `--last`：直接恢复最近会话
- `--all`：显示所有会话，不只当前 cwd
- `--include-non-interactive`：包含非交互 session
- `--remote <ADDR>`：连接远程 app server
- `-m, --model <MODEL>`
- `-s, --sandbox <mode>`
- `-a, --ask-for-approval <policy>`
- `--search`：启用 live web search
- `-C, --cd <DIR>`

### 当前项目示例
```bash
omx resume --last
```

---

## 6.3 `omx status`

### 作用
查看当前活跃模式与状态。

### 用法
```bash
omx status
```

### 当前项目典型输出
可看到：
- `notify-fallback`
- `notify-hook`
- `skill-active`
- `tmux-hook`

用于确认当前是否还有 OMX 运行时残留。

---

## 6.4 `omx cancel`

### 作用
取消活跃执行模式。

### 用法
```bash
omx cancel
```

### 推荐场景
- 中止当前 `ralph` / `team` / 其它运行时模式
- 清理错误进入的执行模式

---

## 6.5 `omx reasoning`

### 作用
查看或设置模型推理强度。

### 用法
```bash
omx reasoning
omx reasoning low
omx reasoning medium
omx reasoning high
omx reasoning xhigh
```

### 当前项目建议
- 日常仓库分析：`high`
- 简单查找：`low` / `medium`
- 高风险规划：`xhigh`

---

## 7. 规划、持久执行与团队执行

## 7.1 `omx ralph`

### 作用
以 Ralph persistence mode 启动 Codex，会在 `.omx/` 下保留 PRD / 进度等持久化产物。

### 用法
```bash
omx ralph "Fix flaky notify-hook tests"
omx ralph --prd "Ship release checklist automation"
omx ralph --model gpt-5 "Refactor state hydration"
omx ralph --no-deslop "修复库存相关失败测试"
```

### 参数
- `--prd <task text>`：PRD 模式快捷入口
- `--no-deslop`：跳过最终 ai-slop-cleaner pass

### 当前项目最适合的场景
- 长链路单 owner 任务
- 需要跨 session 保留上下文与进度
- 例如：
```bash
omx ralph "恢复 npm run type-check:server 绿灯并修复 2 个 failing tests"
```

---

## 7.2 `omx team`

### 作用
在 tmux 中拉起并行 worker，做持久团队协同。

### 用法
```bash
omx team 3:executor "fix failing tests"
omx team status <team-name>
omx team await <team-name>
omx team resume <team-name>
omx team shutdown <team-name>
omx team api <operation> --input '<json>' --json
```

### 具体语法
```bash
omx team [N:agent-type] "<task description>"
omx team status <team-name> [--json] [--tail-lines <100-1000>]
omx team await <team-name> [--timeout-ms <ms>] [--after-event-id <id>] [--json]
omx team resume <team-name>
omx team shutdown <team-name> [--force] [--confirm-issues]
omx team api <operation> [--input <json>] [--json]
```

### 说明
- 默认使用 dedicated worktrees
- `--worktree` 对 `omx team` 已 deprecated，只保留兼容意义
- 小规模同 session fanout 更适合用 Codex 原生 subagents；耐久协同才用 `omx team`

### 当前项目推荐示例
```bash
omx team 3:executor "
1. 修复 type-check:server
2. 修复 print E2E
3. 对齐 stale guard 测试
"
```

---

## 7.3 `omx autoresearch`

### 作用
启动 thin-supervisor autoresearch 流程，适用于“先访谈澄清，再沉淀 spec，再执行”的研究/规划型任务。

### 用法
```bash
omx autoresearch
omx autoresearch --topic "inventory consistency"
omx autoresearch init --topic "mapping migration"
omx autoresearch run <mission-dir>
omx autoresearch --resume <run-id>
```

### 主要行为
- 通过 deep-interview intake 生成 `.omx/specs` 产物
- 校验 `mission.md` / `sandbox.md`
- 记录 baseline / candidate / keep-discard-reset 结果
- 尽量优先 tmux split-pane 启动

### 当前项目适合的场景
- 大范围架构研究
- 数据库/映射迁移方案评估
- 需要正式 mission artifact 的调研任务

---

## 8. 只读探索与 shell 辅助

## 8.1 `omx explore`

### 作用
默认只读探索入口，必要时会自适应使用 sparkshell 后端。

### 当前仓库约束
这个仓库的 AGENTS 明确要求：

- 简单的文件/符号/关系查找，优先 `omx explore`
- 适合做 read-only repository lookup
- 不适合编辑、测试、MCP/Web、复杂 shell 组合

### 推荐写法
```bash
omx explore --prompt "找出采购单创建的后端调用链"
omx explore --prompt "Inventory 页面依赖了哪些 store 和 composable"
omx explore --prompt "mapping workflow 的发布入口在哪些文件"
```

### 适合的问题类型
- 某个功能入口在哪
- 某个符号/服务在哪里被调用
- 某个目录的职责边界是什么

### 不适合
- 修改代码
- 跑完整测试
- 需要复杂 `pipe` / `redirect` / 多段 shell

---

## 8.2 `omx sparkshell`

### 作用
运行原生 sparkshell sidecar，用于直接执行命令或总结 tmux pane 输出。

### 用法
```bash
omx sparkshell rg -n "OrderService" server
omx sparkshell find src -maxdepth 2 -type f
omx sparkshell --tmux-pane %12 --tail-lines 400
```

### 注意
- v1 不解释 shell 元字符；`|`、`>`、重定向等不会像普通 shell 那样工作
- tmux pane 模式需要显式 `--tmux-pane`

### 当前项目推荐场景
- 快速列文件
- 快速 grep
- 汇总某个 tmux pane 的日志输出

---

## 9. 会话检索与本地知识回放

## 9.1 `omx session`

### 作用
搜索历史本地 session 记录。

### 用法
```bash
omx session search <query> [options]
```

### 参数
- `--limit <n>`：最多返回条数，默认 10
- `--session <id>`：限制 session id 或片段
- `--since <spec>`：按时间过滤，如 `7d`、`24h`、`2026-03-10`
- `--project <scope>`：`current | all | <cwd-fragment>`
- `--context <n>`：片段上下文长度，默认 80
- `--case-sensitive`
- `--json`

### 示例
```bash
omx session search "OrderService" --project current --limit 5
omx session search "print document" --since 7d
```

### 当前项目典型用途
- 找之前关于某个订单 bug 的分析记录
- 找历史上某次架构讨论输出
- 回放此前某次 `ralph` / `team` 会话结论

---

## 10. Agent / AGENTS 初始化

## 10.1 `omx agents-init`

### 作用
为仓库或子目录引导轻量 AGENTS.md。

### 用法
```bash
omx agents-init
omx agents-init .
omx agents-init src/features/procurement
```

### 适合场景
- 新仓库首次接入 OMX
- 某个子目录需要更细粒度 agent guidance

---

## 10.2 `omx deepinit`

### 作用
`agents-init` 的别名。

### 用法
```bash
omx deepinit
omx deepinit src/features/inventory
```

---

## 10.3 `omx agents`

### 作用
管理 Codex 原生 agent TOML 文件。

### 用法
```bash
omx agents list
omx agents list --scope user
omx agents add <name>
omx agents edit <name>
omx agents remove <name>
```

### 语法
```bash
omx agents list [--scope user|project]
omx agents add <name> [--scope user|project] [--force]
omx agents edit <name> [--scope user|project]
omx agents remove <name> [--scope user|project] [--force]
```

### 说明
- 默认 list 会同时显示 project + user agents
- 当仓库设置了 project scope 时，`add` 默认 project；否则默认 user
- `remove` 默认会确认，除非 `--force`

---

## 11. Hook / HUD / tmux 辅助

## 11.1 `omx tmux-hook`

### 作用
管理 tmux prompt injection workaround。

### 用法
```bash
omx tmux-hook init
omx tmux-hook status
omx tmux-hook validate
omx tmux-hook test
```

### 子命令
- `init`：创建 `.omx/tmux-hook.json`
- `status`：查看配置和运行时状态摘要
- `validate`：验证配置与 tmux target reachability
- `test`：跑 synthetic notify-hook turn

---

## 11.2 `omx hooks`

### 作用
管理 hook plugins。

### 用法
```bash
omx hooks init
omx hooks status
omx hooks validate
omx hooks test
```

### 说明
- 会创建 `.omx/hooks/sample-plugin.mjs` scaffold
- 插件默认启用
- 可通过 `OMX_HOOK_PLUGINS=0` 禁用
- 这是 additive command，不会替代 `omx tmux-hook`

---

## 11.3 `omx hud`

### 作用
显示 HUD 状态栏。

### 用法
```bash
omx hud
omx hud --watch
omx hud --json
omx hud --preset=minimal
omx hud --preset=focused
omx hud --preset=full
omx hud --tmux
```

### 当前项目建议
日常观察推荐：
```bash
omx hud --watch
```

---

## 12. CLI parity：state / notepad / memory / trace / wiki / code-intel

这些命令本质上是把 MCP 工具暴露成 CLI，用于 shell 场景直接调用。

---

## 12.1 `omx state`

### 作用
读写/列出 OMX 模式状态。

### 用法
```bash
omx state <read|write|clear|list-active|get-status> [--input <json>] [--json]
```

### 示例
```bash
omx state read --input '{"mode":"ralph"}' --json
omx state write --input '{"mode":"ralph","active":true,"current_phase":"executing"}' --json
omx state clear --input '{"mode":"ralph","all_sessions":true}' --json
omx state list-active --json
omx state get-status --input '{"mode":"ralph"}' --json
```

### 当前项目用途
- 查 `.omx/state/` 是否有遗留模式
- 为自动化脚本读取/写入模式状态

---

## 12.2 `omx notepad`

### 作用
CLI 访问 notepad 工具。

### 可用工具
- `notepad_read`
- `notepad_write_priority`
- `notepad_write_working`
- `notepad_write_manual`
- `notepad_prune`
- `notepad_stats`

### 示例
```bash
omx notepad notepad_read --input '{}' --json
omx notepad notepad_write_working --input '{"content":"今天修复 print harness"}' --json
```

---

## 12.3 `omx project-memory`

### 作用
CLI 访问 project-memory 工具。

### 可用工具
- `project_memory_read`
- `project_memory_write`
- `project_memory_add_note`
- `project_memory_add_directive`

### 示例
```bash
omx project-memory project_memory_read --input '{}' --json
omx project-memory project_memory_add_note --input '{"category":"build","content":"server type-check 当前不绿"}' --json
```

---

## 12.4 `omx trace`

### 作用
查看 agent flow trace。

### 可用工具
- `trace_timeline`
- `trace_summary`

### 示例
```bash
omx trace trace_summary --input '{}' --json
omx trace trace_timeline --input '{"last":20}' --json
```

---

## 12.5 `omx code-intel`

### 作用
CLI 访问代码智能工具。

### 可用工具
- `lsp_diagnostics`
- `lsp_diagnostics_directory`
- `lsp_document_symbols`
- `lsp_workspace_symbols`
- `lsp_hover`
- `lsp_find_references`
- `lsp_servers`
- `ast_grep_search`
- `ast_grep_replace`

### 示例
```bash
omx code-intel lsp_diagnostics --input '{"file":"src/views/Inventory.vue"}' --json
omx code-intel lsp_workspace_symbols --input '{"file":"src/main.ts","query":"useInventoryStore"}' --json
omx code-intel ast_grep_search --input '{"language":"typescript","path":"server","pattern":"function $NAME($$$ARGS)"}' --json
```

### 当前项目非常实用的场景
- 查 `Inventory.vue` 的符号结构
- 查 `OrderService` 的引用
- 跑局部 TS/LSP 诊断

---

## 12.6 `omx wiki`

### 作用
CLI 访问 wiki 工具。

### 可用工具
- `wiki_ingest`
- `wiki_query`
- `wiki_lint`
- `wiki_add`
- `wiki_list`
- `wiki_read`
- `wiki_delete`
- `wiki_refresh`

### 示例
```bash
omx wiki wiki_list --input '{}' --json
omx wiki wiki_query --input '{"query":"inventory"}' --json
```

---

## 13. 本地 Provider / 外部助手

## 13.1 `omx ask`

### 作用
向本地 provider CLI 发问，并写出 artifact 输出。

### 用法
```bash
omx ask <claude|gemini> <question or task>
omx ask <claude|gemini> -p "<prompt>"
omx ask claude --print "<prompt>"
omx ask gemini --prompt "<prompt>"
omx ask <claude|gemini> --agent-prompt <role> "<prompt>"
```

### 示例
```bash
omx ask claude -p "帮我审查 Inventory 页面是否过重"
omx ask gemini --agent-prompt architect "评估 mapping workflow 是否适合继续数据库化"
```

---

## 14. 版本与帮助

## 14.1 `omx version`

### 作用
查看 OMX 版本。

### 示例
```bash
omx version
```

当前本机输出：

```text
oh-my-codex v0.12.6
Node.js v25.9.0
Platform: darwin arm64
```

---

## 14.2 `omx help`

### 作用
查看总帮助。

### 示例
```bash
omx help
```

---

## 15. 当前项目推荐命令模板

## 15.1 仓库结构/调用链探索
```bash
omx explore --prompt "找出 procurement 从页面到后端 service 的完整调用链"
omx explore --prompt "找出 formulas published-map 的前后端入口"
omx sparkshell rg -n "OrderService|order.service" server src
```

## 15.2 恢复质量门禁
```bash
omx ralph "恢复 npm run type-check:server 绿灯，并修复当前 failing tests"
```

## 15.3 团队并行修复
```bash
omx team 3:executor "
A. 修复 type-check:server alias/type drift
B. 修复 config-table guard 漂移
C. 修复 print E2E harness/runtime 问题
"
```

## 15.4 做架构调研
```bash
omx autoresearch --topic "inventory and mapping runtime boundaries"
```

## 15.5 查看当前状态与历史
```bash
omx status
omx hud --watch
omx session search "Inventory.vue" --project current
omx trace trace_summary --input '{}' --json
```

---

## 16. 常见注意事项

1. **`omx explore` 是只读探索，不是执行器**
   - 不适合改代码、跑复杂 shell、跑 MCP/web 任务

2. **`omx sparkshell` 不解释 shell 元字符**
   - `|`、`>`、复杂组合命令不要直接照搬 bash 心智

3. **`omx team` 适合耐久并行，不适合小 fanout**
   - 小型并行优先 Codex 原生 subagents

4. **`omx ralph` 更适合长任务与跨 session 持续推进**
   - 当前仓库 `.omx/` 已准备好承载这类状态

5. **当前仓库已经接入 OMX，不要无意义重复 `omx setup`**
   - 除非你在做重装/升级/切换 scope

6. **危险模式要非常慎用**
   - `--madmax` / `--dangerously-bypass-approvals-and-sandbox` 仅在你明确知道后果时使用

---

## 17. 一条最实用的结论

如果你只想在这个项目里高效使用 OMX，可以记住这套最小闭环：

```bash
cd /Users/aries/Dve/workspace
omx doctor
omx status
omx explore --prompt "先帮我定位问题入口"
omx ralph "再把这个问题持续修完"
```

如果任务天然可并行：

```bash
omx team 3:executor "按 3 条子任务并行处理"
```

---

## 18. 文档维护说明

这份文档是按当前本机 `omx v0.12.6` 的实际帮助输出整理的。后续如果 OMX 升级，建议至少重新核对以下命令：

- `omx --help`
- `omx team --help`
- `omx ralph --help`
- `omx autoresearch --help`
- `omx session`
- `omx state`
- `omx code-intel`
- `omx wiki`

