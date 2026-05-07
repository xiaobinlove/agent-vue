import { computed, onMounted, ref } from 'vue'

import {
  createFlowConversation,
  fetchFlowConversation,
  listFlowConversations,
  removeFlowConversation,
  runFlowCompletion,
  updateFlowConversationName,
} from '../services/flow-agent'
import type { ChatMessage, IAnswer, IConversation } from '../types/chat'
import { getFlowDialogId } from '../utils/env'
import {
  DEFAULT_CONVERSATION_NAME,
  buildClientId,
  buildConversationName,
  buildConversationStorageKey,
  buildInitialMessages,
  generateConversationId,
  getConversationDisplayName,
  getErrorMessage,
  isDefaultConversationName,
  mapConversationToChatMessages,
  normalizeReference,
  normalizeConversation,
  sortConversations,
} from '../utils/chat'

export function useFlowChat() {
  const dialogId = getFlowDialogId()
  const storageKey = buildConversationStorageKey(dialogId)

  const conversations = ref<IConversation[]>([])
  const messages = ref<ChatMessage[]>([])
  const draft = ref('')
  const isInitializing = ref(true)
  const isSending = ref(false)
  const isCreatingConversation = ref(false)
  const removingConversationId = ref('')
  const errorMessage = ref('')
  const currentConversationId = ref('')
  const streamAbortController = ref<AbortController | null>(null)

  const currentConversation = computed(() =>
    conversations.value.find((item) => item.id === currentConversationId.value),
  )
  const currentConversationName = computed(() =>
    getConversationDisplayName(currentConversation.value),
  )
  const canSend = computed(
    () =>
      !isInitializing.value &&
      !isSending.value &&
      !isCreatingConversation.value &&
      !removingConversationId.value &&
      draft.value.trim().length > 0,
  )
  const isConversationActionDisabled = computed(
    () =>
      isInitializing.value ||
      isCreatingConversation.value ||
      Boolean(removingConversationId.value),
  )

  function persistConversationId(conversationId: string) {
    currentConversationId.value = conversationId
    localStorage.setItem(storageKey, conversationId)
  }

  function clearConversationId() {
    currentConversationId.value = ''
    localStorage.removeItem(storageKey)
  }

  function setConversationList(nextConversations: IConversation[]) {
    conversations.value = sortConversations(
      nextConversations.map((item) => normalizeConversation(item)),
    )
  }

  function upsertConversation(conversation: IConversation) {
    const nextConversations = conversations.value.filter(
      (item) => item.id !== conversation.id,
    )
    nextConversations.unshift(normalizeConversation(conversation))
    setConversationList(nextConversations)
  }

  function removeConversationFromList(conversationId: string) {
    setConversationList(
      conversations.value.filter((item) => item.id !== conversationId),
    )
  }

  async function createFreshConversation() {
    const conversationId = generateConversationId()
    const conversationName = buildConversationName(DEFAULT_CONVERSATION_NAME)

    const conversation = await createFlowConversation({
      dialogId,
      conversationId,
      name: conversationName,
    })

    upsertConversation({
      id: conversation.id,
      name: conversationName,
      create_time: conversation.create_time,
      createTime: conversation.createTime,
      message: [],
      reference: [],
    })
    persistConversationId(conversation.id)
    messages.value = buildInitialMessages()
    return conversation.id
  }

  async function hydrateConversation(conversationId: string) {
    const conversation = await fetchFlowConversation(conversationId)
    upsertConversation(conversation)
    persistConversationId(conversationId)
    messages.value = mapConversationToChatMessages(conversation)
  }

  async function loadConversationList() {
    const list = await listFlowConversations(dialogId)
    setConversationList(list)
    return conversations.value
  }

  async function bootstrapConversation() {
    const list = await loadConversationList()
    const storedConversationId = localStorage.getItem(storageKey)
    const storedConversationExists = storedConversationId
      ? list.some((item) => item.id === storedConversationId)
      : false
    const targetConversationId = storedConversationExists
      ? storedConversationId
      : list[0]?.id

    if (targetConversationId) {
      try {
        await hydrateConversation(targetConversationId)
        return
      } catch {
        if (storedConversationId === targetConversationId) {
          clearConversationId()
        }

        const fallbackConversation = list.find(
          (item) => item.id !== targetConversationId,
        )
        if (fallbackConversation) {
          await hydrateConversation(fallbackConversation.id)
          return
        }
      }
    }

    await createFreshConversation()
  }

  async function initialize() {
    isInitializing.value = true
    errorMessage.value = ''

    try {
      await bootstrapConversation()
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
      messages.value = []
    } finally {
      isInitializing.value = false
    }
  }

  async function selectConversation(conversationId: string) {
    if (
      !conversationId ||
      conversationId === currentConversationId.value ||
      isConversationActionDisabled.value
    ) {
      return
    }

    stopStreaming()
    isInitializing.value = true
    errorMessage.value = ''

    try {
      await hydrateConversation(conversationId)
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      isInitializing.value = false
    }
  }

  async function createConversation() {
    if (isConversationActionDisabled.value) {
      return
    }

    stopStreaming()
    isCreatingConversation.value = true
    errorMessage.value = ''

    try {
      await createFreshConversation()
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      isCreatingConversation.value = false
    }
  }

  async function renameConversationIfNeeded(content: string) {
    if (!currentConversationId.value || messages.value.length > 0) {
      return
    }

    if (!isDefaultConversationName(currentConversationName.value)) {
      return
    }

    const nextConversationName = buildConversationName(content)
    if (!nextConversationName || nextConversationName === DEFAULT_CONVERSATION_NAME) {
      return
    }

    upsertConversation({
      ...(currentConversation.value ?? { id: currentConversationId.value }),
      id: currentConversationId.value,
      name: nextConversationName,
    })

    try {
      await updateFlowConversationName(
        currentConversationId.value,
        nextConversationName,
      )
    } catch {
      // Keep optimistic title locally even if remote rename fails.
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
    void renameConversationIfNeeded(content)

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

  async function removeConversation(conversationId: string) {
    if (!conversationId || isConversationActionDisabled.value) {
      return
    }

    const isCurrentConversation = conversationId === currentConversationId.value
    const remainingConversations = conversations.value.filter(
      (item) => item.id !== conversationId,
    )

    removingConversationId.value = conversationId
    errorMessage.value = ''

    if (isCurrentConversation) {
      stopStreaming()
    }

    try {
      await removeFlowConversation(conversationId)
      removeConversationFromList(conversationId)

      if (!isCurrentConversation) {
        return
      }

      clearConversationId()
      isInitializing.value = true

      if (remainingConversations.length > 0) {
        try {
          await hydrateConversation(remainingConversations[0].id)
        } catch {
          await createFreshConversation()
        }
        return
      }

      await createFreshConversation()
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      removingConversationId.value = ''
      isInitializing.value = false
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
    conversations,
    currentConversationId,
    currentConversationName,
    draft,
    messages,
    isInitializing,
    isSending,
    isCreatingConversation,
    removingConversationId,
    isConversationActionDisabled,
    errorMessage,
    canSend,
    createConversation,
    selectConversation,
    removeConversation,
    sendMessage,
    stopStreaming,
    retryInitialize: initialize,
  }
}
