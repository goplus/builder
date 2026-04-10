<template>
  <nav
    v-radar="{ name: 'Navbar', desc: 'Top navigation bar' }"
    class="w-full flex justify-center bg-primary-main bg-center bg-repeat text-grey-100 shadow-diffusion"
    :style="bgImgStyle"
  >
    <div
      class="h-12.5 flex items-stretch justify-between gap-3"
      :class="centered ? 'w-305 desktop-large:w-370' : 'w-full'"
    >
      <div class="basis-[30%] flex">
        <NavbarLogo />
        <slot name="left"></slot>
      </div>
      <div class="basis-[40%] flex items-center justify-center overflow-hidden">
        <slot name="center"></slot>
      </div>
      <div class="basis-[30%] flex justify-end">
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

// Keep the quoted `url(...)` construction in script instead of the template.
// This SVG may be inlined as a data URL, and its content contains `url(#...)`, which breaks
// unquoted CSS `background-image: url(...)` values in the browser.
const bgImgStyle = {
  backgroundImage: `url("${bgUrl}")`
}

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
