<template>
  <UIModal
    :radar="radar"
    :visible="visible"
    :auto-focus="autoFocus"
    :mask-closable="maskClosable"
    @update:visible="handleUpdateShow"
  >
    <div class="container">
      <div class="header">
        <div :class="['title', { center: centerTitle }]">
          {{ title }}
        </div>
        <UIModalClose class="close" @click="handleCloseButton" />
      </div>

      <UIDivider />

      <div class="body" :style="bodyStyle">
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
    // maybe it is better to let caller specify the body class instead of body style,
    // but it is now not possible with scoped style & naive-ui `Modal`, which is similar to the issue we encountered in `UIDropdown.vue`
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

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  padding: 8px 24px;
  height: 56px;
}

.title {
  font-size: 16px;
  line-height: 26px;
  flex: 1;
  color: var(--ui-color-title);
}

.center {
  text-align: center;
  padding-left: 24px; // take a offset of the same size with close btn, to make the title content correctly centered
}

.body {
  padding: 20px 24px 24px;
}

.close {
  margin-right: -4px;
}
</style>
