<template>
  <div v-bind="rootAttrs" :class="rootClass">
    <img :src="defaultErrorImg" alt="" />
    <h5 class="mt-3 text-16 text-grey-1000">
      <slot></slot>
    </h5>
    <p v-if="$slots['sub-message'] != null" class="mt-1 text-13/5 text-grey-900">
      <slot name="sub-message"></slot>
    </p>
    <div class="mt-1 flex items-center justify-center gap-3">
      <!-- TODO: consider using slot to support more custom operations -->
      <button v-if="retry != null" :class="opBtnClass" @click="retry">
        <UIIcon v-show="loading" type="loading" />
        {{ retryText }}
      </button>
      <button v-if="back != null" :class="opBtnClass" @click="back">
        {{ backText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import { cn, type ClassValue } from '../utils'
import { useConfig } from '../UIConfigProvider.vue'
import UIIcon from '../icons/UIIcon.vue'
import defaultErrorImg from './default-error.svg'

defineOptions({
  inheritAttrs: false
})

// TODO: support more error types
const props = withDefaults(
  defineProps<{
    retry?: () => unknown
    back?: () => unknown
    cover?: boolean
  }>(),
  {
    retry: undefined,
    back: undefined,
    cover: false
  }
)

const config = useConfig()
const attrs = useAttrs()
const retryText = computed(() => config.error?.retryText ?? 'Retry')
const backText = computed(() => config.error?.backText ?? 'Back')
const rootClass = computed(() =>
  cn(
    'h-full w-full flex flex-col items-center justify-center',
    props.cover ? 'absolute inset-0 overflow-hidden bg-grey-100 opacity-[0.97] [border-radius:inherit]' : null,
    attrs.class as ClassValue
  )
)
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const opBtnClass = [
  'px-3 cursor-pointer border-none outline-none bg-transparent flex items-center gap-1 text-13/5',
  'text-primary-main transition-colors duration-200 hover:text-primary-400 active:text-primary-600'
].join(' ')

const loading = ref(false)

const retry = computed(() =>
  props.retry == null
    ? null
    : async () => {
        loading.value = true
        try {
          await props.retry!()
        } finally {
          loading.value = false
        }
      }
)
</script>
