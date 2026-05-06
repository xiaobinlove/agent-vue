<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { fetchDocumentThumbnails } from '../services/flow-agent'
import {
  getDocumentExtension,
  resolveAgentAssetUrl,
} from '../utils/chat'

const props = defineProps<{
  id: string
  name: string
}>()

const iconModules = import.meta.glob('../assets/file-icon/*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const iconMap = Object.entries(iconModules).reduce<Record<string, string>>(
  (result, [path, url]) => {
    const fileName = path.split('/').pop()?.replace('.svg', '') || ''
    result[fileName] = url
    return result
  },
  {},
)

const thumbnailSrc = ref('')

const extension = computed(() => getDocumentExtension(props.name))
const iconSrc = computed(
  () =>
    iconMap[extension.value] ||
    iconMap.docx ||
    Object.values(iconMap)[0] ||
    '',
)

async function loadThumbnail() {
  if (!props.id) {
    thumbnailSrc.value = ''
    return
  }

  try {
    const thumbnails = await fetchDocumentThumbnails([props.id])
    thumbnailSrc.value = resolveAgentAssetUrl(thumbnails[props.id])
  } catch {
    thumbnailSrc.value = ''
  }
}

watch(
  () => props.id,
  () => {
    void loadThumbnail()
  },
)

onMounted(() => {
  void loadThumbnail()
})
</script>

<template>
  <img
    v-if="thumbnailSrc"
    :src="thumbnailSrc"
    :alt="name"
    class="thumbnail-img"
  >
  <img
    v-else-if="iconSrc"
    :src="iconSrc"
    :alt="name"
    class="file-icon"
  >
</template>

<style scoped>
.thumbnail-img,
.file-icon {
  display: inline-block;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  object-fit: contain;
}
</style>
