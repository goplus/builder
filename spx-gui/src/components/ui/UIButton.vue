<script lang="ts">
import { createRecipe, type ClassValue } from './utils'

export type ButtonType = 'primary' | 'secondary' | 'neutral' | 'white' | 'red' | 'green' | 'blue' | 'purple' | 'yellow'
export type ButtonSize = 'small' | 'medium' | 'large'
export type ButtonHtmlType = 'button' | 'submit' | 'reset'
export type ButtonShape = 'default' | 'circle' | 'square'

type ButtonCssVarState = {
  type: ButtonType
  disabled: boolean
  loading: boolean
}

type ButtonStatePalette = {
  color: string
  bgColor: string
  borderColor: string
}

type ButtonPalette = {
  default: ButtonStatePalette
  hover: ButtonStatePalette
  active: ButtonStatePalette
  loading: ButtonStatePalette
  disabled: ButtonStatePalette
  focusBorderColor: string
}

type ButtonCssVars = {
  '--ui-button-color': string
  '--ui-button-bg-color': string
  '--ui-button-border-color': string
  '--ui-button-hover-bg-color': string
  '--ui-button-hover-border-color': string
  '--ui-button-active-bg-color': string
  '--ui-button-active-border-color': string
  '--ui-button-focus-border-color': string
}

function defineButtonStatePalette(
  color: string,
  backgroundColor: string,
  borderColor = 'transparent'
): ButtonStatePalette {
  return {
    color,
    bgColor: backgroundColor,
    borderColor
  }
}

function defineButtonPalette(
  defaultState: ButtonStatePalette,
  hoverState: ButtonStatePalette,
  activeState: ButtonStatePalette,
  options: {
    loading?: ButtonStatePalette
    disabled: ButtonStatePalette
    focusBorderColor?: string
  }
): ButtonPalette {
  return {
    default: defaultState,
    hover: hoverState,
    active: activeState,
    loading: options.loading ?? defaultState,
    disabled: options.disabled,
    focusBorderColor: options.focusBorderColor ?? 'var(--ui-color-primary-700)'
  }
}

const buttonDisabledFilledPalette = defineButtonStatePalette(
  'var(--ui-color-disabled-text)',
  'var(--ui-color-disabled-bg)'
)

const buttonDisabledStrokePalette = defineButtonStatePalette(
  'var(--ui-color-disabled-text)',
  'var(--ui-color-disabled-bg)',
  'var(--ui-color-grey-400)'
)

const buttonPalettes: Record<ButtonType, ButtonPalette> = {
  primary: defineButtonPalette(
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-primary-500)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-primary-400)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-primary-600)'),
    { disabled: buttonDisabledFilledPalette }
  ),
  secondary: defineButtonPalette(
    defineButtonStatePalette('var(--ui-color-primary-500)', 'var(--ui-color-primary-200)'),
    defineButtonStatePalette('var(--ui-color-primary-500)', 'var(--ui-color-primary-100)'),
    defineButtonStatePalette('var(--ui-color-primary-500)', 'var(--ui-color-primary-300)'),
    { disabled: buttonDisabledFilledPalette }
  ),
  neutral: defineButtonPalette(
    defineButtonStatePalette('var(--ui-color-grey-900)', 'var(--ui-color-grey-300)', 'var(--ui-color-grey-400)'),
    defineButtonStatePalette('var(--ui-color-grey-900)', 'var(--ui-color-grey-200)', 'var(--ui-color-grey-400)'),
    defineButtonStatePalette('var(--ui-color-grey-900)', 'var(--ui-color-grey-400)', 'var(--ui-color-grey-400)'),
    { disabled: buttonDisabledStrokePalette }
  ),
  white: defineButtonPalette(
    defineButtonStatePalette('var(--ui-color-grey-900)', 'var(--ui-color-grey-100)', 'var(--ui-color-grey-400)'),
    defineButtonStatePalette('var(--ui-color-grey-900)', 'var(--ui-color-grey-300)', 'var(--ui-color-grey-400)'),
    defineButtonStatePalette('var(--ui-color-grey-900)', 'var(--ui-color-grey-400)', 'var(--ui-color-grey-400)'),
    { disabled: buttonDisabledStrokePalette }
  ),
  red: defineButtonPalette(
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-red-500)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-red-400)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-red-600)'),
    { disabled: buttonDisabledFilledPalette }
  ),
  green: defineButtonPalette(
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-green-500)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-green-400)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-green-600)'),
    { disabled: buttonDisabledFilledPalette }
  ),
  blue: defineButtonPalette(
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-blue-600)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-blue-400)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-blue-600)'),
    { disabled: buttonDisabledFilledPalette }
  ),
  purple: defineButtonPalette(
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-purple-600)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-purple-400)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-purple-600)'),
    { disabled: buttonDisabledFilledPalette }
  ),
  yellow: defineButtonPalette(
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-yellow-500)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-yellow-400)'),
    defineButtonStatePalette('var(--ui-color-grey-100)', 'var(--ui-color-yellow-600)'),
    { disabled: buttonDisabledFilledPalette }
  )
}

