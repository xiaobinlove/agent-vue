# 流程智能体 Vue 示例项目

这是一个基于 `Vue 3 + TypeScript + Vite` 的流程智能体单页示例，用于对接固定流程的问答场景。

项目当前重点能力：

- 单流程会话页
- 左侧会话列表、右侧问答区
- SSE 流式回答
- Markdown / LaTeX / `<think>` / 代码高亮
- 引用标记 `[ID:n]` 与文档引用弹层
- 文档下载和图片引用预览

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

建议在项目根目录创建 `.env.local`：

```env
VITE_PULSE_BASE_URL=http://127.0.0.1:20300/pulse
VITE_BASE_AGENT_PATH=/agent
VITE_BASE_AIAGENT_PATH=/ai-agent
VITE_FLOW_DIALOG_ID=your-flow-dialog-id
VITE_ZOV_USER_TOKEN=your-user-token
VITE_ZOV_SHARE_TOKEN=
```

3. 启动开发环境

```bash
npm run dev
```

4. 构建生产包

```bash
npm run build
```

## 文档入口

- [文档总览](./doc/README.md)
- [项目说明](./doc/project-guide.md)
- [接口文档](./doc/api-reference.md)

## 目录说明

```text
src/
  App.vue                       应用入口
  main.ts                       挂载 Vue 应用与全局样式
  view/agent/
    index.vue                   页面编排
    composables/useFlowChat.ts  会话与发送逻辑
    services/flow-agent.ts      后端接口封装
    components/                 聊天、引用、Markdown 组件
    utils/                      环境变量、数据处理、Markdown 预处理
    types/chat.ts               本地类型定义
doc/
  README.md                     文档导航
  project-guide.md              项目说明
  api-reference.md              接口文档
```

## 适用场景

- 给第三方团队参考前端实现
- 作为固定流程智能体页面的最小接入示例
- 需要快速验证流程问答、SSE、引用展示等能力

## 说明

- 认证 token 从环境变量读取
- 会话 id 仍会保存在 `localStorage`，仅用于刷新后恢复当前会话。
