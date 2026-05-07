<script setup lang="ts">
import { computed } from 'vue'

import type { IConversation } from '../types/chat'
import {
  DEFAULT_CONVERSATION_NAME,
  getConversationDisplayName,
  getConversationTimestamp,
} from '../utils/chat'

const props = withDefaults(
  defineProps<{
    conversations: IConversation[]
    currentConversationId: string
    loading?: boolean
    creating?: boolean
    removingConversationId?: string
    disabled?: boolean
  }>(),
  {
    loading: false,
    creating: false,
    removingConversationId: '',
    disabled: false,
  },
)

const emit = defineEmits<{
  create: []
  select: [conversationId: string]
  remove: [conversationId: string]
}>()

const hasConversations = computed(() => props.conversations.length > 0)

function formatConversationTime(conversation: IConversation) {
  const timestamp = getConversationTimestamp(conversation)
  if (!timestamp) {
    return '--'
  }

  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function handleSelect(conversationId: string) {
  if (props.disabled) {
    return
  }

  emit('select', conversationId)
}

function handleRemove(conversationId: string) {
  if (props.disabled) {
    return
  }

  emit('remove', conversationId)
}
</script>

<template>
  <aside class="conversation-sidebar">
    <button
      type="button"
      class="create-conversation"
      :disabled="disabled || creating"
      @click="$emit('create')"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        class="create-conversation-icon"
      >
        <path
          d="M8 3.25a.75.75 0 0 1 .75.75v3.25H12a.75.75 0 0 1 0 1.5H8.75V12a.75.75 0 0 1-1.5 0V8.75H4a.75.75 0 0 1 0-1.5h3.25V4A.75.75 0 0 1 8 3.25Z"
        />
      </svg>
      <span>{{ creating ? '创建中...' : '新对话' }}</span>
    </button>

    <div class="conversation-list">
      <div
        v-if="loading && !hasConversations"
        class="conversation-status"
      >
        正在加载会话...
      </div>

      <div
        v-else-if="!hasConversations"
        class="conversation-status"
      >
        暂无会话
      </div>

      <article
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-card"
      >
        <div class="conversation-time">
          {{ formatConversationTime(conversation) }}
        </div>
        <div
          class="conversation-item"
          :class="{
            'conversation-item--active': conversation.id === currentConversationId,
            'conversation-item--disabled':
              disabled && conversation.id !== currentConversationId,
          }"
          @click="handleSelect(conversation.id)"
          @keydown.enter.prevent="handleSelect(conversation.id)"
          @keydown.space.prevent="handleSelect(conversation.id)"
          :tabindex="disabled && conversation.id !== currentConversationId ? -1 : 0"
          role="button"
        >
          <span class="conversation-item-icon">
            <svg
              v-if="conversation.id === currentConversationId"
              viewBox="0 0 14 14"
              aria-hidden="true"
            >
              <path
                d="M1.75 3.5a1.75 1.75 0 0 1 1.75-1.75h4.603a1.75 1.75 0 0 1 1.238.513l2.396 2.396c.328.328.513.773.513 1.237V10.5a1.75 1.75 0 0 1-1.75 1.75H3.5a1.75 1.75 0 0 1-1.75-1.75v-7Z"
                fill="currentColor"
              />
            </svg>
            <svg
              v-else
              viewBox="0 0 14 14"
              aria-hidden="true"
            >
              <path
                d="M3.5 2.25h4.603a.75.75 0 0 1 .53.22l2.396 2.396a.75.75 0 0 1 .221.53V10.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Zm4.293 1.5H3.5a.25.25 0 0 0-.25.25v6.5c0 .138.112.25.25.25h6.75a.25.25 0 0 0 .25-.25V5.707H8.75A.75.75 0 0 1 8 4.957V3.75h-.207Zm1.707 1.147L9.103 4.5H9.5v.397Z"
                fill="currentColor"
              />
            </svg>
          </span>

          <span class="conversation-name">
            {{ getConversationDisplayName(conversation) || DEFAULT_CONVERSATION_NAME }}
          </span>

          <span class="conversation-actions">
            <button
              type="button"
              class="conversation-remove"
              :disabled="disabled || removingConversationId === conversation.id"
              @click.stop="handleRemove(conversation.id)"
            >
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M6 2.75A1.75 1.75 0 0 1 7.75 1h.5A1.75 1.75 0 0 1 10 2.75V3h2.25a.75.75 0 0 1 0 1.5h-.568l-.57 7.406A1.75 1.75 0 0 1 9.367 13.5H6.633a1.75 1.75 0 0 1-1.744-1.594L4.318 4.5H3.75a.75.75 0 0 1 0-1.5H6v-.25Zm1.5.25v-.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25V3H7.5Zm-1.107 1.5.49 6.37a.25.25 0 0 0 .249.23h2.736a.25.25 0 0 0 .249-.23l.49-6.37H6.393Z"
                />
              </svg>
              <span class="sr-only">
                {{ removingConversationId === conversation.id ? '删除中' : '删除会话' }}
              </span>
            </button>
          </span>
        </div>
      </article>
    </div>
  </aside>