export function resolveButtonCssVars({ type, disabled, loading }: ButtonCssVarState): ButtonCssVars {
  const palette = buttonPalettes[type]
  const current = disabled && !loading ? palette.disabled : loading ? palette.loading : palette.default
  const hover = disabled || loading ? current : palette.hover
  const active = disabled || loading ? current : palette.active
  const focusBorderColor = disabled || loading ? current.borderColor : palette.focusBorderColor

  return {
    '--ui-button-color': current.color,
    '--ui-button-bg-color': current.bgColor,
    '--ui-button-border-color': current.borderColor,
    '--ui-button-hover-bg-color': hover.bgColor,
    '--ui-button-hover-border-color': hover.borderColor,
    '--ui-button-active-bg-color': active.bgColor,
    '--ui-button-active-border-color': active.borderColor,
    '--ui-button-focus-border-color': focusBorderColor
  }
}

const buttonRootBaseClass =
  'inline-flex cursor-pointer items-center justify-center p-0 font-medium disabled:cursor-not-allowed'

const buttonRootSurfaceClass =
  'border bg-(--ui-button-bg-color) text-(--ui-button-color) border-(--ui-button-border-color) transition-colors'

const buttonRootInteractiveClass =
  'enabled:hover:bg-(--ui-button-hover-bg-color) enabled:hover:border-(--ui-button-hover-border-color) enabled:active:bg-(--ui-button-active-bg-color) enabled:active:border-(--ui-button-active-border-color)'

const buttonRootFocusClass = 'focus-visible:border-(--ui-button-focus-border-color) focus-visible:outline-none'

const buttonRootClass = [
  buttonRootBaseClass,
  buttonRootSurfaceClass,
  buttonRootInteractiveClass,
  buttonRootFocusClass
].join(' ')

const buttonSlots = {
  root: buttonRootClass,
  icon: 'shrink-0'
} as const

export const buttonRecipe = createRecipe({
  slots: buttonSlots,
  variants: {
    shape: {
      default: {
        root: 'rounded-md'
      },
      circle: {
        root: 'rounded-full'
      },
      square: {
        root: 'rounded-md'
      }
    },
    size: {
      large: {
        root: 'h-10 gap-2 px-6 text-lg/[24px]',
        icon: 'size-5'
      },
      medium: {
        root: 'h-8 gap-1 px-4 text-base/[22px]',
        icon: 'size-4'
      },
      small: {
        root: 'h-[26px] gap-1 px-3 text-base/[22px]',
        icon: 'size-[13px]'
      }
    }
  },
  defaultVariants: {
    shape: 'default',
    size: 'medium'
  },
  compoundVariants: [
    {
      when: {
        shape: ['circle', 'square'],
        size: 'small'
      },
      class: {
        root: 'aspect-square gap-0 p-0',
        icon: 'size-[13px]'
      }
    },
    {
      when: {
        shape: ['circle', 'square'],
        size: 'medium'
      },
      class: {
        root: 'aspect-square gap-0 p-0',
        icon: 'size-4'
      }
    },
    {
      when: {
        shape: ['circle', 'square'],
        size: 'large'
      },
      class: {
        root: 'aspect-square gap-0 p-0',
        icon: 'size-5'
      }
    }
  ]
})
</script>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'

import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    type?: ButtonType
    shape?: ButtonShape
    size?: ButtonSize
    icon?: IconType
    disabled?: boolean
    loading?: boolean
    htmlType?: ButtonHtmlType
    class?: ClassValue
  }>(),
  {
    type: 'primary',
    shape: 'default',
    size: 'medium',
    icon: undefined,
    disabled: false,
    loading: false,
    htmlType: 'button',
    class: undefined
  }
)

const btnRef = ref<HTMLButtonElement | null>(null)
const slots = useSlots()
const isDisabled = computed(() => props.disabled || props.loading)
const resolvedIcon = computed(() => (props.loading ? 'loading' : props.icon))
const hasDefaultSlot = computed(() => slots.default != null)
const contentStyle = computed(() =>
  resolveButtonCssVars({
    type: props.type,
    disabled: props.disabled,
    loading: props.loading
  })
)
const classes = computed(() =>
  buttonRecipe({
    shape: props.shape,
    size: props.size
  })
)
const rootClass = computed(() => classes.value.root(props.class))
const iconClass = computed(() => classes.value.icon())

defineExpose({
  focus() {
    btnRef.value?.focus()
  }
})
</script>

<template>
  <button ref="btnRef" :class="rootClass" :disabled="isDisabled" :style="contentStyle" :type="htmlType">
    <UIIcon v-if="resolvedIcon != null" :class="iconClass" :type="resolvedIcon" />
    <slot v-else name="icon"></slot>
    <slot v-if="hasDefaultSlot"></slot>
  </button>
</template>
