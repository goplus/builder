<template>
  <div class="xiaohongshu-guide">
    <h3>📱 {{ $t({ en: 'How to share to Xiaohongshu?', zh: '如何分享到小红书？' }) }}</h3>

    <div class="guide-steps">
      <div class="step">
        <span class="step-number">1️⃣</span>
        <div class="step-content">
          <strong>{{
            type === 'video'
              ? $t({ en: 'Download Video', zh: '下载视频' })
              : $t({ en: 'Download Poster', zh: '下载海报' })
          }}</strong>
          <p>
            {{
              type === 'video'
                ? $t({ en: 'Click the button below to save video', zh: '点击下方按钮保存视频到设备' })
                : $t({ en: 'Click the button below to save poster', zh: '点击下方按钮保存海报到设备' })
            }}
          </p>
        </div>
      </div>

      <div class="step">
        <span class="step-number">2️⃣</span>
        <div class="step-content">
          <strong>{{ $t({ en: 'Open Xiaohongshu App', zh: '打开小红书APP' }) }}</strong>
          <p>{{ $t({ en: 'Tap "+" to create new post', zh: '点击"+"号发布新笔记' }) }}</p>
        </div>
      </div>

      <div class="step">
        <span class="step-number">3️⃣</span>
        <div class="step-content">
          <strong>{{ $t({ en: 'Upload & Share', zh: '上传分享' }) }}</strong>
          <p>
            {{
              type === 'video'
                ? $t({ en: 'Select the downloaded video to share', zh: '选择刚下载的视频进行分享' })
                : $t({ en: 'Select the downloaded poster to share', zh: '选择刚下载的海报进行分享' })
            }}
          </p>
        </div>
      </div>
    </div>

    <div class="api-notice">
      <span class="notice-icon">💡</span>
      <p>
        {{ $t({ en: 'Manual upload required due to API limitations', zh: '由于API限制，需要手动上传，感谢理解' }) }}
      </p>
    </div>

    <button class="download-btn primary" :disabled="isLoading" @click="$emit('download')">
      {{
        isLoading
          ? $t({ en: 'Downloading...', zh: '下载中...' })
          : type === 'video'
            ? $t({ en: 'Download Video', zh: '下载视频' })
            : $t({ en: 'Download Poster', zh: '下载海报' })
      }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type: 'poster' | 'video' // 下载类型：海报或视频
  isLoading?: boolean // 是否正在下载
}>()

defineEmits<{
  download: []
}>()
</script>

<style lang="scss" scoped>
.xiaohongshu-guide {
  width: 100%;
  max-width: 350px;
  padding: 16px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffeef0 100%);
  border-radius: 10px;
  border: 1px solid #ffb3ba;
  box-shadow: 0 3px 12px rgba(255, 0, 53, 0.12);

  h3 {
    margin: 0 0 14px 0;
    font-size: 15px;
    font-weight: 600;
    color: #ff0035;
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
      color: #333;
      margin-bottom: 3px;
      line-height: 1.3;
    }

    p {
      font-size: 12px;
      color: #666;
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
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;

  .notice-icon {
    font-size: 12px;
    margin-right: 6px;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    font-size: 11px;
    color: #888;
    line-height: 1.4;
    word-wrap: break-word;
  }
}

.download-btn.primary {
  width: 100%;
  background: linear-gradient(135deg, #ff0035 0%, #ff4d6d 100%);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px rgba(255, 0, 53, 0.25);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #e6002f 0%, #ff3366 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(255, 0, 53, 0.35);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
