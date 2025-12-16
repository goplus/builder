<template>
  <UIBlockItem class="ui-editor-sprite-item" :color="color" :active="selected" :interactive="!!selectable">
    <slot name="img" :style="imgStyle"></slot>
    <UIBlockItemTitle size="medium">
      {{ name }}
      <template v-if="visible === false" #suffix>
        <UIIcon class="eye-off" type="eyeOff" />
      </template>
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import UIBlockItem, { type DroppableState } from './UIBlockItem.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'
import UIIcon from '../icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    name: string
    selectable?: false | { selected: boolean }
    color?: 'sprite' | 'primary'
    droppable?: DroppableState | false
    visible?: boolean | null
  }>(),
  {
    selectable: false,
    color: 'sprite',
    droppable: false,
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
<style scoped lang="scss">
.eye-off {
  color: var(--ui-color-grey-700);
  cursor: auto;
}
</style>
