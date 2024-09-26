<template>
  <section class="centered">
    <slot></slot>
  </section>
</template>

<style scoped lang="scss">
$threshold: 1920px; // TODO: reconfirm here with @qingqing

.centered {
  position: relative;
  margin-left: auto;
  margin-right: auto;

  width: 1020px;
  @media (min-width: $threshold) {
    width: 1280px;
  }
}
</style>
