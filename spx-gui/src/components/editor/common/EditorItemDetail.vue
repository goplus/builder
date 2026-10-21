<template>
  <main
    v-radar="{ name: `Detail for \u0022${name}\u0022`, desc: `Detail view of the selected item \u0022${name}\u0022` }"
    class="min-w-0 flex-[1_1_0] flex flex-col gap-5 rounded-br-lg bg-grey-200 px-5 py-6"
  >
    <header
      :class="
        $slots.leading != null || $slots.ops != null
          ? 'flex-none grid grid-cols-[1fr_auto_1fr] items-center gap-3'
          : null
      "
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

defineProps<{
  name: string
}>()

const emit = defineEmits<{
  rename: []
}>()
</script>
