<script setup lang="ts">
import type { CSSProperties } from 'vue'
import eyeOffIcon from '@/assets/editor/ui-icons/eye-off.svg?raw'
import UIBlockItem from '@/components/ui/block-items/UIBlockItem.vue'
import UIBlockItemTitle from '@/components/ui/block-items/UIBlockItemTitle.vue'

withDefaults(
  defineProps<{
    name: string
    title?: string
    selected?: boolean
    visible?: boolean | null
  }>(),
  {
    visible: null
  }
)

const imgStyle: CSSProperties = {
  width: '60px',
  height: '60px',
  marginBottom: '5px',
  objectFit: 'contain'
}
</script>

<template>
  <UIBlockItem :active="selected">
    <slot name="img" :style="imgStyle"></slot>

    <UIBlockItemTitle size="medium" :title="title ?? name">
      {{ name }}
      <template v-if="visible === false" #suffix>
        <span
          class="inline-flex size-3.5 flex-none cursor-auto items-center justify-center text-grey-700 [&>svg]:block [&>svg]:size-full"
          role="img"
          aria-label="Invisible"
          title="Invisible"
          v-html="eyeOffIcon"
        ></span>
      </template>
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
