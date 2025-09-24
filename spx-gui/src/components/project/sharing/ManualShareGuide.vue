<template>
  <div class="manual-share-guide">
    <div class="title">
      {{ $t({ zh: `${title.zh}（${platform.zh}）`, en: `${title.en} (${platform.en})` }) }}
    </div>

    <div class="steps">
      <div v-for="(step, index) in steps" :key="index" class="step">
        <div class="step-content">
          <div class="step-title">{{ index + 1 }}. {{ $t(step.title) }}</div>
          <div class="step-desc">
            {{ $t(step.desc) }}
          </div>
        </div>
      </div>
    </div>

    <UIButton type="primary" size="medium" @click="handleDownload">
      {{ $t(buttonText ?? defaultButtonLabel) }}
    </UIButton>
  </div>
</template>

<script setup lang="ts">
import { UIButton } from '@/components/ui'
import type { LocaleMessage } from '@/utils/i18n/index'

defineProps<{
  platform: LocaleMessage
  title: LocaleMessage
  steps: Array<{ title: LocaleMessage; desc: LocaleMessage }>
  buttonText?: LocaleMessage
  defaultButtonLabel: LocaleMessage
}>()

const emit = defineEmits<{
  download: []
}>()

const handleDownload = () => {
  emit('download')
}
</script>

<style lang="scss" scoped>
.manual-share-guide {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--ui-color-border);
  border-radius: 8px;
  align-items: stretch;
  background: var(--ui-color-background);
  box-sizing: border-box;
  max-width: 360px;
  width: 100%;
}

.title {
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  color: var(--ui-color-text-primary);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.step-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ui-color-text-primary);
}

.step-desc {
  font-size: 12px;
  color: var(--ui-color-text-secondary);
  line-height: 1.4;
}
</style>
