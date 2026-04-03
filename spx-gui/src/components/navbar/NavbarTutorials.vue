<template>
  <UITooltip placement="bottom">
    <template #trigger>
      <router-link
        v-radar="{ name: 'Navbar tutorials link', desc: 'Click to open the tutorials page' }"
        class="flex h-full cursor-pointer items-center px-5"
        to="/tutorials"
      >
        <UIIcon type="tutorial" class="text-grey-1000" style="width: 20px; height: 20px" />
      </router-link>
    </template>
    <div class="text">{{ $t({ en: 'Tutorials', zh: '教程' }) }}</div>
  </UITooltip>
</template>

<script setup lang="ts">
import { UIIcon, UITooltip } from '@/components/ui'
</script>
