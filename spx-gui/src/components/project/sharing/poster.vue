<script setup lang="ts"> // expose、defineExpose需要在setup内执行
import type { ProjectData } from '@/apis/project'
import html2canvas from 'html2canvas'
import { ref, nextTick, computed } from 'vue'
import { UIIcon } from '@/components/ui'
import logo from '@/assets/logo.svg'
import posterBackground from './postBackground.jpg'

const props = defineProps<{
  img: File
  projectData: ProjectData
}>()

const projectUrlQRCode = computed(() =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`
)

const imgUrl = computed(() => {
    return props.img ? URL.createObjectURL(props.img) : ''
})

const posterElementRef = ref<HTMLElement>()

const truncatedDescription = props.projectData.description

const createPoster = async (): Promise<File> => {
  if (!posterElementRef.value || !props.projectData) {
    throw new Error('Poster element not ready or project data is undefined')
  }

  await nextTick() // 确保 DOM 已经更新

  const canvas = await html2canvas(posterElementRef.value, {
    width: 600,
    height: 800
  })

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  )

  if (!blob) throw new Error('Failed to generate poster')

  return new File([blob], `${props.projectData.name}-poster.png`, { type: 'image/png' })
}

defineExpose({
  createPoster
})
</script>

<template>
    <div class="poster">
        <div class="img-area">
            <img v-if="img" :src="imgUrl" class="img"/>
            <div v-else class="img-placeholder">
                <UIIcon type="file" />
                <span>{{ $t({ en: 'No Image', zh: '暂无截屏'}) }}</span>
            </div>
        </div>
        <div class="poster-decoration">
            <div class="project-info">
                <div class="game-title">{{ props.projectData.name }}</div>
            </div>
            <div v-if="props.projectData.owner" class="owner-info">
                <UIIcon type="statePublic" />
                <span>{{ $t({ en: 'Creator by', zh: '创作者'}) }}: {{ props.projectData.owner }}</span>
            </div>
            <div v-if="props.projectData.description" class="project-description">
                <UIIcon type="info" />
                <span>{{ truncatedDescription }}</span>
            </div>
            <div class="project-viewcnt" v-if="props.projectData.viewCount">
                <UIIcon type="eye" />
                <span>{{ props.projectData.viewCount }}</span>
            </div>
            <div class="project-likecnt" v-if="props.projectData.likeCount">
                <UIIcon type="heart" />
                <span>{{ props.projectData.likeCount }}</span>
            </div>
            <div class="project-remixcnt" v-if="props.projectData.remixCount">
                <UIIcon type="remix" />
                <span>{{ props.projectData.remixCount }}</span>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 16px;">
                <div class="branding">
                    <img :src="logo" style="height: 40px; vertical-align: middle;" />
                </div>
                <div v-if="projectUrlQRCode" class="project-qrcode">
                    <canvas ref="projectQrCanvas" class="project-qr-canvas"></canvas>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.poster {
  width: 100%;
  height: 100%;
  background-image: posterBackground;
  background-size: cover;
  background-position: center;
  padding: 32px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  /* box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15); */
  transition: all 0.3s ease;
  max-height: 500px;

  .img-area {
    flex: 1;
    background: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-bottom: 24px;
    position: relative;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1;

    &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, transparent 0%, rgba(0, 0, 0, 0.02) 100%);
        pointer-events: none;
    }
  }
}

.img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.img-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--ui-color-hint-2);
  
  :deep(.ui-icon) {
    width: 48px;
    height: 48px;
  }
}

.poster-decoration {
  color: #333333;
  text-align: left;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 1;
}

.project-info {
  flex: 1;
}

.game-title {
  font-size: 19px;
  font-weight: 800;
  margin-bottom: 8px;
  line-height: 1.3;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  letter-spacing: -0.02em;
  color: #1a1a1a;
}

.owner-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  margin-bottom: 8px;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  color: #2d2d2d;
  
  :deep(.ui-icon) {
    width: 14px;
    height: 14px;
    opacity: 0.8;
  }
  
  span {
    font-weight: 500;
    letter-spacing: -0.01em;
  }
}

.project-description {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 12px;
  opacity: 0.85;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  line-height: 1.4;
  color: #404040;
  
  :deep(.ui-icon) {
    width: 14px;
    height: 14px;
    opacity: 0.7;
    margin-top: 1px;
    flex-shrink: 0;
  }
  
  span {
    font-weight: 400;
    letter-spacing: -0.01em;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
}

.project-viewcnt,
.project-likecnt,
.project-remixcnt {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  color: #2d2d2d;
  
  :deep(.ui-icon) {
    width: 14px;
    height: 14px;
    opacity: 0.8;
  }
  
  span {
    font-weight: 500;
    letter-spacing: -0.01em;
  }
}

/*
.project-stats {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  opacity: 0.98;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  border-radius: 16px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }
  
  :deep(.ui-icon) {
    width: 14px;
    height: 14px;
    opacity: 0.95;
  }
  
  span {
    font-weight: 700;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    letter-spacing: -0.01em;
  }
}
*/

.branding {
  display: flex;
  align-items: center;
  height: 60px;
  background: rgba(0, 0, 0, 0.1);
  padding: 12px 20px;
  border-radius: 24px;
  backdrop-filter: blur(4px);
  box-sizing: border-box;
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);
  
  &:hover {
    background: rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
}

.project-qrcode {
  display: flex;
  align-items: center;
  height: 60px;
  min-width: 60px;
}

.project-qr-canvas {
  width: 60px;
  height: 60px;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

</style>