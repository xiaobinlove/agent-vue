# 项目说明

## 1. 项目定位

这个项目是一个固定绑定单个流程智能体的 Vue 示例页，目标是把后端流程能力以一个可直接接入的问答页面呈现出来。

页面结构参考 React 版本，但实现使用 Vue 3。当前页面包含：

- 左侧会话列表
- 右侧会话标题
- 问答消息流
- 底部输入框
- 文档引用与引用弹层

它不包含：

- 流程切换器
- 顶部流程头部信息
- 多页面路由

## 2. 技术栈

- Vue 3
- TypeScript
- Vite
- `markdown-it`
- `markdown-it-task-lists`
- `markdown-it-texmath`
- `highlight.js`
- `katex`
- `floating-vue`
- `dompurify`
- `eventsource-parser`

## 3. 运行方式

### 3.1 安装

```bash
npm install
```

### 3.2 环境变量

建议在项目根目录创建 `.env.local`：

```env
VITE_PULSE_BASE_URL=http://127.0.0.1:20300/pulse
VITE_BASE_AGENT_PATH=/agent
VITE_BASE_AIAGENT_PATH=/ai-agent
VITE_FLOW_DIALOG_ID=your-flow-dialog-id
VITE_ZOV_USER_TOKEN=your-user-token
VITE_ZOV_SHARE_TOKEN=
```

变量说明：

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `VITE_PULSE_BASE_URL` | 是 | 服务总入口地址。开发环境下会被 Vite 代理使用。 |
| `VITE_BASE_AGENT_PATH` | 是 | 通用智能体相关接口前缀。当前主要用于运行和文档接口。 |
| `VITE_BASE_AIAGENT_PATH` | 是 | 流程智能体会话接口前缀。 |
| `VITE_FLOW_DIALOG_ID` | 是 | 当前页面绑定的流程 id。 |
| `VITE_ZOV_USER_TOKEN` | 是 | 请求头 `Authorization` 使用的 token。 |
| `VITE_ZOV_SHARE_TOKEN` | 否 | 请求头 `share-token`，分享场景可选。 |

### 3.3 启动与构建

```bash
npm run dev
npm run build
npm run preview
```

## 4. 目录结构

```text
src/
  App.vue
  main.ts
  style.css
  view/agent/
    index.vue
    components/
      ConversationSidebar.vue
      DocumentLink.vue
      FileIcon.vue
      MarkdownContent.vue
      MessageItem.vue
      MessageList.vue
      ReferencePopover.vue
    composables/
      useFlowChat.ts
    services/
      flow-agent.ts
    types/
      chat.ts
    utils/
      chat.ts
      env.ts
vite.config.ts
doc/
```

## 5. 页面与代码职责

### 5.1 页面入口

[src/view/agent/index.vue](/Users/bin/Documents/project/agent-vue/src/view/agent/index.vue)

职责：

- 组织左右布局
- 接入会话侧边栏
- 接入消息区和输入区
- 绑定 `useFlowChat` 暴露的状态和事件

### 5.2 会话状态

[src/view/agent/composables/useFlowChat.ts](/Users/bin/Documents/project/agent-vue/src/view/agent/composables/useFlowChat.ts)

职责：

- 初始化会话列表
- 恢复当前会话
- 创建、切换、删除会话
- 发送 SSE 消息
- 更新最后一条助手消息
- 首条提问后自动重命名会话

当前会话 id 会保存在 `localStorage`，只用于刷新后恢复当前会话。

### 5.3 服务层

[src/view/agent/services/flow-agent.ts](/Users/bin/Documents/project/agent-vue/src/view/agent/services/flow-agent.ts)

职责：

- 统一拼接接口地址
- 设置认证头
- 封装会话类接口
- 处理 SSE 流式响应
- 拉取文档缩略图

### 5.4 Markdown 与引用

[src/view/agent/components/MarkdownContent.vue](/Users/bin/Documents/project/agent-vue/src/view/agent/components/MarkdownContent.vue)

职责：

- 解析 Markdown
- 渲染数学公式
- 允许原始 HTML
- 代码高亮
- 把 `[ID:n]` 替换成引用组件

[src/view/agent/components/ReferencePopover.vue](/Users/bin/Documents/project/agent-vue/src/view/agent/components/ReferencePopover.vue)

职责：

- 展示引用 chunk 内容
- 展示图片引用
- 展示文档信息和下载入口

## 6. 页面数据流

### 6.1 首次进入

1. 读取 `VITE_FLOW_DIALOG_ID`
2. 拉取该流程下的会话列表
3. 尝试恢复本地保存的当前会话 id
4. 如果本地会话失效，则回退到最新会话
5. 如果没有任何会话，则自动创建首个会话
6. 拉取当前会话详情并渲染消息

### 6.2 发送消息

1. 前端追加一条用户消息和一条空助手消息
2. 调用 `/canvas/run/completion`
3. 按 SSE 事件持续更新最后一条助手消息的 `answer`
4. 同步更新 `reference`
5. 流结束后关闭 `streaming` 状态

### 6.3 切换会话

1. 若当前正在流式回答，先中断
2. 拉取目标会话详情
3. 把消息区定位到底部
4. 渲染历史消息和引用

## 7. Markdown 能力

当前页面支持：

- GitHub Flavored Markdown
- 任务列表
- 行内和块级公式
- 原始 HTML
- 代码高亮
- `blockquote`
- `[ID:n]` 引用标记
- `<think>...</think>` 预处理

预处理规则位于 [src/view/agent/utils/chat.ts](/Users/bin/Documents/project/agent-vue/src/view/agent/utils/chat.ts)：

- `\[...\]` 转为 `$$...$$`
- `\(...\)` 转为 `$...$`
- `<think>...</think>` 转为 `<section class="think">...</section>`
- 老格式引用占位转为 `[ID:n]`

## 8. 认证与代理

### 8.1 认证

所有接口请求默认带：

- `Authorization: VITE_ZOV_USER_TOKEN`
- `share-token: VITE_ZOV_SHARE_TOKEN`，仅在配置时带上

认证 token 不再从浏览器本地缓存读取。

### 8.2 开发环境代理

[vite.config.ts](/Users/bin/Documents/project/agent-vue/vite.config.ts) 会在开发环境下把：

`/__pulse_proxy__/*`

代理到 `VITE_PULSE_BASE_URL` 对应的服务地址，用于规避本地开发跨域问题。

## 9. 适合如何扩展

### 9.1 如果要接入新的流程

只需要更换：

- `VITE_FLOW_DIALOG_ID`
- 对应 token
- 服务地址相关环境变量

### 9.2 如果要扩展页面功能

常见扩展位置：

- 会话 UI：修改 `ConversationSidebar.vue`
- 消息卡片样式：修改 `MessageItem.vue`
- Markdown 规则：修改 `MarkdownContent.vue`
- 引用弹层：修改 `ReferencePopover.vue`
- 会话状态流：修改 `useFlowChat.ts`

## 10. 第三方接入建议

- 先用固定流程 id 接通完整链路，再考虑做流程切换器
- 后端若返回字段存在 `camelCase` / `snake_case` 混用，优先在服务层做归一化
- 若准备嵌入现有系统，建议保留 `services/` 与 `composables/` 这两层边界，避免 UI 和接口强耦合
- 如需接入企业认证体系，优先替换 `getRequestAuthConfig()`，不要把 token 逻辑散落到组件里
