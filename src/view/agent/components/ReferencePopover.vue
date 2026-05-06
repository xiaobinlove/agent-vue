<script setup lang="ts">
import DOMPurify from 'dompurify'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { fetchDocumentThumbnails } from '../services/flow-agent'
import type { IReference } from '../types/chat'
import {
  buildImageUrl,
  getReferenceChunk,
  isImageReference,
  pickDocumentByChunk,
  resolveAgentAssetUrl,
} from '../utils/chat'

const props = defineProps<{
  reference?: IReference
  referenceIndex: number
}>()

const open = ref(false)
const thumbnailSrc = ref('')

const chunk = computed(() => getReferenceChunk(props.reference, props.referenceIndex))
const documentInfo = computed(() => pickDocumentByChunk(props.reference, chunk.value))
const imageSrc = computed(() => buildImageUrl(chunk.value?.image_id))
const isImageTrigger = computed(() => isImageReference(chunk.value?.doc_type))
const sanitizedContent = computed(() =>
  DOMPurify.sanitize(chunk.value?.content ?? ''),
)

async function loadThumbnail() {
  const documentId = documentInfo.value?.doc_id
  if (!documentId) {
    thumbnailSrc.value = ''
    return
  }

  try {
    const thumbnails = await fetchDocumentThumbnails([documentId])
    thumbnailSrc.value = resolveAgentAssetUrl(thumbnails[documentId])
  } catch {
    thumbnailSrc.value = ''
  }
}

function closeOnDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target?.closest('.reference-popover')) {
    open.value = false
  }
}

function togglePopover() {
  open.value = !open.value
}

function openPopover() {
  open.value = true
}

function closePopover() {
  open.value = false
}

watch(
  () => documentInfo.value?.doc_id,
  () => {
    void loadThumbnail()
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('click', closeOnDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeOnDocumentClick)
})
</script>

<template>
  <span
    class="reference-popover"
    @mouseenter="openPopover"
    @mouseleave="closePopover"
  >
    <button
      class="reference-trigger"
      type="button"
      @click.stop="togglePopover"
    >
      <img
        v-if="isImageTrigger && imageSrc"
        :src="imageSrc"
        alt="引用图片"
        class="reference-trigger-image"
      >
      <span
        v-else
        class="reference-trigger-icon"
        aria-label="查看引用"
      >
        i
      </span>
    </button>

    <div
      v-if="open && chunk"
      class="reference-panel"
      @click.stop
    >
      <img
        v-if="imageSrc"
        :src="imageSrc"
        alt="引用预览"
        class="reference-image-preview"
      >

      <div
        v-if="sanitizedContent"
        class="reference-content"
        v-html="sanitizedContent"
      />

      <div
        v-if="documentInfo"
        class="reference-document"
      >
        <img
          v-if="thumbnailSrc"
          :src="thumbnailSrc"
          alt="文档缩略图"
          class="reference-document-thumbnail"
        >
        <a
          v-if="documentInfo.url"
          :href="documentInfo.url"
          target="_blank"
          rel="noreferrer noopener"
          class="reference-document-link"
        >
          {{ documentInfo.doc_name }}
        </a>
        <span
          v-else
          class="reference-document-name"
        >
          {{ documentInfo.doc_name }}
        </span>
      </div>
    </div>
  </span>
</template>

<style scoped>
.reference-popover {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

.reference-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.reference-trigger-icon {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(27, 104, 252, 0.12);
  color: #1b68fc;
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.reference-trigger-image {
  display: block;
  max-width: 108px;
  max-height: 72px;
  border-radius: 10px;
  object-fit: cover;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
}

.reference-panel {
  position: absolute;
  left: 0;
  bottom: calc(100% + 10px);
  z-index: 30;
  width: min(360px, 72vw);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
  padding: 14px;
  backdrop-filter: blur(16px);
}

.reference-image-preview {
  display: block;
  width: 100%;
  max-height: 200px;
  border-radius: 12px;
  object-fit: contain;
  background: #eef4ff;
}

.reference-content {
  max-height: 220px;
  overflow: auto;
  margin-top: 10px;
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}

.reference-content :deep(p) {
  margin: 0 0 8px;
}

.reference-content :deep(p:last-child) {
  margin-bottom: 0;
}

.reference-document {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

.reference-document-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  background: #eff6ff;
}

.reference-document-link,
.reference-document-name {
  color: #1d4ed8;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.reference-document-link {
  text-decoration: none;
}

.reference-document-link:hover {
  text-decoration: underline;
}
</style>
