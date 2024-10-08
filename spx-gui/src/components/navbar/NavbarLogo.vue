<template>
  <router-link class="logo" to="/">
    <img :src="logoSvg" />
  </router-link>
</template>

<script setup lang="ts">
import logoSvg from './logo.svg'
</script>

<style lang="scss" scoped>
.logo {
  height: 100%;
  margin: 0 20px 0 24px;
  display: flex;
  align-items: center;
}
</style>
