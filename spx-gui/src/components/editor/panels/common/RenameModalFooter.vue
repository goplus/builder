<template>
  <footer class="rename-modal-footer">
    <UIButton type="boring" @click="emit('cancel')">
      {{ $t({ en: 'Cancel', zh: '取消' }) }}
    </UIButton>
    <UIButton type="primary" html-type="submit">
      {{ $t({ en: 'Confirm', zh: '确认' }) }}
    </UIButton>
  </footer>
</template>

<script setup lang="ts">
import { UIButton } from '@/components/ui'

const emit = defineEmits<{
  cancel: []
}>()
</script>

<style scoped lang="scss">
.rename-modal-footer {
  margin-top: 40px;
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}
</style>
