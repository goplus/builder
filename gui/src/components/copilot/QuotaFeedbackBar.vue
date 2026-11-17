<script setup lang="ts">
import { shallowRef } from 'vue'

import { useMessageHandle } from '@/utils/exception'
import { UIButton, UIDivider, UIIcon } from '@/components/ui'
import { useSendFeedback } from '@/components/feedback'
import type { Round } from './copilot'

defineProps<{
  round: Round
}>()

const dismissedRound = shallowRef<Round | null>(null)
const sendFeedback = useSendFeedback()
const handleFeedback = useMessageHandle(() => sendFeedback('copilotQuotaExceeded')).fn
</script>

<template>
  <div v-if="dismissedRound !== round" class="bg-grey-300">
    <UIDivider />
    <div class="flex items-center gap-2 px-4 py-2.5">
      <p class="min-w-0 flex-1 text-xs text-text">
        {{
          $t({
            en: 'Ran into an issue?',
            zh: '使用中遇到问题？'
          })
        }}
      </p>
      <UIButton class="flex-none text-xs" type="white" size="small" @click="handleFeedback">
        {{ $t({ en: 'Send feedback', zh: '提交反馈' }) }}
      </UIButton>
      <button
        type="button"
        :aria-label="$t({ en: 'Close', zh: '关闭' })"
        class="-mr-1 flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-grey-800 transition-colors duration-200 hover:bg-grey-400 active:bg-grey-500"
        @click="dismissedRound = round"
      >
        <UIIcon type="close" class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
