# LumiOS 功能补全路线图（对标完整 AI OS）

## Context

当前 LumiOS 已完成：
- Phase 2.1 Personality Engine
- Phase 2.2 Memory Enhancement
- Phase 2.3 RAG / Knowledge Graph
- Phase 2.4 Autonomous Task System
- 多轮 UI/UX 深化优化

项目现状是：**主模块骨架都在，但很多能力仍停留在 MVP / 基础可用 / 半闭环状态**。如果目标是接近“完整 AI OS / 原项目能力”，下一阶段不应继续优先做视觉层，而应转向**系统能力补全**。

本路线图目标：
1. 把当前“看起来完整但能力未闭环”的模块真正闭环
2. 优先补齐对系统价值最大的 P0 模块
3. 为后续长期演进建立稳定的数据、权限、任务与配置基础设施

---

## Goal

在不推翻现有代码结构的前提下，用 3 个层次（P0 / P1 / P2）完成 LumiOS 从 MVP 向“完整 AI OS”演进的功能补全：

- **P0：系统级闭环**
- **P1：产品级补强**
- **P2：高级能力与体验增强**

---

## Overall Strategy

### 优先原则

按收益和依赖关系，建议顺序如下：

1. **设置中心服务端化**
2. **工具/MCP 启停闭环 + 权限控制**
3. **任务系统生产化**
4. **Chat 主流程增强**
5. **账号与数据控制补全**
6. **运维 / 安全 / 可观察性**
7. **知识库 / RAG 深化**
8. **通知 / 实时产品化**

### 路线图分层

- **P0** = 影响系统真实性、稳定性、闭环能力
- **P1** = 影响长期可用性和产品化程度
- **P2** = 影响高级体验与差异化

---

## P0 路线（最高优先级）

## Step 1: 服务端用户设置中心

### Why
当前 provider/model/tool/memory 等关键设置存于 localStorage（见 `src/pages/Profile.tsx`），这意味着：
- 登录换设备后配置丢失
- 后端无法基于用户设置进行严格执行
- 很多“功能开关”只是前端展示，而非真正系统行为

### Scope
新增一套用户级配置系统：
- 默认 Provider / Model
- 启用记忆
- 启用工具
- 默认语音偏好
- 默认人格模式（预留）
- 通知偏好（预留）

### Files
- `server/db/connection.ts` — 新增 `user_settings` 表
- `server/db/settings.ts` — CRUD
- `server/routes/settings.ts` — `/api/settings`
- `server/app.ts` — 注册路由
- `src/pages/Profile.tsx` — 改为读写服务端
- `src/contexts/AuthContext.tsx` — 登录后同步 settings（可选）
- `server/chat/engine.ts` — 改为读取服务端 settings
- `server/routes/voice.ts` / `server/routes/tasks.ts` — 后续可逐步复用

### Exit criteria
- 用户设置不再依赖 localStorage 为主存储
- 新设备登录后可恢复设置
- chat / task / voice 可统一读取用户设置

### Verification
```bash
npm run lint
npm test
npm run build
```

### Priority
P0

---

## Step 2: ToolMarketplace 真正控制后端工具执行

### Why
当前 ToolMarketplace 的启用/停用只存在前端本地（`src/pages/ToolMarketplace.tsx`），并不会真正影响：
- `server/chat/engine.ts` 的工具列表
- `server/tasks/engine.ts` 的工具执行

这会导致 UI 与系统行为不一致。

### Scope
实现真正的工具权限闭环：
- 每用户工具启用配置持久化
- 聊天时只注入被允许的工具
- 任务执行时对工具调用做 whitelist 校验
- MCP 工具也纳入 whitelist

### Files
- `server/db/tool-preferences.ts`（新）
- `server/routes/tools.ts` — 增加启用/禁用配置接口
- `server/chat/engine.ts` — 根据用户配置过滤 built-in tools / MCP tools
- `server/tasks/engine.ts` — 工具执行前校验权限
- `src/pages/ToolMarketplace.tsx` — 改为真实服务端开关

### Exit criteria
- ToolMarketplace 的开关真正决定后端是否可调用工具
- Chat 与 Task 的工具权限一致
- MCP 工具与内置工具都受控

### Priority
P0

---

## Step 3: 自主任务系统生产化（从 step runner 升级）

### Why
当前任务系统已经可用，但本质仍是：
- LLM 规划步骤
- 顺序执行步骤
- 进程内 setInterval 调度

这更像 demo 级 runner，不像可靠任务系统。

### Scope
补齐最关键的生产能力：
- 任务重试策略
- 执行日志持久化
- 外部触发器预留（webhook / event）
- scheduler 可靠性增强
- 任务状态更细粒度（queued / retrying / waiting）
- 失败恢复机制

### Files
- `server/tasks/types.ts`
- `server/tasks/db.ts`
- `server/tasks/engine.ts`
- `server/tasks/scheduler.ts`
- `server/routes/tasks.ts`
- `src/pages/Tasks.tsx`
- `server/tests/tasks-*.test.ts`

### Exit criteria
- 任务支持重试与失败恢复
- 调度器不会只靠简单 in-memory 行为
- 任务详情页能看到更完整执行信息

### Priority
P0

---

## Step 4: Chat 主流程增强

