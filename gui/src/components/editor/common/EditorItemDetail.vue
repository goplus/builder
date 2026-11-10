<template>
  <main
    v-radar="{ name: `Detail for \u0022${name}\u0022`, desc: `Detail view of the selected item \u0022${name}\u0022` }"
    class="relative min-w-0 flex-[1_1_0] flex flex-col rounded-br-lg bg-grey-200"
    :class="canvas ? 'overflow-hidden' : 'gap-5 px-5 py-6'"
  >
    <header
      v-show="!workspace?.aiActive.value"
      class="min-h-8"
      :class="[
        canvas != null ? 'absolute inset-x-5 top-3 z-20' : null,
        $slots.leading != null || $slots.ops != null
          ? 'flex-none grid grid-cols-[1fr_auto_1fr] items-center gap-3'
          : null
      ]"
    >
      <div v-if="$slots.leading != null || $slots.ops != null" class="flex items-center">
        <slot name="leading"></slot>
      </div>
      <h4 class="flex items-center justify-center gap-1 min-w-0">
        <AssetName>{{ name }}</AssetName>
        <UIIcon
          v-radar="{ name: 'Rename button', desc: 'Click to rename the selected item' }"
          class="cursor-pointer text-grey-900 transition-colors hover:text-grey-800 active:text-grey-1000"
          :title="$t({ en: 'Rename', zh: '重命名' })"
          type="edit"
          @click="emit('rename')"
        />
      </h4>
      <div v-if="$slots.leading != null || $slots.ops != null" class="flex items-center justify-end">
        <slot name="ops"></slot>
      </div>
    </header>
    <slot></slot>
  </main>
</template>

<script setup lang="ts">
import { UIIcon } from '@/components/ui'
import AssetName from '@/components/asset/AssetName.vue'
import { useResourceCanvas } from '../sprite/resource-canvas'
import { useResourceWorkspace } from '../sprite/resource-workspace'

const canvas = useResourceCanvas()
const workspace = useResourceWorkspace()

defineProps<{
  name: string
}>()

const emit = defineEmits<{
  rename: []
}>()
</script>
