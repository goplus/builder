<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch, nextTick, onUnmounted } from 'vue'
import Poster from './poster.vue'
import PlatformSelector from './platformSelector.vue'
import type { ProjectData } from '@/apis/project'
import type { PlatformConfig } from './platformShare'

const props = defineProps<{
    screenshot: File
    projectData: ProjectData
    visible: boolean
}>()

const emit = defineEmits<{
    cancelled: []
    resolved: [platform: string]
}>()

// 组件引用
const posterCompRef = ref<InstanceType<typeof Poster>>()

// 平台相关状态
const selectedPlatform = ref<PlatformConfig | null>(null)
const jumpUrl = ref<string>('')
const qrCodeData = ref<string>('')
const isGeneratingQR = ref(false)

// 清理 object URLs
const createdObjectUrls = new Set<string>()

onUnmounted(() => {
    // 清理所有创建的 object URLs
    createdObjectUrls.forEach(url => {
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url)
        }
    })
    createdObjectUrls.clear()
})

// 处理平台选择变化
function handlePlatformChange(platform: PlatformConfig) {
    selectedPlatform.value = platform
    generateShareQRCode()
}

// 获取当前项目URL
function getCurrentProjectUrl() {
    return window.location.origin + window.location.pathname
}

// 生成分享二维码
async function generateShareQRCode() {
    if (!selectedPlatform.value) return
    
    try {
        isGeneratingQR.value = true
        
        // 创建poster文件
        const posterFile = await posterCompRef.value?.createPoster()
        if (!posterFile) {
            console.error('生成海报失败')
            return
        }

        // 根据平台类型生成跳转URL
        const platform = selectedPlatform.value
        const currentUrl = getCurrentProjectUrl()
        
        let shareUrl = ''
        if (platform.shareType.supportImage && platform.shareFunction.shareImage) {
            shareUrl = await platform.shareFunction.shareImage(posterFile)
        } else if (platform.shareType.supportURL && platform.shareFunction.shareURL) {
            shareUrl = await platform.shareFunction.shareURL(currentUrl)
        } else {
            shareUrl = currentUrl
        }

        jumpUrl.value = shareUrl
        
        // 生成二维码
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}&margin=3`
        
        try {
            // 使用 fetch 获取二维码图片以绕过 COEP 限制
            const response = await fetch(qrCodeUrl)
            const blob = await response.blob()
            const objectUrl = URL.createObjectURL(blob)
            createdObjectUrls.add(objectUrl)
            qrCodeData.value = objectUrl
        } catch (error) {
            console.error('获取二维码图片失败:', error)
            qrCodeData.value = qrCodeUrl // 回退到原始URL
        }

        console.log(`${platform.basicInfo.label.zh}分享二维码已生成`)
    } catch (error) {
        console.error('生成分享二维码失败:', error)
    } finally {
        isGeneratingQR.value = false
    }
}

// 处理分享
async function handleSharePoster(): Promise<void> {
    if (!props.screenshot || !selectedPlatform.value) {
        emit('cancelled')
        return
    }
    
    await generateShareQRCode()
    
    if (jumpUrl.value) {
        emit('resolved', selectedPlatform.value.basicInfo.name)
    } else {
        emit('cancelled')
    }
}

// 监听弹窗显示状态
watch(() => props.visible, (newVisible) => {
    if (newVisible) {
        // 重置状态
        jumpUrl.value = ''
        qrCodeData.value = ''
        
        // 等待DOM更新后生成二维码
        nextTick(() => {
            if (selectedPlatform.value) {
                generateShareQRCode()
            }
        })
    }
})
</script>

<template>
    <div v-if="visible" class="project-screenshot-sharing">
        <div class="screenshot-sharing-content">
            <!-- 分享内容 -->
            <div class="share-content">
                <div class="share-title">
                    {{ $t({ en: 'This screenshot is great, share it with friends!', zh: '截图这么棒，分享给好友吧!' }) }}
                </div>
                <div class="share-main">
                    <div class="poster-section">
                        <Poster 
                            ref="posterCompRef" 
                            :img="screenshot" 
                            :project-data="projectData" 
                        />
                        <div class="poster-platform-selector">
                            <PlatformSelector @change="handlePlatformChange" />
                        </div>
                    </div>
                    <div class="qr-section">
                        <div class="qr-section-inner">
                            <div class="qr-content">
                                <div class="qr-code">
                                    <img 
                                        v-if="qrCodeData" 
                                        :src="qrCodeData" 
                                        :alt="$t({ en: 'Share QR Code', zh: '分享二维码' })" 
                                        class="qr-image" 
                                    />
                                    <div v-else class="qr-placeholder">
                                        <span>{{ isGeneratingQR ? $t({ en: 'Generating...', zh: '生成中...' }) : $t({ en: 'Select platform to generate QR code', zh: '选择平台生成二维码' }) }}</span>
                                    </div>
                                </div>
                                <div class="qr-hint">
                                    {{ $t({ en: 'Scan the code with the corresponding platform to share', zh: '用对应平台进行扫码分享' }) }}
                                </div>
                            </div>
                            <button 
                                class="download-btn"
                                :disabled="!qrCodeData"
                                @click="handleSharePoster"
                            >
                                {{ $t({ en: 'Generate Share', zh: '生成分享' }) }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="actions">
                <button @click="$emit('cancelled')">{{ $t({ en: 'Cancel', zh: '取消' }) }}</button>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.project-screenshot-sharing {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.screenshot-sharing-content {
    background: white;
    padding: 20px;
    border-radius: 12px;
    min-width: 800px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
}

.share-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: 20px 0;
}

.share-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--ui-color-title);
    text-align: center;
    margin-bottom: 24px;
}

.share-main {
    height: 100%;
    display: flex;
    gap: 24px;
}

.poster-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 16px;
}

.poster-platform-selector {
    width: 100%;
    display: flex;
    justify-content: center;
}

.qr-section {
    flex: 1 1 0%;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    align-items: stretch;
    min-width: 220px;
    min-height: 0;
    padding: 16px;
}

.qr-section-inner {
    flex: 1 1 0%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 0;
}

.qr-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
}

.qr-code {
    width: 120px;
    height: 120px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--ui-color-dividing-line-1);
    border-radius: 12px;
    background: white;
}

.qr-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.qr-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 12px;
    color: var(--ui-color-hint-2);
    padding: 20px;
}

.qr-hint {
    font-size: 12px;
    color: var(--ui-color-hint-2);
    line-height: 1.3;
    text-align: center;
    word-wrap: break-word;
    max-width: 100%;
}

.download-btn {
    width: 100%;
    margin-top: 8px;
    border-radius: 6px;
    padding: 8px 16px;
    border: 1px solid var(--ui-color-primary-main);
    background: var(--ui-color-primary-main);
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: var(--ui-color-primary-shade);
    }

    &:disabled {
        background: var(--ui-color-hint-2);
        border-color: var(--ui-color-hint-2);
        cursor: not-allowed;
    }
}



.actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    justify-content: center;
}

.actions button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f0f0f0;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: #e0e0e0;
    }
}
</style>