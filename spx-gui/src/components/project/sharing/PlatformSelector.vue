<script setup lang="ts">
  import type { PlatformConfig } from "./platform-share"
  
  defineProps<{
        modelValue?: PlatformConfig
    }>()

  defineEmits<{
      /** v-model 更新（平台选择变化） */
      'update:model-value': [platform: PlatformConfig]
  }>()
</script>

<template>
  <div>
    <!-- Platform selector component content will be implemented here -->
  </div>
</template>
<style scoped lang="scss">
</style>