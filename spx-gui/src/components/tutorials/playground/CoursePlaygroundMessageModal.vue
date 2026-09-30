<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import CourseMarkdown from './CourseMarkdown.vue'
import { UIButton, UIModal } from '@/components/ui'

import guideImage from './images/guide.svg'
import messageImage from './images/message.svg'

const props = defineProps<{
  visible: boolean
  active?: boolean
  content: string
  kind: 'prelude' | 'message'
  signal: AbortSignal
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const dismissed = ref(false)

function dismiss() {
  if (dismissed.value) return
  dismissed.value = true
  emit('resolved')
}

onMounted(() => {
  if (props.signal.aborted) dismiss()
  else props.signal.addEventListener('abort', dismiss, { once: true })
})
onUnmounted(() => props.signal.removeEventListener('abort', dismiss))
</script>

<template>
  <UIModal
    :visible="visible && !dismissed"
    :active="active"
    size="small"
    class="w-111! rounded-xl!"
    :mask-closable="false"
    :radar="{
      name: kind === 'prelude' ? 'course-prelude' : 'course-message',
      desc: kind === 'prelude' ? 'Course opening task guide' : 'Message from the Course author'
    }"
    @update:visible="dismiss"
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
        class="mt-6 w-full! rounded-lg!"
        size="large"
        @click="dismiss"
      >
        {{ $t({ en: 'Continue', zh: '继续' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
