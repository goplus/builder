<script lang="ts">
import { createRecipe, type ClassValue } from './utils'

export type ButtonColor =
  | 'primary'
  | 'secondary'
  | 'boring'
  | 'white'
  | 'danger'
  | 'success'
  | 'blue'
  | 'purple'
  | 'yellow'
export type ButtonSize = 'small' | 'medium' | 'large'
export type ButtonHtmlType = 'button' | 'submit' | 'reset'
export type ButtonVariant = 'shadow' | 'flat' | 'stroke'
export type ButtonShape = 'square' | 'circle'

type ButtonCssVarState = {
  color: ButtonColor
  disabled: boolean
  loading: boolean
}

type ButtonCssVars = {
  '--ui-button-color': string
  '--ui-button-bg-color': string
  '--ui-button-hover-bg-color': string
  '--ui-button-shadow-color': string
  '--ui-button-stroke-color': string
}

function defineButtonCssVars(
  color: string,
  backgroundColor: string,
  hoverBackgroundColor: string,
  shadowColor: string,
  strokeColor = 'var(--ui-color-grey-400)'
): ButtonCssVars {
  return {
    '--ui-button-color': color,
    '--ui-button-bg-color': backgroundColor,
    '--ui-button-hover-bg-color': hoverBackgroundColor,
    '--ui-button-shadow-color': shadowColor,
    '--ui-button-stroke-color': strokeColor
  }
}

const buttonColorVars: Record<ButtonColor, ButtonCssVars> = {
  primary: defineButtonCssVars(
    'var(--ui-color-grey-100)',
    'var(--ui-color-primary-main)',
    'var(--ui-color-primary-400)',
    'var(--ui-color-primary-700)'
  ),
  secondary: defineButtonCssVars(
    'var(--ui-color-primary-main)',
    'var(--ui-color-primary-200)',
    'var(--ui-color-primary-100)',
    'var(--ui-color-primary-300)'
  ),
  boring: defineButtonCssVars(
    'var(--ui-color-text)',
    'var(--ui-color-grey-300)',
    'var(--ui-color-grey-200)',
    'var(--ui-color-grey-600)'
  ),
  white: defineButtonCssVars(
    'var(--ui-color-text)',
    'var(--ui-color-grey-100)',
    'var(--ui-color-grey-300)',
    'var(--ui-color-grey-400)'
  ),
  danger: defineButtonCssVars(
    'var(--ui-color-grey-100)',
    'var(--ui-color-danger-main)',
    'var(--ui-color-danger-400)',
    'var(--ui-color-danger-600)'
  ),
  success: defineButtonCssVars(
    'var(--ui-color-grey-100)',
    'var(--ui-color-success-main)',
    'var(--ui-color-success-400)',
    'var(--ui-color-success-600)'
  ),
  blue: defineButtonCssVars(
    'var(--ui-color-grey-100)',
    'var(--ui-color-blue-main)',
    'var(--ui-color-blue-400)',
    'var(--ui-color-blue-700)'
  ),
  purple: defineButtonCssVars(
    'var(--ui-color-grey-100)',
    'var(--ui-color-purple-main)',
    'var(--ui-color-purple-400)',
    'var(--ui-color-purple-700)'
  ),
  yellow: defineButtonCssVars(
    'var(--ui-color-grey-100)',
    'var(--ui-color-yellow-main)',
    'var(--ui-color-yellow-400)',
    'var(--ui-color-yellow-700)'
  )
}

const buttonDisabledVars = defineButtonCssVars(
  'var(--ui-color-disabled-text)',
  'var(--ui-color-disabled-bg)',
  'var(--ui-color-disabled-bg)',
  'var(--ui-color-grey-500)'
)

export function resolveButtonCssVars({ color, disabled, loading }: ButtonCssVarState): ButtonCssVars {
  return disabled && !loading ? buttonDisabledVars : buttonColorVars[color]
}

// Keep text size and text color in different utility groups.
// `text-15` and `text-(color:...)` can be treated as conflicting `text-*`
// utilities by `twMerge`, so color/background stay on raw CSS properties.
// TODO: Remove this special-case once app.css migrates numeric text tokens to semantic text-size tokens.
const buttonSlots = {
  root: 'group/ui-button cursor-pointer flex items-stretch border-none bg-transparent p-0 disabled:cursor-not-allowed',
  content:
    'flex-[1_1_0] h-full flex items-center justify-center [color:var(--ui-button-color)] [background-color:var(--ui-button-bg-color)]',
  icon: 'shrink-0'
} as const

