<!-- The item (in animation list) standing for an animation-generation -->

<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { AnimationGen } from '@/models/gen/animation-gen'
import CornerMenu from '@/components/editor/common/CornerMenu.vue'
import RenameMenuItem from '@/components/editor/common/corner-menu-item/RenameMenuItem.vue'
import RemoveMenuItem from '@/components/editor/common/corner-menu-item/RemoveMenuItem.vue'

defineProps<{
  gen: AnimationGen
  active: boolean
}>()

const emit = defineEmits<{
  click: []
  rename: []
  remove: []
}>()
</script>

<template>
  <UIBlockItem :active="active" @click="emit('click')">
    <UIBlockItemTitle size="large">{{ gen.name }}</UIBlockItemTitle>
    <CornerMenu v-if="active" color="primary">
      <RenameMenuItem v-radar="{ name: 'Rename', desc: 'Click to rename the animation' }" @click="emit('rename')" />
      <RemoveMenuItem v-radar="{ name: 'Remove', desc: 'Click to remove the animation' }" @click="emit('remove')" />
    </CornerMenu>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
