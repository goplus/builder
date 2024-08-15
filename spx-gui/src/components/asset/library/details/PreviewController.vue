<template>
  <div class="preview-controller">
    <NTooltip placement="right">
      <template #trigger>
        <div
          role="button"
          class="preview-action zoom-in"
          aria-label="zoom in"
          @click="handleZoomIn"
        >
          <NIcon :size="18">
            <ZoomInOutlined />
          </NIcon>
        </div>
      </template>
      <span>
        {{ $t({ en: 'Zoom In', zh: '放大' }) }}
      </span>
    </NTooltip>
    <NTooltip placement="right">
      <template #trigger>
        <div
          role="button"
          class="preview-action zoom-out"
          aria-label="zoom out"
          @click="handleZoomOut"
        >
          <NIcon :size="18">
            <ZoomOutOutlined />
          </NIcon>
        </div>
      </template>
      <span>
        {{ $t({ en: 'Zoom Out', zh: '缩小' }) }}
      </span>
    </NTooltip>
    <NTooltip placement="right">
      <template #trigger>
        <div role="button" class="preview-action fit" aria-label="fit" @click="handleFit">
          <NIcon :size="18">
            <FullscreenOutlined />
          </NIcon>
        </div>
      </template>
      <span>
        {{ $t({ en: 'Fit', zh: '适应' }) }}
      </span>
    </NTooltip>
  </div>
</template>

<script lang="ts" setup>
import { NIcon, NTooltip } from 'naive-ui'
import { ZoomInOutlined, ZoomOutOutlined } from '@vicons/antd'
import { FullscreenOutlined } from '@vicons/material'

const emit = defineEmits<{
  zoomIn: [],
  zoomOut: [],
  fit: [],
}>()

const handleZoomIn = () => {
  emit('zoomIn')
}

const handleZoomOut = () => {
  emit('zoomOut')
}

const handleFit = () => {
  emit('fit')
}
</script>

<style scoped>
.preview-controller {
  display: flex;
  gap: 10px;
  flex-direction: column;
}

.preview-action {
  cursor: pointer;
  background-color: var(--ui-color-grey-100, #ffffff);
  box-shadow: var(--ui-box-shadow-big);
  opacity: 0.8;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}
</style>
