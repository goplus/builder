<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { UIButton, UIModal } from '@/components/ui'

import CourseMarkdown from './CourseMarkdown.vue'

import guideImage from './images/guide.svg'
import messageImage from './images/message.svg'

const props = defineProps<{
  visible: boolean
  contents: string[]
  buttonText: string | null
  kind: 'prelude' | 'message'
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()
const pageIndex = ref(0)
const scrollContainer = ref<HTMLElement | null>(null)
async function advance() {
  if (pageIndex.value === props.contents.length - 1) {
    emit('resolved')
    return
  }
  pageIndex.value++
  // Reset scrolling after the new page renders; the modal may unmount while waiting.
  await nextTick()
  if (scrollContainer.value != null) scrollContainer.value.scrollTop = 0
}
</script>

<template>
  <UIModal
    :visible="visible"
    size="small"
    class="w-111!"
    :mask-closable="false"
    :close-on-esc="false"
    :radar="{
      name: kind === 'prelude' ? 'course-prelude' : 'course-message',
      desc: kind === 'prelude' ? 'Course opening task guide' : 'Message from the Course author'
    }"
  >
    <div ref="scrollContainer" class="max-h-[calc(100vh-32px)] overflow-y-auto p-6">
      <div class="aspect-[2/1] w-full overflow-hidden">
        <img :src="kind === 'prelude' ? guideImage : messageImage" alt="" class="block size-full object-contain" />
      </div>
      <div class="rounded-lg bg-grey-300 px-6 py-8">
        <CourseMarkdown class="text-base/6! text-grey-900" :value="contents[pageIndex]" />
      </div>
      <UIButton
        v-radar="{ name: 'course-continue', desc: 'Dismiss the message and continue the Course' }"
        class="mt-6 w-full!"
        size="large"
        @click="advance"
      >
        {{
          pageIndex < contents.length - 1
            ? $t({ en: 'Next', zh: '下一步' })
            : buttonText ?? $t(kind === 'prelude' ? { en: 'Start', zh: '开始' } : { en: 'Continue', zh: '继续' })
        }}
      </UIButton>
    </div>
  </UIModal>
</template>
