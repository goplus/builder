<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { CostumeGen } from '@/models/gen/costume-gen'
import CornerMenu from '@/components/editor/common/CornerMenu.vue'
import RenameMenuItem from '@/components/editor/common/corner-menu-item/RenameMenuItem.vue'
import RemoveMenuItem from '@/components/editor/common/corner-menu-item/RemoveMenuItem.vue'

export type Operable = {
  removable: boolean
}

defineProps<{
  gen: CostumeGen
  active: boolean
  // TODO: implement isDefault style
  isDefault: boolean
  operable: false | Operable
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
    <CornerMenu v-if="operable && active" color="primary">
      <RenameMenuItem v-radar="{ name: 'Rename', desc: 'Click to rename the costume' }" @click="emit('rename')" />
      <RemoveMenuItem
        v-radar="{ name: 'Remove', desc: 'Click to remove the costume' }"
        :disabled="!operable.removable"
        @click="emit('remove')"
      />
    </CornerMenu>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
