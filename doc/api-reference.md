# 接口文档

本文档描述当前 Vue 流程智能体页依赖的前端接口约定，便于第三方团队联调和参考实现。

## 1. 基础约定

### 1.1 地址拼接

前端最终请求地址由以下几部分拼接：

`requestBaseUrl + basePath + endpoint`

其中：

- `requestBaseUrl` 来自 `VITE_PULSE_BASE_URL`
- `basePath` 可能是 `VITE_BASE_AGENT_PATH` 或 `VITE_BASE_AIAGENT_PATH`
- `endpoint` 为具体接口路径

示例：

```text
VITE_PULSE_BASE_URL=http://127.0.0.1:20300/pulse
VITE_BASE_AIAGENT_PATH=/ai-agent

最终地址：
http://127.0.0.1:20300/pulse/ai-agent/agent/canvas/conversation/list
```

### 1.2 认证请求头

所有请求默认携带：

| Header | 来源 | 说明 |
| --- | --- | --- |
| `Authorization` | `VITE_ZOV_USER_TOKEN` | 必填 |
| `share-token` | `VITE_ZOV_SHARE_TOKEN` | 可选 |
| `Content-Type: application/json` | 前端自动设置 | JSON 请求时带上 |

### 1.3 通用响应结构

普通 JSON 接口默认按以下结构解析：

```json
{
  "code": 1,
  "data": {},
  "message": "success"
}
```

解析规则：

- `response.ok` 必须为 `true`
- `code` 必须等于 `1` 或 `"1"`
- 出错时前端优先读取 `message` 或 `msg`

## 2. 会话相关接口

这些接口由 [src/view/agent/services/flow-agent.ts](../../src/view/agent/services/flow-agent.ts) 调用。

### 2.1 创建流程会话

- 方法：`POST`
- 路径：`/agent/canvas/conversation/create`
- Base Path：`VITE_BASE_AIAGENT_PATH`

请求体：

