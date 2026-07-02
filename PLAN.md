# LumiOS MVP — 语音 / 知识库 / Canvas / 3D 记忆树 优化计划

## 背景与目标

LumiOS MVP 当前只有对话、记忆管理、工具市场和个人中心四个模块。侧边栏里语音、画布、知识库、记忆树均为禁用占位项。本计划将这四个模块补齐到**可演示、有设计感、前后端完整闭环**的状态，并保持 MVP 的简洁性：优先从 `lumi-os-source` 移植并裁剪，不自造复杂的生产级方案。

## 设计方向

延续现有暗色天体主题（`celestial-deep`、`celestial-panel`、`lumi-accent`），统一使用：
- 玻璃拟态面板（`bg-white/5` + `backdrop-blur`）
- 天蓝色强调 + 微光晕
- 有目的的动效：状态切换、节点流动、粒子缓动
- 避免默认 SaaS 模板感

## 总体依赖

```bash
npm install multer pdf-parse
npm install -D @types/multer
```

`multer` 同时服务语音上传（STT 音频 blob）和知识库文件上传。

---

## 阶段 1：语音对话页

### 范围
推按说话 → Web Audio API 录制 → 后端 STT → LLM → 后端 TTS → 前端播放，全流程可视化。

### 端口决策
- **移植**：`lumi-os-source/src/hooks/useTTS.ts`（浏览器 TTS fallback）、`VoiceForge.tsx` 中的 Canvas 波形绘制思路
- **简化重写**：不用 Socket.IO 实时流，走 HTTP 短连接以降低复杂度；移除克隆、声纹、唤醒词

### 后端

1. **新建 `server/voice/stt.ts`**
   - 优先使用 OpenAI Whisper（`OPENAI_API_KEY` 已配置）
   - 文件大小限制 5MB，格式 webm/opus
   - 返回 `{ text: string }`

2. **新建 `server/voice/tts.ts`**
   - 优先 OpenAI TTS（`tts-1`， alloy）
   - 未配置时返回 `{ available: false }`，前端降级到 `speechSynthesis`

3. **新建 `server/routes/voice.ts`**
   ```
   POST /api/voice/stt  multipart/form-data  audio -> { text }
   POST /api/voice/tts  JSON { text }        -> audio/mpeg blob
   GET  /api/voice/status                   -> { stt: boolean, tts: boolean }
   ```

4. **修改 `server/app.ts`**：注册 `app.use('/api/voice', voiceRouter)`

### 前端

1. **新建 `src/hooks/useVoice.ts`**
   - 状态机：`idle | recording | processing | speaking`
   - `MediaRecorder` 录制 `audio/webm`
   - `AudioContext` 播放后端返回的音频 ArrayBuffer
   - 提供 `startRecording()` / `stopRecording()` / `cancel()`

2. **新建 `src/components/voice/AudioVisualizer.tsx`**
   - Canvas 2D 实时音量环 + 频谱条
   - props: `stream: MediaStream | null`、`state: VoiceState`

3. **新建 `src/components/voice/VoiceCallButton.tsx`**
   - 大圆形按钮，状态色：idle 蓝、recording 红、speaking 白
   - 脉冲光环动画

4. **新建 `src/pages/Voice.tsx`**
   - 居中布局：标题、AudioVisualizer、VoiceCallButton、转写文本区、AI 回复区

5. **修改 `src/App.tsx`**：添加 `/voice` 路由
6. **修改 `src/components/layout/AppLayout.tsx`**：移除 `disabled: true`

### 测试
- `server/tests/voice.test.ts`：mock Whisper/TTS 路由，验证音频上传与返回
- `src/hooks/__tests__/useVoice.test.ts`：状态机转换

---

## 阶段 2：知识库页

### 范围
文件上传（拖放）→ 文本/PDF 提取 → 分块 → 写入 memories 表作为 RAG 来源 → 对话中检索并引用。

### 后端

1. **数据库变更 `server/db/connection.ts`**
   新增 `knowledge_files` 表：
   ```sql
   id TEXT PRIMARY KEY,
   user_id TEXT NOT NULL,
   filename TEXT NOT NULL,
   display_name TEXT NOT NULL,
   size INTEGER NOT NULL,
   status TEXT NOT NULL CHECK(status IN ('ready','indexing','indexed','failed')),
   content_preview TEXT,
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL
   ```

2. **修改 `server/db/types.ts`**：新增 `KnowledgeFile` interface
3. **新建 `server/db/knowledge.ts`**：CRUD 操作
4. **新建 `server/knowledge/extractor.ts`**
   - `.txt/.md/.json/.csv/.code`：直接读文本
   - `.pdf`：`pdf-parse`
   - 返回 `{ text: string, preview: string }`
