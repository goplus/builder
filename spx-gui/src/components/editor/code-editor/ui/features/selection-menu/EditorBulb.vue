<script setup lang="ts">
import IconBulb from '../../icons/bulb.svg?raw'
import IconBulbArrow from '../../icons/bulb-arrow.svg?raw'
import { normalizeIconSize } from '@/components/editor/code-editor/ui/common'
defineProps<{
  showBorder?: boolean
}>()
</script>

<template>
  <span
    class="bulb-wrapper"
    :class="{
      'show-border': showBorder
    }"
  >
    <span :ref="(el) => normalizeIconSize(el as Element, 16)" class="bulb" v-html="IconBulb"></span>
    <span
      :ref="(el) => normalizeIconSize(el as Element, 10)"
      class="arrow"
      v-html="IconBulbArrow"
    ></span>
  </span>
</template>

<style scoped lang="scss">
.bulb-wrapper {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  border: 2px solid transparent;

  .bulb,
  .arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .bulb {
    margin-right: 4px;
  }

  .arrow {
    visibility: hidden;
  }

  &:hover,
  &.show-border {
    border: 2px solid var(--ui-color-grey-600);

    .arrow {
      visibility: visible;
    }
  }
}
</style>
