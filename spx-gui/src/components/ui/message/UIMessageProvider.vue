<template>
  <NMessageProvider :to="attachTo">
    <slot></slot>
  </NMessageProvider>
</template>

<script setup lang="ts">
import { NMessageProvider } from 'naive-ui'
import { useRootContainer } from '../utils'

const attachTo = useRootContainer()
</script>

<style lang="scss">
.n-message {
  align-items: flex-start; /** text-content may contain multiple lines */
  .n-message__icon {
    margin-top: 1px; /** align icon with text-content */
  }
}
</style>
