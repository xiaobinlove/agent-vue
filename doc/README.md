# 文档总览

这个目录面向第三方接入团队，重点解决两个问题：

- 这个项目怎么启动、怎么读、怎么改
- 前端依赖哪些接口、请求和响应长什么样

## 文档列表

- [项目说明](./project-guide.md)
  适合先阅读，帮助快速理解页面结构、运行方式、状态流和关键模块。

- [接口文档](./api-reference.md)
  适合联调时查阅，包含环境变量、认证方式、接口列表、请求体和响应体说明。

## 推荐阅读顺序

1. 先看 [项目说明](./project-guide.md)
2. 再看 [接口文档](./api-reference.md)
3. 最后按需要阅读 `src/view/agent/` 下的代码

## 核心源码入口

- [src/App.vue](/Users/bin/Documents/project/agent-vue/src/App.vue)
- [src/view/agent/index.vue](/Users/bin/Documents/project/agent-vue/src/view/agent/index.vue)
- [src/view/agent/composables/useFlowChat.ts](/Users/bin/Documents/project/agent-vue/src/view/agent/composables/useFlowChat.ts)
- [src/view/agent/services/flow-agent.ts](/Users/bin/Documents/project/agent-vue/src/view/agent/services/flow-agent.ts)
