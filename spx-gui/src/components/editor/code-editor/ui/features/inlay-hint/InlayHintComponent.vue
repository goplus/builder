<script setup lang="ts">
import { InlayHint } from './inlay-hint'

defineProps<{
  inlayHint: InlayHint
}>()
</script>

<template>
  <slot></slot>
</template>

<style lang="scss">
//.view-line .inlay-hint__param,
.view-line {
  .inlay-hint__param {
    font-size: 0.8em;
    margin-right: 0.5em;
    color: rgba(0, 0, 0, 0.3);
    vertical-align: middle;
  }

  .inlay-hint__icon-playlist {
    cursor: pointer;
    &::after {
      content: '';
      display: inline-block;
      width: 0.75em;
      height: 0.75em;
      background-image: var(--monaco-editor-icon-playlist);
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center center;
    }
  }

  .inlay-hint__tag {
    width: 0;
    color: rgba(0, 0, 0, 0.3);
    padding: 2px 4px;
    margin: 0 2px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 2px;
    font-size: 0.85em;
    vertical-align: top;
  }
}
</style>
