<template>
  <div class="xiaohongshu-guide">
    <h3>{{ guideTitle }}</h3>

    <div class="guide-steps">
      <div class="step">
        <span class="step-number" aria-label="Step 1">1</span>
        <div class="step-content">
          <strong>{{ step1Title }}</strong>
          <p>{{ step1Description }}</p>
        </div>
      </div>

      <div class="step">
        <span class="step-number" aria-label="Step 2">2</span>
        <div class="step-content">
          <strong>{{ step2Title }}</strong>
          <p>{{ step2Description }}</p>
        </div>
      </div>

      <div class="step">
        <span class="step-number" aria-label="Step 3">3</span>
        <div class="step-content">
          <strong>{{ step3Title }}</strong>
          <p>{{ step3Description }}</p>
        </div>
      </div>
    </div>

    <div class="api-notice">
      <p>{{ apiNoticeText }}</p>
    </div>

    <button class="download-btn primary" :disabled="isLoading" @click="$emit('download')">
      {{ downloadButtonText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'

const { t } = useI18n()

const props = defineProps<{
  type: 'poster' | 'video'
  isLoading?: boolean
}>()

defineEmits<{
  download: []
}>()

const guideTitle = computed(() => t({ en: 'How to share to Xiaohongshu?', zh: '如何分享到小红书？' }))

const step1Title = computed(() =>
  props.type === 'video' ? t({ en: 'Download Video', zh: '下载视频' }) : t({ en: 'Download Poster', zh: '下载海报' })
)

const step1Description = computed(() =>
  props.type === 'video'
    ? t({ en: 'Click the button below to save video', zh: '点击下方按钮保存视频到设备' })
    : t({ en: 'Click the button below to save poster', zh: '点击下方按钮保存海报到设备' })
)

const step2Title = computed(() => t({ en: 'Open Xiaohongshu App', zh: '打开小红书APP' }))

const step2Description = computed(() => t({ en: 'Tap "+" to create new post', zh: '点击"+"号发布新笔记' }))

const step3Title = computed(() => t({ en: 'Upload & Share', zh: '上传分享' }))

const step3Description = computed(() =>
  props.type === 'video'
    ? t({ en: 'Select the downloaded video to share', zh: '选择刚下载的视频进行分享' })
    : t({ en: 'Select the downloaded poster to share', zh: '选择刚下载的海报进行分享' })
)

const apiNoticeText = computed(() =>
  t({ en: 'Manual upload required due to API limitations', zh: '由于API限制，需要手动上传，感谢理解' })
)

const downloadButtonText = computed(() => {
  if (props.isLoading) {
    return t({ en: 'Downloading...', zh: '下载中...' })
  }
  return props.type === 'video'
    ? t({ en: 'Download Video', zh: '下载视频' })
    : t({ en: 'Download Poster', zh: '下载海报' })
})
</script>

<style lang="scss" scoped>
.xiaohongshu-guide {
  width: 100%;
  max-width: 350px;
  padding: 16px;
  background: linear-gradient(135deg, var(--ui-color-grey-100) 0%, var(--ui-color-grey-200) 100%);
  border-radius: 10px;
  border: 1px solid var(--ui-color-border);
  box-shadow: var(--ui-box-shadow-small);

  h3 {
    margin: 0 0 14px 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--ui-color-red-main);
    text-align: center;
    line-height: 1.2;
  }
}

.guide-steps {
  margin-bottom: 14px;

  .step {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .step-number {
    font-size: 14px;
    margin-right: 8px;
    flex-shrink: 0;
    line-height: 1.2;
    width: 16px;
  }

  .step-content {
    flex: 1;
    min-width: 0;

    strong {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--ui-color-title);
      margin-bottom: 3px;
      line-height: 1.3;
    }

    p {
      font-size: 12px;
      color: var(--ui-color-text);
      margin: 0;
      line-height: 1.4;
      word-wrap: break-word;
    }
  }
}

.api-notice {
  display: flex;
  align-items: flex-start;
  margin-bottom: 14px;
  padding: 8px 10px;
  background: var(--ui-color-grey-300);
  border-radius: 6px;

  p {
    margin: 0;
    font-size: 11px;
    color: var(--ui-color-hint-2);
    line-height: 1.4;
    word-wrap: break-word;
  }
}

.download-btn.primary {
  width: 100%;
  background: var(--ui-color-red-main);
  color: var(--ui-color-grey-100);
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--ui-box-shadow-small);

  &:hover:not(:disabled) {
    background: var(--ui-color-red-600);
    transform: translateY(-1px);
    box-shadow: var(--ui-box-shadow-big);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
