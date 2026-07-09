<script lang="ts">
import { z } from 'zod'
import { getApiVideo, getAvailableApiVideoIds, markApiLearned } from './api-videos'

export const tagName = 'api-video'

export const isRaw = false

export const description = 'Show the explainer video of an API as a playable card.'

export function getDetailedDescription() {
  const availableIds = getAvailableApiVideoIds()
  return `Show the explainer video of an API as a playable card in the chat; clicking it plays the video in a modal. \
Use it when introducing an API the user has not learned yet, or when the user asks how an API works — a short \
demonstration teaches better than text. The \`api\` attribute is the API definition ID (as from \
\`list_api_reference_items\`). Videos are only available for these APIs (for others the element renders nothing): \
${availableIds.length > 0 ? availableIds.join(', ') : '(none yet)'}. For example, <${tagName} api="${availableIds[0] ?? 'xgo:github.com/goplus/spx/v2?Sprite.step#0'}" />.`
}

export const attributes = z.object({
  api: z.string().describe('API definition ID (as from `list_api_reference_items`)')
})
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { UIIcon, UIModal, UIModalClose } from '@/components/ui'

const props = defineProps<{
  /** API definition ID */
  api: string
}>()

const video = computed(() => getApiVideo(props.api))
const playing = ref(false)

function handlePlay() {
  playing.value = true
  markApiLearned(props.api)
}
</script>

<template>
  <template v-if="video != null">
    <button
      v-radar="{ name: 'API video card', desc: 'Click to play the explainer video of the API' }"
      class="inline-flex w-fit cursor-pointer items-center gap-1 rounded-[4px] border-none bg-turquoise-main px-1.25 py-0.5 text-sm/[normal] text-grey-100 outline-none hover:bg-turquoise-400 active:bg-turquoise-600"
      type="button"
      @click="handlePlay"
    >
      <UIIcon class="h-3.5 w-3.5" type="playHollow" />
      {{ $t(video.title) }}
    </button>
    <UIModal
      v-radar="{ name: 'API video modal', desc: 'Modal playing the explainer video of an API' }"
      :visible="playing"
      size="large"
      mask-closable
      @update:visible="playing = false"
    >
      <div class="flex flex-col px-5 pb-5 pt-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg text-title">{{ $t(video.title) }}</h3>
          <UIModalClose @click="playing = false" />
        </div>
        <div class="mt-3 overflow-hidden rounded-md bg-grey-1000">
          <video class="block aspect-video w-full" :src="video.src" controls autoplay playsinline></video>
        </div>
      </div>
    </UIModal>
  </template>
</template>