5. **新建 `server/knowledge/chunker.ts`**
   - 500 字符/块，50 字符重叠
   - 返回 `Chunk[]` 带 index/total
6. **新建 `server/routes/knowledge.ts`**
   ```
   GET    /api/knowledge/files
   POST   /api/knowledge/upload    multipart, max 5 files, 20MB each
   DELETE /api/knowledge/files/:id
   POST   /api/knowledge/:id/ingest
   GET    /api/knowledge/files/:id
   ```
   上传成功后自动调用提取 + 分块 + 写入 memories（source 元数据）

7. **修改 `server/memory/context.ts`**：检索时同时返回普通记忆和知识块，并在 `summary` 中标注来源
8. **修改 `server/app.ts`**：注册 knowledge router

### 前端

1. **新建 `src/components/knowledge/FileUploader.tsx`**
   - 拖放区域，文件类型提示，上传进度 toast
2. **新建 `src/components/knowledge/FileList.tsx`**
   - 卡片列表：文件名、大小、状态 badge、删除按钮
   - 状态：ready/indexing/indexed/failed
3. **新建 `src/pages/KnowledgeBase.tsx`**
   - 两栏：左侧上传 + 文件列表，右侧选中文件详情（preview + 分块预览）
4. **修改 `src/App.tsx`**：添加 `/knowledge`
5. **修改 `src/components/layout/AppLayout.tsx`**：启用知识库导航

### 测试
- `server/tests/knowledge.test.ts`：上传文本/PDF、提取、分块、写入 memories、检索引用
- 前端：FileUploader 拖放事件、FileList 状态渲染

---

## 阶段 3：Canvas 画布

### 范围
把一次对话的完整过程可视化：用户输入 → 记忆检索 → 工具调用 → 工具结果 → LLM 推理 → 回复流。

### 后端

1. **修改 `server/chat/types.ts`**：扩展事件类型
   ```ts
   export type ChatStreamEvent =
     | { type: 'delta'; content: string }
     | { type: 'tool_call'; toolCall: LLMToolCall }
     | { type: 'tool_result'; toolCall: LLMToolCall; toolResult: unknown }
     | { type: 'memory_retrieval'; memories: { content: string; importance: number }[] }
     | { type: 'llm_reasoning' }
     | { type: 'done' }
     | { type: 'error'; error: string };
   ```

2. **修改 `server/chat/engine.ts`**：在关键节点 emit 事件
   - 记忆检索完成后 emit `memory_retrieval`
   - 首次 LLM 调用前 emit `llm_reasoning`
   - 工具调用/结果已有 emit
   - 回复流 emit `delta`

3. **修改 `server/routes/chat.ts` 的 `/stream`**：把新事件透传给 SSE

### 前端

1. **新建 `src/types/canvas.ts`**
   ```ts
   export interface CanvasNodeData {
     id: string;
     type: 'user_input' | 'memory_retrieval' | 'tool_call' | 'tool_result' | 'llm_reasoning' | 'response';
     title: string;
     detail?: string;
     timestamp: number;
   }
   ```

2. **新建 `src/components/canvas/CanvasNode.tsx`**
   - 六种节点类型，不同颜色/图标，展开/折叠详情
3. **新建 `src/components/canvas/CanvasConnection.tsx`**
   - SVG 贝塞尔曲线，带动画虚线流动
4. **新建 `src/components/canvas/ConversationCanvas.tsx`**
   - 接收 `events` 数组，自动布局为垂直时间轴
   - 响应式：桌面左右交错，桌面以下单列
5. **新建 `src/pages/Canvas.tsx`**
   - 独立页面，也允许从 Chat 页面 toggle 侧栏显示
6. **修改 `src/pages/Chat.tsx`**：新增 Canvas 切换按钮，把 SSE 事件同时喂给 Canvas 状态
7. **修改 `src/App.tsx`**：添加 `/canvas`
8. **修改 `src/components/layout/AppLayout.tsx`**：启用画布导航

### 测试
- `server/tests/canvas.test.ts`：验证聊天流中 emit 了新事件类型
- 前端：CanvasNode 渲染、时间轴排序

---

## 阶段 4：3D 记忆树

### 范围
用 Three.js / React Three Fiber 把 memories 可视化为可交互的 3D 树。为兼顾性能和移动设备，同时保留一个纯 Canvas 2D fallback（从 `PixelTree.tsx` 简化）。

### 端口决策
- **移植**：`lumi-os-source/src/components/PixelTree.tsx` 的 2D canvas 实现作为稳健 fallback
- **重写/简化**：3D 版用更简单的 `<Instances>` 粒子 + 连线，不移植完整后处理链

### 后端

1. **修改 `server/routes/memories.ts`**：新增
   ```
   GET /api/memories/tree?groupBy=month
   ```
   返回层级结构：根 → 月份分支 → 记忆叶子。

