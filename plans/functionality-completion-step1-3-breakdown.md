# LumiOS Step 1-3 详细拆解（功能补全路线图执行版）

## Context

本拆解承接：
- `plans/functionality-completion-roadmap.md`

目标是把路线图中的前三个高价值基础能力拆成可执行的开发步骤：

1. **Step 1：服务端用户设置中心**
2. **Step 2：ToolMarketplace 真正控制后端工具执行**
3. **Step 3：自主任务系统生产化**

要求：
- 每个步骤都能独立作为一个或多个 PR 落地
- 先补“能力闭环”，再追求高级体验
- 尽量复用现有 routes / db / chat / tasks 架构

---

# 总体依赖关系

```text
Step 1 设置中心服务端化
   ↓
Step 2 工具/MCP 权限闭环
   ↓
Step 3 任务系统生产化
```

原因：
- Step 2 需要依赖用户级工具配置
- Step 3 最终也应读取用户设置（默认工具权限、默认模型等）

---

# Step 1：服务端用户设置中心（详细拆解）

## 目标
把当前散落在 localStorage 的关键用户设置上收为服务端持久化配置，成为 Chat / Tasks / Voice / Tools 的统一设置来源。

## 当前问题
证据：`src/pages/Profile.tsx`
- provider/model/enableMemory/enableTools 保存在 `localStorage('lumi_settings')`
- 后端 `server/chat/engine.ts`、`server/tasks/*` 不真正读取这套服务端用户配置
- 导致设置“看起来完整”，但很多只对当前浏览器有效

## 建议拆分为 3 个 PR

---

## PR 1.1：建立 user_settings 数据模型与 API

### 范围
只做后端，不改聊天逻辑。

### 新增/修改文件
- `server/db/connection.ts`
  - 新增表 `user_settings`
- `server/db/settings.ts`（新）
  - `getUserSettings(userId)`
  - `saveUserSettings(userId, partial)`
  - `getOrCreateUserSettings(userId)`
- `server/routes/settings.ts`（新）
  - `GET /api/settings`
  - `PUT /api/settings`
- `server/app.ts`
  - 注册 `/api/settings`
- `server/tests/settings.test.ts`（新）

### 建议表结构
```sql
user_id TEXT PRIMARY KEY
provider TEXT NOT NULL DEFAULT 'openai'
model TEXT
enable_memory INTEGER NOT NULL DEFAULT 1
enable_tools INTEGER NOT NULL DEFAULT 1
default_voice TEXT
default_persona_mode TEXT
notifications_json TEXT
updated_at TEXT NOT NULL
```

### 行为
- 用户首次访问 `/api/settings` 时自动创建默认记录
- `PUT /api/settings` 使用 Zod 做部分字段校验
- 返回统一 settings DTO

### 验证
- settings test 覆盖默认创建、更新、读取
- `npm run lint && npm test && npm run build`

### 风险
- 低

---

## PR 1.2：Profile 页面切换到服务端设置

### 范围
让 Profile 页从 localStorage 迁移到 `/api/settings`。

### 修改文件
- `src/pages/Profile.tsx`
- `src/lib/api.ts`（如需要补 helper）
- `src/types/settings.ts`（建议新增）

### 行为
- 页面加载时先拉取 `/api/settings`
- 改动后点击保存（或自动保存）写回服务端
- localStorage 只保留迁移兼容，不再作为主来源

### 兼容迁移策略
首次加载时：
1. 读服务端设置
2. 如果服务端是默认值，且本地 localStorage 有设置，则提示或自动迁移一次
3. 迁移后以后都以服务端为准

### 验证
- 登录后刷新仍保留设置
- 切浏览器/切设备能恢复设置（手工验证）

### 风险
- 中（前后端状态迁移）

---

## PR 1.3：Chat / Tasks / Voice 改读服务端设置

### 范围
把真正消费设置的系统切到服务端。

### 修改文件
- `server/chat/engine.ts`
- `server/routes/chat.ts`（如需默认参数策略）
- `server/tasks/planner.ts`
- `server/tasks/engine.ts`
- `server/routes/voice.ts`（如后续需要 voice default）
- `server/db/settings.ts`
- `server/tests/chat*.test.ts`、`server/tests/tasks*.test.ts`

