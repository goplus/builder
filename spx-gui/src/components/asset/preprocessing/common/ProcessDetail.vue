<template>
  <section class="process-detail">
    <header>
      <div class="title">
        <slot name="header"></slot>
      </div>
      <UIButton
        v-show="applyFn && !applied"
        icon="check"
        color="success"
        :loading="handleApply.isLoading.value"
        @click="handleApply.fn"
        >{{ $t({ en: 'Apply', zh: '应用' }) }}</UIButton
      >
      <UIButton
        v-show="cancelFn && applied"
        color="boring"
        :loading="handleCancel.isLoading.value"
        @click="handleCancel.fn"
        >{{ $t({ en: 'Cancel', zh: '取消' }) }}</UIButton
      >
    </header>
    <main>
      <slot></slot>
    </main>
  </section>
</template>

<script lang="ts" setup>
import { UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  applied?: boolean
  applyFn?: () => Promise<void>
  cancelFn?: () => Promise<void>
}>()

const handleApply = useMessageHandle(() => props.applyFn!(), {
  en: 'Failed to apply',
  zh: '应用失败'
})

const handleCancel = useMessageHandle(() => props.cancelFn!(), {
  en: 'Failed to cancel',
  zh: '取消失败'
})
</script>

<style lang="scss" scoped>
.process-detail {
  position: relative;
  padding: 10px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
header {
  display: flex;

  .title {
    flex: 1 1 0;
    height: var(--ui-line-height-2);
    display: flex;
    gap: 12px;
    align-items: center;
  }
}
main {
  flex: 1 1 0;
  overflow-y: auto;

  border-radius: var(--ui-border-radius-1);
  background-color: var(--ui-color-grey-300);
}
</style>
