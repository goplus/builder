<script lang="ts">
import { z } from 'zod'
import { getApiVideo, getAvailableApiVideoIds, markApiLearned } from './api-videos'

export const tagName = 'api-video'

export const isRaw = false

export const description = 'Play the explainer video of an API in a modal dialog.'

export function getDetailedDescription() {
  const availableIds = getAvailableApiVideoIds()
  return `Play the explainer video of an API in a modal dialog, opened immediately when your message arrives — \
nothing is shown in the chat. Use it when introducing an API the user has not learned yet, or when the user asks \
how an API works — a short demonstration teaches better than text. Re-emit the element when the user wants to watch \
again. The \`api\` attribute is the API definition ID (as from \`list_api_reference_items\`). Videos are only \
available for these APIs (for others the element does nothing): \
${availableIds.length > 0 ? availableIds.join(', ') : '(none yet)'}. For example, <${tagName} api="${availableIds[0] ?? 'xgo:github.com/goplus/spx/v2?Sprite.step#0'}" />.`
}

export const attributes = z.object({
  api: z.string().describe('API definition ID (as from `list_api_reference_items`)')
})
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useCopilotRound } from '@/components/copilot/context'
import { UIModal, UIModalClose } from '@/components/ui'

const props = defineProps<{
  /** API definition ID */
  api: string
}>()

const round = useCopilotRound()
const video = computed(() => getApiVideo(props.api))
const playing = ref(false)

onMounted(() => {
  if (video.value == null) return
  // Auto-play is gated to the current, live round so a restored chat doesn't pop videos for
  // old messages; the copilot re-emits the element when the user wants to watch again.
  if (round != null && !(round.round.isLive && round.isLastRound())) return
  playing.value = true
  markApiLearned(props.api)
})
</script>

<template>
  <UIModal
    v-if="video != null"
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
