<template>
  <UIBlockItem :active="selected" :interactive="!!selectable">
    <slot name="img" :style="imgStyle"></slot>
    <div
      class="w-full h-5.5 flex items-center text-center text-title text-2xs"
      style="gap: 2px; padding-left: 4px; padding-right: 4px"
      :title="name"
    >
      <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {{ name }}
      </span>
      <UIIcon v-if="visible === false" class="h-3.5 w-3.5 flex-none cursor-auto text-grey-700" type="eyeOff" />
    </div>
    <slot></slot>
  </UIBlockItem>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import UIBlockItem from '@/components/ui/block-items/UIBlockItem.vue'
import UIIcon from '@/components/ui/icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    name: string
    selectable?: false | { selected: boolean }
    visible?: boolean | null
  }>(),
  {
    selectable: false,
    visible: null
  }
)

const selected = computed(() => props.selectable && props.selectable.selected)

const imgStyle: CSSProperties = {
  marginBottom: '5px',
  height: '60px',
  width: '60px'
}
</script>
