<template>
  <div class="share-platform">
    <div v-if="showLabel" class="section-label">
      {{ $t({ en: 'Share Method', zh: '分享方式' }) }}
    </div>
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
        <span class="platform-name">{{ $t(platform.label) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, computed } from 'vue'
  import qqIcon from '@/assets/images/qq.svg'
  import wechatIcon from '@/assets/images/微信.svg'
  import douyinIcon from '@/assets/images/抖音.svg'
  import xiaohongshuIcon from '@/assets/images/小红书.svg'
  import bilibiliIcon from '@/assets/images/bilibili.svg'

  export interface SocialPlatform {
    name: string
    label: { en: string; zh: string }
    color: string
  }

  const props = withDefaults(defineProps<{
    modelValue?: string
    showLabel?: boolean
    platforms?: SocialPlatform[]
  }>(), {
    modelValue: 'qq',
    showLabel: true,
    platforms: undefined
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'change': [platform: SocialPlatform]
  }>()

  const selectedPlatform = ref(props.modelValue)

  // 默认社交平台配置
  const defaultSocialPlatforms: SocialPlatform[] = [
    { name: 'qq', label: { en: 'QQ', zh: 'QQ' }, color: '#FF6B35' },
    { name: 'wechat', label: { en: 'WeChat', zh: '微信' }, color: '#07C160' },
    { name: 'douyin', label: { en: 'TikTok', zh: '抖音' }, color: '#000000' },
    { name: 'xiaohongshu', label: { en: 'RedNote', zh: '小红书' }, color: '#FF2442' },
    { name: 'bilibili', label: { en: 'Bilibili', zh: 'b站' }, color: '#FB7299' }
  ]

  // 使用传入的平台配置或默认配置
  const socialPlatforms = computed(() => props.platforms || defaultSocialPlatforms)

  // 处理平台切换
  const handlePlatformChange = (platform: SocialPlatform) => {
    selectedPlatform.value = platform.name
    emit('update:modelValue', platform.name)
    emit('change', platform)
  }

  // 监听外部传入的 modelValue 变化
  watch(() => props.modelValue, (newValue) => {
    if (newValue !== selectedPlatform.value) {
      selectedPlatform.value = newValue
    }
  })

  // 监听内部 selectedPlatform 变化，同步到外部
  watch(selectedPlatform, (newValue) => {
    if (newValue !== props.modelValue) {
      emit('update:modelValue', newValue)
    }
  })
</script>

<style scoped lang="scss">
.share-platform {
  .section-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--ui-color-hint-1);
    margin-bottom: 12px;
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
}
</style>
