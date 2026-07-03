# Phase 2.4: Autonomous Task System（自主任务系统）

## Context

LumiOS 已完成 Phase 2.1-2.3：
- 2.1 Personality Engine：人格画像、情绪状态、基于对话的进化
- 2.2 Memory Enhancement：记忆提取、存储、关系图谱、记忆化身、整合
- 2.3 RAG & Knowledge Graph：知识库上传、分块、嵌入、实体图谱、语义检索

这些系统为 Lumi 提供了「了解用户」和「拥有知识」的能力。Phase 2.4 要让 Lumi 能够**主动替用户执行任务**：把用户的一句话目标分解为可执行的步骤，调用工具/MCP 逐步完成，并把结果反馈给用户。

## Goal

实现一个自主任务系统，支持：
1. 用户通过自然语言创建任务（目标 → 自动拆解步骤）
2. 任务步骤可调用内置工具、MCP 工具、LLM 推理
3. 任务可手动触发、聊天中触发、按计划周期触发
4. 实时展示任务状态和步骤执行日志
5. 任务完成/失败时通过通知中心提醒用户
6. 与现有人格、记忆、知识库上下文无缝集成

## Design

### 数据模型

新增 3 张表，沿用现有 SQLite 模式：

#### `tasks`
- `id TEXT PRIMARY KEY`
- `user_id TEXT NOT NULL` → FK users(id) ON DELETE CASCADE
- `title TEXT NOT NULL`
- `description TEXT`
- `status TEXT NOT NULL` CHECK(`pending` | `running` | `paused` | `completed` | `failed` | `cancelled`)
- `priority INTEGER NOT NULL DEFAULT 5` (1-10)
- `trigger_type TEXT NOT NULL` CHECK(`manual` | `scheduled` | `chat` | `event`)
- `schedule_cron TEXT` — 当 trigger_type = scheduled 时使用（标准 5 字段 cron）
- `context_json TEXT` — 创建时的记忆/知识/人格上下文摘要
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

#### `task_steps`
- `id TEXT PRIMARY KEY`
- `task_id TEXT NOT NULL` → FK tasks(id) ON DELETE CASCADE
- `step_index INTEGER NOT NULL`
- `description TEXT NOT NULL`
- `tool_name TEXT` — 可选，为空表示纯 LLM 推理/总结步骤
- `tool_args_json TEXT` — 工具参数
- `status TEXT NOT NULL` CHECK(`pending` | `running` | `completed` | `failed` | `skipped`)
- `result_json TEXT` — 步骤结果
- `error TEXT` — 失败原因
- `started_at TEXT`
- `completed_at TEXT`

#### `task_executions`
- `id TEXT PRIMARY KEY`
- `task_id TEXT NOT NULL` → FK tasks(id) ON DELETE CASCADE
- `status TEXT NOT NULL` CHECK(`running` | `completed` | `failed` | `cancelled`)
- `result_summary TEXT` — 执行结果摘要
- `error_message TEXT`
- `started_at TEXT NOT NULL`
- `completed_at TEXT`

索引：
- `idx_tasks_user` on tasks(user_id)
- `idx_tasks_status` on tasks(user_id, status)
- `idx_task_steps_task` on task_steps(task_id)
- `idx_task_executions_task` on task_executions(task_id)

### 架构分层

```
server/tasks/
  ├── types.ts          # Task / TaskStep / TaskExecution 类型
  ├── db.ts             # 任务相关数据库操作
  ├── planner.ts        # 用 LLM 把目标拆解为步骤
  ├── engine.ts         # 任务执行引擎（顺序执行步骤、错误处理、重试）
  └── scheduler.ts      # 周期任务调度器（cron 解析 + setInterval）
server/routes/tasks.ts  # REST API
server/socket/tasks.ts  # 实时状态推送
src/pages/Tasks.tsx     # 任务列表与详情
src/components/tasks/   # TaskList, TaskDetail, TaskCreateDialog, TaskExecutionLog
server/tests/tasks.test.ts
```

### 执行流程

1. **创建任务**
   - 用户输入目标 → 前端 POST `/api/tasks`
   - planner 调用 `completeLLM`，结合人格/记忆/知识上下文生成步骤数组
   - 每个步骤包含：description、tool_name（可选）、tool_args（可选）
   - 保存 task + task_steps，返回任务摘要

2. **执行任务**
   - POST `/api/tasks/:id/run` 或调度器触发
   - engine 锁定任务状态为 running，创建 task_execution
   - 遍历 task_steps：
     - 若 tool_name 存在，按 chat engine 模式调用 `executeTool` → 失败则尝试 `executeMCPTool`
     - 若 tool_name 为空，调用 LLM 进行推理/总结，结果写入 result_json
     - 每步完成后通过 Socket.IO 推送 `task:step_update`
   - 全部完成 → task 状态 completed，生成结果摘要
   - 任一步失败 → 根据策略暂停或失败，记录错误
   - 创建通知：task_completed / task_failed

3. **调度任务**
   - scheduler 每分钟扫描一次 `trigger_type = 'scheduled'` 且 status != 'running' 的任务
   - 解析 cron，匹配当前时间则调用 `executeTask`
   - 调度器在 `server/index.ts` 启动后初始化

4. **聊天触发**
   - chat engine 的工具列表中新增 `create_task` 工具
   - LLM 可在合适时调用该工具创建任务，并告知用户「我稍后会帮你完成」
   - 任务完成后通过通知 + socket 提醒

### 与现有系统集成

