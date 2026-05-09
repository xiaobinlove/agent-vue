import type {
  ChatMessage,
  Docagg,
  IConversation,
  IReference,
  IReferenceChunk,
} from '../types/chat'
import { getRuntimeBaseConfig } from './env'

export const CURRENT_REFERENCE_REG = /\[ID:(\d+)\]/g
export const DEFAULT_CONVERSATION_NAME = '新对话'
const OLD_REFERENCE_REG = /(#{2}\d+\${2})/g
const THINK_TAG_REG = /<think>([\s\S]*?)<\/think>/g
const BLOCK_LATEX_REG = /\\\[([\s\S]*?)\\\]/g
const INLINE_LATEX_REG = /\\\(([\s\S]*?)\\\)/g
const IMAGE_REFERENCE_TYPES = new Set(['image', 'table'])

export function replaceOldReferenceTokens(text = '') {
  return text.replace(OLD_REFERENCE_REG, (substring) => {
    return `[ID:${substring.slice(2, -2)}]`
  })
}

export function replaceThinkToSection(text = '') {
  return text.replace(THINK_TAG_REG, '<section class="think">$1</section>')
}

export function preprocessLatex(text = '') {
  const blockProcessedContent = text.replace(
    BLOCK_LATEX_REG,
    (_, equation: string) => `$$${equation}$$`,
  )

  return blockProcessedContent.replace(
    INLINE_LATEX_REG,
    (_, equation: string) => `$${equation}$`,
  )
}

export function preprocessMarkdownContent(text = '') {
  return preprocessLatex(replaceThinkToSection(replaceOldReferenceTokens(text)))
}

export function generateConversationId() {
  return crypto.randomUUID().replace(/-/g, '')
}

export function buildClientId(prefix: string, rawId?: string) {
  return `${prefix}_${rawId || crypto.randomUUID()}`
}

export function buildConversationStorageKey(dialogId: string) {
  return `flow-agent:conversation:${dialogId}`
}

export function buildConversationName(rawName: string) {
  const name = rawName.trim()
  return name.length > 30 ? `${name.slice(0, 30)}...` : name
}

export function getConversationDisplayName(
  conversation?: Pick<IConversation, 'name'> | null,
) {
  return conversation?.name?.trim() || DEFAULT_CONVERSATION_NAME
}

export function isDefaultConversationName(name?: string | null) {
  return (
    getConversationDisplayName({
      name: typeof name === 'string' ? name : undefined,
    }) === DEFAULT_CONVERSATION_NAME
  )
}

export function getConversationTimestamp(
  conversation?: Pick<IConversation, 'createTime' | 'create_time'> | null,
) {
  const rawTimestamp = Number(
    conversation?.create_time ?? conversation?.createTime ?? 0,
  )

  if (!Number.isFinite(rawTimestamp) || rawTimestamp <= 0) {
    return 0
  }

  return rawTimestamp < 1e12 ? rawTimestamp * 1000 : rawTimestamp
}

export function normalizeConversation(conversation: IConversation) {
  const normalizedConversation: IConversation = {
    ...conversation,
    name: getConversationDisplayName(conversation),
    message:
      conversation.message ??
      conversation.messages ??
      conversation.dsl?.messages,
    reference:
      conversation.reference ??
      conversation.retrieval ??
      conversation.dsl?.reference ??
      conversation.dsl?.retrieval,
  }
  const timestamp = getConversationTimestamp(conversation)

  if (timestamp > 0) {
    normalizedConversation.create_time = timestamp
    normalizedConversation.createTime = timestamp
  }

  return normalizedConversation
}

export function sortConversations(conversations: IConversation[]) {
  return [...conversations].sort(
    (left, right) =>
      getConversationTimestamp(right) - getConversationTimestamp(left),
  )
}

export function normalizeReference(
  reference?: IReference | null,
): IReference | undefined {
  if (!reference) {
    return undefined
  }

  const rawChunks = Array.isArray(reference.chunks)
    ? reference.chunks
    : reference.chunks ?? {}

  return {
    chunks: rawChunks,
    doc_aggs: Array.isArray(reference.doc_aggs) ? reference.doc_aggs : [],
    total:
      reference.total ??
      (Array.isArray(rawChunks) ? rawChunks.length : Object.keys(rawChunks).length),
  }
}

export function normalizeReferenceCollection(
  references?: IReference[] | Record<number, IReference>,
) {
  if (!references) {
    return []
  }

  const list = Array.isArray(references)
    ? references
    : Object.entries(references)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, value]) => value)

  return list
    .map((item) => normalizeReference(item))
    .filter((item): item is IReference => Boolean(item))
}

