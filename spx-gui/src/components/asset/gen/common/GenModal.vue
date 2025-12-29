<script lang="ts" setup>
import { UIDivider, UIModal, UIModalClose } from '@/components/ui'
import type { RadarNodeMeta } from '@/utils/radar'

defineProps<{
  title: string
  visible?: boolean
  radar?: RadarNodeMeta
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}
</script>

<template>
  <UIModal
    class="container"
    :radar="radar"
    size="large"
    :visible="visible"
    mask-closable
    @update:visible="handleUpdateShow"
  >
    <header class="header">
      <h2 class="title">{{ title }}</h2>

      <UIModalClose class="close" @click="handleUpdateShow(false)" />
    </header>
    <UIDivider />

    <main class="body">
      <slot></slot>
    </main>

    <footer class="footer">
      <slot name="footer"></slot>
    </footer>
  </UIModal>
</template>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ui-gap-middle) 24px;
  height: 64px;

  .title {
    font-size: 16px;
    color: var(--ui-color-title);
  }
}

.body {
  flex: 1;
}

footer {
  display: flex;
  gap: 16px;
  justify-content: flex-end;

  &:not(:empty) {
    padding: var(--ui-gap-middle) 24px;
  }
}
</style>
