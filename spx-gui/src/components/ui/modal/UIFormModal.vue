<template>
  <UIModal
    :radar="radar"
    :visible="visible"
    :auto-focus="autoFocus"
    :mask-closable="maskClosable"
    @update:visible="handleUpdateShow"
  >
    <div class="flex-[1_1_0] flex flex-col">
      <div class="h-14 flex items-center px-6 py-2">
        <!--  pl-6: take a offset of the same size with close btn, to make the title content correctly centered -->
        <div class="flex-1 text-16 text-title" :class="{ 'pl-6 text-center': centerTitle }">
          {{ title }}
        </div>
        <UIModalClose class="-mr-1" @click="handleCloseButton" />
      </div>

      <UIDivider />

      <div class="px-6 pt-5 pb-6" :style="bodyStyle">
        <slot></slot>
      </div>
    </div>
  </UIModal>
</template>
<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { RadarNodeMeta } from '@/utils/radar'
import { UIDivider } from '@/components/ui'
import UIModal from './UIModal.vue'
import UIModalClose from './UIModalClose.vue'

withDefaults(
  defineProps<{
    title: string
    visible?: boolean
    autoFocus?: boolean
    maskClosable?: boolean
    centerTitle?: boolean
    // Callers can tweak the body layout inline here without coupling to the internal
    // surface/header structure of `UIFormModal`.
    bodyStyle?: CSSProperties
    radar?: RadarNodeMeta
  }>(),
  {
    autoFocus: true,
    maskClosable: true,
    bodyStyle: () => ({}),
    radar: undefined
  }
)

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}

const handleCloseButton = () => {
  handleUpdateShow(false)
}
</script>
