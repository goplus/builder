<script lang="ts">
import { imgExts } from '@/utils/file'
import { extname } from '@/utils/path'

function isImageUrl(url: string) {
  const path = url.split(/[?#]/, 1)[0]
  return imgExts.includes(extname(path).slice(1).toLowerCase())
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

import { Cancelled } from '@/utils/exception'
import { UniversalUrlScheme } from '@/utils/universal-url'
import { useAsyncComputed } from '@/utils/utils'
import { cloudHelpers } from '@/models/common/cloud'
import { useModal } from '@/components/ui'
import NotificationImagePreviewModal from './NotificationImagePreviewModal.vue'

const props = withDefaults(
  defineProps<{
    /** Missing if `MarkdownView` dropped an unsafe URL */
    href?: string | null
    title?: string | null
  }>(),
  { href: null, title: null }
)

const webUrl = useAsyncComputed(async () => {
  if (props.href == null) return null
  if (!props.href.startsWith(`${UniversalUrlScheme.Kodo}:`)) return props.href
  return cloudHelpers.universalUrlToWebUrl(props.href)
})
const isImage = computed(() => props.href != null && isImageUrl(props.href))
const previewImage = useModal(NotificationImagePreviewModal)

function handleImageClick(event: MouseEvent) {
  event.preventDefault()
  if (webUrl.value == null) return
  const name = props.title ?? (event.currentTarget as HTMLElement).textContent ?? ''
  previewImage({ name, url: webUrl.value }).catch((e) => {
    // Closing the preview rejects with `Cancelled`
    if (!(e instanceof Cancelled)) throw e
  })
}
</script>

<template>
  <span v-if="href == null"><slot></slot></span>
  <a
    v-else-if="isImage"
    class="notification-image-link block w-fit max-w-full cursor-zoom-in truncate"
    :href="webUrl ?? undefined"
    :title="title ?? undefined"
    @click="handleImageClick"
    ><slot></slot
  ></a>
  <a v-else :href="webUrl ?? undefined" :title="title ?? undefined"><slot></slot></a>
</template>
