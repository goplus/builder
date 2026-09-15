<script setup lang="ts">
import { computed, defineComponent, h, markRaw } from 'vue'

import MarkdownView from '@/components/common/markdown-vue/MarkdownView'
import { UIButton } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    value: string
    compact?: boolean
    time?: string | null
    timeTitle?: string | null
    timeValue?: string | null
  }>(),
  { compact: false, time: null, timeTitle: null, timeValue: null }
)

const emit = defineEmits<{
  preview: [attachment: { name: string; url: string }]
}>()

function isImageAttachmentURL(value: string) {
  if (value.startsWith('blob:') || value.startsWith('data:image/')) return true
  try {
    return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(new URL(value, 'http://localhost').pathname)
  } catch {
    return false
  }
}

const NotificationMarkdownLink = defineComponent({
  name: 'NotificationMarkdownLink',
  props: {
    href: { type: String, required: true },
    title: { type: String, default: undefined }
  },
  setup(linkProps, { slots }) {
    return () => {
      if (!isImageAttachmentURL(linkProps.href)) {
        return h('a', { href: linkProps.href, title: linkProps.title }, slots.default?.())
      }
      return h(
        UIButton,
        {
          type: 'white',
          size: 'small',
          onClick: (event: MouseEvent) => {
            const button = event.currentTarget
            const name = button instanceof HTMLElement ? button.textContent?.trim() : null
            emit('preview', { name: name || 'Attachment', url: linkProps.href })
          }
        },
        { default: () => slots.default?.() }
      )
    }
  }
})

const NotificationMarkdownTime = defineComponent({
  name: 'NotificationMarkdownTime',
  setup() {
    return () =>
      h(
        'time',
        {
          class: 'notification-time',
          datetime: props.timeValue ?? undefined,
          title: props.timeTitle ?? undefined
        },
        props.time
      )
  }
})

const markdownComponents = markRaw({
  custom: {
    a: NotificationMarkdownLink,
    'notification-time': NotificationMarkdownTime
  }
})

const renderedValue = computed(() => {
  if (props.compact || props.time == null) return props.value
  const timeMarker = '<notification-time></notification-time>'
  const quoteStart = props.value.search(/^>/m)
  if (quoteStart < 0) return `${props.value.trim()}\n\n${timeMarker}`
  return `${props.value.slice(0, quoteStart).trim()}\n\n${timeMarker}\n\n${props.value.slice(quoteStart).trim()}`
})
</script>

<template>
  <div class="notification-content" :class="{ compact }">
    <MarkdownView class="notification-markdown" :value="renderedValue" :components="markdownComponents" />
  </div>
</template>

<style scoped>
.notification-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-markdown {
  display: flex;
  flex-direction: column;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 22px;
  overflow-wrap: anywhere;
}

.notification-markdown :deep(> * + *) {
  margin-top: 16px;
}

.notification-markdown :deep(> p:has(> button)) {
  margin-top: 12px;
}

.notification-markdown :deep(> p:has(> .notification-time)) {
  margin-top: 8px;
}

.notification-markdown :deep(h1),
.notification-markdown :deep(h2),
.notification-markdown :deep(h3),
.notification-markdown :deep(h4),
.notification-markdown :deep(h5),
.notification-markdown :deep(h6) {
  color: var(--ui-color-title);
  font-weight: 500;
}

.notification-markdown :deep(h1) {
  font-size: 18px;
  line-height: 26px;
}

.notification-markdown :deep(h2) {
  font-size: 16px;
  line-height: 24px;
}

.notification-markdown :deep(h3),
.notification-markdown :deep(h4),
.notification-markdown :deep(h5),
.notification-markdown :deep(h6) {
  font-size: 14px;
  line-height: 22px;
}

.notification-markdown :deep(ul),
.notification-markdown :deep(ol) {
  padding-inline-start: 20px;
}

.notification-markdown :deep(ul) {
  list-style: disc;
}

.notification-markdown :deep(ol) {
  list-style: decimal;
}

.notification-markdown :deep(li + li) {
  margin-top: 6px;
}

.notification-markdown :deep(blockquote) {
  padding: 12px 16px;
  border-inline-start: 3px solid var(--ui-color-grey-600);
  border-radius: 0 8px 8px 0;
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-900);
  font-size: 12px;
  line-height: 18px;
}

.notification-markdown :deep(blockquote > * + *) {
  margin-top: 8px;
}

.notification-markdown :deep(blockquote > :first-child + *) {
  margin-top: 4px;
}

.notification-markdown :deep(blockquote > :first-child) {
  font-size: 14px;
  line-height: 22px;
}

.notification-markdown :deep(a) {
  color: var(--ui-color-turquoise-600);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.notification-markdown :deep(code) {
  padding: 2px 4px;
  border: 1px solid var(--ui-color-grey-500);
  border-radius: 4px;
  background: var(--ui-color-grey-300);
  font-family: var(--ui-font-family-code);
  font-size: 0.92em;
}

.notification-markdown :deep(.notification-time) {
  color: var(--ui-color-grey-700);
  font-size: 12px;
  line-height: 18px;
}

.notification-content.compact {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  color: var(--ui-color-grey-800);
  font-size: 12px;
  line-height: 18px;
}

.notification-content.compact :deep(*) {
  display: inline;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.notification-content.compact :deep(a),
.notification-content.compact :deep(button) {
  pointer-events: none;
}

.notification-content.compact :deep(blockquote::before) {
  content: ' ';
}
</style>
