<template>
  <div class="ui-loading" :class="{ cover, visible, [`mask-${mask}`]: true }">
    <NSpin />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NSpin } from 'naive-ui'

export type MaskType = 'none' | 'semi-transparent' | 'solid'

const props = withDefaults(
  defineProps<{
    cover?: boolean
    visible?: boolean
    mask?: boolean | MaskType
  }>(),
  {
    cover: false,
    visible: true,
    mask: true
  }
)

const mask = computed(() => {
  if (props.mask === false) return 'none'
  if (props.mask === true) return 'semi-transparent'
  return props.mask
})
</script>

<style lang="scss" scoped>
// TODO: loading style not designed yet
.ui-loading {
  width: 100%;
  height: 80%;
  display: flex;
  justify-content: center;
  visibility: hidden;
  opacity: 0;
  transition:
    visibility 0.3s,
    opacity 0.3s;

  &.cover {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;

    &.mask-semi-transparent {
      background-color: rgba(255, 255, 255, 0.5);
    }
    &.mask-solid {
      background-color: var(--ui-color-grey-100);
    }
  }

  &.visible {
    visibility: visible;
    opacity: 1;
  }
}
</style>
