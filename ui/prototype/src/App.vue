<script setup lang="ts">
import { RouterView } from 'vue-router'

import PrototypeCopilot from '@/components/copilot/PrototypeCopilot.vue'
</script>

<template>
  <div class="prototype-root">
    <RouterView />
    <PrototypeCopilot />
  </div>
</template>
