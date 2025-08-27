<template>
  <!-- 提示词输入 -->
  <div class="form-group">
    <label class="form-label">{{ $t({ en: 'Describe the image you want', zh: '描述您想要的图片' }) }}</label>
    <textarea
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      class="prompt-input"
      :placeholder="$t({ en: 'Please describe in detail the image content you want to generate, for example: a cute cartoon cat sitting on a rainbow with blue sky and white clouds in the background...', zh: '请详细描述您想要生成的图片内容，例如：一只可爱的卡通猫咪，坐在彩虹上，背景是蓝天白云...' })"
      rows="4"
    ></textarea>
    <div class="input-hint">
      {{ $t({ en: 'Tip: The more detailed the description, the better the generated image effect', zh: '提示：描述越详细，生成的图片效果越好' }) }}
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  modelValue: string
}

defineProps<Props>()

// Emits
defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.prompt-input {
  width: 100%;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s;
}

.prompt-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.input-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
</style>