### Why
Chat 是 AI OS 核心入口，但当前仍缺：
- 多轮工具 loop
- 消息重试/重发
- 更强上下文治理
- 多模态能力入口

### Scope
本阶段先做高 ROI 的增强：
- 工具调用从单轮升级为受限多轮 loop（例如最多 3 轮）
- 支持“重新生成最后回复”
- 增加会话摘要/长对话压缩
- 把 memory/tool/personality 引用展示得更清楚

### Files
- `server/chat/engine.ts`
- `server/routes/chat.ts`
- `server/db/messages.ts`
- `src/pages/Chat.tsx`
- `src/components/chat/*`

### Exit criteria
- Chat 能稳定进行多轮工具推理
- 长对话不会无限膨胀
- 前端具备基本重试和上下文感知

### Priority
P0

---

## Step 5: 账号与数据控制补全

### Why
当前只有导出，没有：
- 删除账号
- 清空我的数据
- 导入恢复
- token/session 管理

### Scope
- 删除账号
- 清空知识库 / 记忆 / 会话 / 任务
- 导入之前导出的 JSON
- 后续预留 refresh token/session revoke

### Files
- `server/routes/auth.ts`
- `server/db/*`（按域补删除/导入能力）
- `src/pages/Profile.tsx`

### Exit criteria
- 用户能真正控制自己的数据生命周期

### Priority
P0

---

## Step 6: 运维 / 安全 / 可观察性基础补齐

### Why
这是“从玩具到产品”的关键缺口。

### Scope
- 扩展 rate limit 到 auth/chat/tasks
- 改进 logger 为更结构化输出
- 收紧 CORS / Socket origin
- 增加基本审计日志（任务执行、工具调用、MCP server 配置变更）
- 统一错误码和追踪字段

### Files
- `server/lib/logger.ts`
- `server/lib/rateLimit.ts`
- `server/app.ts`
- `server/socket/index.ts`
- `server/routes/*`

### Exit criteria
- 核心入口都有保护
- 关键行为可追踪
- 运行行为更可观测

### Priority
P0

---

## P1 路线（产品化补强）

## Step 7: 知识库 / RAG 深化
- 自动 ingest pipeline
- 文件标签 / 分类
- 文档级引用定位
- 知识与记忆解耦
- 更真实的知识图谱

### Priority
P1

---

## Step 8: 记忆系统治理增强
- 记忆类型分层
- 用户确认/锁定/忽略
- 敏感记忆保护
- 冲突处理

### Priority
P1

---

## Step 9: 人格系统产品化
- persona profile 可编辑
- 场景人格模式
- 更强演化与说明
- 人格与语音/任务联动

### Priority
P1

---

## Step 10: 通知 / 实时产品化
- 通知页 socket 实时刷新
- 通知偏好
- 任务流式进度更细
- 浏览器通知能力（可选）

### Priority
P1

---

## Step 11: 前端设置中心统一化
- 把零散配置聚合到真正的 Settings Center
- 统一系统偏好、任务偏好、语音偏好、隐私偏好

### Priority
P1

---

## P2 路线（高级能力与差异化）

## Step 12: 语音实时双工升级
- VAD
- 打断
- 双工交互
- 语音 persona

### Priority
P2

---

## Step 13: Canvas 变成工作流工作台
- 节点拖拽
- 工作流保存
- agent graph
- 会话回放

### Priority
P2

---

## Step 14: 高级任务系统
- DAG / 依赖任务
- 多代理协作
- 任务模板
- 事件驱动自动化

### Priority
P2

---

## 建议的实施节奏

## Sprint A（最值得先做）
1. Step 1 用户设置中心
2. Step 2 工具权限闭环
3. Step 4 Chat 主流程增强（最小版）

## Sprint B
4. Step 3 任务系统生产化
5. Step 5 数据控制补全
6. Step 6 运维/安全/可观察性

## Sprint C
7. Step 7 知识库深化
8. Step 8 记忆治理增强
9. Step 10 通知实时产品化

## Sprint D
10. Step 9 人格产品化
11. Step 12 语音升级
12. Step 13 Canvas 工作台
13. Step 14 高级任务系统

---

## 最值得优先开始的第一件事

如果只能先做一个，我建议：

# **Step 1: 服务端用户设置中心**

原因：
- 这是后续几乎所有能力闭环的基础
- 能直接修复当前“页面配置看起来完整，但后端不真正受控”的问题
- 可以立刻联动 Chat / Tasks / Tools / Voice / Notifications

---

## Rollback Strategy

- 各步骤应按独立 PR 推进
- 先新增，不要直接替换旧逻辑
- 对于 localStorage 配置，采用“服务端优先，前端兼容回退”迁移策略
- 所有新表都应可独立回滚，不影响旧核心聊天能力

---

## Verification Baseline

每一步完成后至少验证：

```bash
npm run lint
npm test
npm run build
```

对高风险步骤（settings/chat/tasks）额外要求：
- 手动登录验证
- 聊天主流程 smoke test
- 工具调用 smoke test
- 任务执行 smoke test

---

## Final Recommendation

建议你下一步直接进入：

1. **Step 1: 服务端用户设置中心**
2. **Step 2: ToolMarketplace 真正控制后端执行**
3. **Step 4: Chat 主流程增强**

这是当前最能把项目从“好看的 MVP”推进为“能力真正闭环的 AI OS”的组合。
