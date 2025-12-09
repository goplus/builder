<template>
  <form class="wrapper" @submit.prevent="emit('confirm')">
    <header class="header">
      <h4 class="title">{{ title }}</h4>
      <UIModalClose class="close" @click="emit('cancel')" />
    </header>
    <UIDivider />
    <main class="body">
      <slot></slot>
    </main>
    <footer class="footer">
      <UIButton
        v-radar="{ name: 'Cancel button', desc: 'Click to cancel the operation in modal' }"
        color="boring"
        @click="emit('cancel')"
      >
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Confirm button', desc: 'Click to submit the modal' }"
        color="primary"
        html-type="submit"
      >
        {{ $t({ en: 'Confirm', zh: '确认' }) }}
      </UIButton>
    </footer>
  </form>
</template>
<script setup lang="ts">
import { UIButton, UIDivider } from '@/components/ui'
import UIModalClose from './UIModalClose.vue'

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<style scoped lang="scss">
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 44px;
}

.title {
  font-size: 16px;
  line-height: 26px;
  flex: 1;
  color: var(--ui-color-title);
}

.close {
  margin-right: -4px;
}

.body {
  padding: 12px 16px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.footer {
  flex: 0 0 auto;
  padding: 16px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
