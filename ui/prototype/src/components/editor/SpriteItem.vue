<script setup lang="ts">
import UIEditorSpriteItem from '@/components/ui/block-items/UIEditorSpriteItem.vue'

defineProps<{
  sprite: {
    name: string
    shortName: string
    image: string
    hidden: boolean
  }
  active?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <UIEditorSpriteItem :name="sprite.shortName" :title="sprite.name" :selected="active" :visible="!sprite.hidden" @click="emit('select')">
    <template #img="{ style }">
      <img :src="sprite.image" :alt="sprite.name" :style="style" />
    </template>

    <span v-if="$slots.corner" class="prototype-sprite-item-corner" @click.stop>
      <slot name="corner"></slot>
    </span>
  </UIEditorSpriteItem>
</template>

<style scoped>
.prototype-sprite-item-corner {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 5;
}
</style>
