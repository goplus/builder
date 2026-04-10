<!-- Simple header component for pages like search & explore -->

<template>
  <section class="flex-none bg-grey-100">
    <CenteredWrapper class="h-16 flex items-center justify-between gap-5">
      <h1 class="flex-[1_1_0] min-w-0 truncate text-16 text-title">
        <slot></slot>
      </h1>
      <label class="flex-none">
        <slot name="options"></slot>
      </label>
    </CenteredWrapper>
  </section>
</template>

<script setup lang="ts">
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
</script>