### 关键逻辑
- Chat 默认 provider/model 从 user_settings 读取
- 如果前端显式传 provider/model，则前端参数优先
- `enableMemory` / `enableTools` 若前端未显式指定，则从服务端设置读取
- Tasks 规划 / reasoning / summarize 的 provider/model 也读取服务端默认值

### 验证
- 不传 provider/model 时能正确走用户默认设置
- 关闭工具后 chat/task 无法调工具
- 关闭记忆后 chat 不再检索记忆

### 风险
- 高（会影响核心聊天路径）

---

## Step 1 完成标准
- 用户关键设置已服务端化
- Profile 不再以 localStorage 为主
- Chat / Tasks / Voice 都能统一读取服务端设置

---

# Step 2：ToolMarketplace 真正控制后端工具执行（详细拆解）

## 目标
让 ToolMarketplace 成为真正的权限控制台，而不是只影响本地 UI。

## 当前问题
证据：
- `src/pages/ToolMarketplace.tsx` 的 `enabledTools` 只存在 localStorage
- `server/chat/engine.ts` 直接 `listTools()` + `listMCPTools()` 注入模型
- `server/tasks/engine.ts` 执行工具时不做用户级 whitelist 校验

## 建议拆分为 3 个 PR

---

## PR 2.1：建立用户工具偏好 / 权限表

### 新增/修改文件
- `server/db/connection.ts`
  - 新增 `user_tool_preferences`
- `server/db/tool-preferences.ts`（新）
- `server/routes/tools.ts`
  - 增加用户级偏好读取与保存
- `server/tests/tools-preferences.test.ts`（新）

### 建议表结构
```sql
id TEXT PRIMARY KEY
user_id TEXT NOT NULL
tool_name TEXT NOT NULL
enabled INTEGER NOT NULL DEFAULT 1
source TEXT NOT NULL DEFAULT 'user'
updated_at TEXT NOT NULL
UNIQUE(user_id, tool_name)
```

### API 设计
- `GET /api/tools/preferences`
- `PUT /api/tools/preferences`
  - body: `{ toolName, enabled }`

### 风险
- 低

---

## PR 2.2：Chat 工具注入改为按用户过滤

### 修改文件
- `server/chat/engine.ts`
- `server/routes/chat.ts`
- `server/db/tool-preferences.ts`
- `server/tests/app.test.ts` 或新增 `chat-tools-permissions.test.ts`

### 行为
- `listTools()` 后按用户偏好过滤
- `listMCPTools()` 后也按用户偏好过滤
- 未显式配置的工具默认启用，或默认只启用内置工具（二选一，需要产品决策）
- 前端 `enableTools=false` 时直接整体关闭

### 注意
需要定义工具名规范：
- built-in: `get_current_time`
- mcp: `serverName__toolName`

### 验证
- 关闭某个 built-in 工具后，模型上下文不再收到该工具 schema
- 关闭某个 MCP 工具后，不会出现在可调用列表中

### 风险
- 中高（影响 Chat 主流程）

---

## PR 2.3：Tasks 工具执行改为按用户权限校验

### 修改文件
- `server/tasks/engine.ts`
- `server/tasks/planner.ts`
- `server/routes/tasks.ts`
- `server/db/tool-preferences.ts`
- `server/tests/tasks-engine.test.ts`

### 行为
- 任务执行前校验步骤中 `tool_name` 是否对当前用户启用
- 若未启用：
  - 可直接 fail
  - 或标记为 skipped + 记录权限错误
- planner 也最好只基于用户可用工具规划 steps

### 验证
- 禁用工具后，任务中若规划到该工具，执行应失败并记录原因
- planner 不应优先规划用户禁用的工具

### 风险
- 高

---

## Step 2 完成标准
- ToolMarketplace 的启停对 Chat 和 Tasks 都真实生效
- MCP 工具与内置工具在权限模型中一致
- 用户能真正控制 AI 能调哪些工具

---

# Step 3：自主任务系统生产化（详细拆解）

## 目标
把当前任务系统从“可运行 demo”提升到“可靠执行系统”。

## 当前问题
证据：
- `server/tasks/scheduler.ts` 用进程内 `setInterval`
- `server/tasks/engine.ts` 是顺序 step runner
- 状态机较简单，无 retry / queue / waiting / checkpoint
- 无外部事件触发

## 建议拆分为 4 个 PR

---

## PR 3.1：任务状态机增强 + 执行日志完善

