<script setup lang="ts">
import { computed } from 'vue'

import type { ChatMessage } from '../types/chat'
import MarkdownContent from './MarkdownContent.vue'

const props = defineProps<{
  message: ChatMessage
}>()

const isAssistant = computed(() => props.message.role === 'assistant')
</script>

<template>
  <article
    class="message-item"
    :class="{
      'message-item--assistant': isAssistant,
      'message-item--user': !isAssistant,
    }"
  >
    <div class="message-meta">
      {{ isAssistant ? '智能助手' : '我' }}
    </div>

    <div
      class="message-bubble"
      :class="{
        'message-bubble--assistant': isAssistant,
        'message-bubble--user': !isAssistant,
      }"
    >
      <div
        v-if="message.streaming && !message.content"
        class="streaming-placeholder"
      >
        正在思考...
      </div>
      <MarkdownContent
        v-else
        :content="message.content"
        :reference="message.reference"
      />
    </div>
  </article>
</template>

<style scoped>
.message-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-item--user {
  align-items: flex-end;
}

.message-item--assistant {
  align-items: flex-start;
}

.message-meta {
  color: #64748b;
  font-size: 12px;
  line-height: 1;
}

.message-bubble {
  max-width: min(860px, 100%);
  border-radius: 22px;
  padding: 14px 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.message-bubble--assistant {
  background: #f7f8fa;
  color: #1e293b;
}

.message-bubble--user {
  background: rgba(27, 104, 252, 0.1);
  color: #0f172a;
}

.streaming-placeholder {
  color: #475569;
  font-size: 14px;
}

@media (max-width: 768px) {
  .message-bubble {
    max-width: 100%;
    border-radius: 18px;
    padding: 12px 14px;
  }
}
</style>
