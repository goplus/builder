<template>
  <main
    v-radar="{ name: `Detail for \u0022${name}\u0022`, desc: `Detail view of the selected item \u0022${name}\u0022` }"
    class="min-h-0 min-w-0 flex-[1_1_0] overflow-y-auto rounded-br-lg bg-grey-200"
  >
    <div
      class="min-h-full flex flex-col gap-5 px-5 py-6"
      style="padding-bottom: calc(1.5rem + var(--editor-console-safe-area, 0px))"
    >
      <h4 class="flex items-center justify-center gap-1">
        <AssetName>{{ name }}</AssetName>
        <UIIcon
          v-radar="{ name: 'Rename button', desc: 'Click to rename the selected item' }"
          class="cursor-pointer text-grey-900 transition-colors hover:text-grey-800 active:text-grey-1000"
          :title="$t({ en: 'Rename', zh: '重命名' })"
          type="edit"
          @click="emit('rename')"
        />
      </h4>
      <slot></slot>
    </div>
  </main>
</template>

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
