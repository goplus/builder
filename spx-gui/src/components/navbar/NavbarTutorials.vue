<!-- eslint-disable vue/no-v-html -->
<template>
  <router-link
    v-radar="{ name: 'Navbar tutorials link', desc: 'Click to open the tutorials page' }"
    class="navbar-tutorials"
    to="/tutorials"
  >
    <button class="button">
      <UIIcon class="icon" type="tutorial" />
      <div class="text">{{ $t({ en: 'Tutorials', zh: '教程' }) }}</div>
    </button>
  </router-link>
</template>

<script setup lang="ts">
import { UIIcon } from '@/components/ui'
</script>

<style lang="scss" scoped>
.navbar-tutorials {
  display: flex;
  height: 100%;
  padding: 0 20px;
  align-items: center;
  text-decoration: none;

  .button {
    display: flex;
    padding: 4px 16px;
    align-items: center;
    gap: 4px;
    border-radius: 12px;
    border: none;
    outline: none;
    background: var(--ui-color-grey-100);

    .icon {
      width: 16px;
      height: 16px;
      color: var(--ui-color-primary-main);
    }
    .text {
      white-space: nowrap;
      color: var(--ui-color-primary-main);
      font-size: 14px;
      font-style: normal;
      font-weight: 600;
      line-height: 22px;
    }

    &:hover {
      cursor: pointer;
      background: var(--ui-color-grey-300);
    }
  }
}
</style>
