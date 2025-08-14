<template>
  <UIFormModal
    :radar="{ name: 'Project share modal', desc: 'Modal for sharing project with social media platforms' }"
    :title="$t({ en: 'Share Project', zh: '分享项目' })"
    :visible="props.visible"
    :auto-focus="false"
    @update:visible="emit('cancelled')"
  >
    <div class="share-content">
      <!-- 分享标题 -->
      <div class="share-title">
        {{ $t({ en: 'This work is great, share it with friends!', zh: '作品这么棒,分享给好友吧!' }) }}
      </div>

      <!-- 分享链接区域 -->
      <div class="share-link-section">
        <div class="section-label">{{ $t({ en: 'Share Link', zh: '分享链接' }) }}</div>
        <div class="link-container">
          <UITextInput
            v-radar="{ name: 'Sharing link input', desc: 'Input field showing the project sharing link' }"
            :value="projectSharingLink"
            :readonly="true"
            class="link-input"
            @focus="$event.target.select()"
          />
          <UIButton
            v-radar="{ name: 'Copy button', desc: 'Click to copy sharing link to clipboard' }"
            class="copy-button"
            type="primary"
            size="small"
            :loading="handleCopy.isLoading.value"
            @click="handleCopy.fn"
          >
            {{ $t({ en: 'Copy', zh: '复制' }) }}
          </UIButton>
        </div>
      </div>

      <!-- 分享方式区域 -->
      <div class="share-methods-section">
        <div class="section-label">{{ $t({ en: 'Share Method', zh: '分享方式' }) }}</div>
        <div class="social-icons">
                      <div
              v-for="platform in socialPlatforms"
              :key="platform.name"
              class="social-icon"
              :class="{ active: selectedPlatform === platform.name }"
              @click="handlePlatformChange(platform)"
            >
            <div class="icon-wrapper">
              <img
                v-if="platform.name === 'qq'"
                :src="qqIcon"
                class="icon"
                alt="QQ"
              />
              <img
                v-else-if="platform.name === 'wechat'"
                :src="wechatIcon"
                class="icon"
                alt="WeChat"
              />
              <img
                v-else-if="platform.name === 'douyin'"
                :src="douyinIcon"
                class="icon"
                alt="Douyin"
              />
              <img
                v-else-if="platform.name === 'xiaohongshu'"
                :src="xiaohongshuIcon"
                class="icon"
                alt="Xiaohongshu"
              />
              <img
                v-else-if="platform.name === 'bilibili'"
                :src="bilibiliIcon"
                class="icon"
                alt="Bilibili"
              />
            </div>
            <span class="platform-name">{{ platform.label }}</span>
          </div>
        </div>
      </div>

      <!-- 二维码区域 -->
      <div class="qr-section">
        <div class="qr-code">
          <div v-if="selectedPlatform === 'qq' ||  selectedPlatform === 'wechat'" class="qr-code-container">
            <img :src="qrCodeData" :alt="$t({ en: 'Share QR Code', zh: '分享二维码' })" class="qr-image" />
          </div>
          <div v-else-if="selectedPlatform === 'douyin' || selectedPlatform === 'xiaohongshu' || selectedPlatform === 'bilibili'" class="qr-grid">
            <div v-for="i in 25" :key="i" class="qr-cell" :class="{ filled: Math.random() > 0.5 }"></div>
          </div>
        </div>
        <div class="qr-hint">
          {{ $t({ en: 'Scan the code with the corresponding platform to share', zh: '用对应平台进行扫码分享' }) }}
        </div>
      </div>
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { UIButton, UIFormModal, UITextInput } from '@/components/ui'
  import { useMessageHandle } from '@/utils/exception'
  import { computed, ref } from 'vue'
  import { getProjectShareRoute } from '@/router'
  import qqIcon from '@/assets/images/qq.svg'
  import wechatIcon from '@/assets/images/微信.svg'
  import douyinIcon from '@/assets/images/抖音.svg'
  import xiaohongshuIcon from '@/assets/images/小红书.svg'
  import bilibiliIcon from '@/assets/images/bilibili.svg'
  import { generateShareQRCode, type ProjectShareInfo } from '@/utils/qrcode'

  const props = defineProps<{
    visible: boolean
    owner: string
    name: string
    thumbnail: string
  }>()

  const emit = defineEmits<{
    cancelled: []
    resolved: []
  }>()

  const selectedPlatform = ref('qq')

  // const showQRCode = ref(false) // 是否显示二维码
  const qrCodeUrl = ref<string>('') // 二维码对应的URL
  const qrCodeData = ref<string>('') // 二维码数据

  const projectSharingLink = computed(() => {
    return `${location.origin}${getProjectShareRoute(props.owner, props.name)}`
  })

  const handleCopy = useMessageHandle(
    () => navigator.clipboard.writeText(projectSharingLink.value),
    { en: 'Failed to copy link to clipboard', zh: '分享链接复制到剪贴板失败' },
    { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }
  )

  // 社交平台配置
  const socialPlatforms = [
    { name: 'qq', label: 'QQ', color: '#FF6B35' },
    { name: 'wechat', label: '微信', color: '#07C160' },
    { name: 'douyin', label: '抖音', color: '#000000' },
    { name: 'xiaohongshu', label: '小红书', color: '#FF2442' },
    { name: 'bilibili', label: 'b站', color: '#FB7299' }
  ]

    // 处理平台切换
  const handlePlatformChange = async (platform: any) => {
    selectedPlatform.value = platform.name
    await handleSocialMediaShare(platform)
  }

  // 处理QQ和微信分享
  const handleSocialMediaShare = async (platform: any) => {
    try {

      // 准备项目分享信息
      const projectInfo: ProjectShareInfo = {
        projectName: props.name,
        // projectUrl: `${window.location.origin}/project/${props.owner}/${props.projectName}`, // 根据实际路由调整
        projectUrl: `https://builder.goplus.org/project/${props.owner}/${props.name}`,
        description: `这是我在XBuilder上创作的游戏作品《${platform.name}》！🎮 在XBuilder学编程，创造属于你的游戏世界！`,
        thumbnail: props.thumbnail
      }

      // 生成二维码
      console.log(`正在生成${platform.name}分享二维码...`)
      const qrCodeDataUrl = await generateShareQRCode(platform.name, projectInfo, {
        width: 120,
        margin: 3
      })

      qrCodeData.value = qrCodeDataUrl
      // showQRCode.value = true
      qrCodeUrl.value = projectInfo.projectUrl // 暂定为 projectUrl

      console.log(`${platform.name}分享二维码已生成`)
    } catch (error) {
      console.error(`生成${platform.name}分享二维码失败:`, error)
      // 可以显示错误提示给用户
    }
  }

  onMounted(() => {
    handleSocialMediaShare(socialPlatforms[0])
  })
