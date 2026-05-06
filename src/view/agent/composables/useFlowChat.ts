import { computed, onMounted, ref } from 'vue'

import {
  createFlowConversation,
  fetchFlowConversation,
  fetchRuntimeDialog,
  getFlowDialogId,
  runFlowCompletion,
} from '../services/flow-agent'
import type { ChatMessage, IAnswer, IRuntimeDialog } from '../types/chat'
import {
  buildClientId,
  buildConversationName,
  buildConversationStorageKey,
  buildInitialMessages,
  generateConversationId,
  getDialogPrologue,
  getErrorMessage,
  mapConversationToChatMessages,
  normalizeReference,
} from '../utils/chat'

export function useFlowChat() {
  const dialogId = getFlowDialogId()
  const storageKey = buildConversationStorageKey(dialogId)

  const runtimeDialog = ref<IRuntimeDialog | null>(null)
  const messages = ref<ChatMessage[]>([])
  const draft = ref('')
  const isInitializing = ref(true)
  const isSending = ref(false)
  const errorMessage = ref('')
  const currentConversationId = ref('')
  const streamAbortController = ref<AbortController | null>(null)

  const prologue = computed(() => getDialogPrologue(runtimeDialog.value))
  const canSend = computed(
    () => !isInitializing.value && !isSending.value && draft.value.trim().length > 0,
  )

  function persistConversationId(conversationId: string) {
    currentConversationId.value = conversationId
    localStorage.setItem(storageKey, conversationId)
  }

  function clearConversationId() {
    currentConversationId.value = ''
    localStorage.removeItem(storageKey)
  }

  async function createFreshConversation() {
    const conversationId = generateConversationId()
    const conversationName = buildConversationName(
      runtimeDialog.value?.name || '新对话',
    )

    const conversation = await createFlowConversation({
      dialogId,
      conversationId,
      name: conversationName,
    })

    persistConversationId(conversation.id)
    messages.value = buildInitialMessages(prologue.value)
    return conversation.id
  }

  async function hydrateConversation(conversationId: string) {
    const conversation = await fetchFlowConversation(conversationId)
    persistConversationId(conversationId)
    messages.value = mapConversationToChatMessages(conversation, prologue.value)
  }

  async function bootstrapConversation() {
    const storedConversationId = localStorage.getItem(storageKey)

    if (storedConversationId) {
      try {
        await hydrateConversation(storedConversationId)
        return
      } catch {
        clearConversationId()
      }
    }

    await createFreshConversation()
  }

  async function initialize() {
    isInitializing.value = true
    errorMessage.value = ''

    try {
      runtimeDialog.value = await fetchRuntimeDialog(dialogId)
      await bootstrapConversation()
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
      messages.value = []
    } finally {
      isInitializing.value = false
    }
  }

  function updateAssistantMessage(clientId: string, answer: IAnswer) {
    const message = messages.value.find((item) => item.clientId === clientId)
    if (!message) {
      return
    }

    message.content = answer.answer ?? message.content
    message.reference = normalizeReference(answer.reference)
    message.streaming = true
  }

  async function sendMessage() {
    const content = draft.value.trim()
    if (!content || isSending.value) {
      return
    }

    if (!currentConversationId.value) {
      await createFreshConversation()
    }

    errorMessage.value = ''

    const userMessage: ChatMessage = {
      clientId: buildClientId('user'),
      role: 'user',
      content,
    }
    const assistantMessageId = buildClientId('assistant')
    const assistantMessage: ChatMessage = {
      clientId: assistantMessageId,
      role: 'assistant',
      content: '',
      streaming: true,
    }

    messages.value = [...messages.value, userMessage, assistantMessage]
    draft.value = ''
    isSending.value = true

    const controller = new AbortController()
    streamAbortController.value = controller

    try {
      await runFlowCompletion({
        conversationId: currentConversationId.value,
        dialogId,
        query: content,
        signal: controller.signal,
        onAnswer: (answer) => updateAssistantMessage(assistantMessageId, answer),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      const assistant = messages.value.find(
        (item) => item.clientId === assistantMessageId,
      )

      if (assistant && !assistant.content) {
        assistant.content = getErrorMessage(error)
      }

      errorMessage.value = getErrorMessage(error)
    } finally {
      const assistant = messages.value.find(
        (item) => item.clientId === assistantMessageId,
      )
      if (assistant) {
        assistant.streaming = false
      }

      streamAbortController.value = null
      isSending.value = false
    }
  }

  function stopStreaming() {
    streamAbortController.value?.abort()
    streamAbortController.value = null
    isSending.value = false
    const latestAssistant = [...messages.value]
      .reverse()
      .find((item) => item.role === 'assistant' && item.streaming)
    if (latestAssistant) {
      latestAssistant.streaming = false
    }
  }

  onMounted(() => {
    void initialize()
  })

  return {
    draft,
    messages,
    prologue,
    runtimeDialog,
    isInitializing,
    isSending,
    errorMessage,
    canSend,
    sendMessage,
    stopStreaming,
    retryInitialize: initialize,
  }
}