export function hasReferenceData(reference?: IReference) {
  if (!reference) {
    return false
  }

  const chunkCount = Array.isArray(reference.chunks)
    ? reference.chunks.length
    : reference.chunks && typeof reference.chunks === 'object'
      ? Object.keys(reference.chunks).length
      : 0

  return (
    (Array.isArray(reference.doc_aggs) && reference.doc_aggs.length > 0) ||
    chunkCount > 0 ||
    Number(reference.total) > 0
  )
}

export function getReferenceChunk(
  reference: IReference | undefined,
  index: number,
) {
  if (!reference) {
    return undefined
  }

  if (Array.isArray(reference.chunks)) {
    return reference.chunks[index]
  }

  const keyedChunk = reference.chunks?.[index]
  if (keyedChunk) {
    return keyedChunk
  }

  const chunks = Object.entries(reference.chunks ?? {})
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, value]) => value)

  return chunks[index]
}

export function getReferenceDocument(
  reference: IReference | undefined,
  chunk: IReferenceChunk | undefined,
) {
  if (!reference || !chunk?.document_id) {
    return undefined
  }

  return reference.doc_aggs.find((item) => item.doc_id === chunk.document_id)
}

export function getReferenceDocuments(reference?: IReference) {
  if (!reference?.doc_aggs?.length) {
    return []
  }

  const seen = new Set<string>()
  return reference.doc_aggs.filter((item) => {
    if (!item?.doc_id || seen.has(item.doc_id)) {
      return false
    }

    seen.add(item.doc_id)
    return true
  })
}

export function isImageReference(docType?: string) {
  return Boolean(docType && IMAGE_REFERENCE_TYPES.has(docType))
}

export function getDocumentExtension(name = '') {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex >= 0 ? name.slice(dotIndex + 1).toLowerCase() : ''
}

export function resolveAgentAssetUrl(url = '') {
  if (!url) {
    return ''
  }

  if (/^https?:\/\//i.test(url)) {
    return url
  }

  const { requestBaseUrl, agentBasePath } = getRuntimeBaseConfig()

  if (url.startsWith('/v1')) {
    return url.replace(/^\/v1/, `${requestBaseUrl}${agentBasePath}`)
  }

  if (url.startsWith('/')) {
    return `${requestBaseUrl}${url}`
  }

  return url
}

export function buildImageUrl(imageId = '') {
  if (!imageId) {
    return ''
  }

  const { requestBaseUrl, agentBasePath } = getRuntimeBaseConfig()
  return `${requestBaseUrl}${agentBasePath}/document/image/${imageId}`
}

export function buildDocumentDownloadUrl(document: Docagg, prefix = 'document') {
  if (document.url) {
    return resolveAgentAssetUrl(document.url)
  }

  if (!document.doc_id) {
    return ''
  }

  const { requestBaseUrl, agentBasePath } = getRuntimeBaseConfig()
  const extension = getDocumentExtension(document.doc_name || '')
  const query = new URLSearchParams()

  if (extension) {
    query.set('ext', extension)
  }
  query.set('prefix', prefix)

  return `${requestBaseUrl}${agentBasePath}/document/get/${document.doc_id}?${query.toString()}`
}

export function buildInitialMessages() {
  return [] as ChatMessage[]
}

export function mapConversationToChatMessages(
  conversation: IConversation | null,
) {
  const rawMessages =
    conversation?.message ??
    conversation?.messages ??
    conversation?.dsl?.messages ??
    []
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return [] as ChatMessage[]
  }

  const references = normalizeReferenceCollection(
    conversation?.reference ??
      conversation?.retrieval ??
      conversation?.dsl?.reference ??
      conversation?.dsl?.retrieval,
  )
  const assistantMessages = rawMessages.filter(
    (message) => message.role === 'assistant',
  )
  const assistantMessagesWithoutPrologue = assistantMessages.slice(1)

  return rawMessages.map((message, index) => {
    const isAssistant = message.role === 'assistant'
    const matcher = (item: typeof message) =>
      item.id === message.id && item.content === message.content
    const assistantIndex = assistantMessages.findIndex(matcher)
    const assistantIndexWithoutPrologue =
      assistantMessagesWithoutPrologue.findIndex(matcher)
    const referenceCandidates = [
      normalizeReference(message.reference),
      normalizeReference(references[assistantIndex]),
      normalizeReference(references[assistantIndexWithoutPrologue]),
      normalizeReference(references[index]),
    ]
    const reference = isAssistant
      ? referenceCandidates.find(hasReferenceData) ??
        referenceCandidates[0] ??
        referenceCandidates[1] ??
        referenceCandidates[2] ??
        referenceCandidates[3]
      : undefined

    return {
      ...message,
      clientId: buildClientId(message.role, message.id || String(index)),
      reference,
    } satisfies ChatMessage
  })
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return '请求失败，请稍后重试。'
}

export function pickDocumentByChunk(
  reference: IReference | undefined,
  chunk: IReferenceChunk | undefined,
) {
  return getReferenceDocument(reference, chunk) as Docagg | undefined
}
