<template>
  <div :class="rootClass">
    <div class="ui-loading__spin" role="img" aria-label="loading">
      <svg class="ui-loading__spin-icon" viewBox="0 0 200 200">
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 100 100;270 100 100"
            begin="0s"
            dur="1.6s"
            fill="freeze"
            repeatCount="indefinite"
          />
          <circle
            fill="none"
            stroke="currentColor"
            stroke-width="18"
            stroke-linecap="round"
            cx="100"
            cy="100"
            r="91"
            stroke-dasharray="567"
            stroke-dashoffset="1848"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 100 100;135 100 100;450 100 100"
              begin="0s"
              dur="1.6s"
              fill="freeze"
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-dashoffset"
              values="567;142;567"
              begin="0s"
              dur="1.6s"
              fill="freeze"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn, type ClassValue } from '../utils'

export type MaskType = 'none' | 'semi-transparent' | 'solid'

const props = withDefaults(
  defineProps<{
    cover?: boolean
    visible?: boolean
    mask?: boolean | MaskType
    class?: ClassValue
  }>(),
  {
    cover: false,
    visible: true,
    mask: true,
    class: undefined
  }
)

const mask = computed(() => {
  if (props.mask === false) return 'none'
  if (props.mask === true) return 'semi-transparent'
  return props.mask
})

const rootClass = computed(() =>
  cn(
    'h-[80%] w-full flex items-center justify-center invisible opacity-0 [transition:visibility_0.3s,opacity_0.3s]',
    props.cover ? 'absolute left-0 top-0 h-full' : null,
    props.cover && mask.value === 'semi-transparent' ? 'bg-white/50' : null,
    props.cover && mask.value === 'solid' ? 'bg-grey-100' : null,
    props.visible ? 'visible opacity-100' : null,
    props.class
  )
)
</script>

<style scoped>
@keyframes ui-loading-rotator {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.ui-loading__spin {
  display: inline-flex;
  width: 32px;
  height: 32px;
  color: var(--ui-color-primary-main);
  animation: ui-loading-rotator 3s linear infinite both;
}

.ui-loading__spin-icon {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
