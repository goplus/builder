<script lang="ts">
import { z } from 'zod'

export const tagName = 'guide-modal'

export const isRaw = false

export const description = 'Show guidance content in a centered modal dialog.'

export const detailedDescription = `Show guidance content in a centered modal dialog, which draws much more attention \
than a chat message. Use it sparingly, for guidance the user must not miss (e.g. introducing the goal at the start, \
or getting a stuck user back on track) — NOT for routine replies. The modal opens immediately when your message \
arrives; the user closes it to continue, and can reopen it from the chat afterwards. The element content (markdown \
supported) is the modal body. For example,

<${tagName} title="试试运行">
点击右下角的运行按钮，看看 Kiko 会做什么！
</${tagName}>

shows a modal titled "试试运行" with that text as its content.`

export const attributes = z.object({
  title: z.string().optional().describe('Short title of the modal, in user language')
})
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { useCopilotRound } from '@/components/copilot/context'
import { UIButton, UIModal, UIModalClose } from '@/components/ui'

const props = defineProps<{
  /** Short title of the modal */
  title?: string
}>()

const round = useCopilotRound()
const visible = ref(false)

onMounted(() => {
  // Auto-open is gated to the current, live round so a restored chat doesn't pop modals for
  // old guidance; the chip below still allows reopening them manually.
  if (round != null && !(round.round.isLive && round.isLastRound())) return
  visible.value = true
})
</script>

<template>
  <button
    v-radar="{ name: 'Guide modal chip', desc: 'Click to (re)open the guidance modal' }"
    class="inline-block w-fit cursor-pointer rounded-[4px] border-none bg-turquoise-main px-1.25 py-0.5 text-sm/[normal] text-grey-100 outline-none hover:bg-turquoise-400 active:bg-turquoise-600"
    type="button"
    @click="visible = true"
  >
    {{ props.title ?? $t({ en: 'View guidance', zh: '查看引导' }) }}
  </button>
  <UIModal
    v-radar="{ name: 'Guide modal', desc: 'Modal showing guidance content from the copilot' }"
    :visible="visible"
    size="medium"
    mask-closable
    @update:visible="visible = false"
  >
    <div class="flex flex-col px-6 pb-6 pt-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg text-title">{{ props.title ?? '' }}</h3>
        <UIModalClose @click="visible = false" />
      </div>
      <div class="mt-3 text-base text-text">
        <slot></slot>
      </div>
      <UIButton class="mt-6 self-center" type="primary" size="large" @click="visible = false">
        {{ $t({ en: 'Got it', zh: '知道了' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
