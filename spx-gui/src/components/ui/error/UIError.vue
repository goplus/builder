<template>
  <div class="ui-error" :class="{ cover }">
    <img :src="defaultErrorImg" />
    <h5 class="message">
      <slot></slot>
    </h5>
    <div class="ops">
      <!-- TODO: consider using slot to support more custom operations -->
      <button v-if="retry != null" class="op-btn" @click="retry">
        <UIIcon v-show="loading" type="loading" />
        {{ retryText }}
      </button>
      <button v-if="back != null" class="op-btn" @click="back">
        {{ backText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfig } from '../UIConfigProvider.vue'
import UIIcon from '../icons/UIIcon.vue'
import defaultErrorImg from './default-error.svg'

// TODO: support more error types
const props = withDefaults(
  defineProps<{
    retry?: () => unknown
    back?: () => unknown
    cover?: boolean
  }>(),
  {
    retry: undefined,
    back: undefined,
    cover: false
  }
)

const config = useConfig()
const retryText = computed(() => config.error?.retryText ?? 'Retry')
const backText = computed(() => config.error?.backText ?? 'Back')

const loading = ref(false)

const retry = computed(() =>
  props.retry == null
    ? null
    : async () => {
        loading.value = true
        try {
          await props.retry!()
        } finally {
          loading.value = false
        }
      }
)
</script>

<style scoped lang="scss">
.ui-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &.cover {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    overflow: hidden;
    opacity: 0.97;
    background-color: var(--ui-color-grey-100);
  }
}

.message {
  margin-top: 12px;
  font-size: 16px;
  line-height: 26px;
  color: var(--ui-color-grey-1000);
}

.ops {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  // TODO(@UI): update style here when design finished
  gap: 12px;
}

.op-btn {
  // TODO: should this be one type of UIButton?
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  font-size: 13px;
  line-height: 20px;
  outline: none;
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
