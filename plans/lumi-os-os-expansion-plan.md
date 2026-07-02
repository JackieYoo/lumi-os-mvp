# LumiOS MVP：向 AI 操作系统演进（多页面扩展计划）

## Context

当前 MVP 仅包含登录页和聊天页，功能集中在单一会话流上。用户希望扩展多个系统级页面，让产品更像一个「个人 AI 操作系统」：记忆可管理、工具可配置、个人数据可控、未来可接入语音/知识库/可视化。

## Goal

在保持现有核心聊天能力稳定的前提下：
1. 引入客户端路由，把单页聊天应用升级为多页面应用
2. 建立统一的侧边栏导航和页面布局
3. 先完成高价值、低风险的页面：记忆管理、个人中心、工具/MCP 市场
4. 为后续 Canvas、语音、知识库、3D 记忆树预留扩展接口

## Recommended Approach

### 1. 引入 `react-router-dom`

当前 `App.tsx` 用条件渲染切换 Login/Chat。新增 7+ 页面后，应引入 `react-router-dom`（v6）：
- URL 可反映当前页面，支持刷新后保持位置
- 便于权限守卫、懒加载、嵌套布局
- 与 React 19 + Vite 兼容

新增依赖：
```bash
npm install react-router-dom
```

### 2. 路由与页面规划

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | `Login` | 公开路由 |
| `/chat` | `Chat` | 默认首页，含会话历史 |
| `/chat/:sessionId` | `Chat` | 打开指定会话 |
| `/memories` | `MemoryManagement` | 查看/搜索/编辑/删除记忆 |
| `/tools` | `ToolMarketplace` | 内置工具开关 + MCP 服务器管理 |
| `/profile` | `Profile` | 修改密码、用量、导出数据 |
| `/voice` | `VoiceChat` | 语音输入/输出（第二阶段） |
| `/knowledge` | `KnowledgeBase` | 知识库/RAG（第二阶段） |
| `/canvas` | `Canvas` | 对话可视化（第二阶段） |
| `/memories/tree` | `MemoryTree3D` | 3D 记忆树（第二阶段） |

### 3. 第一阶段范围（推荐）

先做 **记忆管理页、个人中心、工具/MCP 市场**，原因：
- 记忆层 DB 函数已完整，只需补路由和前端
- 工具注册中心已存在，MCP 可先做配置 UI
- 认证体系完整，个人中心可自然扩展
- 这三个页面为后续 Canvas/3D Tree 建立布局、路由、API 基础设施

### 4. 关键文件变更

#### 前端
- `src/App.tsx` — 改造为 Router 配置 + 权限守卫
- `src/components/layout/AppLayout.tsx` — 侧边栏 + 主内容区
- `src/components/layout/AppSidebar.tsx` — 全局导航 + 会话历史
- `src/pages/MemoryManagement.tsx` — 记忆管理页
- `src/pages/Profile.tsx` — 个人中心（替代当前 Settings 弹窗）
- `src/pages/ToolMarketplace.tsx` — 工具/MCP 市场
- `src/lib/api.ts` — 扩展记忆、工具、MCP、用户相关 API 调用

#### 后端
- `server/routes/memories.ts` — 记忆 CRUD 路由
- `server/db/memories.ts` — 新增 `updateMemoryContent` 函数
- `server/routes/tools.ts` — 内置工具列表路由
- `server/routes/mcp.ts` — MCP 服务器配置路由
- `server/routes/auth.ts` — 扩展修改密码、导出数据、用量统计

### 5. 设计要点

- **侧边栏**：全局导航在上，会话历史在下（仅在 `/chat` 下展开）
- **Settings 弹窗升级**：当前 Settings 的模型选择等功能迁移到 `Profile` 页面，顶部栏保留「快速设置」入口
- **工具开关状态**：内置工具开关先存 `localStorage`，聊天时读取
- **MCP 配置**：因后端 MCP 是占位实现，第一阶段先做配置 CRUD 和测试按钮，真实连接后续实现
- **个人中心**：修改密码必须验证旧密码；Token 用量可先 mock/占位，后端逐步补齐

### 6. 验证方式

- `npm run lint` — 前后端类型检查
- `npm run build` — 生产构建
- `npm test` — Vitest 集成测试
- 手动验证：登录 → 侧边栏切换 `/memories` `/tools` `/profile` → 各页面 CRUD 正常 → 返回 `/chat` 仍可聊天

## Out of Scope (第二阶段)

- 语音对话页（后端需新增 STT/TTS 路由）
- 知识库页（后端需完整上传/索引/检索链路）
- Canvas 画布（需引入图形库或自研 SVG 交互）
- 3D 记忆树（需引入 Three.js 依赖）

这些页面在第一阶段完成基础设施后，可快速跟进。
