<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { UIImg, UIEditorSpriteItem, UILoading } from '@/components/ui'
import type { SpriteGeneration } from '@/components/asset/library/generators'

const props = withDefaults(
  defineProps<{
    generation: SpriteGeneration
    color?: 'sprite' | 'primary'
    selectable?: false | { selected: boolean }
  }>(),
  {
    color: 'sprite',
    selectable: false
  }
)

const sprite = computed(() => props.generation.state.sprite)
const [imgSrc, imgLoading] = useFileUrl(() => sprite.value.defaultCostume?.img)

const radarNodeMeta = computed(() => {
  const name = `Sprite generation "${sprite.value.name}"`
  const desc = 'Click to continue generating the sprite'
  return { name, desc }
})
</script>

<template>
  <UIEditorSpriteItem
    v-radar="radarNodeMeta"
    :name="sprite.name"
    :selectable="selectable"
    :color="color"
    class="sprite-generation-item"
  >
    <template #img="{ style }">
      <div class="generating-overlay" :style="style">
        <UIImg :style="style" :src="imgSrc" :loading="imgLoading" class="generating-img" />
        <div class="generating-indicator">
          <UILoading :size="20" />
        </div>
      </div>
    </template>
    <template #status>
      <span class="generating-status">{{ $t({ en: 'Generating...', zh: '生成中...' }) }}</span>
    </template>
  </UIEditorSpriteItem>
</template>

<style scoped lang="scss">
.sprite-generation-item {
  opacity: 0.8;
}

.generating-overlay {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.generating-img {
  opacity: 0.6;
}

.generating-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.generating-status {
  font-size: 10px;
  color: var(--ui-color-primary-main);
}
</style>
