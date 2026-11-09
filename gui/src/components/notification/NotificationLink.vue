<script lang="ts">
import { imgExts } from '@/utils/file'
import { extname } from '@/utils/path'
import { UniversalUrlScheme } from '@/utils/universal-url'

/** Only images in Kodo are previewed, as other hosts may not allow the cross-origin isolated app to load images */
function isKodoImageUrl(url: string) {
  return url.startsWith(`${UniversalUrlScheme.Kodo}:`) && imgExts.includes(extname(url).slice(1).toLowerCase())
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

import { Cancelled } from '@/utils/exception'
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
const isImage = computed(() => props.href != null && isKodoImageUrl(props.href))
const previewImage = useModal(NotificationImagePreviewModal)

function handleImageClick(event: MouseEvent) {
  // Keep native behaviors such as opening the image in a new tab
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return
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
