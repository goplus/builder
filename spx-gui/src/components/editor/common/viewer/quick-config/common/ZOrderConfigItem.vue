<script lang="ts">
export const moveActionNames = {
  up: { en: 'Bring forward', zh: '向前移动' },
  top: { en: 'Bring to front', zh: '移到最前' },
  down: { en: 'Send backward', zh: '向后移动' },
  bottom: { en: 'Send to back', zh: '移到最后' }
}
</script>

<script lang="ts" setup>
import { UIDropdown, UIMenu, UIMenuItem } from '@/components/ui'
import ConfigItem from './ConfigItem.vue'

defineProps<{ type: 'sprite' | 'widget' }>()

const emit = defineEmits<{
  'move-zorder': [keyof typeof moveActionNames]
}>()

function moveZorder(direction: keyof typeof moveActionNames) {
  emit('move-zorder', direction)
}
</script>

<template>
  <UIDropdown trigger="click" placement="top">
    <template #trigger>
      <ConfigItem icon="layer" />
    </template>
    <UIMenu>
      <UIMenuItem
        v-radar="{ name: 'Move up', desc: `Click to move ${type} up in z-order` }"
        @click="moveZorder('up')"
        >{{ $t(moveActionNames.up) }}</UIMenuItem
      >
      <UIMenuItem
        v-radar="{ name: 'Move to top', desc: `Click to move ${type} to top in z-order` }"
        @click="moveZorder('top')"
        >{{ $t(moveActionNames.top) }}</UIMenuItem
      >
      <UIMenuItem
        v-radar="{ name: 'Move down', desc: `Click to move ${type} down in z-order` }"
        @click="moveZorder('down')"
        >{{ $t(moveActionNames.down) }}</UIMenuItem
      >
      <UIMenuItem
        v-radar="{ name: 'Move to bottom', desc: `Click to move ${type} to bottom in z-order` }"
        @click="moveZorder('bottom')"
        >{{ $t(moveActionNames.bottom) }}</UIMenuItem
      >
    </UIMenu>
  </UIDropdown>
</template>

<style lang="scss" scoped></style>
