<script lang="ts">
import { z } from 'zod'
import { apiVideoDemoFallback, getApiVideo, getAvailableApiVideoIds, markApiLearned } from './api-videos'

export const tagName = 'api-video'

export const isRaw = false

export const description = 'Play the explainer video of an API in a modal dialog.'

export function getDetailedDescription() {
  const availableIds = getAvailableApiVideoIds()
  const availability = apiVideoDemoFallback
    ? 'A video is available for EVERY API.'
    : `Videos are only available for these APIs (for others the element does nothing): \
${availableIds.length > 0 ? availableIds.join(', ') : '(none yet)'}.`
  return `Play the explainer video of an API in a modal dialog. The dialog auto-opens only the FIRST time a video \
is emitted within a session; emitting the same video again renders a small chip the user can click to (re)play — \
it will not interrupt the user again. Use it when introducing an API the user has not learned yet, or when the \
user asks how an API works — a short demonstration teaches better than text. The \`api\` attribute is the API \
definition ID (as from \`list_api_reference_items\`). ${availability} For example, \
<${tagName} api="${availableIds[0] ?? 'xgo:github.com/goplus/spx/v2?Sprite.step#0'}" />.`
}

export const attributes = z.object({
  api: z.string().describe('API definition ID (as from `list_api_reference_items`)')
})

// APIs whose video already auto-played, per copilot session. Auto-play happens at most once
// per API per session: the copilot occasionally re-emits the element despite instructions
// (e.g. on auto-perception rounds), and the video popping over the user repeatedly is worse
// than a chip they can click.
const autoPlayedApisPerSession = new WeakMap<object, Set<string>>()

function checkAndMarkAutoPlayed(session: object, api: string): boolean {
  let apis = autoPlayedApisPerSession.get(session)
  if (apis == null) {
    apis = new Set()
    autoPlayedApisPerSession.set(session, apis)
  }
  if (apis.has(api)) return false
  apis.add(api)
  return true
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'

import { useCopilot, useCopilotRound } from '@/components/copilot/context'
import { UIIcon, UIModal, UIModalClose } from '@/components/ui'

const props = defineProps<{
  /** API definition ID */
  api: string
}>()

const copilot = useCopilot()
const round = useCopilotRound()
const video = computed(() => getApiVideo(props.api))
const playing = ref(false)
// A re-emission of an already auto-played video renders as a clickable chip instead
const showChip = ref(false)

onMounted(() => {
  if (video.value == null) return
  // Auto-play is gated to the current, live round so a restored chat doesn't pop videos for
  // old messages.
  if (round != null && !(round.round.isLive && round.isLastRound())) return
  const session = copilot.currentSession
  if (session != null && !checkAndMarkAutoPlayed(session, props.api)) {
    showChip.value = true
    return
  }
  playing.value = true
  markApiLearned(props.api)
})

function handleChipClick() {
  playing.value = true
  markApiLearned(props.api)
}

// While the video dialog is open it is a visible copilot artifact (pauses e.g. auto perception)
watchEffect((onCleanup) => {
  if (!playing.value) return
  onCleanup(copilot.addVisibleArtifact())
})
</script>

<template>
  <template v-if="video != null">
    <button
      v-if="showChip"
      v-radar="{ name: 'API video chip', desc: 'Click to play the explainer video of the API' }"
      class="inline-flex w-fit cursor-pointer items-center gap-1 rounded-[4px] border-none bg-turquoise-main px-1.25 py-0.5 text-sm/[normal] text-grey-100 outline-none hover:bg-turquoise-400 active:bg-turquoise-600"
      type="button"
      @click="handleChipClick"
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
