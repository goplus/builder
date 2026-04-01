<script lang="ts" setup></script>

<template>
  <div class="flex">
    <div class="flex-[1_0_44%] overflow-hidden border-r border-grey-400 p-4">
      <slot name="left"></slot>
    </div>
    <div class="flex-[1_0_56%] flex">
      <slot name="right"></slot>
    </div>
  </div>
</template>
