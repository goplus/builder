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

    <UIButton v-if="downloadUrl" type="secondary" size="medium" @click="handleShowMobileDownload">
      {{ $t({ zh: '下载到手机', en: 'Download to Phone' }) }}
    </UIButton>

    <div v-if="showQRCode" class="qr-section">
      <div class="qr-title">{{ $t({ zh: '扫描二维码下载', en: 'Scan QR Code to Download' }) }}</div>
      <div class="qr-container">
        <img v-if="qrCodeData" :src="qrCodeData" alt="QR Code" class="qr-image" />
        <div v-else class="qr-loading">{{ $t({ zh: '生成中...', en: 'Generating...' }) }}</div>
      </div>
      <div class="qr-hint">{{ $t({ zh: '请使用手机浏览器扫描二维码', en: 'Scan with mobile browser' }) }}</div>
      <UIButton type="secondary" size="small" @click="handleCloseQRCode">
        {{ $t({ zh: '关闭', en: 'Close' }) }}
      </UIButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UIButton } from '@/components/ui'
import type { LocaleMessage } from '@/utils/i18n/index'
import QRCode from 'qrcode'

const props = defineProps<{
  platform: LocaleMessage
  title: LocaleMessage
  steps: Array<{ title: LocaleMessage; desc: LocaleMessage }>
  buttonText?: LocaleMessage
  defaultButtonLabel: LocaleMessage
  downloadUrl?: string // 可选的下载URL，用于生成二维码
}>()

const emit = defineEmits<{
  download: []
}>()

const showQRCode = ref(false)
const qrCodeData = ref<string | null>(null)

const handleDownload = () => {
  emit('download')
}

const handleShowMobileDownload = async () => {
  if (!props.downloadUrl) return

  showQRCode.value = true

  // 生成二维码
  try {
    qrCodeData.value = await QRCode.toDataURL(props.downloadUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.error('Failed to generate QR code:', error)
  }
}

const handleCloseQRCode = () => {
  showQRCode.value = false
  qrCodeData.value = null
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

.qr-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--ui-color-border);
  border-radius: 8px;
  background: var(--ui-color-grey-50);
  align-items: center;
  margin-top: 8px;
}

.qr-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-color-text-primary);
  text-align: center;
}

.qr-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  background: white;
  border-radius: 8px;
  border: 2px solid var(--ui-color-border);
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-loading {
  font-size: 14px;
  color: var(--ui-color-text-secondary);
}

.qr-hint {
  font-size: 12px;
  color: var(--ui-color-text-secondary);
  text-align: center;
  line-height: 1.4;
}
</style>
