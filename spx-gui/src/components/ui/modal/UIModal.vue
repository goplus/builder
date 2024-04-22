<template>
  <NModal :to="attachTo" :show="visible" @update:show="handleUpdateShow">
    <div :class="['container', `size-${size || 'medium'}`]">
      <slot></slot>
    </div>
  </NModal>
</template>
<script setup lang="ts">
import { NModal } from 'naive-ui'
import { usePopupContainer } from '../utils'

export type ModalSize = 'small' | 'medium' | 'large' | 'full'
defineProps<{
  size?: ModalSize
  visible?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}

const attachTo = usePopupContainer()
</script>
<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  box-shadow: var(--ui-box-shadow-big);
  border-radius: var(--ui-border-radius-2);
  background-color: white;
}

.size-small {
  width: 480px;
}

.size-medium {
  width: 640px;
}

.size-large {
  width: 960px;
}

.size-full {
  width: 100%;
  margin: 16px;
}

.divider {
  margin: 0;
}

.main {
  padding: 16px;
}
</style>
