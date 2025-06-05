<template>
  <NModal :to="attachTo" :auto-focus="false" :show="visible" @update:show="handleUpdateShow">
    <div class="container">
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
  height: 100vh;
  width: 100vw;
  background-color: white;
}
</style>
