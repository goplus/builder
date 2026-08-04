<!-- Shown when a course's primary goal (the runtime signal) is met but its secondary goal (the way
     the learner was meant to get there) is not. It is deliberately not a failure notice: the run
     did work, and saying so is what makes the remaining ask land as the actual lesson rather than
     as a rejection. -->
<script lang="ts" setup>
import { UIButton, UIModal, UIModalClose } from '@/components/ui'

defineProps<{
  visible: boolean
  /** The course-authored line naming what is still missing. */
  hint: string
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
    mask-closable
    @update:visible="emit('close')"
  >
    <div class="flex flex-col px-5 pt-4 pb-5">
      <div class="flex items-center justify-between">
        <h3 class="text-lg text-title">{{ $t({ en: 'Almost there', zh: '就差一点' }) }}</h3>
        <UIModalClose @click="emit('close')" />
      </div>

      <p class="mt-3 text-text">
        {{ $t({ en: 'Your program reached the goal.', zh: '你的程序已经达成目标了。' }) }}
      </p>
      <p v-if="hint !== ''" class="mt-2 text-text">{{ hint }}</p>

      <UIButton class="mt-5 self-center" type="primary" size="large" @click="emit('close')">
        {{ $t({ en: 'Try it that way', zh: '再试一次' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