</template>

<style scoped>
.conversation-sidebar {
  display: flex;
  min-height: 0;
  width: 260px;
  flex: 0 0 260px;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 20px;
  background: #fff;
  padding: 14px 10px 10px;
  overflow: hidden;
}

.create-conversation {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  border: 1px solid #1b68fc;
  border-radius: 999px;
  background: linear-gradient(99deg, rgba(108, 71, 239, 0.08) 0%, rgba(27, 104, 252, 0.08) 100%);
  color: #1b68fc;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
}

.create-conversation:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.create-conversation-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.conversation-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  margin-top: 20px;
  padding-right: 2px;
}

.conversation-status {
  display: flex;
  min-height: 120px;
  align-items: center;
  justify-content: center;
  color: #85888f;
  font-size: 13px;
}

.conversation-card {
  margin-bottom: 20px;
}

.conversation-card:last-child {
  margin-bottom: 0;
}

.conversation-time {
  margin-bottom: 6px;
  color: #85888f;
  font-size: 12px;
  line-height: 16px;
}

.conversation-item {
  display: flex;
  width: 100%;
  align-items: center;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #242424;
  cursor: pointer;
  padding: 10px;
  position: relative;
  text-align: left;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.conversation-item:hover,
.conversation-item--active {
  background: linear-gradient(99deg, rgba(108, 71, 239, 0.08) 0%, rgba(27, 104, 252, 0.08) 100%);
}

.conversation-item--disabled {
  cursor: not-allowed;
}

.conversation-item:focus-visible {
  outline: 2px solid rgba(27, 104, 252, 0.35);
  outline-offset: 2px;
}

.conversation-item-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  margin-right: 6px;
  color: #64748b;
}

.conversation-item--active .conversation-item-icon,
.conversation-item--active .conversation-name {
  color: #1b68fc;
}

.conversation-item-icon svg {
  width: 14px;
  height: 14px;
}

.conversation-name {
  min-width: 0;
  flex: 1;
  color: #242424;
  font-size: 14px;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 28px;
  flex: 0 0 28px;
}

.conversation-remove {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.conversation-item:hover .conversation-remove,
.conversation-item--active .conversation-remove {
  opacity: 1;
}

.conversation-remove:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.06);
  color: #334155;
}

.conversation-remove:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.conversation-remove svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 768px) {
  .conversation-sidebar {
    width: 100%;
    flex: 0 0 auto;
    border-radius: 18px;
    padding: 14px 12px 12px;
  }

  .conversation-list {
    max-height: 220px;
    margin-top: 16px;
  }

  .conversation-remove {
    opacity: 1;
  }
}
</style>
