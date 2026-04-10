<template>
  <div>
    <div class="flex h-[43px] items-center px-4 text-16">
      <slot></slot>
    </div>
    <UIDivider />
  </div>
</template>
<script setup lang="ts">
import { UIDivider } from '@/components/ui'
</script>