2. **新建 `server/memory/tree.ts`**：把 `listMemoriesByUser` 结果分组，按重要性映射颜色/半径

### 前端

1. **新建 `src/components/memory/PixelTree.tsx`**（2D fallback）
   - 全屏 Canvas，3D 投影、星场、分支贝塞尔曲线、流动粒子
   - props: `memories: Memory[]`、`searchQuery: string`、`onNodeClick`
2. **新建 `src/components/memory/MemoryTree3D.tsx`**（Three.js）
   - `@react-three/fiber` + `@react-three/drei`
   - 节点为发光球体，连线为 tube/line
   - OrbitControls + 自动旋转
   - 搜索高亮、非匹配节点变暗
3. **新建 `src/components/memory/TreeNodeDetail.tsx`**：悬浮卡片显示记忆内容、重要性、日期
4. **新建 `src/components/memory/TreeSearch.tsx`**：顶部搜索栏，搜索结果列表
5. **新建 `src/pages/MemoryTree.tsx`**：包裹 3D/2D 切换、搜索、详情卡片
6. **修改 `src/App.tsx`**：添加 `/memories/tree`
7. **修改 `src/components/layout/AppLayout.tsx`**：启用记忆树导航

### 依赖
```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

### 测试
- `server/tests/memory-tree.test.ts`：验证 `/tree` 分组结构
- 前端：PixelTree canvas 渲染、搜索高亮、节点点击

---

## 共享与跨模块

### 新增类型目录
创建 `src/types/`：
- `voice.ts`：VoiceState、TTSSettings
- `knowledge.ts`：KnowledgeFile、FileStatus
- `canvas.ts`：CanvasNodeData

### UI 组件复用
继续使用 `Button`、`Card`、`Badge`、`Input`、`Select`。

### 错误处理
后端所有新路由 `try/catch` + `next(err)`；前端使用现有 `apiRequest`。

### 安全
- 文件上传使用 `multer` 的 `limits` 和文件类型白名单
- 所有新路由挂载 `requireAuth`
- 文件路径严格限制在项目 `data/uploads/` 下
- 无硬编码密钥

---

## 执行顺序

```
Phase 1 语音  ─────────┐
                       ├── 可并行
Phase 2 知识库 ────────┘
                       │
                       ▼
Phase 3 Canvas 画布 ───┐
                       ├── 可并行
Phase 4 3D 记忆树 ─────┘
```

建议实际开发顺序：**语音 → 知识库 → Canvas → 记忆树**，因为 Canvas 需要复用聊天流事件，记忆树需要复用记忆数据结构。

---

## 验证清单

- [ ] `npm run lint` 通过
- [ ] `npm test` 通过
- [ ] `npm run build` 通过
- [ ] 语音页：按住说话、松开后显示文本与回复、听到语音
- [ ] 知识库页：拖放 txt/pdf、状态变为 indexed、对话中引用来源
- [ ] Canvas 页/侧边栏：发送消息后看到节点流程动画
- [ ] 记忆树页：3D 树渲染、搜索高亮、点击节点显示详情

---

## 关键文件清单

### 新建后端
- `server/routes/voice.ts`
- `server/voice/stt.ts`
- `server/voice/tts.ts`
- `server/routes/knowledge.ts`
- `server/knowledge/extractor.ts`
- `server/knowledge/chunker.ts`
- `server/db/knowledge.ts`
- `server/memory/tree.ts`

### 新建前端
- `src/pages/Voice.tsx`
- `src/hooks/useVoice.ts`
- `src/components/voice/AudioVisualizer.tsx`
- `src/components/voice/VoiceCallButton.tsx`
- `src/pages/KnowledgeBase.tsx`
- `src/components/knowledge/FileUploader.tsx`
- `src/components/knowledge/FileList.tsx`
- `src/pages/Canvas.tsx`
- `src/components/canvas/ConversationCanvas.tsx`
- `src/components/canvas/CanvasNode.tsx`
- `src/components/canvas/CanvasConnection.tsx`
- `src/pages/MemoryTree.tsx`
- `src/components/memory/PixelTree.tsx`
- `src/components/memory/MemoryTree3D.tsx`
- `src/components/memory/TreeNodeDetail.tsx`
- `src/components/memory/TreeSearch.tsx`
- `src/types/voice.ts`
- `src/types/knowledge.ts`
- `src/types/canvas.ts`

### 修改
- `server/app.ts`
- `server/db/connection.ts`
- `server/db/types.ts`
- `server/memory/context.ts`
- `server/chat/engine.ts`
- `server/chat/types.ts`
- `server/routes/memories.ts`
- `src/App.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/pages/Chat.tsx`
