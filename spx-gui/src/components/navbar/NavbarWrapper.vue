<template>
  <nav v-radar="{ name: 'Navbar', desc: 'Top navigation bar' }" class="w-full flex justify-center text-grey-1000">
    <div
      class="h-12 flex items-stretch justify-between gap-3"
      :class="centered ? 'w-310 desktop-large:w-373' : 'w-full'"
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
import NavbarLogo from './NavbarLogo.vue'
import NavbarProfile from './NavbarProfile.vue'

withDefaults(
  defineProps<{
    /**
     * Whether the navbar content should be centered (to keep consistent with the page content). Typically,
     * - We stretch the navbar content to full width for editor pages
     * - We center the navbar content for community pages
     */
    centered?: boolean
  }>(),
  {
    centered: false
  }
)
</script>
