<script lang="ts">
export function getDefaultValue() {
  return 0
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { nomalizeDegree, useDebouncedModel } from '@/utils/utils'
import { makeArcPathString } from '@/utils/svg'
import { UINumberInput } from '@/components/ui'

const props = defineProps<{
  value: number
}>()

const emit = defineEmits<{
  'update:value': [number]
}>()

const modelValue = useDebouncedModel<number | null>(
  () => props.value,
  (v) => emit('update:value', Math.floor(nomalizeDegree(v ?? getDefaultValue())))
)

const arcPath = computed(() => makeArcPathString({ x: 70, y: 70, r: 63, start: 0, end: modelValue.value ?? 0 }))

function handleCircleClick(e: MouseEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const angle = Math.atan2(x - centerX, centerY - y) * (180 / Math.PI)
  modelValue.value = Math.floor(nomalizeDegree(angle))
}
</script>

<template>
  <div class="circle-container">
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      @click="handleCircleClick"
    >
      <g>
        <circle cx="70" cy="70" r="62.3" fill="#3FCDD9" stroke="#B5EBF0" stroke-width="1.4" />
        <rect x="69.0542" y="15.8193" width="1.26" height="8.82" fill="white" />
        <rect x="69.6841" y="115.359" width="1.26" height="8.82" fill="white" />
        <rect x="42.0918" y="23.5508" width="1.26" height="8.82" transform="rotate(-30 42.0918 23.5508)" fill="white" />
        <rect x="92.4077" y="109.44" width="1.26" height="8.82" transform="rotate(-30 92.4077 109.44)" fill="white" />
        <rect x="42.0918" y="23.5508" width="1.26" height="8.82" transform="rotate(-30 42.0918 23.5508)" fill="white" />
        <rect x="92.4077" y="109.44" width="1.26" height="8.82" transform="rotate(-30 92.4077 109.44)" fill="white" />
        <rect x="42.0918" y="23.5508" width="1.26" height="8.82" transform="rotate(-30 42.0918 23.5508)" fill="white" />
        <rect x="92.4077" y="109.44" width="1.26" height="8.82" transform="rotate(-30 92.4077 109.44)" fill="white" />
        <rect x="22.6064" y="43.729" width="1.26" height="8.82" transform="rotate(-60 22.6064 43.729)" fill="white" />
        <rect x="109.125" y="92.9531" width="1.26" height="8.82" transform="rotate(-60 109.125 92.9531)" fill="white" />
        <rect x="15.8208" y="70.9458" width="1.26" height="8.82" transform="rotate(-90 15.8208 70.9458)" fill="white" />
        <rect x="115.361" y="70.3159" width="1.26" height="8.82" transform="rotate(-90 115.361 70.3159)" fill="white" />
        <rect
          width="1.26"
          height="8.82"
          transform="matrix(-0.866025 -0.5 -0.5 0.866025 97.9087 23.5508)"
          fill="white"
        />
        <rect width="1.26" height="8.82" transform="matrix(-0.866025 -0.5 -0.5 0.866025 47.5928 109.44)" fill="white" />
        <rect width="1.26" height="8.82" transform="matrix(-0.5 -0.866025 -0.866025 0.5 117.394 43.729)" fill="white" />
        <rect width="1.26" height="8.82" transform="matrix(-0.5 -0.866025 -0.866025 0.5 30.875 92.9531)" fill="white" />
        <path :d="arcPath" fill="#B5EBF0" fill-opacity="0.5" />
        <rect x="67.9004" y="67.9004" width="4.2" height="4.2" rx="2.1" fill="white" />
        <rect x="69.0542" y="7" width="1.39453" height="63" fill="white" />
        <g :transform="`rotate(${modelValue} 70 70)`">
          <rect x="69.0542" y="7" width="1.39453" height="63" fill="white" />
          <g filter="url(#filter0_d_1229_8413)">
            <rect x="60" width="20" height="20" rx="10" fill="#0AA5BE" />
            <rect
              x="60.4109"
              y="0.410905"
              width="19.1782"
              height="19.1782"
              rx="9.5891"
              stroke="#B5EBF0"
              stroke-width="0.82181"
            />
          </g>
          <g>
            <path d="M69.9995 3.43365L65.037 13.5297L69.9854 10.9489L74.9619 13.5297L69.9995 3.43365Z" fill="white" />
          </g>
        </g>
      </g>
      <defs>
        <filter
          id="filter0_d_1154_13636"
          x="113.426"
          y="56.7128"
          width="33.149"
          height="33.149"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="3.28724" />
          <feGaussianBlur stdDeviation="3.28724" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1154_13636" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1154_13636" result="shape" />
        </filter>
      </defs>
    </svg>
  </div>
  <div class="input-container">
    <UINumberInput v-model:value="modelValue" class="input" :min="-180" :max="180" :style="{ alignSelf: 'stretch' }" />
  </div>
</template>

<style lang="scss" scoped>
.input-container {
  display: flex;
  align-items: center;
}
.input {
  width: 62px;
  text-align: center;

  :deep(.n-input .n-input-wrapper) {
    // Correcting uneven left/right padding in UINumberInput
    // TODO: Dig and fix padding inconsistency in UINumberInput component
    padding-left: 8px;
    padding-right: 8px;
  }
}
</style>
