# LumiOS MVP

一个从零复刻的 LumiOS 最小可用版本（Minimum Viable Product）。

> 原项目：[maoxiansheng946-dev/-lumi-OS](https://github.com/maoxiansheng946-dev/-lumi-OS)

---

## 愿景

复刻 LumiOS 最核心的体验：一个**能记住你、能调用工具、能多模型切换**的个人 AI 伴侣。

本项目保留原项目的架构思想，但大幅精简实现，使其可以在单机上快速运行、学习与二次开发。

---

## 已实现功能

- **React + TypeScript + Vite + Tailwind CSS v4** 前端
- **Express + TypeScript + SQLite3** 后端
- **JWT 认证**：注册 / 登录 / Token 鉴权
- **多 LLM Provider 统一调用**：OpenAI、DeepSeek、Anthropic、Google、Ollama
- **流式聊天**：SSE 实时推送
- **内置工具系统**：当前时间、文件读取、文件列表、网页搜索占位
- **记忆系统**：从对话中自动提取事实性记忆，并在后续对话中检索注入上下文
- **会话管理**：创建 / 删除 / 切换会话
- **Markdown 消息渲染**：Assistant 消息支持 Markdown、代码高亮、GFM、复制代码
- **多页面 AI 操作系统界面**：
  - 对话页（含会话历史）
  - 记忆管理页（查看/搜索/编辑/删除记忆）
  - 工具 / MCP 市场（内置工具开关 + MCP 服务器配置）
  - 个人中心（模型设置、修改密码、导出数据）
- **客户端路由**：react-router-dom
- **测试覆盖**：Health / Auth / Chat / Tool / Memory 集成测试
- **代码质量**：统一 logger、安全的路径遍历防护、SSE 错误处理

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite, Tailwind CSS v4, react-router-dom |
| 后端 | Node.js, Express, TypeScript, SQLite3 |
| AI | OpenAI SDK, Anthropic SDK, Google Generative AI, Ollama |
| 工具 | 内置函数调用 |
| 记忆 | SQLite + LLM 提取 + 关键词检索 |

---

## 快速开始

### 环境要求

- Node.js 18+（推荐 22+）
- npm

### 安装与启动

```bash
cd lumi-os-mvp
npm install
cp .env.example .env
# 编辑 .env，填入至少一个 LLM API Key（OPENAI_API_KEY 或 DEEPSEEK_API_KEY）
npm run dev
```

然后打开浏览器访问：http://localhost:5173

后端 API 运行在：http://localhost:3000

### 构建生产版本

```bash
npm run build
npm run start
```

---

## 项目结构

```
lumi-os-mvp/
├── server/                 # 后端
│   ├── index.ts            # 入口
│   ├── app.ts              # Express 应用
│   ├── config.ts           # 环境变量
│   ├── db/                 # SQLite 数据层
│   ├── routes/             # API 路由
│   ├── llm/                # LLM Provider 抽象
│   ├── tools/              # 内置工具
│   ├── mcp/                # MCP 占位
│   ├── memory/             # 记忆系统
│   └── chat/               # 聊天引擎
├── src/                    # 前端
│   ├── main.tsx
│   ├── App.tsx             # 路由配置
│   ├── contexts/           # React Context
│   ├── components/         # UI 组件 + 布局
│   ├── pages/              # 页面（Chat / MemoryManagement / ToolMarketplace / Profile）
│   └── lib/                # 工具函数
├── server/tests/           # 后端测试
├── plans/                  # 学习路线与建设计划
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 核心设计

### LLM 路由层

`server/llm/` 将 OpenAI / DeepSeek / Anthropic / Google / Ollama 统一为同一接口：

```typescript
streamLLM({ provider, model, messages, tools }, onChunk)
completeLLM({ provider, model, messages, tools })
```

OpenAI 兼容接口（OpenAI / DeepSeek / Ollama）共享同一实现，只需切换 `baseURL` 和 `apiKey`。

### 记忆系统

1. 每次对话后，调用 LLM 从会话历史中抽取事实性记忆
2. 记忆存入 SQLite，包含重要度评分
3. 用户新消息触发关键词检索，返回最相关的记忆
4. 相关记忆被注入 system prompt，让 AI 能够“记住”用户

### 工具系统

`server/tools/registry.ts` 提供工具注册中心。每个工具定义：

- `name` / `description` / `parameters`
- `execute(args)` 执行函数

聊天引擎在调用 LLM 时自动注入工具声明；LLM 返回 `tool_calls` 时，引擎执行对应工具并将结果再次交给 LLM。

---

## 测试

```bash
npm test
```

当前覆盖：健康检查、用户注册、用户登录。

---

## 学习与复刻计划

详见 `plans/` 目录：

- `lumi-os-learning-roadmap.md` —— LumiOS 学习路线
- `lumi-os-clone-plan.md` —— MVP 分阶段建设计划

---

## 注意事项

- `.env` 文件包含敏感信息，已加入 `.gitignore`，请勿提交到版本控制。
- 生产环境请使用长度不少于 32 个字符的强随机 `JWT_SECRET`。
- 语音、MCP 生态、桌面端 Tauri、Computer Use 等功能在本 MVP 中未实现，仅保留扩展接口。

---

## 许可证

AGPL-3.0（与原项目保持一致）
