<template>
  <div class="ui-error">
    <img :src="defaultErrorImg" />
    <h5 class="message">
      <slot></slot>
    </h5>
    <button v-if="retry != null" class="retry" @click="retry">{{ retryText }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfig } from '../UIConfigProvider.vue'
import defaultErrorImg from './default-error.svg'

// TODO: support more error types
defineProps<{
  retry?: () => unknown
}>()

const config = useConfig()
const retryText = computed(() => config.error?.retryText ?? 'Retry')
</script>

<style scoped lang="scss">
.ui-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.message {
  margin-top: 12px;
  font-size: 16px;
  line-height: 26px;
  color: var(--ui-color-grey-1000);
}

.retry {
  margin-top: 4px;
  // TODO: should this be one type of UIButton?
  padding: 0 12px;
  border: none;
  background: none;
  font-size: 13px;
  line-height: 20px;
  color: var(--ui-color-primary-main);
  cursor: pointer;
  transition: color 0.2s;
  &:hover {
    color: var(--ui-color-primary-400);
  }
  &:active {
    color: var(--ui-color-primary-600);
  }
}
</style>
