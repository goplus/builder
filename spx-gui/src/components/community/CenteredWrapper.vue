<template>
  <section class="centered">
    <slot></slot>
  </section>
</template>

<style scoped lang="scss">
@import '@/components/ui/responsive';

.centered {
  position: relative;
  margin-left: auto;
  margin-right: auto;

  width: 1020px;
  @include responsive(desktop-large) {
    width: 1280px;
  }
}
</style>
