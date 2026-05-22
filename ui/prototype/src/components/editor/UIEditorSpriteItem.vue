<script setup lang="ts">
import type { CSSProperties } from 'vue'
import eyeOffIcon from '@/assets/editor/ui-icons/eye-off.svg?raw'
import UIBlockItem from '@/components/editor/UIBlockItem.vue'
import UIBlockItemTitle from '@/components/editor/UIBlockItemTitle.vue'

defineProps<{
  name: string
  title?: string
  selected?: boolean
  visible?: boolean
}>()

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

    <UIBlockItemTitle class="gap-0.5 px-1" size="medium" :title="title ?? name">
      {{ name }}
      <template v-if="visible === false" #suffix>
        <span
          class="size-3.5 flex-none cursor-auto text-grey-700"
          role="img"
          aria-label="Invisible"
          v-html="eyeOffIcon"
        ></span>
      </template>
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
