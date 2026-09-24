<script lang="ts" setup>
import { UIButton, UIModal } from '@/components/ui'
import reminderIllustration from '@/assets/images/tutorial-retry-illustration-v3.svg'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <UIModal
    v-radar="{
      name: 'Tutorial course reminder modal',
      desc: 'Modal showing an in-course reminder'
    }"
    :visible="visible"
    size="small"
    class="w-[444px]! rounded-xl! shadow-[0_4px_12px_rgba(36,41,47,0.08)]"
    :mask-closable="false"
    @update:visible="emit('close')"
  >
    <div class="flex flex-col items-center gap-6 p-6">
      <div class="flex w-full flex-col">
        <div class="aspect-[2/1] w-full overflow-hidden">
          <img :src="reminderIllustration" alt="" class="block size-full object-contain" />
        </div>
        <div class="w-full rounded-lg bg-grey-300 px-6 py-8">
          <slot />
        </div>
      </div>

      <UIButton class="w-full! rounded-lg! text-[15px]/[24px]!" type="primary" size="large" @click="emit('close')">
        {{ $t({ en: 'Keep trying', zh: '继续尝试' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