- **人格**：planner 使用 `buildPersonalityContext` 调整任务风格和优先级判断
- **记忆**：planner 使用 `buildMemoryContext` 获取用户偏好和过往相关任务
- **知识库**：planner 可检索知识库片段辅助步骤设计
- **工具/MCP**：复用 chat engine 的 `executeTool` / `executeMCPTool` 调用链
- **通知**：复用 `createNotification` + `emitNotification`
- **Socket**：新增 `server/socket/tasks.ts`，复用 `getIO()`

### API 设计

```
GET    /api/tasks              → 列表（支持 ?status= &limit=）
POST   /api/tasks              → 创建（body: {title?, goal, triggerType?, scheduleCron?}）
GET    /api/tasks/:id          → 详情（含 steps + latest execution）
POST   /api/tasks/:id/run      → 立即执行
POST   /api/tasks/:id/pause    → 暂停
POST   /api/tasks/:id/resume   → 恢复
POST   /api/tasks/:id/cancel   → 取消当前执行
DELETE /api/tasks/:id          → 删除
GET    /api/tasks/:id/executions → 执行历史
```

响应格式沿用现有 `{success, data, error}` 约定。

### 前端页面

- `/tasks`：任务列表页
  - 顶部「新建任务」按钮 + 对话框
  - 任务卡片：标题、状态 badge、下次运行时间、运行按钮
  - 点击展开任务详情：步骤列表 + 最近一次执行日志
- 新增 Socket 事件监听：任务状态/步骤更新时刷新列表
- 侧边栏导航增加「任务」入口

### 安全与边界

- 所有路由使用 `requireAuth`
- 任务操作仅允许任务所有者
- 工具参数需通过 Zod 校验（与 chat 一致）
- 调度器限制并发执行数，防止资源耗尽
- 失败步骤默认不重试（保持简单），后续可扩展
- 周期任务最小间隔 1 分钟，防止滥用

## Implementation Steps

### Step 1: Database schema & types
**Files:**
- `server/db/connection.ts` — 添加 tasks / task_steps / task_executions 表
- `server/tasks/types.ts` — 定义类型
- `server/tasks/db.ts` — CRUD 函数

**Exit criteria:**
- `npm run lint` passes
- Vitest 测试能连接数据库并创建任务/步骤/执行记录

### Step 2: Task planner
**Files:**
- `server/tasks/planner.ts` — `planTask(userId, goal)`

**Exit criteria:**
- 给定用户目标，返回结构化的步骤数组
- 集成人格/记忆上下文
- 单测覆盖常见目标拆解

### Step 3: Task execution engine
**Files:**
- `server/tasks/engine.ts` — `executeTask(taskId)`

**Exit criteria:**
- 可顺序执行内置工具步骤
- 失败时正确标记状态和错误
- 单测覆盖成功/失败/跳过路径

### Step 4: Scheduler
**Files:**
- `server/tasks/scheduler.ts` — `startScheduler()` / `stopScheduler()`
- `server/index.ts` — 启动/关闭钩子

**Exit criteria:**
- 每分钟检查周期任务
- 到达触发时间自动执行
- 单测覆盖 cron 匹配逻辑

### Step 5: REST API routes
**Files:**
- `server/routes/tasks.ts`
- `server/app.ts` — 注册 `/api/tasks`

**Exit criteria:**
- 所有端点可用并通过 supertest 测试
- Zod 校验输入

### Step 6: Socket.IO integration
**Files:**
- `server/socket/tasks.ts` — `emitTaskUpdate`, `emitTaskStepUpdate`
- `server/socket/index.ts` — 注册 room 监听

**Exit criteria:**
- 任务状态/步骤更新时前端收到事件

### Step 7: Frontend
**Files:**
- `src/pages/Tasks.tsx`
- `src/components/tasks/TaskList.tsx`
- `src/components/tasks/TaskDetail.tsx`
- `src/components/tasks/TaskCreateDialog.tsx`
- `src/components/tasks/TaskExecutionLog.tsx`
- `src/App.tsx` — 添加 `/tasks` 路由
- `src/components/layout/AppSidebar.tsx` 或 AppLayout — 添加导航入口

**Exit criteria:**
- 页面可创建、查看、运行、删除任务
- 状态变化实时反映
- `npm run build:client` 通过

### Step 8: Chat integration
**Files:**
- `server/tools/built-ins/createTask.ts` — 注册 `create_task` 工具
- `server/chat/engine.ts` — 工具列表自动包含

**Exit criteria:**
- LLM 可在对话中创建任务
- 单测覆盖 chat 触发任务

### Step 9: Tests & verification
**Files:**
- `server/tests/tasks.test.ts`
- `server/tests/tasks-scheduler.test.ts`

**Exit criteria:**
- 新增测试全部通过
- 整体 `npm test` 通过
- `npm run build` 通过

## Verification Commands

```bash
npm run lint
npm test
npm run build
```

## Rollback Strategy

- 所有变更新增文件为主，回滚时可：
  1. 从 `server/app.ts` 移除 `/api/tasks` 路由注册
  2. 从 `server/index.ts` 移除调度器启动
  3. 删除 `server/tasks/`、`server/routes/tasks.ts`、`server/socket/tasks.ts`、前端 `Tasks` 相关文件
  4. 数据库表保留不影响现有功能（独立表 + ON DELETE CASCADE）

## Out of Scope

- 复杂工作流（并行步骤、条件分支、循环）
- 分布式任务队列（当前使用内存调度器）
- 任务编辑时重新规划步骤（创建后只可更新标题/调度/暂停）
- 多用户共享任务

## Dependencies

无新增生产依赖。复用：
- `zod`（校验）
- `socket.io`（实时推送）
- `cron-parser` style parsing via lightweight inline helper（不引入新包，先支持标准 cron 子集）
- 现有 LLM router / tool registry / MCP tools
