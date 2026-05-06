<script setup lang="ts">
import { computed } from 'vue'

import type { Docagg } from '../types/chat'
import { buildDocumentDownloadUrl } from '../utils/chat'

const props = withDefaults(
  defineProps<{
    document: Docagg
    className?: string
    prefix?: string
  }>(),
  {
    className: '',
    prefix: 'document',
  },
)

const href = computed(() =>
  buildDocumentDownloadUrl(props.document, props.prefix),
)
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noreferrer"
    :class="className"
    class="document-link"
  >
    <slot>
      {{ document.doc_name }}
    </slot>
  </a>
</template>

<style scoped>
.document-link {
  color: rgb(15, 79, 170);
  word-break: break-all;
  text-decoration: none;
}

.document-link:hover {
  text-decoration: underline;
}
</style>