export const buttonRecipe = createRecipe({
  slots: buttonSlots,
  variants: {
    variant: {
      shadow: {
        root: 'pb-1 enabled:active:pb-0',
        content: 'shadow-[0_4px_var(--ui-button-shadow-color)]'
      },
      flat: {
        root: 'pb-0'
      },
      stroke: {
        root: 'pb-0',
        content: 'border border-(--ui-button-stroke-color)'
      }
    },
    shape: {
      square: {
        root: 'rounded-md',
        content: 'rounded-md'
      },
      circle: {
        root: 'rounded-full',
        content: 'rounded-full'
      }
    },
    size: {
      large: {
        root: 'h-(--ui-line-height-3)',
        content: 'gap-2 px-6 text-15/[1.6]',
        icon: 'size-[18px]'
      },
      medium: {
        root: 'h-(--ui-line-height-2)',
        content: 'gap-1 px-4 text-body/[1.5]',
        icon: 'size-[14px]'
      },
      small: {
        root: 'h-(--ui-line-height-1)',
        content: 'gap-1 px-3 text-13/[1.5]',
        icon: 'size-[13px]'
      }
    },
    loading: {
      true: {
        root: 'cursor-not-allowed'
      },
      false: null
    },
    disabled: {
      true: null,
      false: null
    },
    iconOnly: {
      true: {
        root: 'aspect-square',
        content: 'px-0'
      },
      false: null
    }
  },
  defaultVariants: {
    variant: 'shadow',
    shape: 'square',
    size: 'medium',
    loading: false,
    disabled: false,
    iconOnly: false
  },
  compoundVariants: [
    {
      when: {
        variant: ['flat', 'stroke'],
        size: 'large'
      },
      class: {
        icon: 'size-5'
      }
    },
    {
      when: {
        variant: ['flat', 'stroke'],
        size: 'medium'
      },
      class: {
        icon: 'size-4'
      }
    },
    {
      when: {
        variant: 'shadow',
        loading: true
      },
      class: {
        root: 'pb-0',
        content: 'shadow-none'
      }
    }
  ]
})
</script>

<script setup lang="ts">
import { computed, ref, useAttrs, useSlots } from 'vue'

import UIIcon, { type Type as IconType } from './icons/UIIcon.vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    shape?: ButtonShape
    color?: ButtonColor
    size?: ButtonSize
    icon?: IconType
    disabled?: boolean
    loading?: boolean
    htmlType?: ButtonHtmlType
  }>(),
  {
    variant: 'shadow',
    shape: 'square',
    color: 'primary',
    size: 'medium',
    icon: undefined,
    disabled: false,
    loading: false,
    htmlType: 'button'
  }
)

const btnRef = ref<HTMLButtonElement | null>(null)
const attrs = useAttrs()
const slots = useSlots()
const isDisabled = computed(() => props.disabled || props.loading)
const resolvedIcon = computed(() => (props.loading ? 'loading' : props.icon))
const hasDefaultSlot = computed(() => slots.default != null)
const iconOnly = computed(() => (props.icon != null || slots.icon != null) && !hasDefaultSlot.value)
const contentStyle = computed(() =>
  resolveButtonCssVars({
    color: props.color,
    disabled: props.disabled,
    loading: props.loading
  })
)
const classes = computed(() =>
  buttonRecipe({
    variant: props.variant,
    shape: props.shape,
    size: props.size,
    loading: props.loading,
    disabled: isDisabled.value,
    iconOnly: iconOnly.value
  })
)
const rootClass = computed(() => classes.value.root(attrs.class as ClassValue | null))
const contentClass = computed(() => classes.value.content())
const iconClass = computed(() => classes.value.icon())
const buttonAttrs = computed(() => {
  const { class: _class, disabled: _disabled, type: _type, ...rest } = attrs
  return rest
})

defineExpose({
  focus() {
    btnRef.value?.focus()
  }
})
</script>

<template>
  <button
    ref="btnRef"
    v-bind="buttonAttrs"
    class="ui-button-root"
    :class="rootClass"
    :data-loading="loading || null"
    :data-variant="variant"
    :disabled="isDisabled"
    :type="htmlType"
  >
    <span class="ui-button-content" :class="contentClass" :style="contentStyle">
      <UIIcon v-if="resolvedIcon != null" :class="iconClass" :type="resolvedIcon" />
      <slot v-else name="icon"></slot>
      <slot v-if="hasDefaultSlot"></slot>
    </span>
  </button>
</template>

<style scoped>
.ui-button-root:hover:enabled:not(:active) .ui-button-content {
  background-color: var(--ui-button-hover-bg-color);
}

.ui-button-root[data-variant='shadow']:enabled:active .ui-button-content,
.ui-button-root[data-variant='shadow'][data-loading='true'] .ui-button-content {
  box-shadow: none;
}
</style>