### 修改文件
- `server/tasks/types.ts`
- `server/tasks/db.ts`
- `server/tasks/engine.ts`
- `server/routes/tasks.ts`
- `server/tests/tasks-engine.test.ts`

### 增强点
- Task status 增加：`queued`, `retrying`, `waiting`
- Step status 增加更清晰的失败信息
- `task_executions` 增加更多字段：
  - `attempt`
  - `trigger_source`
  - `logs_json`（可选）

### 价值
先把“执行过程记录清楚”，为重试与调度升级打地基。

---

## PR 3.2：任务重试与失败恢复

### 修改文件
- `server/tasks/engine.ts`
- `server/tasks/db.ts`
- `server/routes/tasks.ts`
- `src/pages/Tasks.tsx`
- `server/tests/tasks-engine.test.ts`

### 行为
- 增加 per-task 或 per-step retry 次数
- 某步失败时：
  - 可自动 retry 1-3 次
  - 超过次数后进入 failed
- 前端可见 retrying 状态与错误原因

### UI 建议
- Tasks 页显示：
  - 最近执行 attempt
  - 当前失败 step
  - 手动重跑按钮

---

## PR 3.3：调度器可靠性增强

### 修改文件
- `server/tasks/scheduler.ts`
- `server/tasks/db.ts`
- `server/index.ts`
- `server/tests/tasks-scheduler.test.ts`

### 建议增强
- 记录 `next_run_at`
- 启动时恢复 pending/retrying 任务
- 避免简单 cron 全表扫描
- scheduler 更偏“查到期任务并执行”而不是“全量匹配 cron”

### 说明
这一步仍可保留 SQLite + 单进程，但要为后续换任务队列留接口。

---

## PR 3.4：事件触发器接口预留

### 修改文件
- `server/db/connection.ts`
- `server/tasks/types.ts`
- `server/routes/tasks.ts`
- `src/pages/Tasks.tsx`

### 新增能力
- trigger_type 扩展支持：
  - `manual`
  - `scheduled`
  - `chat`
  - `event`
- 对 `event` 先只做模型与 UI 预留：
  - webhook token
  - event name
- 暂不完全实现复杂事件总线，但定义未来接口

### 价值
让任务系统从“只能手动/定时”迈向“可自动化编排”。

---

## Step 3 完成标准
- 任务拥有更完整状态机
- 失败可自动重试或手动恢复
- 调度器不再只是最简 in-memory 轮询
- 已为事件触发任务打好模型基础

---

# 推荐实施顺序（最适合真实开发）

## 执行顺序
1. PR 1.1 → PR 1.2 → PR 1.3
2. PR 2.1 → PR 2.2 → PR 2.3
3. PR 3.1 → PR 3.2 → PR 3.3 → PR 3.4

## 并行建议
- `PR 1.2` 与 `PR 2.1` 可部分并行（前端设置页 vs 后端工具偏好表）
- `PR 3.1` 与 `PR 2.3` 不建议并行，因为都会改任务执行语义

---

# 最关键的第一波开发建议

如果你想最快看到“系统从 MVP 变成闭环产品”的变化，建议先做：

### 第一波（最高 ROI）
1. `PR 1.1 + PR 1.2 + PR 1.3`
2. `PR 2.1 + PR 2.2`

也就是先完成：
- 服务端设置中心
- Chat 真正按用户配置运行
- ToolMarketplace 真正影响后端工具列表

这是最关键的能力闭环。

---

# 每个 PR 的通用验证基线

```bash
npm run lint
npm test
npm run build
```

## 手动验收建议
- 登录后修改设置并刷新页面
- 切换 provider/model 后发起聊天
- 关闭某工具后验证 chat 无法调用
- 关闭 memory 后验证 chat 不再注入记忆
- 创建任务并验证工具权限生效

---

# Final Recommendation

你下一步最合理的实现起点是：

## **先做 PR 1.1：user_settings 表 + settings API**

因为它会成为：
- Profile 的真实配置来源
- Chat 的默认执行参数来源
- ToolMarketplace 权限体系的依赖
- Tasks 后续生产化的配置基础

如果你愿意，我下一步可以继续直接帮你：

## 产出《PR 1.1 实施计划》
我会把 PR 1.1 继续拆到：
- 表结构
- DTO/Zod schema
- API request/response shape
- 具体函数签名
- 测试用例清单

