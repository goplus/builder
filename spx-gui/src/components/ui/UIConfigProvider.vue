<template>
  <NConfigProvider
    ref="nConfigProvider"
    class="ui-config-provider"
    :theme-overrides="themeOverrides"
    :style="cssVariables"
  >
    <slot></slot>
  </NConfigProvider>
</template>

<script lang="ts">
import { type GlobalThemeOverrides } from 'naive-ui'
import { inject, type InjectionKey } from 'vue'
import { computedShallowReactive } from '@/utils/utils'
import * as uiVariables from './tokens'
import { getCssVars } from './tokens/utils'
import { useProvideLastClickEvent } from './utils'
import { providePopupContainer, provideModalContainer, provideRootContainer } from '.'

const uiVariablesKey: InjectionKey<typeof uiVariables> = Symbol('theme-variables')

export function useUIVariables() {
  const vars = inject(uiVariablesKey)
  if (vars == null) throw new Error('useUIVariables should be called inside of UIConfigProvider')
  return vars
}

// config for UI components' behavior
export type Config = {
  confirmDialog?: {
    cancelText?: string
    confirmText?: string
  }
  empty?: {
    text?: string
  }
  error?: {
    retryText?: string
    backText?: string
  }
}

const configKey: InjectionKey<Config> = Symbol('config')

export function useConfig() {
  const config = inject(configKey)
  if (config == null) throw new Error('useConfig should be called inside of UIConfigProvider')
  return config
}

const themeOverrides: GlobalThemeOverrides = {
  common: {
    // TODO: review text color mapping
    primaryColor: uiVariables.color.primary.main,
    primaryColorHover: uiVariables.color.primary[400],
    primaryColorPressed: uiVariables.color.primary[600],
    textColorBase: uiVariables.color.text,
    textColor1: uiVariables.color.title,
    textColor2: uiVariables.color.text,
    textColor3: uiVariables.color.text,
    textColorDisabled: uiVariables.color.disabled.text,
    placeholderColor: uiVariables.color.grey[700],
    dividerColor: uiVariables.color.dividingLine[2],
    borderColor: uiVariables.color.border,
    errorColor: uiVariables.color.danger.main,
    errorColorHover: uiVariables.color.danger[400],
    warningColor: uiVariables.color.yellow.main,
    warningColorHover: uiVariables.color.yellow[400],
    successColor: uiVariables.color.success.main,
    successColorHover: uiVariables.color.success[400],
    infoColor: uiVariables.color.primary.main,
    infoColorHover: uiVariables.color.primary[400],

    boxShadow1: uiVariables.boxShadow.sm,
    boxShadow2: uiVariables.boxShadow.md,
    boxShadow3: uiVariables.boxShadow.lg,

    borderRadiusSmall: uiVariables.borderRadius.sm,
    borderRadius: uiVariables.borderRadius.md,

    heightSmall: uiVariables.lineHeight.sm,
    heightMedium: uiVariables.lineHeight.md,
    heightLarge: uiVariables.lineHeight.lg
  },
  Popover: {
    space: '8px', // TODO: some var like gap?
    arrowOffset: '30px',
    borderRadius: uiVariables.borderRadius.md
  },
  Tooltip: {
    borderRadius: uiVariables.borderRadius.md,
    boxShadow: uiVariables.boxShadow.sm,
    color: uiVariables.color.grey[1000],
    textColor: uiVariables.color.grey[100],
    padding: '7px 8px',
    peers: {
      Popover: {
        arrowOffset: '12px' // TODO: `UITooltip` should be smart enough to use a smaller `arrowOffset` when the trigger element size is small
      }
    }
  },
  Input: {
    border: 'none',
    borderHover: 'none',
    borderFocus: `1px solid ${uiVariables.color.primary.main}`,
    borderDisabled: 'none',
    boxShadowFocus: 'none',
    boxShadowFocusError: 'none',
    suffixTextColor: uiVariables.color.grey[800],
    textColor: uiVariables.color.grey[1000]
  },
  Radio: {
    boxShadowFocus: `inset 0 0 0 1px ${uiVariables.color.primary.main}`
  },
  Switch: {
    buttonBoxShadow: 'none',
    railColor: uiVariables.color.grey[600],
    boxShadowFocus: `0 0 0 2px ${uiVariables.color.turquoise[300]}`
  },
  Checkbox: {
    boxShadowFocus: 'none',
    borderRadius: uiVariables.borderRadius.md
  },
  Message: {
    padding: `11px ${uiVariables.spacing.xl}`,
    iconMargin: `0 8px 0 0`,
    lineHeight: '1.57143',
    textColorInfo: uiVariables.color.title,
    textColorSuccess: uiVariables.color.title,
    textColorWarning: uiVariables.color.title,
    textColorError: uiVariables.color.title,
    maxWidth: '367px'
  },
  Form: {
    labelTextColor: uiVariables.color.hint[1]
  },
  Timeline: {
    iconColorInfo: uiVariables.color.grey[500],
    lineColor: uiVariables.color.grey[500]
  }
}
</script>

<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import { computed, provide, ref } from 'vue'

const props = defineProps<{
  config?: Config
}>()

provide(uiVariablesKey, uiVariables)
provide(
  configKey,
  computedShallowReactive(() => props.config ?? {})
)

const nConfigProvider = ref<InstanceType<typeof NConfigProvider> | null>(null)
const nConfigProviderEl = computed(() => nConfigProvider.value?.$el)
provideRootContainer(nConfigProviderEl)
providePopupContainer(nConfigProviderEl)
provideModalContainer(nConfigProviderEl)

useProvideLastClickEvent()

const cssVariables = getCssVars('--ui-', uiVariables)
</script>

<style scoped>
.ui-config-provider {
  height: 100%;

  color: var(--ui-color-text);
  font-size: var(--ui-font-size-base);
  font-family: var(--ui-font-family-main);
  line-height: 22px;
}
</style>

<style>
/* vueuc (dep of naive-ui) uses `pointer-events: all` on children of `v-binder-follower-content`, which wraps `Popover` content in naive-ui. */
/* It causes pointer behavior issues in popup content. For example, a svg in a `visibility: hidden` element will still be clickable. */
/* So we override it here to fix the issue. See details in https://github.com/07akioni/vueuc/issues/314 */
.v-binder-follower-content > * {
  pointer-events: initial;
}
</style>
