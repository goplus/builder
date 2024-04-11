<template>
  <NConfigProvider :theme-overrides="themeOverrides" :style="cssVariables">
    <slot></slot>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, type GlobalThemeOverrides } from 'naive-ui'

const primaryColor = '#0BC0CF'
// Panels, ...
const boxShadow1 = '0px 4px 12px 0px #D0F2F8'
// Dropdown menus, ...
const boxShadow2 = '0px 8px 24px 0px #00000014'
// Panels, ...
const borderRadius = '20px'

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

const cssVariables = {
  '--ui-primary-color': primaryColor,
  '--ui-box-shadow-1': boxShadow1,
  '--ui-box-shadow-2': boxShadow2,
  '--ui-border-radius': borderRadius
  // TOOD: more
}
</script>

<style lang="scss">
/* TODO: remove me? */
.n-config-provider {
  height: 100%;
}
</style>
