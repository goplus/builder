<script lang="ts">
import { z } from 'zod'

export const tagName = 'guide-modal'

// Raw content: the modal shows plain text only — no markdown and no nested custom elements.
export const isRaw = true

export const description = 'Show one very short guidance sentence in a centered modal dialog.'

export const detailedDescription = `Show one very short guidance sentence in a centered modal dialog, which draws \
much more attention than a chat message. This is your gentlest intervention for a user who is genuinely stuck: a \
plain-text nudge that points the direction (what to check, where to look) — NEVER the answer or the code itself. Do \
not use it at the course opening, for routine encouragement, or for anything the user is already handling fine. The \
element content is PLAIN TEXT ONLY — no markdown, no other elements — and MUST be at most 30 characters (a Chinese \
character counts as one): a single short sentence. The modal opens immediately when your message arrives; the user closes it to continue and can \
reopen it from the chat. For example,

<${tagName}>量一量：Kiko 离萝卜有多远？</${tagName}>`

export const attributes = z.object({})
</script>

<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'

import { useSlotText } from '@/utils/vnode'
import { useCopilot, useCopilotRound } from '@/components/copilot/context'
import TutorialCourseReminderModal from './TutorialCourseReminderModal.vue'

const copilot = useCopilot()
const round = useCopilotRound()
const text = useSlotText()
const visible = ref(false)

onMounted(() => {
  // Auto-open is gated to the current, live round so a restored chat doesn't pop modals for
  // old guidance; the chip below still allows reopening them manually.
  if (round != null && !(round.round.isLive && round.isLastRound())) return
  visible.value = true
})

// While the modal is open it is a visible copilot artifact (pauses e.g. auto perception)
watchEffect((onCleanup) => {
  if (!visible.value) return
  onCleanup(copilot.addVisibleArtifact())
})
</script>

<template>
  <button
    v-radar="{ name: 'Guide modal chip', desc: 'Click to (re)open the guidance modal' }"
    class="inline-block w-fit cursor-pointer rounded-[4px] border-none bg-turquoise-main px-1.25 py-0.5 text-sm/[normal] text-grey-100 outline-none hover:bg-turquoise-400 active:bg-turquoise-600"
    type="button"
    @click="visible = true"
  >
    {{ $t({ en: 'View guidance', zh: '查看引导' }) }}
  </button>
  <TutorialCourseReminderModal :visible="visible" @close="visible = false">
    <p class="text-base/[1.5] font-normal text-grey-900">{{ text.trim() }}</p>
  </TutorialCourseReminderModal>
</template>
