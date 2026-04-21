<template>
  <UITooltip placement="bottom">
    <template #trigger>
      <router-link
        v-radar="{ name: 'Navbar tutorials link', desc: 'Click to open the tutorials page' }"
        class="h-full cursor-pointer flex items-center px-3 hover:bg-grey-400"
        to="/tutorials"
      >
        <UIIcon class="h-5 w-5 text-grey-1000" type="tutorial" />
      </router-link>
    </template>
    <div class="text">{{ $t({ en: 'Tutorials', zh: '教程' }) }}</div>
  </UITooltip>
</template>

<script setup lang="ts">
import { UIIcon, UITooltip } from '@/components/ui'
</script>
