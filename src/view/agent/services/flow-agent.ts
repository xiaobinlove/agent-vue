import { EventSourceParserStream } from 'eventsource-parser/stream'

import type {
  ApiResponse,
  IAnswer,
  IConversation,
} from '../types/chat'
import { getRuntimeBaseConfig } from '../utils/env'

const USER_TOKEN_KEY = 'zov-user-token'
const SHARE_TOKEN_KEY = 'zov-share-token'
const SHARE_HEADER_KEY = 'share-token'

const documentThumbnailCache = new Map<string, string>()

function buildUrl(basePath: string, endpoint: string) {
  const { requestBaseUrl } = getRuntimeBaseConfig()
  return `${requestBaseUrl}${basePath}${endpoint}`
}

function createHeaders(includeJson = false) {
  const headers = new Headers()
  const token = localStorage.getItem(USER_TOKEN_KEY)
  const shareToken = localStorage.getItem(SHARE_TOKEN_KEY)

  if (token) {
    headers.set('Authorization', token)
  }

  if (shareToken) {
    headers.set(SHARE_HEADER_KEY, shareToken)
  }

  if (includeJson) {
    headers.set('Content-Type', 'application/json')
  }

  return headers
}

async function parseApiResponse<T>(response: Response) {
  let payload: ApiResponse<T> | null = null

  try {
    payload = (await response.clone().json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.msg || '请求失败，请稍后重试。')
  }

  if (!payload) {
    throw new Error('接口返回为空。')
  }

  if (String(payload.code) !== '1') {
    throw new Error(payload.message || payload.msg || '接口返回异常。')
  }

  return payload.data
}

async function requestJson<T>(
  url: string,
  init: RequestInit = {},
  includeJson = false,
) {
  const response = await fetch(url, {
    ...init,
    headers: createHeaders(includeJson),
  })

  return parseApiResponse<T>(response)
}

export async function createFlowConversation(payload: {
  dialogId: string
  conversationId: string
  name: string
}) {
  const { aiAgentBasePath } = getRuntimeBaseConfig()
  const url = buildUrl(aiAgentBasePath, '/agent/canvas/conversation/create')

  const data = await requestJson<{ id?: string }>(
    url,
    {
      method: 'POST',
      body: JSON.stringify({
        id: payload.conversationId,
        canvasId: payload.dialogId,
        name: payload.name,
        hasDia: 0,
        status: 1,
      }),
    },
    true,
  )

  return {
    id: data.id || payload.conversationId,
  }
}

export async function fetchFlowConversation(conversationId: string) {
  const { aiAgentBasePath } = getRuntimeBaseConfig()
  const url = buildUrl(
    aiAgentBasePath,
    `/agent/canvas/conversation/get?id=${encodeURIComponent(conversationId)}`,
  )

  const data = await requestJson<IConversation>(url)

  return {
    ...data,
    message: data.message ?? data.dsl?.messages ?? [],
    reference: data.reference ?? data.dsl?.retrieval ?? [],
  } satisfies IConversation
}

export async function runFlowCompletion(payload: {
  conversationId: string
  dialogId: string
  query: string
  signal: AbortSignal
  onAnswer: (answer: IAnswer) => void
}) {
  const { agentBasePath } = getRuntimeBaseConfig()
  const url = buildUrl(agentBasePath, '/canvas/run/completion')

  const response = await fetch(url, {
    method: 'POST',
    headers: createHeaders(true),
    body: JSON.stringify({
      conversation_id: payload.conversationId,
      agent_status: 1,
      id: payload.dialogId,
      running_hint_text: 'runing...🕞',
      query: payload.query,
      inputs: {},
      files: [],
      session_id: null,
    }),
    signal: payload.signal,
  })

  if (!response.ok) {
    const errorData = await parseApiResponse<unknown>(response)
    return { response, data: errorData }
  }

  const reader = response.body
    ?.pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())
    .getReader()

  if (!reader) {
    throw new Error('当前环境不支持流式响应读取。')
  }

  while (true) {
    const result = await reader.read()
    if (result.done) {
      break
    }

    const rawData = result.value?.data
    if (!rawData) {
      continue
    }

    try {
      const parsed = JSON.parse(rawData) as ApiResponse<IAnswer | boolean>
      if (String(parsed.code) !== '1') {
        throw new Error(parsed.message || parsed.msg || '对话流式请求失败。')
      }

      if (parsed.data && typeof parsed.data !== 'boolean') {
        payload.onAnswer(parsed.data)
      }
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : '流式响应解析失败。',
      )
    }
  }

  return { response, data: null }
}

export async function fetchDocumentThumbnails(docIds: string[]) {
  const normalizedIds = docIds.filter(Boolean)
  if (normalizedIds.length === 0) {
    return {}
  }

  const unresolvedIds = normalizedIds.filter((id) => !documentThumbnailCache.has(id))
  if (unresolvedIds.length > 0) {
    const { agentBasePath } = getRuntimeBaseConfig()
    const url = buildUrl(agentBasePath, '/document/thumbnails')
    const data = await requestJson<Record<string, string>>(
      url,
      {
        method: 'POST',
        body: JSON.stringify({ doc_ids: unresolvedIds }),
      },
      true,
    )

    Object.entries(data).forEach(([id, thumbnail]) => {
      documentThumbnailCache.set(id, thumbnail)
    })
  }

  return normalizedIds.reduce<Record<string, string>>((result, id) => {
    const thumbnail = documentThumbnailCache.get(id)
    if (thumbnail) {
      result[id] = thumbnail
    }
    return result
  }, {})
}
