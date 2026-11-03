<script setup lang="ts">
import { ref } from 'vue'
import { UIButton, UIDropdown, UIIcon } from '@/components/ui'

const wordWrap = defineModel<boolean>('wordWrap', { required: true })
const visible = ref(false)

const emit = defineEmits<{
  in: []
  out: []
  reset: []
}>()

const itemClass =
  'flex h-10 w-full cursor-pointer items-center gap-2 rounded-sm border-0 px-3 text-left text-sm hover:bg-grey-300 focus-visible:outline-2 focus-visible:outline-primary-main'
</script>

<template>
  <UIDropdown v-model:visible="visible" trigger="manual" placement="top-end">
    <template #trigger>
      <UIButton
        v-radar="{ name: 'code-editor-settings', desc: 'Open code editor settings' }"
        type="white"
        icon="setting"
        shape="square"
        size="large"
        :title="$t({ en: 'Settings', zh: '设置' })"
        :aria-expanded="visible"
        @click="visible = !visible"
      />
    </template>
    <div class="flex w-44 flex-col gap-1 p-2 text-text">
      <button
        v-radar="{ name: 'zoom-in', desc: 'Zoom in the code editor' }"
        type="button"
        class="bg-transparent"
        :class="itemClass"
        @click="emit('in')"
      >
        <UIIcon type="zoomIn" class="h-5 w-5" />
        {{ $t({ en: 'Zoom in', zh: '放大' }) }}
      </button>
      <button
        v-radar="{ name: 'zoom-out', desc: 'Zoom out the code editor' }"
        type="button"
        class="bg-transparent"
        :class="itemClass"
        @click="emit('out')"
      >
        <UIIcon type="zoomOut" class="h-5 w-5" />
        {{ $t({ en: 'Zoom out', zh: '缩小' }) }}
      </button>
      <button
        v-radar="{ name: 'reset-zoom', desc: 'Reset code editor zoom to default' }"
        type="button"
        class="bg-transparent"
        :class="itemClass"
        @click="emit('reset')"
      >
        <UIIcon type="zoomReset" class="h-5 w-5" />
        {{ $t({ en: 'Reset', zh: '重置' }) }}
      </button>
      <div class="my-1 border-t border-dividing-line-2"></div>
      <button
        v-radar="{ name: 'word-wrap', desc: 'Toggle code word wrap' }"
        type="button"
        :class="[itemClass, wordWrap ? 'bg-primary-100 text-primary-main hover:bg-primary-200' : 'bg-transparent']"
        :aria-pressed="wordWrap"
        @click="wordWrap = !wordWrap"
      >
        <svg
          class="h-5 w-5 shrink-0"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M17 3v14M3 5h7a3.5 3.5 0 0 1 0 7H4m3-3-3 3 3 3" />
        </svg>
        <span class="flex-1">{{ $t({ en: 'Word wrap', zh: '换行' }) }}</span>
        <UIIcon v-if="wordWrap" type="check" aria-hidden="true" />
      </button>
    </div>
  </UIDropdown>
</template>
