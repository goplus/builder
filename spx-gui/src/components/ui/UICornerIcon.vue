<!-- icon at the top-right corner of item -->

<template>
  <div class="ui-corner-icon" :style="cssVars" @click.stop="emit('click', $event)">
    <UIIcon class="icon" :type="type" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'
import type { Color } from './tokens/colors'
import { useUIVariables } from './UIConfigProvider.vue'
import { getCssVars } from './tokens/utils'

const props = withDefaults(
  defineProps<{
    type: IconType
    color?: Color
  }>(),
  {
    color: 'primary'
  }
)

const emit = defineEmits<{
  click: [MouseEvent]
}>()

const uiVariables = useUIVariables()
const cssVars = computed(() =>
  getCssVars('--ui-corner-icon-color-', uiVariables.color[props.color])
)
</script>

<style scoped lang="scss">
.ui-corner-icon {
  position: absolute;
  top: -6px;
  right: -6px;

  display: flex;
  width: 24px;
  height: 24px;
  justify-content: center;
  align-items: center;

  color: var(--ui-color-grey-100);
  border-radius: 50%;
  background: var(--ui-corner-icon-color-main);
  cursor: pointer;

  &:hover {
    background-color: var(--ui-corner-icon-color-400);
  }
  &:active {
    background-color: var(--ui-corner-icon-color-600);
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}
</style>
