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
      name: `Preview for \u0022${name}\u0022`,
      desc: `Preview for the selected generation item \u0022${name}\u0022`
    }"
    class="gen-preview"
  >
    <header class="header">
      <div class="name">
        <!-- TODO: confirm style details with @qingqing-ux here -->
        <AssetName>{{ name }}</AssetName>
        <UIIcon
          v-radar="{ name: 'Rename button', desc: 'Click to rename the selected item' }"
          class="edit-icon"
          :title="$t({ en: 'Rename', zh: '重命名' })"
          type="edit"
          @click="emit('rename')"
        />
      </div>
      <slot name="ops"></slot>
    </header>
    <main class="body">
      <slot></slot>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.gen-preview {
  flex: 1 1 0;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  line-height: var(--ui-line-height-2);
}

.body {
  flex: 1 1 0;
  display: flex;
  position: relative;
  overflow: hidden;
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
