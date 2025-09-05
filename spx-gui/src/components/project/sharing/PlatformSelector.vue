<script setup lang="ts">
  import { ref, onMounted, watch } from 'vue'
  import { SocialPlatformConfigs, type PlatformConfig } from "./platform-share"
  const props = defineProps<{
        modelValue?: PlatformConfig
    }>()

  const emit = defineEmits<{
      /** v-model 更新（平台选择变化） */
      'update:model-value': [platform: PlatformConfig]
  }>()
</script>

<template>

</template>
<style scoped lang="scss">
</style>