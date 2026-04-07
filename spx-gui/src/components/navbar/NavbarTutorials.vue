<template>
  <UITooltip placement="bottom">
    <template #trigger>
      <router-link
        v-radar="{ name: 'Navbar tutorials link', desc: 'Click to open the tutorials page' }"
        class="flex h-full cursor-pointer items-center px-5 hover:bg-primary-600"
        to="/tutorials"
      >
        <UIIcon class="w-6 h-6 text-grey-100" type="tutorial" />
      </router-link>
    </template>
    <div class="text">{{ $t({ en: 'Tutorials', zh: '教程' }) }}</div>
  </UITooltip>
</template>

<script setup lang="ts">
import { UIIcon, UITooltip } from '@/components/ui'
</script>
