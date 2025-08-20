<template>
  <nav v-radar="{ name: 'Navbar', desc: 'Top navigation bar' }" class="top-nav">
    <div class="content" :class="{ centered }">
      <div class="left">
        <NavbarLogo />
        <slot name="left"></slot>
        <NavbarLang />
        <NavbarTutorials v-if="showTutorialsEntry" />
      </div>
      <div class="center">
        <slot name="center"></slot>
      </div>
      <div class="right">
        <slot name="right"></slot>
        <NavbarProfile />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { showTutorialsEntry } from '@/utils/env'
import NavbarLogo from './NavbarLogo.vue'
import NavbarLang from './NavbarLang.vue'
import NavbarProfile from './NavbarProfile.vue'
import NavbarTutorials from './NavbarTutorials.vue'

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

<style lang="scss" scoped>
@import '@/components/ui/responsive';

.top-nav {
  width: 100%;
  display: flex;
  justify-content: center;
  color: var(--ui-color-grey-100);
  background-color: var(--ui-color-primary-main);
  background-position: center;
  background-repeat: repeat;
  background-image: url(./bg.svg);
  box-shadow: var(--ui-box-shadow-diffusion);
}

.content {
  width: 100%;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  height: 50px;

  &.centered {
    width: 1220px;
    @include responsive(desktop-large) {
      width: 1480px;
    }
  }
}

.left,
.right {
  flex-basis: 30%;
  display: flex;
}

.center {
  flex-basis: 40%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.right {
  gap: 8px;
  justify-content: flex-end;
}
</style>
