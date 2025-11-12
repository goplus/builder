<template>
  <div class="color-selector">
    <button
      :class="['tool-btn ai-btn', { active: isActive }]"
      :title="$t({ en: 'Select Color', zh: '选择颜色' })"
      type="button"
      @click="handleColorSelect"
    >
      {{ $t({ en: 'Color', zh: '填充颜色' }) }}
      <span class="color-icon" :style="{ backgroundColor: canvasColor }"></span>
    </button>

    <!-- 颜色选择器弹窗 -->
    <n-modal v-model:show="showColorPicker" :mask-closable="false">
      <div class="color-picker-modal">
        <h3>{{ $t({ en: 'Select Fill Color', zh: '选择填充颜色' }) }}</h3>
        <SpxColorInputWithHSBA v-model:value="colorValue" @submit="handleColorConfirm" />
        <div class="modal-buttons">
          <n-button @click="handleColorCancel">{{ $t({ en: 'Cancel', zh: '取消' }) }}</n-button>
          <n-button type="primary" @click="handleColorConfirm">{{ $t({ en: 'Confirm', zh: '确认' }) }}</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed, type Ref, watch } from 'vue'
import { NModal, NButton } from 'naive-ui'
import SpxColorInputWithHSBA from '@/components/editor/code-editor/ui/input-helper/spx-color-input/SpxColorInputWithHSBA.vue'
import { type ColorValue } from '@/utils/spx'
import {
  hex2rgb,
  rgb2builderHSB,
  builderHSB2CSSColorString,
  builderHSBA2CSSColorString,
  type BuilderHSBA
} from '@/utils/color'

// 定义props
const props = defineProps<{
  isActive: boolean
}>()

// 注入当前画布颜色（用于展示已选择的颜色）
const canvasColor = inject<Ref<string>>('canvasColor', ref('#000'))

// 解析CSS颜色字符串为ColorValue
function parseCSSColorToColorValue(cssColor: string): ColorValue {
  try {
    // 处理 rgba 格式
    const rgbaMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1])
      const g = parseInt(rgbaMatch[2])
      const b = parseInt(rgbaMatch[3])
      const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1

      const hsb = rgb2builderHSB([r, g, b])
      const alpha100 = Math.round(a * 100)

      if (alpha100 < 100) {
        return {
          constructor: 'HSBA',
          args: [...hsb, alpha100] as BuilderHSBA
        }
      } else {
        return {
          constructor: 'HSB',
          args: hsb
        }
      }
    }

    // 处理 hex 格式
    if (cssColor.startsWith('#')) {
      const rgb = hex2rgb(cssColor)
      const hsb = rgb2builderHSB(rgb)
      return {
        constructor: 'HSB',
        args: hsb
      }
    }

    // 默认返回黑色
    return {
      constructor: 'HSB',
      args: [0, 0, 0]
    }
  } catch {
    // 如果解析失败，返回默认颜色
    return {
      constructor: 'HSB',
      args: [0, 0, 0]
    }
  }
}

// 颜色选择器相关状态
const showColorPicker = ref(false)

// 将CSS颜色字符串转换为SpxColorInput需要的ColorValue格式
const colorValue = computed<ColorValue>({
  get() {
    return parseCSSColorToColorValue(canvasColor.value)
  },
  set(value: ColorValue) {
    // 将ColorValue转换为CSS颜色字符串
    if (value.constructor === 'HSB') {
      const hsb = value.args as [number, number, number]
      canvasColor.value = builderHSB2CSSColorString(hsb)
    } else if (value.constructor === 'HSBA') {
      const hsba = value.args as [number, number, number, number]
      canvasColor.value = builderHSBA2CSSColorString(hsba)
    } else {
      // 其他格式暂时不处理，使用默认值
      canvasColor.value = builderHSB2CSSColorString([0, 0, 0])
    }
  }
})

// 颜色选择器处理函数
const handleColorConfirm = (): void => {
  showColorPicker.value = false
}

const handleColorCancel = (): void => {
  showColorPicker.value = false
}

// 处理颜色选择按钮点击
const handleColorSelect = (): void => {
  showColorPicker.value = true
}

// 初始化颜色选择器的方法
const initColorPicker = (): void => {
  showColorPicker.value = true
}

// 监听工具切换，每次激活时显示颜色选择器
watch(
  () => props.isActive,
  (newValue) => {
    if (newValue) {
      initColorPicker()
    } else {
      showColorPicker.value = false
    }
  }
)

// 暴露方法给父组件
defineExpose({
  showColorPicker: initColorPicker
})
</script>

<style scoped>
.color-selector {
  position: relative;
}

.tool-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  text-align: center;
  min-height: 42px;
  font-size: 12px;
}

.tool-btn:hover {
  background-color: #f8f9fa;
  border-color: #2196f3;
  color: #2196f3;
}

.tool-btn:focus {
  outline: none;
  box-shadow: none;
}

.tool-btn span {
  font-weight: 500;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.color-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
  display: inline-block;
}

.color-picker-modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 400px;
  min-width: 320px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.color-picker-modal h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

</style>
