<script setup lang="ts">
import { computed } from 'vue'

import MessageList from './components/MessageList.vue'
import { useFlowChat } from './composables/useFlowChat'

const {
  draft,
  messages,
  isInitializing,
  isSending,
  errorMessage,
  canSend,
  sendMessage,
  stopStreaming,
  retryInitialize,
} = useFlowChat()

const hasRenderableMessages = computed(() => messages.value.length > 0)

function handleTextareaKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) {
    return
  }

  event.preventDefault()
  if (canSend.value) {
    void sendMessage()
  }
}
</script>

<template>
  <div class="agent-view">
    <div class="chat-shell">
      <div
        v-if="errorMessage && !hasRenderableMessages && !isInitializing"
        class="chat-error"
      >
        <div class="chat-error-title">流程智能体加载失败</div>
        <p class="chat-error-text">
          {{ errorMessage }}
        </p>
        <button
          class="chat-error-button"
          type="button"
          @click="retryInitialize"
        >
          重新加载
        </button>
      </div>

      <MessageList
        v-else
        :messages="messages"
        :loading="isInitializing"
      />

      <div class="composer">
        <div
          v-if="errorMessage && hasRenderableMessages"
          class="composer-error"
        >
          {{ errorMessage }}
        </div>

        <textarea
          v-model="draft"
          class="composer-input"
          :disabled="isInitializing"
          placeholder="输入你的问题，流程智能体会按当前流程为你处理..."
          rows="1"
          @keydown="handleTextareaKeydown"
        />

        <div class="composer-footer">
          <div class="composer-tip">
            {{ isSending ? '正在输出，点击停止可中断当前回答。' : 'Enter 发送，Shift + Enter 换行。' }}
          </div>

          <button
            v-if="isSending"
            type="button"
            class="composer-button composer-button--secondary"
            @click="stopStreaming"
          >
            停止
          </button>
          <button
            v-else
            type="button"
            class="composer-button composer-button--primary"
            :disabled="!canSend"
            @click="sendMessage"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-view {
  height: 100dvh;
  padding: 20px;
  overflow: hidden;
}

.chat-shell {
  display: flex;
  height: calc(100dvh - 40px);
  min-height: calc(100dvh - 40px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(20px);
}

.chat-error {
  display: flex;
  min-height: 360px;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.chat-error-title {
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
}

.chat-error-text {
  margin: 12px 0 0;
  max-width: 560px;
  color: #64748b;
  line-height: 1.7;
}

.chat-error-button {
  margin-top: 18px;
  border: none;
  border-radius: 999px;
  background: #1d4ed8;
  color: #fff;
  cursor: pointer;
  padding: 10px 18px;
}

.composer {
  position: sticky;
  bottom: 0;
  z-index: 5;
  flex: 0 0 auto;
  border-top: 1px solid rgba(226, 232, 240, 0.92);
  padding: 18px 24px 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), #ffffff 48%);
}

.composer-error {
  margin-bottom: 10px;
  color: #dc2626;
  font-size: 13px;
}

.composer-input {
  width: 100%;
  min-height: 96px;
  resize: vertical;
  border: 1px solid rgba(191, 219, 254, 0.9);
  border-radius: 20px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  line-height: 1.7;
  padding: 16px 18px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.composer-input:focus {
  border-color: rgba(29, 78, 216, 0.72);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.composer-input:disabled {
  background: #f8fafc;
  color: #94a3b8;
}

.composer-footer {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.composer-tip {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.composer-button {
  min-width: 88px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 10px 18px;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease,
    background-color 0.2s ease;
}

.composer-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.composer-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.composer-button--primary {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #fff;
}

.composer-button--secondary {
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

@media (max-width: 768px) {
  .agent-view {
    padding: 0;
  }

  .chat-shell {
    height: 100dvh;
    min-height: 100dvh;
    border: none;
    border-radius: 0;
  }

  .composer {
    padding: 14px 16px 18px;
  }

  .composer-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .composer-button {
    align-self: flex-end;
  }
}
</style>
