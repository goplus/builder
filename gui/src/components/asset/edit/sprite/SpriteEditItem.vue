<script setup lang="ts">
import { computed } from 'vue'
import type { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import { UIBlockItemTitle } from '@/components/ui'
import GenItem from '../../gen/common/GenItem.vue'
import spriteSVG from '../../gen/common/sprite.svg?raw'

const props = defineProps<{
  edit: SpriteEdit
}>()

const isLoading = computed(() => props.edit.isBusy)
</script>

<template>
  <GenItem
    v-radar="{ name: `Sprite edit '${edit.name}'`, desc: `Continue editing sprite '${edit.name}'` }"
    :loading="isLoading"
    highlight
    :placeholder="spriteSVG"
  >
    <UIBlockItemTitle size="medium" :title="edit.name">{{ edit.name }}</UIBlockItemTitle>
  </GenItem>
</template>
