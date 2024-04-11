<template>
  <NConfigProvider :theme-overrides="themeOverrides" :style="cssVariables">
    <slot></slot>
  </NConfigProvider>
</template>

<script lang="ts">
import { type GlobalThemeOverrides } from 'naive-ui'
import { type InjectionKey } from 'vue'
import { inject } from 'vue'

const primaryColor = '#0BC0CF'
// Panels, ...
const boxShadow1 = '0px 4px 12px 0px #D0F2F8'
// Dropdown menus, ...
const boxShadow2 = '0px 8px 24px 0px #00000014'
// Panels, ...
const borderRadius = '20px'

const uiVariables = {
  primaryColor,
  boxShadow1,
  boxShadow2,
  borderRadius
  // TOOD: more
}

const uiVariablesKey: InjectionKey<typeof uiVariables> = Symbol('theme-variables')

export function useUIVariables() {
  const vars = inject(uiVariablesKey)
  if (vars == null) throw new Error('useUIVariables should be called inside of UIConfigProvider')
  return vars
}

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor,
    boxShadow1,
    boxShadow2,
    borderRadius
  },
  Button: {
    // TODO: more
  }
}
</script>

<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import { provide } from 'vue'

provide(uiVariablesKey, uiVariables)

// TODO: generated from `uiVariables`?
const cssVariables = {
  '--ui-primary-color': primaryColor,
  '--ui-box-shadow-1': boxShadow1,
  '--ui-box-shadow-2': boxShadow2,
  '--ui-border-radius': borderRadius
}
</script>

<style lang="scss">
/* TODO: remove me? */
.n-config-provider {
  height: 100%;
}
</style>
