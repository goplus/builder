<!-- Shown when a course's primary goal (the runtime signal) is met but its secondary goal (the way
     the learner was meant to get there) is not. It is deliberately not a failure notice: the run
     did work, and saying so is what makes the remaining ask land as the actual lesson rather than
     as a rejection. -->
<script lang="ts" setup>
import type { Tutorial } from './tutorial'
import { UIButton, UIModal } from '@/components/ui'
import MarkdownView from '@/components/copilot/MarkdownView.vue'
import retryIllustration from '@/assets/images/tutorial-retry-illustration-v3.svg'

defineProps<{
  visible: boolean
  /** The course-authored line naming what is still missing. Rendered as Markdown, so a hint can
   * name the code it is asking for the way the rest of the app writes code. */
  hint: string
  tutorial: Tutorial
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <UIModal
    v-radar="{
      name: 'Tutorial course retry modal',
      desc: 'Shown when the course goal was reached but not in the way the course is teaching'
    }"
    :visible="visible"
    size="small"
    class="w-[444px]! rounded-xl! shadow-[0_4px_12px_rgba(36,41,47,0.08)]"
    :mask-closable="false"
    @update:visible="emit('close')"
  >
    <div class="flex flex-col items-center gap-6 p-6">
      <div class="flex w-full flex-col">
        <div class="aspect-[2/1] w-full overflow-hidden">
          <img :src="retryIllustration" alt="" class="block size-full object-contain" />
        </div>
        <div class="flex min-h-[164px] w-full flex-col justify-center rounded-lg bg-grey-300 px-6 py-8">
          <p class="text-base/[1.5] font-normal text-grey-900">
            {{ $t({ en: 'Almost there!', zh: '就差一点！' }) }}
          </p>
          <p class="text-base/[1.5] font-normal text-grey-900">
            {{ $t({ en: 'Your program reached the goal.', zh: '你的程序已经达成目标了。' }) }}
          </p>
          <MarkdownView v-if="hint !== ''" class="text-base/[1.5]! font-normal text-grey-900" :value="hint" />
        </div>
      </div>

      <div class="flex w-full flex-col gap-3">
        <UIButton class="w-full! rounded-lg! text-[15px]/[24px]!" type="primary" size="large" @click="emit('close')">
          {{ $t({ en: 'Keep trying', zh: '继续尝试' }) }}
        </UIButton>
      </div>
    </div>
  </UIModal>
</template>
