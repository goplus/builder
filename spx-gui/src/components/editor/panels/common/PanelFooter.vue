<!-- (floating) Footer for Sprite/Sound Panel -->

<template>
  <div
    class="flex-none flex flex-col gap-3 bg-grey-100 p-3"
    :style="{
      // slightly different with --ui-box-shadow-small
      boxShadow: '0px -2px 8px 0px rgba(51, 51, 51, 0.08)'
    }"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts"></script>
