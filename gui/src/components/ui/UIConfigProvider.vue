<template>
  <div ref="rootEl" class="h-full text-text font-main text-base" :style="cssVariables">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { inject, type InjectionKey } from 'vue'
import { computedShallowReactive } from '@/utils/utils'
import * as uiVariables from './tokens'
import { getCssVars } from './tokens/utils'
import { provideLayerStack, useProvideLastClickEvent } from './utils'
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
</script>

<script setup lang="ts">
import { provide, ref } from 'vue'

const props = defineProps<{
  config?: Config
}>()

provide(uiVariablesKey, uiVariables)
provide(
  configKey,
  computedShallowReactive(() => props.config ?? {})
)

const rootEl = ref<HTMLElement>()
provideRootContainer(rootEl)
providePopupContainer(rootEl)
provideModalContainer(rootEl)
provideLayerStack()

useProvideLastClickEvent()

const cssVariables = getCssVars('--ui-', uiVariables)
</script>
