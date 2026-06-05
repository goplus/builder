<template>
  <button type="button" class="login-button" :class="{ primary }" :disabled="disabled" @click="$emit('click')">
    <img v-if="imgSrc != null" class="w-6 h-6" :src="imgSrc" />
    <span class="text-xl">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    primary?: boolean
    disabled?: boolean
    imgSrc?: string
  }>(),
  {
    primary: false,
    disabled: false,
    imgSrc: undefined
  }
)

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.login-button {
  height: 50px;
  width: 100%;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 50px;
  gap: 12px;
  color: var(--ui-color-grey-1000);
  background-color: #fff;
  border: 1px solid var(--ui-color-grey-500);
  cursor: pointer;
  transition: 0.2s;
}

.login-button:hover {
  color: var(--ui-color-grey-1000);
  background-color: var(--ui-color-grey-400);
}

.login-button.primary {
  color: #fff;
  background-color: #0bc0cf;
  border-color: #0bc0cf;
}

.login-button.primary:hover {
  background-color: #0aa5be;
  border-color: #0aa5be;
}

.login-button:disabled {
  opacity: 0.7;
  cursor: wait;
}
</style>