```json
{
  "id": "conversation-id",
  "canvasId": "flow-dialog-id",
  "name": "新对话",
  "hasDia": 0,
  "status": 1
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 前端生成的会话 id |
| `canvasId` | string | 流程 id |
| `name` | string | 初始会话名 |
| `hasDia` | number | 当前固定传 `0` |
| `status` | number | 当前固定传 `1` |

返回示例：

```json
{
  "code": 1,
  "data": {
    "id": "conversation-id"
  }
}
```

### 2.2 查询会话列表

- 方法：`POST`
- 路径：`/agent/canvas/conversation/list`
- Base Path：`VITE_BASE_AIAGENT_PATH`

请求体：

```json
{
  "canvasId": "flow-dialog-id"
}
```

返回示例：

```json
{
  "code": 1,
  "data": [
    {
      "id": "conversation-id",
      "name": "请总结招标文件",
      "createTime": 1716000000000,
      "updateTime": 1716000010000
    }
  ]
}
```

前端兼容字段：

- `createTime`
- `create_time`
- `updateTime`
- `update_time`

### 2.3 查询单个会话详情

- 方法：`GET`
- 路径：`/agent/canvas/conversation/get?id={conversationId}`
- Base Path：`VITE_BASE_AIAGENT_PATH`

返回示例：

```json
{
  "code": 1,
  "data": {
    "id": "conversation-id",
    "name": "请总结招标文件",
    "dsl": {
      "messages": [
        {
          "role": "user",
          "content": "请总结这份文档"
        },
        {
          "role": "assistant",
          "content": "这是总结结果 [ID:0]"
        }
      ],
      "retrieval": [
        {
          "chunks": [
            {
              "id": "chunk-1",
              "content": "<p>命中的片段</p>",
              "document_id": "doc-1",
              "document_name": "招标文件.pdf",
              "image_id": "image-1",
              "doc_type": "pdf"
            }
          ],
          "doc_aggs": [
            {
              "doc_id": "doc-1",
              "doc_name": "招标文件.pdf",
              "url": "/v1/document/get/doc-1"
            }
          ]
        }
      ]
    }
  }
}
```

说明：

- 前端优先读取 `data.message` / `data.reference`
- 如果不存在，则回退到 `data.dsl.messages` / `data.dsl.retrieval`

### 2.4 更新会话名称

- 方法：`POST`
- 路径：`/agent/canvas/conversation/update`
- Base Path：`VITE_BASE_AIAGENT_PATH`

请求体：

```json
{
  "id": "conversation-id",
  "name": "请总结招标文件"
}
```

当前用途：

- 不暴露重命名 UI
- 仅在首条提问后，由前端自动把 `新对话` 更新为问题摘要

### 2.5 删除会话

- 方法：`POST`
- 路径：`/agent/canvas/conversation/rm`
- Base Path：`VITE_BASE_AIAGENT_PATH`

请求体：

```json
{
  "id": "conversation-id"
}
```

删除当前会话时，前端行为：

1. 若正在流式输出，先中断
2. 删除成功后，从剩余会话中选最新一条
3. 若已无剩余会话，则自动创建一个新会话

## 3. 流式回答接口

### 3.1 运行流程并返回 SSE

- 方法：`POST`
- 路径：`/canvas/run/completion`
- Base Path：`VITE_BASE_AGENT_PATH`

请求体：

```json
{
  "conversation_id": "conversation-id",
  "agent_status": 1,
  "id": "flow-dialog-id",
  "running_hint_text": "runing...🕞",
  "query": "请总结这份文档",
  "inputs": {},
  "files": [],
  "session_id": null
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `conversation_id` | string | 当前会话 id |
| `agent_status` | number | 当前固定为 `1` |
| `id` | string | 流程 id |
| `running_hint_text` | string | 运行提示文案 |
| `query` | string | 用户输入 |
| `inputs` | object | 当前固定空对象 |
| `files` | array | 当前固定空数组 |
| `session_id` | null | 当前固定 `null` |

返回类型：

- `text/event-stream`

SSE 单条 `data` 示例：

```json
{
  "code": 1,
  "data": {
    "answer": "这是第一段回答",
    "reference": {
      "chunks": [
        {
          "id": "chunk-1",
          "content": "<p>命中的片段</p>",
          "document_id": "doc-1",
          "document_name": "招标文件.pdf",
          "image_id": "image-1",
          "doc_type": "pdf"
        }
      ],
      "doc_aggs": [
        {
          "doc_id": "doc-1",
          "doc_name": "招标文件.pdf",
          "url": "/v1/document/get/doc-1"
        }
      ]
    }
  }
}
```

前端处理规则：

- 每收到一条事件，就更新最后一条助手消息
- `answer` 直接覆盖当前内容
- `reference` 同步覆盖当前引用
- 如果 `data` 是布尔值，前端忽略该事件

## 4. 文档与引用相关接口

### 4.1 批量获取文档缩略图

- 方法：`POST`
- 路径：`/document/thumbnails`
- Base Path：`VITE_BASE_AGENT_PATH`

请求体：

```json
{
  "doc_ids": ["doc-1", "doc-2"]
}
```

返回示例：

```json
{
  "code": 1,
  "data": {
    "doc-1": "/v1/document/thumbnails/doc-1.png",
    "doc-2": "/v1/document/thumbnails/doc-2.png"
  }
}
```

用途：

- 引用弹层中的文档缩略图展示

### 4.2 获取引用图片

- 方法：`GET`
- 路径：`/document/image/{imageId}`
- Base Path：`VITE_BASE_AGENT_PATH`

说明：

- 当前前端直接拼接图片地址，不额外做 JSON 包装解析
- 常用于引用类型为 `image` / `table` 时的缩略图与大图预览

### 4.3 获取文档下载地址

当前前端优先使用 `reference.doc_aggs[].url`。

如果后端没有直接返回 `url`，则前端会按以下规则拼接：

- 方法：`GET`
- 路径：`/document/get/{doc_id}?ext={ext}&prefix={prefix}`
- Base Path：`VITE_BASE_AGENT_PATH`

示例：

```text
/document/get/doc-1?ext=pdf&prefix=document
```

说明：

- `ext` 来自文件扩展名
- `prefix` 当前默认使用 `document`

## 5. 关键数据结构

### 5.1 `FlowMessage`

```json
{
  "id": "message-id",
  "role": "assistant",
  "content": "回答内容",
  "prompt": "",
  "doc_ids": [],
  "audio_binary": ""
}
```

### 5.2 `IReference`

```json
{
  "chunks": [
    {
      "id": "chunk-id",
      "content": "<p>命中的片段内容</p>",
      "document_id": "doc-id",
      "document_name": "文档.pdf",
      "image_id": "image-id",
      "doc_type": "pdf"
    }
  ],
  "doc_aggs": [
    {
      "doc_id": "doc-id",
      "doc_name": "文档.pdf",
      "url": "文档访问地址"
    }
  ],
  "total": 1
}
```

### 5.3 `[ID:n]` 引用规则

如果回答中出现：

```text
[ID:0]
[ID:1]
```

前端会：

1. 从 `reference.chunks[n]` 取出 chunk
2. 根据 `doc_type` 判断是图像型引用还是普通引用
3. 渲染为缩略图触发器或信息图标
4. 悬浮后展示 chunk 内容、预览图和关联文档

## 6. 前端容错与兼容说明

- `reference.chunks` 允许是数组或对象
- `reference.doc_aggs` 缺失时，正文仍正常显示
- `doc_aggs[].url` 缺失时，前端会尝试拼接下载地址
- `createTime` / `create_time` 混用时，前端会归一化
- `code` 可为数字 `1` 或字符串 `"1"`

## 7. 联调建议

- 先联通 `list / create / get / completion` 四个核心接口
- 再确认 `reference` 结构是否完整，尤其是 `chunks` 与 `doc_aggs`
- 最后补 `document/thumbnails` 和文档下载地址，完善引用体验
