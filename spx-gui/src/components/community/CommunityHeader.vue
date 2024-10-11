<!-- Simple header component for pages like search & explore -->

<template>
  <section class="header">
    <CenteredWrapper class="header-content">
      <h1 class="title">
        <slot></slot>
      </h1>
      <label class="options">
        <slot name="options"></slot>
      </label>
    </CenteredWrapper>
  </section>
</template>

<script setup lang="ts">
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
</script>

<style lang="scss" scoped>
@import '@/utils/utils';

.header {
  flex: 0 0 auto;
  background-color: var(--ui-color-grey-100);
}

.header-content {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  .title {
    flex: 1 1 0;
    @include text-ellipsis;
    line-height: 26px;
    font-size: 16px;
    color: var(--ui-color-title);
  }

  .options {
    flex: 0 0 auto;
  }
}
</style>
