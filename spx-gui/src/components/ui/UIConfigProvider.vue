<template>
  <NConfigProvider
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
import * as uiVariables from './tokens'
import { getCssVars } from './tokens/utils'

const uiVariablesKey: InjectionKey<typeof uiVariables> = Symbol('theme-variables')

export function useUIVariables() {
  const vars = inject(uiVariablesKey)
  if (vars == null) throw new Error('useUIVariables should be called inside of UIConfigProvider')
  return vars
}

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: uiVariables.color.primary.main,

    // TODO: review text color mapping
    textColorBase: uiVariables.color.text,
    textColor1: uiVariables.color.text,
    textColor2: uiVariables.color.text,
    textColor3: uiVariables.color.text,

    // TODO: review boxShadow mapping
    boxShadow1: uiVariables.boxShadow.small,
    boxShadow2: uiVariables.boxShadow.big,
    boxShadow3: uiVariables.boxShadow.diffusion,

    borderRadiusSmall: uiVariables.borderRadius[1],
    borderRadius: uiVariables.borderRadius[2]
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

const cssVariables = getCssVars('--ui-', uiVariables)
</script>

<style lang="scss" scoped>
@import '@/assets/fonts/font.css';

.ui-config-provider {
  height: 100%;

  color: var(--ui-color-text);
  font-size: var(--ui-font-size-text);
  font-family:
    // ChauPhilomeneOne,
    AlibabaPuHuiT,
    Cherry Bomb,
    Heyhoo,
    sans-serif;
  line-height: 1.57143;
}
</style>

<style lang="scss">
/* TODO: var definition for font-size, line-height & font-weight? */
/* TODO: actully different font-weight for h1-h6, but with different font-family to achieve this (if we use FZLanTing YuanS) */

/* Special title */
h1 {
  font-size: 20px;
  line-height: 1.4;
  font-weight: 500;
}

/* Standard title */
h2 {
  font-size: 16px;
  line-height: 1.5;
}

/* Text in navigation bar */
h3,
/* Text */
h4 {
  font-size: 14px;
  line-height: 1.57143;
}

/* More information */
h5 {
  font-size: 12px;
  line-height: 1.5;
}

h6 {
  font-size: 10px;
  line-height: 1.6;
}
</style>
