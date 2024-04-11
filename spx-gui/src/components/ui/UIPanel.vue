<template>
  <div class="ui-panel">
    <slot></slot>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss">
.ui-panel {
  box-shadow: var(--ui-box-shadow-1);
  border-radius: var(--ui-border-radius);
  background-color: #fff; /** TODO: define as var */
}
</style>
