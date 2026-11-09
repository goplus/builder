<script lang="ts">
import { markRaw } from 'vue'

import { humanizeExactTime, humanizeTime } from '@/utils/utils'
import MarkdownView from '@/components/common/markdown-vue/MarkdownView'
import NotificationLink from './NotificationLink.vue'
import NotificationImage from './NotificationImage.vue'

const components = markRaw({ link: NotificationLink, image: NotificationImage })
</script>

<script setup lang="ts">
defineProps<{
  /** Notification body in Markdown */
  value: string
  /** Time of the notification, shown after the body */
  time: string
}>()
</script>

<template>
  <div class="notification-content">
    <MarkdownView class="notification-markdown" :value="value" :components="components" complete />
    <time class="notification-time" :datetime="time" :title="$t(humanizeExactTime(time))">
      {{ $t(humanizeTime(time)) }}
    </time>
  </div>
</template>

<style scoped>
.notification-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

/* List images (rendered by `NotificationImage`) closer together */
.notification-markdown :deep(> p:has(> .notification-image-link)) {
  margin-top: 4px;
}

.notification-markdown :deep(> :not(p:has(> .notification-image-link)) + p:has(> .notification-image-link)) {
  margin-top: 8px;
}

/* A paragraph followed by a quote attributes the quote */
.notification-markdown :deep(> * + p:has(+ blockquote)) {
  margin-top: 24px;
}

.notification-markdown :deep(> p:has(+ blockquote)) {
  color: var(--ui-color-grey-700);
  font-size: 12px;
  line-height: 18px;
}

.notification-markdown :deep(> p + blockquote) {
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
  padding: 4px 12px;
  border-inline-start: 3px solid var(--ui-color-grey-400);
  border-radius: 0 8px 8px 0;
  color: var(--ui-color-grey-900);
  font-size: 13px;
  line-height: 20px;
}

.notification-markdown :deep(blockquote > * + *) {
  margin-top: 8px;
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

.notification-time {
  color: var(--ui-color-grey-700);
  font-size: 12px;
  line-height: 18px;
}
</style>
