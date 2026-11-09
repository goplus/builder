<script setup lang="ts">
import { Cancelled } from '@/utils/exception'
import { useAsyncComputed } from '@/utils/utils'
import { useModal } from '@/components/ui'
import NotificationImagePreviewModal from './NotificationImagePreviewModal.vue'
import { resolveWebUrl, useInsideNotificationLink } from './NotificationLink.vue'

const props = withDefaults(
  defineProps<{
    /** Missing if `MarkdownView` dropped an unsafe URL */
    src?: string | null
    alt?: string
    title?: string | null
  }>(),
  { src: null, alt: '', title: null }
)

// Clicking an image inside a link opens the link instead of previewing the image
const insideLink = useInsideNotificationLink()
const webUrl = useAsyncComputed(async () => (props.src == null ? null : resolveWebUrl(props.src)))
const previewImage = useModal(NotificationImagePreviewModal)

function handleClick(event: MouseEvent) {
  // Keep native behaviors such as opening the image in a new tab
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  if (webUrl.value == null) return
  previewImage({ name: props.title ?? props.alt, url: webUrl.value }).catch((e) => {
    // Closing the preview rejects with `Cancelled`
    if (!(e instanceof Cancelled)) throw e
  })
}
</script>

<template>
  <span v-if="webUrl == null">{{ alt }}</span>
  <img
    v-else-if="insideLink"
    class="my-2 block max-h-96 max-w-full rounded-lg object-contain"
    :src="webUrl"
    :alt="alt"
    crossorigin="anonymous"
  />
  <a
    v-else
    class="notification-image-link block w-fit max-w-full cursor-zoom-in truncate"
    :href="webUrl"
    :title="title ?? alt"
    @click="handleClick"
    ><img
      class="my-2 block max-h-96 max-w-full rounded-lg object-contain"
      :src="webUrl"
      :alt="alt"
      crossorigin="anonymous"
  /></a>
</template>
