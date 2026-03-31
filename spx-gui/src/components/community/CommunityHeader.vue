<!-- Simple header component for pages like search & explore -->

<template>
  <section class="flex-none bg-grey-100">
    <CenteredWrapper class="flex h-16 items-center justify-between gap-5">
      <h1 class="min-w-0 flex-1 truncate text-body leading-1 text-title">
        <slot></slot>
      </h1>
      <label class="shrink-0">
        <slot name="options"></slot>
      </label>
    </CenteredWrapper>
  </section>
</template>

<script setup lang="ts">
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
</script>
