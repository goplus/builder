<script setup lang="ts">
import { ref } from 'vue'
import { UIButton, UIDropdown, UIIcon, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'

const wordWrap = defineModel<boolean>('wordWrap', { required: true })
const visible = ref(false)

const emit = defineEmits<{
  in: []
  out: []
  reset: []
}>()

const itemClass = 'pr-2 focus-visible:outline-2 focus-visible:outline-primary-main'

function activateMenuItem(event: KeyboardEvent) {
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.click()
}
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
    <UIMenu class="w-44">
      <UIMenuGroup>
        <UIMenuItem
          v-radar="{ name: 'zoom-in', desc: 'Zoom in the code editor' }"
          :close-on-click="false"
          role="button"
          tabindex="0"
          :class="itemClass"
          @keydown.enter.prevent="activateMenuItem"
          @keydown.space.prevent="activateMenuItem"
          @click="emit('in')"
        >
          <template #icon><UIIcon type="zoomIn" aria-hidden="true" /></template>
          {{ $t({ en: 'Zoom in', zh: '放大' }) }}
        </UIMenuItem>
        <UIMenuItem
          v-radar="{ name: 'zoom-out', desc: 'Zoom out the code editor' }"
          :close-on-click="false"
          role="button"
          tabindex="0"
          :class="itemClass"
          @keydown.enter.prevent="activateMenuItem"
          @keydown.space.prevent="activateMenuItem"
          @click="emit('out')"
        >
          <template #icon><UIIcon type="zoomOut" aria-hidden="true" /></template>
          {{ $t({ en: 'Zoom out', zh: '缩小' }) }}
        </UIMenuItem>
        <UIMenuItem
          v-radar="{ name: 'reset-zoom', desc: 'Reset code editor zoom to default' }"
          :close-on-click="false"
          role="button"
          tabindex="0"
          :class="itemClass"
          @keydown.enter.prevent="activateMenuItem"
          @keydown.space.prevent="activateMenuItem"
          @click="emit('reset')"
        >
          <template #icon><UIIcon type="zoomReset" aria-hidden="true" /></template>
          {{ $t({ en: 'Reset', zh: '重置' }) }}
        </UIMenuItem>
      </UIMenuGroup>
      <UIMenuGroup>
        <UIMenuItem
          v-radar="{ name: 'word-wrap', desc: 'Toggle code word wrap' }"
          :close-on-click="false"
          role="button"
          tabindex="0"
          :class="[itemClass, wordWrap ? 'bg-primary-100 text-primary-main hover:bg-primary-200' : null]"
          :aria-pressed="wordWrap"
          @keydown.enter.prevent="activateMenuItem"
          @keydown.space.prevent="activateMenuItem"
          @click="wordWrap = !wordWrap"
        >
          <template #icon><UIIcon type="wordWrap" aria-hidden="true" /></template>
          <span class="flex-1">{{ $t({ en: 'Word wrap', zh: '换行' }) }}</span>
          <UIIcon v-if="wordWrap" type="check" class="h-4 w-4 shrink-0" aria-hidden="true" />
        </UIMenuItem>
      </UIMenuGroup>
    </UIMenu>
  </UIDropdown>
</template>