</script>

<style scoped lang="scss">
.share-content {
  padding: 20px 0;
}

.share-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ui-color-title);
  text-align: center;
  margin-bottom: 24px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--ui-color-hint-1);
  margin-bottom: 12px;
}

.share-link-section {
  margin-bottom: 24px;
}

.link-container {
  display: flex;
  gap: 12px;
  align-items: center;
  border: 2px solid var(--ui-color-blue-main);
  border-radius: 8px;
  padding: 4px;
  background: var(--ui-color-blue-50);
}

.link-input {
  flex: 1;
  border: none;
  background: transparent;

  :deep(.input) {
    border: none;
    background: transparent;
    box-shadow: none;
  }
}

.copy-button {
  white-space: nowrap;
  border-radius: 6px;
}

.share-methods-section {
  margin-bottom: 24px;
}

.social-icons {
  display: flex;
  gap: 48px;
  justify-content: center;
}

.social-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &.active .icon-wrapper {
    border: 2px solid var(--ui-color-red-main);
  }
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  transition: all 0.2s ease;
}

.icon {
  width: 42px;
  height: 42px;
  display: block;
  flex-shrink: 0;
}

.platform-name {
  font-size: 12px;
  color: var(--ui-color-hint-1);
}

.qr-section {
  text-align: center;
}

.qr-code {
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.qr-code-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-placeholder {
  width: 120px;
  height: 120px;
  margin: 0 auto;
  border: 2px solid var(--ui-color-grey-300);
  border-radius: 8px;
  padding: 8px;
  background: white;
}

.qr-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  width: 100%;
  height: 100%;
}

.qr-cell {
  width: 100%;
  height: 100%;
  background: var(--ui-color-grey-200);
  border-radius: 1px;

  &.filled {
    background: var(--ui-color-grey-800);
  }
}

.qr-hint {
  font-size: 12px;
  color: var(--ui-color-hint-2);
  line-height: 1.4;
}
</style>