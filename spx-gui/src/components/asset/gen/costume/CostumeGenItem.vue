<script lang="ts">
export function isCostumeLoading(gen: CostumeGen) {
  return [gen.enrichState.status, gen.generateState.status].includes('running')
}

export function isCostumesLoading(gens: CostumeGen[]) {
  return gens.some((gen) => isCostumeLoading(gen))
}
</script>

<script lang="ts" setup>
import { computed } from 'vue'
import { UIBlockItemTitle, UIImg } from '@/components/ui'
import type { CostumeGen } from '@/models/gen/costume-gen'
import CornerMenu from '@/components/editor/common/CornerMenu.vue'
import RenameMenuItem from '@/components/editor/common/corner-menu-item/RenameMenuItem.vue'
import RemoveMenuItem from '@/components/editor/common/corner-menu-item/RemoveMenuItem.vue'
import GenItem from '../common/GenItem.vue'
import { useFileUrl } from '@/utils/file'
import littleGuySVG from '../common/little-guy.svg?raw'

export type Operable = {
  removable: boolean
}

const props = defineProps<{
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

const [url, imageLoading] = useFileUrl(() => props.gen.image)

const isLoading = computed(() => isCostumeLoading(props.gen) || imageLoading.value)
</script>

<template>
  <GenItem
    :gen-color="{
      color: 'primary',
      loading: {
        headColor: 'var(--ui-color-primary-main)',
        tailColor: '#DCF7FA',
        traceColor: '#F3FCFD1A',
        backgroundColor: 'var(--ui-color-primary-main)'
      },
      pending: {
        highlightColor: 'var(--ui-color-primary-main)'
      }
    }"
    :placeholder="littleGuySVG"
    :active="active"
    :loading="isLoading"
    @click="emit('click')"
  >
    <template v-if="gen.result != null" #preview>
      <UIImg class="preview" :src="url" :loading="imageLoading" />
    </template>
    <UIBlockItemTitle size="large">{{ gen.name }}</UIBlockItemTitle>
    <CornerMenu v-if="operable && active" color="primary">
      <RenameMenuItem v-radar="{ name: 'Rename', desc: 'Click to rename the costume' }" @click="emit('rename')" />
      <RemoveMenuItem
        v-radar="{ name: 'Remove', desc: 'Click to remove the costume' }"
        :disabled="!operable.removable"
        @click="emit('remove')"
      />
    </CornerMenu>
  </GenItem>
</template>

<style lang="scss" scoped>
.preview {
  width: 100%;
  height: 100%;
}
</style>
