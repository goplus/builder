<template>
  <main
    v-radar="{ name: `Detail for \u0022${name}\u0022`, desc: `Detail view of the selected item \u0022${name}\u0022` }"
    class="editor-item-detail"
  >
    <h4 class="name">
      <AssetName>{{ name }}</AssetName>
      <UIIcon
        v-radar="{ name: 'Rename button', desc: 'Click to rename the selected item' }"
        class="edit-icon"
        :title="$t({ en: 'Rename', zh: '重命名' })"
        type="edit"
        @click="emit('rename')"
      />
    </h4>
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

<style lang="scss" scoped>
.editor-item-detail {
  flex: 1 1 0;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: var(--ui-color-grey-200);
  border-bottom-right-radius: var(--ui-border-radius-3);
}

.name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.edit-icon {
  cursor: pointer;
  color: var(--ui-color-grey-900);
  &:hover {
    color: var(--ui-color-grey-800);
  }
  &:active {
    color: var(--ui-color-grey-1000);
  }
}
</style>
