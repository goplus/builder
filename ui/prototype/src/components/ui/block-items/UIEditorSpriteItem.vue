<script setup lang="ts">
import type { CSSProperties } from 'vue'
import UIBlockItem from '@/components/ui/block-items/UIBlockItem.vue'
import UIBlockItemTitle from '@/components/ui/block-items/UIBlockItemTitle.vue'
import UIIcon from '@/components/ui/icons/UIIcon.vue'

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
        <UIIcon
          class="size-3.5 flex-none cursor-auto text-grey-700"
          type="eyeOff"
          role="img"
          aria-label="Invisible"
          title="Invisible"
        />
      </template>
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
