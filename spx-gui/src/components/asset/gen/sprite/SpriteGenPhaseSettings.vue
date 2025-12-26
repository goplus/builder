<!--
  Phase "settings" for sprite-gen:
  * Inputting & enriching settings
  * Generate & select image (default costume)
-->

<script setup lang="ts">
import { computed } from 'vue'
import { UIButton } from '@/components/ui'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import SpriteSettingsInput from './SpriteSettingsInput.vue'
import SpriteImages from './SpriteImages.vue'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  gen: SpriteGen
}>()

const emit = defineEmits<{
  collapse: []
}>()

const allowSubmit = computed(() => props.gen.image != null)

const handleSubmit = useMessageHandle(() => props.gen.prepareContent(), {
  en: 'Failed to generate sprite content',
  zh: '生成精灵内容失败'
})
</script>

<template>
  <main class="phase-settings">
    <div class="body">
      <SpriteSettingsInput :gen="gen" />
      <SpriteImages :state="gen.imagesGenState" :selected="gen.image" @select="gen.setImage($event)" />
    </div>
    <footer class="footer">
      <UIButton color="secondary" size="large" @click="emit('collapse')">{{
        $t({ en: 'Collapse', zh: '收起' })
      }}</UIButton>
      <UIButton
        color="primary"
        size="large"
        :disabled="!allowSubmit"
        :loading="handleSubmit.isLoading.value"
        @click="handleSubmit.fn"
        >{{ $t({ en: 'Next', zh: '下一步' }) }}</UIButton
      >
    </footer>
  </main>
</template>

<style lang="scss" scoped>
.phase-settings {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.body {
  flex: 1 1 0;
  width: 584px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
}
.footer {
  width: 100%;
  flex: 0 0 auto;
  padding: 20px 24px;
  display: flex;
  justify-content: end;
  gap: 16px;
}
</style>
