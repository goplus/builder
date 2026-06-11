<script setup lang="ts">
// This full-width button currently preserves the Account sign-in button style.
// Long term, we should decide whether it should become a UIButton variant or stay as a separate UI primitive.
withDefaults(
  defineProps<{
    primary?: boolean
    disabled?: boolean
    imgSrc?: string | null
    htmlType?: 'button' | 'submit' | 'reset'
  }>(),
  {
    primary: false,
    disabled: false,
    imgSrc: null,
    htmlType: 'button'
  }
)

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    :type="htmlType"
    class="flex h-[50px] w-full cursor-pointer items-center justify-center gap-3 rounded-lg border px-[50px] text-grey-1000 transition duration-200 disabled:cursor-wait disabled:opacity-70"
    :class="
      primary
        ? 'border-[#0bc0cf] bg-[#0bc0cf] text-white hover:border-[#0aa5be] hover:bg-[#0aa5be]'
        : 'border-grey-500 bg-white hover:bg-grey-400'
    "
    :disabled="disabled"
    @click="$emit('click')"
  >
    <img v-if="imgSrc != null" class="w-6 h-6" :src="imgSrc" />
    <span class="text-xl">
      <slot></slot>
    </span>
  </button>
</template>
