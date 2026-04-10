<template>
  <form class="flex flex-col items-stretch" @submit.prevent="emit('confirm')">
    <header class="h-11 flex flex-none items-center px-4">
      <h4 class="flex-1 text-16 text-title">{{ title }}</h4>
      <UIModalClose class="-mr-1" @click="emit('cancel')" />
    </header>
    <UIDivider />
    <main class="flex-auto min-h-0 overflow-y-auto px-4 py-3">
      <slot></slot>
    </main>
    <footer class="flex-none flex justify-end gap-3 p-4">
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
