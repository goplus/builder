<script setup lang="ts">
import { UIModal, UIModalClose } from '@/components/ui'

defineProps<{
  visible: boolean
  /** File name of the image */
  name: string
  /** Web URL of the image */
  url: string
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()
</script>

<template>
  <UIModal
    :visible="visible"
    size="large"
    class="w-[min(1040px,calc(100vw-2rem))]"
    :radar="{ name: 'Notification image preview', desc: 'Previewing an image attached to a notification' }"
    @update:visible="emit('cancelled')"
  >
    <div class="flex max-h-[calc(100vh-2rem)] min-h-[360px] flex-col">
      <header class="flex min-h-10 items-center justify-between gap-3 border-b border-grey-400 px-6 py-2">
        <h2 class="min-w-0 truncate text-sm font-normal leading-[22px] text-title" :title="name">{{ name }}</h2>
        <UIModalClose class="h-8 w-8 shrink-0" @click="emit('cancelled')" />
      </header>
      <div class="min-h-0 flex flex-1 items-center justify-center overflow-y-auto bg-grey-100 p-6">
        <img
          class="block max-h-[calc(100vh-10rem)] max-w-full rounded-lg object-contain"
          crossorigin="anonymous"
          :src="url"
          :alt="name"
        />
      </div>
    </div>
  </UIModal>
</template>
