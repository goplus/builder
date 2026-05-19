<template>
  <section class="flex-none border-b border-grey-400 bg-grey-100">
    <CenteredWrapper class="flex h-16 items-center justify-between gap-5">
      <h1 class="min-w-0 flex-1 truncate text-xl text-title">
        <slot />
      </h1>
      <label class="flex-none">
        <slot name="options" />
      </label>
    </CenteredWrapper>
  </section>
</template>

<script setup lang="ts">
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
</script>
