<script setup lang="ts">
import { computed } from 'vue'

import type { ChatMessage } from '../types/chat'
import { getReferenceDocuments } from '../utils/chat'
import DocumentLink from './DocumentLink.vue'
import FileIcon from './FileIcon.vue'
import MarkdownContent from './MarkdownContent.vue'

const props = defineProps<{
  message: ChatMessage
}>()

const isAssistant = computed(() => props.message.role === 'assistant')
const referenceDocuments = computed(() =>
  getReferenceDocuments(props.message.reference),
)
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
        'message-bubble--with-documents': isAssistant && referenceDocuments.length > 0,
      }"
    >
      <div class="message-content">
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

      <div
        v-if="isAssistant && referenceDocuments.length > 0"
        class="message-documents"
      >
        <DocumentLink
          v-for="document in referenceDocuments"
          :key="document.doc_id"
          :document="document"
          class-name="message-document-link"
        >
          <FileIcon
            :id="document.doc_id"
            :name="document.doc_name"
          />
          <span class="message-document-name">{{ document.doc_name }}</span>
        </DocumentLink>
      </div>
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
  overflow: hidden;
}

.message-bubble--assistant {
  background: #f7f8fa;
  color: #1e293b;
}

.message-bubble--user {
  background: rgba(27, 104, 252, 0.1);
  color: #0f172a;
}

.message-bubble--with-documents {
  padding: 14px 0 0;
}

.message-content {
  padding: 0;
}

.message-bubble--with-documents .message-content {
  padding: 0 16px 16px;
}

.streaming-placeholder {
  color: #475569;
  font-size: 14px;
}

.message-documents {
  display: block;
  margin-top: 4px;
}

:deep(.message-document-link) {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px 20px 16px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

:deep(.message-document-link:first-child) {
  border-top: none;
}

:deep(.message-document-link:hover) {
  background: rgba(15, 79, 170, 0.035);
}

.message-document-name {
  min-width: 0;
  color: rgb(15, 79, 170);
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
}

@media (max-width: 768px) {
  .message-bubble {
    max-width: 100%;
    border-radius: 18px;
    padding: 12px 14px;
  }

  .message-bubble--with-documents {
    padding: 12px 0 0;
  }

  .message-bubble--with-documents .message-content {
    padding: 0 14px 14px;
  }

  :deep(.message-document-link) {
    padding: 12px 16px 14px;
  }
}
</style>
