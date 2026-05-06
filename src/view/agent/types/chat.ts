export type MessageRole = 'assistant' | 'user'

export interface PromptConfig {
  prologue?: string
  system?: string
  empty_response?: string
  parameters?: unknown[]
}

export interface Docagg {
  count?: number
  doc_id: string
  doc_name: string
  url?: string
}

export interface IReferenceChunk {
  id?: string
  content?: string | null
  document_id?: string
  document_name?: string
  dataset_id?: string
  image_id?: string
  similarity?: number
  vector_similarity?: number
  term_similarity?: number
  positions?: number[] | number[][]
  doc_type?: string
}

export interface IReference {
  chunks: IReferenceChunk[] | Record<number, IReferenceChunk>
  doc_aggs: Docagg[]
  total?: number
}

export interface FlowMessage {
  id?: string
  content: string
  role: MessageRole
  prompt?: string
  doc_ids?: string[]
  audio_binary?: string
}

export interface IAnswer {
  answer: string
  reference?: IReference
  conversationId?: string
  prompt?: string
  id?: string
  audio_binary?: string
}

export interface FlowConversationDsl {
  messages?: FlowMessage[]
  retrieval?: IReference[] | Record<number, IReference>
}

export interface IConversation {
  id: string
  name?: string
  createTime?: number
  create_time?: number
  dsl?: FlowConversationDsl
  message?: FlowMessage[]
  reference?: IReference[] | Record<number, IReference>
}

export interface IRuntimeDialog {
  id: string
  name: string
  icon?: string
  promptConfig?: PromptConfig
  prompt_config?: PromptConfig
  agentDsl?: string
}

export interface ApiResponse<T> {
  code: number | string
  data: T
  message?: string
  msg?: string
}

export interface ChatMessage extends FlowMessage {
  clientId: string
  reference?: IReference
  streaming?: boolean
}
