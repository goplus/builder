<template>
  <nav
    v-radar="{ name: 'Navbar', desc: 'Top navigation bar' }"
    class="flex w-full justify-center bg-primary-main bg-center bg-repeat text-grey-100 shadow-diffusion"
    :style="{ backgroundImage: `url(${bgUrl})` }"
  >
    <div
      class="flex h-12.5 w-full items-stretch justify-between gap-3"
      :class="centered ? 'w-305 desktop-large:w-370' : 'w-full'"
    >
      <div class="flex basis-[30%]">
        <NavbarLogo />
        <slot name="left"></slot>
      </div>
      <div class="flex basis-[40%] items-center justify-center overflow-hidden">
        <slot name="center"></slot>
      </div>
      <div class="flex basis-[30%] justify-end">
        <slot name="right"></slot>
        <NavbarProfile />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import bgUrl from './bg.svg'
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
