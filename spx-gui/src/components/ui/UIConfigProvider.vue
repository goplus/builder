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
import { provideModalStack } from './modal/stack'
import { providePopupStack } from './popup'
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
    primaryColorPressed: uiVariables.color.primary.main,
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
    warningColorHover: uiVariables.color.yellow[100],
    successColor: uiVariables.color.success.main,
    successColorHover: uiVariables.color.success[400],
    infoColor: uiVariables.color.primary.main,
    infoColorHover: uiVariables.color.primary[100],

    // TODO: review boxShadow mapping
    boxShadow1: uiVariables.boxShadow.small,
    boxShadow2: uiVariables.boxShadow.big,
    boxShadow3: uiVariables.boxShadow.diffusion,

    borderRadiusSmall: uiVariables.borderRadius[1],
    borderRadius: uiVariables.borderRadius[2],

    heightSmall: uiVariables.lineHeight[1],
    heightMedium: uiVariables.lineHeight[2],
    heightLarge: uiVariables.lineHeight[3]
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
    boxShadowFocus: 'none'
  },
  Message: {
    padding: `11px ${uiVariables.gap.middle}`,
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
provideModalStack()
providePopupStack()

useProvideLastClickEvent()

const cssVariables = getCssVars('--ui-', uiVariables)
</script>

<style scoped>
.ui-config-provider {
  height: 100%;

  color: var(--ui-color-text);
  font-size: var(--ui-font-size-text);
  font-family: var(--ui-font-family-main);
  line-height: 1.57143;
}
</style>
