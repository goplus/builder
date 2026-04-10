<template>
  <div v-bind="rootAttrs" :class="rootClass">
    <template v-if="size === 'large'">
      <img :src="img" />
      <slot></slot>
      <template v-if="!slots.default">
        {{ defaultText }}
      </template>
    </template>
    <template v-else-if="size === 'extra-large'">
      <img :src="img" />
      <p class="mt-3 text-16 text-grey-700">
        <slot></slot>
        <template v-if="!slots.default">
          {{ defaultText }}
        </template>
      </p>
      <div class="ui-empty-op mt-6 flex gap-large"><slot name="op"></slot></div>
    </template>
    <template v-else>
      <svg
        v-if="size === 'medium'"
        class="line"
        width="36"
        height="2"
        viewBox="0 0 36 2"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M1 1H9" stroke="#EAEFF3" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M15 1H35" stroke="#EAEFF3" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <slot></slot>
      <template v-if="!slots.default">
        {{ defaultText }}
      </template>
      <svg
        v-if="size === 'medium'"
        class="line"
        width="36"
        height="2"
        viewBox="0 0 36 2"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M1 1H21" stroke="#EAEFF3" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M27 1H35" stroke="#EAEFF3" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import { cn, type ClassValue } from '../utils'
import { useConfig } from '../UIConfigProvider.vue'
import searchImg from './search.svg'
import gameImg from './game.svg'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  size: 'small' | 'medium' | 'large' | 'extra-large'
  img?: 'search' | 'game'
}>()

const img = computed(() => {
  if (props.img === 'game') return gameImg
  if (props.img === 'search') return searchImg
  if (props.size === 'extra-large') return gameImg
  return searchImg
})

const config = useConfig()
const defaultText = computed(() => config.empty?.text ?? 'No data')
const slots = useSlots()
const attrs = useAttrs()
const rootClass = computed(() =>
  cn(
    'h-full w-full flex items-center justify-center',
    {
      'flex-col gap-3 text-16 text-grey-1000': props.size === 'large',
      'flex-col': props.size === 'extra-large',
      'gap-2 text-grey-600': props.size === 'small' || props.size === 'medium'
    },
    attrs.class as ClassValue
  )
)
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

// TODO: support button for size:large ?
</script>

<style scoped>
.ui-empty-op {
  /* TODO: more reliable approach? */
  :deep(.ui-button svg),
  :deep(.ui-button img) {
    width: 18px;
    height: 18px;
  }
}
</style>
