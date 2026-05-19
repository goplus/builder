<script setup lang="ts">
import { RouterView } from 'vue-router'

import Copilot from '@/components/copilot/Copilot.vue'
</script>

<template>
  <div class="prototype-root">
    <RouterView />
    <Copilot />
  </div>
</template>
