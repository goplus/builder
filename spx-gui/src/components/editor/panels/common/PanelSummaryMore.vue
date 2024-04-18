<template>
  <div class="overview-more">
    <UIIcon class="icon" type="more" />
  </div>
</template>

<script setup lang="ts">
import { UIIcon } from '@/components/ui'
</script>

<style scoped lang="scss">
.overview-more {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-grey-700);
  border-radius: var(--ui-border-radius-1);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
}

.icon {
  width: 24px;
  height: 24px;
}
</style>
