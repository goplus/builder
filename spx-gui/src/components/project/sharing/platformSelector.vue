<script setup lang="ts">
    import { ref, defineEmits, onMounted, defineProps, watch } from 'vue'
    import { SocialPlatformConfigs, type PlatformConfig } from "./platformShare"
    import qqIcon from './logos/qq.svg'
    import wechatIcon from './logos/微信.svg'
    import douyinIcon from './logos/抖音.svg'
    import xiaohongshuIcon from './logos/小红书.svg'
    import bilibiliIcon from './logos/bilibili.svg'

    const props = defineProps<{
        modelValue?: PlatformConfig
    }>()

    const emit = defineEmits<{
        /** 平台选择变化事件 */
        'change': [platform: PlatformConfig]
        /** v-model 更新 */
        'update:modelValue': [platform: PlatformConfig]
    }>()

    const selectedPlatform = ref<PlatformConfig>(props.modelValue ?? SocialPlatformConfigs[0])

    const handlePlatformChange = (platform: PlatformConfig) => {
        selectedPlatform.value = platform
        emit('update:modelValue', platform)
        emit('change', platform)
    }

    const socialPlatforms = ref<PlatformConfig[]>(SocialPlatformConfigs)

    // 初次加载时，将默认选择的平台传递给父组件
    onMounted(() => {
        emit('update:modelValue', selectedPlatform.value)
        emit('change', selectedPlatform.value)
    })

    // 监听父组件传入的值，保持同步
    watch(
        () => props.modelValue,
        (val) => {
            if (val && val.basicInfo.name !== selectedPlatform.value.basicInfo.name) {
                selectedPlatform.value = val
            }
        }
    )
</script>

<template>
  <div class="share-platform">
    <div  class="section-label">
      {{ $t({ en: 'Share Method', zh: '分享方式' }) }}
    </div>
    <div class="social-icons">
      <div
        v-for="platform in socialPlatforms"
        :key="platform.basicInfo.name"
        class="social-icon"
        :class="{ active: selectedPlatform.basicInfo.name === platform.basicInfo.name }"
        @click="handlePlatformChange(platform)"
      >
        <div class="icon-wrapper">
          <img
            v-if="platform.basicInfo.name === 'qq'"
            :src="qqIcon"
            class="icon"
            alt="QQ"
          />
          <img
            v-else-if="platform.basicInfo.name === 'wechat'"
            :src="wechatIcon"
            class="icon"
            alt="WeChat"
          />
          <img
            v-else-if="platform.basicInfo.name === 'douyin'"
            :src="douyinIcon"
            class="icon"
            alt="Douyin"
          />
          <img
            v-else-if="platform.basicInfo.name === 'xiaohongshu'"
            :src="xiaohongshuIcon"
            class="icon"
            alt="Xiaohongshu"
          />
          <img
            v-else-if="platform.basicInfo.name === 'bilibili'"
            :src="bilibiliIcon"
            class="icon"
            alt="Bilibili"
          />
        </div>
        <span class="platform-name">{{ $t(platform.basicInfo.label) }}</span>
      </div>
    </div>
  </div>  
</template>

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