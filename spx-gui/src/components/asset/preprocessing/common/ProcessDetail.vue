<template>
  <section class="relative h-full flex flex-col gap-2.5 px-5 py-2.5">
    <header class="flex">
      <div class="flex-[1_1_0] h-8 flex items-center gap-3">
        <slot name="header"></slot>
      </div>
      <UIButton
        v-show="applyFn && !applied"
        icon="check"
        color="success"
        :loading="handleApply.isLoading.value"
        @click="handleApply.fn"
      >
        {{ $t({ en: 'Apply', zh: '应用' }) }}
      </UIButton>
      <UIButton
        v-show="cancelFn && applied"
        color="boring"
        :loading="handleCancel.isLoading.value"
        @click="handleCancel.fn"
      >
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
    </header>
    <main class="flex-[1_1_0] overflow-y-auto rounded-1 bg-grey-300">
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
