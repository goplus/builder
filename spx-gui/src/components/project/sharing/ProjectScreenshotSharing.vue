<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue'
import Poster from './poster.vue'
// TODO: 暂时注释掉，等 platformShare 模块修复后再启用
// import { sharePoster, SocialPlatformConfigs } from './platformShare'
// import platformSelector from './platformSelector.vue'
import type { ProjectData } from '@/apis/project'
// TODO: 暂时注释掉，等 platformShare 模块修复后再启用
// import type { PlatformShare } from './platformShare'

const props = defineProps<{
    screenshot: File
    projectData: ProjectData
    visible: boolean
}>()

const emit = defineEmits<{
    cancelled: []
    resolved: [platform: string]
}>()

/*
const projectUrlQRCode = computed(() =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`
)
*/

// TODO: 暂时使用测试值，等 platformShare 模块修复后再使用真实配置
const selectedPlatformKey = ref<string>('test') // SocialPlatformConfigs[0]?.name ?? '')
const selectedPlatform = ref<any>(null)
const jumpUrl = ref<string>('')

function handlePlatformChange(p: any){ // PlatformShare){
    selectedPlatform.value = p
}

// TODO: 暂时简化实现，等 platformShare 模块修复后再使用完整逻辑
function resolveSelectedPlatform(): any | null {
    // const cfg = SocialPlatformConfigs.find((c: any) => c.name === selectedPlatformKey.value)
    // if (!cfg) return null
    // return { shareType: cfg.shareType, shareFunction: cfg.shareFunction }
    return null
}

async function handleSharePoster(): Promise<void> {
    if (!props.screenshot) {
        emit('cancelled')
        return
    }
    
    // TODO: 暂时简化平台选择逻辑，等 platformShare 模块修复后再使用完整逻辑
    // const platform = selectedPlatform.value ?? resolveSelectedPlatform()
    // if (!platform) {
    //     emit('cancelled')
    //     return
    // }

    const posterCompRef = ref<InstanceType<typeof Poster>>()
    const posterFile = await posterCompRef.value?.createPoster()

    if (posterFile) {
        // TODO: 暂时模拟分享成功，等 platformShare 模块修复后再使用真实分享逻辑
        // jumpUrl.value = await sharePoster(platform, posterFile, window.location.href)
        jumpUrl.value = 'https://example.com/shared'
        emit('resolved', selectedPlatformKey.value)
    }
}

const JumpUrlQRCode = computed(() =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(jumpUrl.value)}`
)

//<Poster ref="posterCompRef" /> // 到时候挂载组件，及时更新渲染结果
</script>

<template>
    <div v-if="visible" class="project-screenshot-sharing">
        <div class="screenshot-sharing-content">
            <h3>截图分享</h3>
            <Poster ref="posterCompRef" :img="screenshot" :project-data="projectData" />
            <div class="actions">
                <button @click="handleSharePoster">生成海报</button>
                <button @click="$emit('cancelled')">取消</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
    border-radius: 8px;
    min-width: 400px;
    max-width: 80vw;
    max-height: 80vh;
    overflow-y: auto;
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
}

.actions button:hover {
    background: #e0e0e0;
}
</style>