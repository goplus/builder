<template>
  <div class="w-full">
    <div class="field-wrap">
      <img :src="iconUrl" alt="" aria-hidden="true" class="icon" />
      <input
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        :class="['input', { 'with-right-icon': rightIconUrl != null, error: error !== '' }]"
        @input="handleInput"
      />
      <img
        v-if="rightIconUrl"
        :src="rightIconUrl"
        alt=""
        aria-hidden="true"
        class="right-icon"
        @click="$emit('right-icon-click')"
      />
    </div>
    <div v-if="error" class="error-text">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    type?: string
    placeholder: string
    error?: string
    iconUrl: string
    rightIconUrl?: string | null
  }>(),
  {
    type: 'text',
    error: '',
    rightIconUrl: null
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'right-icon-click': []
}>()

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.field-wrap {
  position: relative;
  width: 100%;
}

.icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
}

.input {
  width: 100%;
  height: 50px;
  padding: 0 12px 0 44px;
  font-size: 16px;
  border: 1px solid #cfd9de;
  border-radius: 8px;
  outline: none;
  box-sizing: border-box;
}

.input.with-right-icon {
  padding-right: 44px;
}

.input.error {
  border-color: #ff4d4f;
}

.right-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.error-text {
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 4px;
}
</style>
