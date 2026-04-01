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
    class="flex flex-1 flex-col gap-5 px-5 py-6"
  >
    <header class="relative flex flex-none items-center justify-center">
      <div class="flex items-center justify-center gap-1">
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
      <div class="absolute top-0 right-0">
        <slot name="ops"></slot>
      </div>
    </header>
    <main class="relative flex flex-1 overflow-hidden">
      <slot></slot>
    </main>
  </div>
</template>
