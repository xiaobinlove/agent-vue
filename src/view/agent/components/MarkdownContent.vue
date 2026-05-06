<script setup lang="ts">
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import markdownit from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import {
  Fragment,
  computed,
  defineComponent,
  h,
  type VNodeChild,
} from 'vue'

import type { IReference } from '../types/chat'
import {
  CURRENT_REFERENCE_REG,
  getReferenceChunk,
  preprocessMarkdownContent,
} from '../utils/chat'
import ReferencePopover from './ReferencePopover.vue'

const props = defineProps<{
  content: string
  reference?: IReference
}>()

function createMarkdownRenderer() {
  const md = markdownit({
    html: true,
    linkify: true,
    breaks: true,
    highlight(code: string, language: string) {
      if (language && hljs.getLanguage(language)) {
        return `<pre class="hljs"><code>${hljs.highlight(code, {
          language,
          ignoreIllegals: true,
        }).value}</code></pre>`
      }

      return `<pre class="hljs"><code>${hljs.highlightAuto(code).value}</code></pre>`
    },
  })

  md.use(taskLists, { enabled: true, label: true, labelAfter: true })
  md.use(texmath, {
    engine: katex,
    delimiters: 'dollars',
    katexOptions: { throwOnError: false },
  })

  md.core.ruler.after('inline', 'reference-citation', (state: any) => {
    state.tokens.forEach((token: any) => {
      if (token.type !== 'inline' || !token.children) {
        return
      }

      const nextChildren = token.children.flatMap((child: any) => {
        if (child.type !== 'text') {
          return [child]
        }

        const content = child.content
        if (!CURRENT_REFERENCE_REG.test(content)) {
          CURRENT_REFERENCE_REG.lastIndex = 0
          return [child]
        }

        CURRENT_REFERENCE_REG.lastIndex = 0
        const fragments = [] as typeof token.children
        let lastIndex = 0
        let match: RegExpExecArray | null = null

        while ((match = CURRENT_REFERENCE_REG.exec(content))) {
          if (match.index > lastIndex) {
            const textToken = new state.Token('text', '', 0)
            textToken.content = content.slice(lastIndex, match.index)
            fragments.push(textToken)
          }

          const htmlToken = new state.Token('html_inline', '', 0)
          htmlToken.content = `<span data-reference-index="${match[1]}"></span>`
          fragments.push(htmlToken)
          lastIndex = match.index + match[0].length
        }

        if (lastIndex < content.length) {
          const textToken = new state.Token('text', '', 0)
          textToken.content = content.slice(lastIndex)
          fragments.push(textToken)
        }

        return fragments
      })

      token.children = nextChildren
    })
  })

  return md
}

const markdown = createMarkdownRenderer()

const renderedNodes = computed(() => {
  const processed = preprocessMarkdownContent(props.content)
  if (!processed.trim()) {
    return [] as VNodeChild[]
  }

  const html = markdown.render(processed)
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-reference-index', 'target', 'rel'],
  })
  const documentNode = new DOMParser().parseFromString(sanitized, 'text/html')

  function toVNodes(node: Node, key: string): VNodeChild[] {
    if (node.nodeType === Node.TEXT_NODE) {
      return [node.textContent || '']
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return []
    }

    const element = node as HTMLElement
    const referenceIndex = element.dataset.referenceIndex
    if (referenceIndex !== undefined) {
      const chunk = getReferenceChunk(props.reference, Number(referenceIndex))
      if (!chunk) {
        return [`[ID:${referenceIndex}]`]
      }

      return [
        h(ReferencePopover, {
          key,
          reference: props.reference,
          referenceIndex: Number(referenceIndex),
        }),
      ]
    }

    const tag = element.tagName.toLowerCase()
    const attributes = Array.from(element.attributes).reduce<Record<string, unknown>>(
      (result, attribute) => {
        result[attribute.name] = attribute.value
        return result
      },
      {},
    )

    if (tag === 'a') {
      attributes.target = '_blank'
      attributes.rel = 'noreferrer noopener'
    }

    if (tag === 'input' && element.getAttribute('type') === 'checkbox') {
      attributes.checked = element.hasAttribute('checked')
      attributes.disabled = true
    }

    const children = Array.from(element.childNodes).flatMap((childNode, index) =>
      toVNodes(childNode, `${key}-${index}`),
    )

    return [h(tag, { ...attributes, key }, children)]
  }

  return Array.from(documentNode.body.childNodes).flatMap((node, index) =>
    toVNodes(node, `markdown-${index}`),
  )
})

const RenderContent = defineComponent({
  name: 'RenderedMarkdownContent',
  setup() {
    return () => h(Fragment, renderedNodes.value)
  },
})
</script>

<template>
  <div class="markdown-content">
    <RenderContent />
  </div>
</template>

<style scoped>
.markdown-content {
  color: inherit;
  font-size: 15px;
  line-height: 1.8;
  word-break: break-word;
}

.markdown-content :deep(p),
.markdown-content :deep(ul),
.markdown-content :deep(ol),
.markdown-content :deep(blockquote),
.markdown-content :deep(pre),
.markdown-content :deep(table) {
  margin: 0 0 14px;
}

.markdown-content :deep(p:last-child),
.markdown-content :deep(ul:last-child),
.markdown-content :deep(ol:last-child),
.markdown-content :deep(blockquote:last-child),
.markdown-content :deep(pre:last-child),
.markdown-content :deep(table:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(section.think) {
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 2px solid #d6d3d1;
  color: #6b7280;
  font-size: 14px;
}

.markdown-content :deep(blockquote) {
  padding-left: 14px;
  border-left: 4px solid rgba(148, 163, 184, 0.7);
  color: #475569;
}

.markdown-content :deep(pre) {
  overflow: auto;
  border-radius: 16px;
  background: #0f172a;
  padding: 14px 16px;
}

.markdown-content :deep(code) {
  font-family:
    'SFMono-Regular',
    ui-monospace,
    'Cascadia Code',
    'Source Code Pro',
    monospace;
}

.markdown-content :deep(p code),
.markdown-content :deep(li code) {
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.06);
  padding: 0.16em 0.38em;
  font-size: 0.92em;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 12px;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid rgba(203, 213, 225, 0.8);
  padding: 10px 12px;
  text-align: left;
}

.markdown-content :deep(th) {
  background: rgba(226, 232, 240, 0.55);
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 1.4em;
}

.markdown-content :deep(a) {
  color: #2563eb;
}

.markdown-content :deep(img) {
  max-width: 100%;
  border-radius: 12px;
}

.markdown-content :deep(.contains-task-list) {
  list-style: none;
  padding-left: 0;
}

.markdown-content :deep(.task-list-item) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.markdown-content :deep(.task-list-item-checkbox) {
  margin-top: 0.38em;
}
</style>
