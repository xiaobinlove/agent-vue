import type {
  ChatMessage,
  Docagg,
  IConversation,
  IReference,
  IReferenceChunk,
  IRuntimeDialog,
} from '../types/chat'

export const CURRENT_REFERENCE_REG = /\[ID:(\d+)\]/g
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

export function getDialogPrologue(dialog: IRuntimeDialog | null) {
  const promptConfig = dialog?.promptConfig ?? dialog?.prompt_config
  if (promptConfig?.prologue) {
    return promptConfig.prologue
  }

  if (!dialog?.agentDsl) {
    return ''
  }

  try {
    const dsl = JSON.parse(dialog.agentDsl)
    return dsl?.components?.begin?.obj?.params?.prologue ?? ''
  } catch {
    return ''
  }
}

export function normalizeReference(
  reference?: IReference | null,
): IReference | undefined {
  if (!reference) {
    return undefined
  }

  const rawChunks = Array.isArray(reference.chunks)
    ? reference.chunks
    : Object.entries(reference.chunks ?? {})
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, value]) => value)

  return {
    chunks: rawChunks,
    doc_aggs: Array.isArray(reference.doc_aggs) ? reference.doc_aggs : [],
    total: reference.total ?? rawChunks.length,
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

export function getReferenceChunk(
  reference: IReference | undefined,
  index: number,
) {
  if (!reference) {
    return undefined
  }

  const chunks = Array.isArray(reference.chunks)
    ? reference.chunks
    : Object.entries(reference.chunks)
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

  const baseUrl = (import.meta.env.VITE_PULSE_BASE_URL || '').replace(/\/$/, '')
  const agentPath = import.meta.env.VITE_BASE_AGENT_PATH || ''

  if (url.startsWith('/v1')) {
    return url.replace(/^\/v1/, `${baseUrl}${agentPath}`)
  }

  if (url.startsWith('/')) {
    return `${baseUrl}${url}`
  }

  return url
}

export function buildImageUrl(imageId = '') {
  if (!imageId) {
    return ''
  }

  const baseUrl = (import.meta.env.VITE_PULSE_BASE_URL || '').replace(/\/$/, '')
  const agentPath = import.meta.env.VITE_BASE_AGENT_PATH || ''
  return `${baseUrl}${agentPath}/document/image/${imageId}`
}

export function buildInitialMessages(prologue: string) {
  if (!prologue.trim()) {
    return [] as ChatMessage[]
  }

  return [
    {
      clientId: buildClientId('assistant'),
      role: 'assistant' as const,
      content: prologue,
    },
  ]
}

export function mapConversationToChatMessages(
  conversation: IConversation | null,
  prologue: string,
) {
  const rawMessages = conversation?.message ?? conversation?.dsl?.messages ?? []
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return buildInitialMessages(prologue)
  }

  const references = normalizeReferenceCollection(
    conversation?.reference ?? conversation?.dsl?.retrieval,
  )

  let assistantCursor = 0

  return rawMessages.map((message, index) => {
    const isAssistant = message.role === 'assistant'
    const directReference = normalizeReference(references[index])
    const fallbackReference = normalizeReference(references[assistantCursor])
    const reference = isAssistant
      ? directReference ?? fallbackReference
      : undefined

    if (isAssistant) {
      assistantCursor += 1
    }

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
