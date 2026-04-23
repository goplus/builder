<!-- Common layout for CostumeGenPreview & AnimationGenPreview in SpriteGen -->

<script setup lang="ts">
import { UIIcon } from '@/components/ui'
import AssetName from '@/components/asset/AssetName.vue'

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
      name: `Preview for '${name}'`,
      desc: `Preview for the generation item '${name}'`
    }"
    class="flex-[1_1_0] flex flex-col gap-5 px-5 py-6"
  >
    <header class="flex-none grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div aria-hidden="true"></div>
      <div class="flex items-center justify-center gap-1 min-w-0">
        <!-- TODO: confirm style details with @qingqing-ux here -->
        <AssetName>{{ name }}</AssetName>
        <UIIcon
          v-radar="{ name: 'Rename', desc: 'Click to rename the generation item' }"
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
