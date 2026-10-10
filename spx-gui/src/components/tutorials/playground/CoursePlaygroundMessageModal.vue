<script setup lang="ts">
import CourseMarkdown from './CourseMarkdown.vue'
import { UIButton, UIModal } from '@/components/ui'

import guideImage from './images/guide.svg'
import messageImage from './images/message.svg'

defineProps<{
  visible: boolean
  content: string
  kind: 'prelude' | 'message'
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()
</script>

<template>
  <UIModal
    :visible="visible"
    size="small"
    class="w-111!"
    :mask-closable="false"
    :radar="{
      name: kind === 'prelude' ? 'course-prelude' : 'course-message',
      desc: kind === 'prelude' ? 'Course opening task guide' : 'Message from the Course author'
    }"
    @update:visible="emit('resolved')"
  >
    <div class="max-h-[calc(100vh-32px)] overflow-y-auto p-6">
      <div class="aspect-[2/1] w-full overflow-hidden">
        <img :src="kind === 'prelude' ? guideImage : messageImage" alt="" class="block size-full object-contain" />
      </div>
      <div class="rounded-lg bg-grey-300 px-6 py-8">
        <CourseMarkdown class="text-base/6! text-grey-900" :value="content" />
      </div>
      <UIButton
        v-radar="{ name: 'course-continue', desc: 'Dismiss the message and continue the Course' }"
        class="mt-6 w-full!"
        size="large"
        @click="emit('resolved')"
      >
        {{ $t({ en: 'Continue', zh: '继续' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
