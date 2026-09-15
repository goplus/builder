<script setup lang="ts">
import { defineComponent, h, markRaw } from 'vue'

import MarkdownView from '@/components/common/markdown-vue/MarkdownView'

withDefaults(
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
        'a',
        {
          href: linkProps.href,
          title: linkProps.title,
          class: 'notification-attachment-link',
          onClick: (event: MouseEvent) => {
            event.preventDefault()
            const link = event.currentTarget
            const name = linkProps.title ?? (link instanceof HTMLElement ? link.textContent?.trim() : null)
            emit('preview', { name: name || 'Attachment', url: linkProps.href })
          }
        },
        slots.default?.()
      )
    }
  }
})

const markdownComponents = markRaw({
  custom: {
    a: NotificationMarkdownLink
  }
})
</script>

<template>
  <div class="notification-content" :class="{ compact }">
    <MarkdownView class="notification-markdown" :value="value" :components="markdownComponents" />
    <time
      v-if="!compact && time != null"
      class="notification-time"
      :datetime="timeValue ?? undefined"
      :title="timeTitle ?? undefined"
    >
      {{ time }}
    </time>
  </div>
</template>

<style scoped>
.notification-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.notification-markdown :deep(> p:has(> .notification-attachment-link)) {
  margin-top: 4px;
}

.notification-markdown :deep(> :not(p:has(> .notification-attachment-link)) + p:has(> .notification-attachment-link)) {
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
  padding: 8px 12px;
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

.notification-markdown :deep(blockquote > p:has(> .notification-attachment-link)) {
  margin-top: 4px;
}

.notification-markdown
  :deep(blockquote > :not(p:has(> .notification-attachment-link)) + p:has(> .notification-attachment-link)) {
  margin-top: 8px;
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

.notification-markdown :deep(.notification-attachment-link) {
  display: block;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: zoom-in;
}

.notification-markdown :deep(code) {
  padding: 2px 4px;
  border: 1px solid var(--ui-color-grey-500);
  border-radius: 4px;
  background: var(--ui-color-grey-300);
  font-family: var(--ui-font-family-code);
  font-size: 0.92em;
}

.notification-time {
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

.notification-content.compact :deep(a) {
  text-decoration: none;
}

.notification-content.compact :deep(blockquote),
.notification-content.compact :deep(blockquote > *),
.notification-content.compact :deep(blockquote > :first-child) {
  font-size: 12px;
  line-height: 18px;
}

.notification-content.compact :deep(blockquote::before) {
  content: ' ';
}
</style>
