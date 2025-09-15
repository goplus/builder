<template>
  <NModal :to="attachTo" :auto-focus="false" :trap-focus="false" :show="visible" @update:show="handleUpdateShow">
    <div
      v-radar="{ name: 'Full screen modal', desc: 'A full screen modal dialog for specific purpose' }"
      class="container"
    >
      <slot></slot>
    </div>
  </NModal>
</template>
<script setup lang="ts">
import { NModal } from 'naive-ui'
import { useModalContainer } from '../utils'

defineProps<{
  visible?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}

const attachTo = useModalContainer()
</script>
<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: var(--ui-color-grey-100);
}
</style>
