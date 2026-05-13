<template>
  <nav v-radar="{ name: 'Navbar', desc: 'Top navigation bar' }" class="w-full flex justify-center text-grey-1000">
    <div
      class="h-12 flex items-stretch justify-between gap-3"
      :class="centered ? 'prototype-navbar-centered' : 'w-full'"
    >
      <div class="basis-[30%] flex">
        <NavbarLogo />
        <slot name="left"></slot>
      </div>
      <div class="basis-[40%] flex items-center justify-center overflow-hidden">
        <slot name="center"></slot>
      </div>
      <div class="basis-[30%] flex items-center justify-end" :class="!centered && 'mr-2'">
        <slot name="right"></slot>
        <NavbarProfile />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import NavbarLogo from '@/components/navbar/NavbarLogo.vue'
import NavbarProfile from '@/components/navbar/NavbarProfile.vue'

withDefaults(
  defineProps<{
    centered?: boolean
  }>(),
  {
    centered: false
  }
)
</script>

<style scoped>
.prototype-navbar-centered {
  width: min(calc(100% - 40px), 1492px);
}
</style>
