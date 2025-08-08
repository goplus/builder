<!-- Wrapper for main content of user pages like projects, likes, following & followers -->

<script setup lang="ts">
import CommunityCard from '../../CommunityCard.vue'
</script>

<template>
  <CommunityCard v-radar="{ name: 'User content', desc: 'Main content area for user pages' }" class="user-content">
    <header class="header">
      <h2 class="title">
        <slot name="title"></slot>
      </h2>
      <div class="extra">
        <slot name="extra"></slot>
      </div>
    </header>
    <slot></slot>
  </CommunityCard>
</template>

<style lang="scss" scoped>
.user-content {
  padding: 20px var(--ui-gap-middle);
  display: flex;
  flex-direction: column;
}

.header {
  margin-bottom: 8px;
  height: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;

  .title {
    // TODO: Layout here shifts when jumping from `/user/:name` to `/user/:name/projects`, which is not ideal
    line-height: 26px;
    font-size: 16px;
    color: var(--ui-color-title);
  }

  .extra {
    display: flex;
    gap: 24px;
  }
}
</style>
