<!-- Wrapper for main content of user pages like projects, likes, following & followers -->

<script setup lang="ts">
import CommunityCard from '../../CommunityCard.vue'
</script>

<template>
  <CommunityCard
    v-radar="{ name: 'User content', desc: 'Main content area for user pages' }"
    class="flex flex-col px-middle py-5"
  >
    <header class="mb-2 h-8 flex items-center justify-between gap-5">
      <!-- TODO: Layout here shifts when jumping from `/user/:name` to `/user/:name/projects`, which is not ideal -->
      <h2 class="text-16 text-title">
        <slot name="title"></slot>
      </h2>
      <div class="flex gap-6">
        <slot name="extra"></slot>
      </div>
    </header>
    <slot></slot>
  </CommunityCard>
</template>
