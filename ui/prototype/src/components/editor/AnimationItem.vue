<script setup lang="ts">
import UIEditorSpriteItem from '@/components/ui/block-items/UIEditorSpriteItem.vue'

defineProps<{
  animation: {
    name: string
    image: string
  }
  active?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <UIEditorSpriteItem :name="animation.name" :selected="active" @click="emit('select')">
    <template #img="{ style }">
      <img :src="animation.image" :alt="animation.name" :style="style" />
    </template>

    <slot v-if="$slots.corner" name="corner"></slot>
  </UIEditorSpriteItem>
</template>
