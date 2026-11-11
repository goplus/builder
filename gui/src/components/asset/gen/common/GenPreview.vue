<!-- Common layout for CostumeGenPreview & AnimationGenPreview in SpriteGen -->

<script setup lang="ts">
import { UIIcon } from '@/components/ui'
import AssetName from '@/components/asset/AssetName.vue'
import { useResourceCanvas } from '@/components/editor/sprite/resource-canvas'
import { useResourceWorkspace } from '@/components/editor/sprite/resource-workspace'

const canvas = useResourceCanvas()
const workspace = useResourceWorkspace()

defineProps<{
  name: string
}>()

const emit = defineEmits<{
  rename: []
}>()
</script>

<template>
  <div
    v-radar="{
      name: 'generation-preview',
      desc: `Preview for the generation item '${name}'`,
      attrs: { name }
    }"
    class="relative flex-[1_1_0] flex flex-col"
    :class="canvas ? 'overflow-hidden' : 'gap-5 px-5 py-6'"
  >
    <header
      v-show="!workspace?.aiActive.value"
      class="flex-none min-h-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3"
      :class="canvas != null ? 'absolute inset-x-5 top-3 z-20' : null"
    >
      <div class="flex items-center">
        <slot name="leading"></slot>
      </div>
      <div class="flex items-center justify-center gap-1 min-w-0">
        <!-- TODO: confirm style details with @qingqing-ux here -->
        <AssetName>{{ name }}</AssetName>
        <UIIcon
          v-radar="{ name: 'rename', desc: 'Click to rename the generation item' }"
          class="cursor-pointer text-grey-900 hover:text-grey-800 active:text-grey-1000"
          :title="$t({ en: 'Rename', zh: '重命名' })"
          type="edit"
          @click="emit('rename')"
        />
      </div>
      <div class="flex items-center justify-end">
        <slot name="ops"></slot>
      </div>
    </header>
    <main class="relative flex-[1_1_0] flex overflow-hidden">
      <slot></slot>
    </main>
  </div>
</template>
