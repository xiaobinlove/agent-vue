<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import type { ChatMessage } from '../types/chat'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  messages: ChatMessage[]
  loading?: boolean
  conversationId?: string
}>()

const listRef = ref<HTMLElement | null>(null)
const endRef = ref<HTMLDivElement | null>(null)

function scrollToBottom(behavior: ScrollBehavior = 'auto') {
  const listElement = listRef.value
  if (listElement) {
    listElement.scrollTo({
      top: listElement.scrollHeight,
      behavior,
    })
  }

  endRef.value?.scrollIntoView({ behavior, block: 'end' })
}

async function scrollAfterLayout(behavior: ScrollBehavior = 'auto') {
  await nextTick()

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollToBottom(behavior)
    })
  })
}

watch(
  () =>
    props.messages
      .map((message) => `${message.clientId}:${message.content.length}:${message.streaming ? 1 : 0}`)
      .join('|'),
  () => {
    void scrollAfterLayout('smooth')
  },
  { flush: 'post' },
)

watch(
  () => [props.conversationId, props.loading] as const,
  ([conversationId, loading], previousValue) => {
    const previousLoading = previousValue?.[1]

    if (!loading && (previousLoading || conversationId)) {
      void scrollAfterLayout('auto')
    }
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <section
    ref="listRef"
    class="message-list"
  >
    <div
      v-if="loading"
      class="message-list-status"
    >
      正在加载流程智能体...
    </div>

    <template v-else>
      <MessageItem
        v-for="message in messages"
        :key="message.clientId"
        :message="message"
      />
    </template>

    <div ref="endRef" />
  </section>
</template>

<style scoped>
.message-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
  padding: 28px 28px 12px;
}

.message-list-status {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 14px;
}

@media (max-width: 768px) {
  .message-list {
    padding: 18px 16px 8px;
    gap: 18px;
  }
}
</style>
