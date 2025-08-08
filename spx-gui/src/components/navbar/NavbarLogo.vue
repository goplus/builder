<template>
  <router-link v-radar="{ name: 'Logo link', desc: 'Logo image as link to the homepage' }" class="logo" to="/">
    <img :src="logoSvg" />
  </router-link>
</template>

<script setup lang="ts">
import logoSvg from './logo.svg'
</script>

<style lang="scss" scoped>
.logo {
  position: relative;
  height: 100%;
  margin: 0 24px 0 24px;
  display: flex;
  align-items: center;

  &::after {
    content: '';
    position: absolute;
    right: -24px;
    display: block;
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.3);
  }
}
</style>
