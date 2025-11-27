<template>
  <UITooltip placement="bottom">
    <template #trigger>
      <router-link
        v-radar="{ name: 'Navbar tutorials link', desc: 'Click to open the tutorials page' }"
        class="navbar-tutorials"
        to="/tutorials"
      >
        <UIIcon class="icon" type="tutorial" />
      </router-link>
    </template>
    <div class="text">{{ $t({ en: 'Tutorials', zh: '教程' }) }}</div>
  </UITooltip>
</template>

<script setup lang="ts">
import { UIIcon, UITooltip } from '@/components/ui'
</script>

<style lang="scss" scoped>
.navbar-tutorials {
  height: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;
  cursor: pointer;

  .icon {
    width: 24px;
    height: 24px;
    color: white;
  }

  &:hover {
    background-color: var(--ui-color-primary-600);
  }
}
</style>
