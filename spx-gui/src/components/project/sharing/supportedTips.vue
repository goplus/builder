<template>
  <div class="unsupported-tips">
    <div class="guide-title">{{ guideTitle }}</div>
    
    <div class="steps">
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">{{ step1Title }}</div>
          <div class="step-description">{{ step1Description }}</div>
        </div>
      </div>
      
      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">{{ step2Title }}</div>
          <div class="step-description">{{ step2Description }}</div>
        </div>
      </div>
      
      <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">{{ step3Title }}</div>
          <div class="step-description">{{ step3Description }}</div>
        </div>
      </div>
    </div>
    
    <div class="api-notice">
      <div class="notice-icon">ℹ️</div>
      <div class="notice-text">{{ apiNoticeText }}</div>
    </div>
    
    <UIButton
      v-if="showDownloadButton"
      class="download-button"
      :loading="isLoading"
      @click="handleDownload"
    >
      {{ downloadButtonText }}
    </UIButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { UIButton } from '@/components/ui'
import type { LocalizedLabel } from './platform-share'

interface Props {
  platform: LocalizedLabel
  shareType: { en: string; zh: string }
  isLoading?: boolean
  showDownloadButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  showDownloadButton: true
})

const emit = defineEmits<{
  download: []
}>()

const { t } = useI18n()

const guideTitle = computed(() => 
  t({ en: `How to share to ${props.platform.en}?`, zh: `如何分享到${props.platform.zh}？` })
)

const step1Title = computed(() => 
  t({ en: `Download ${props.shareType.en}`, zh: `下载${props.shareType.zh}` })
)

const step1Description = computed(() => 
  t({ en: `Click the button below to save ${props.shareType.en}`, zh: `点击下方按钮保存${props.shareType.zh}到设备` })
)

const step2Title = computed(() => 
  t({ en: `Open ${props.platform.en} App`, zh: `打开${props.platform.zh}APP` })
)

const step2Description = computed(() => 
  t({ en: `Tap "+" to create new post`, zh: `点击"+"号发布新笔记` })
)

const step3Title = computed(() => 
  t({ en: 'Upload & Share', zh: '上传分享' })
)

const step3Description = computed(() => 
  t({ en: `Select the downloaded ${props.shareType.en} to share`, zh: `选择刚下载的${props.shareType.zh}进行分享` })
)

const apiNoticeText = computed(() => 
  t({ en: `Manual upload required due to API limitations`, zh: `由于API限制，需要手动上传，感谢理解` })
)

const downloadButtonText = computed(() => {
  if (props.isLoading) {
    return t({ en: 'Downloading...', zh: '下载中...' })
  }
  return t({ en: `Download ${props.shareType.en}`, zh: `下载${props.shareType.zh}` })
})

const handleDownload = () => {
  emit('download')
}
</script>

<style scoped lang="scss">
.unsupported-tips {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--ui-color-background);
  border-radius: 8px;
  border: 1px solid var(--ui-color-border);
}

.guide-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ui-color-text-primary);
  text-align: center;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--ui-color-primary);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ui-color-text-primary);
  margin-bottom: 4px;
}

.step-description {
  font-size: 12px;
  color: var(--ui-color-text-secondary);
  line-height: 1.4;
}

.api-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--ui-color-warning-light);
  border: 1px solid var(--ui-color-warning);
  border-radius: 6px;
  width: 100%;
}

.notice-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.notice-text {
  font-size: 12px;
  color: var(--ui-color-warning-dark);
  line-height: 1.4;
}

.download-button {
  width: 100%;
  max-width: 200px;
}
</style>
