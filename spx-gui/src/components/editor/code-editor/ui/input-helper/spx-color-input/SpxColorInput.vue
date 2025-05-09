<script lang="ts">
// TODO: Use HSB color model instead of RGB for spx2
export type ColorValue = [r: number, g: number, b: number, a: number]

export function getDefaultValue(): ColorValue {
  return [255, 0, 0, 1]
}
</script>

<script setup lang="ts">
import { debounce } from 'lodash'
import { onMounted, ref, watch } from 'vue'
import { UINumberInput, UIDivider } from '@/components/ui'
import { builderHSB2rgb, rgb2builderHSB, getCSSColorString } from '@/utils/color'
import ColorSlider from './ColorSlider.vue'

const props = defineProps<{
  value: ColorValue
}>()

const emit = defineEmits<{
  'update:value': [ColorValue]
  submit: []
}>()

const hue = ref(0)
const saturation = ref(0)
const brightness = ref(0)
const alpha = ref(0)

onMounted(() => {
  const [r, g, b, a] = props.value
  const hsb = rgb2builderHSB([r, g, b])
  hue.value = hsb[0]
  saturation.value = hsb[1]
  brightness.value = hsb[2]
  alpha.value = a
})

const onChange = debounce(() => {
  const [r, g, b] = builderHSB2rgb([hue.value, saturation.value, brightness.value])
  const a = alpha.value
  if (r === props.value[0] && g === props.value[1] && b === props.value[2] && a === props.value[3]) return
  emit('update:value', [r, g, b, a])
}, 300)

watch([hue, saturation, brightness, alpha], onChange)
</script>

<template>
  <div class="spx-color-input">
    <section class="sliders">
      <div class="slider-wrapper">
        <h5 class="slider-title">
          {{ $t({ en: 'Hue: ', zh: '色相：' }) }}<span class="slider-value">{{ hue }}</span>
        </h5>
        <ColorSlider v-model:value="hue" :get-color="(v: number) => getCSSColorString([v, saturation, brightness])" />
      </div>
      <div class="slider-wrapper">
        <h5 class="slider-title">
          {{ $t({ en: 'Saturation: ', zh: '饱和度：' }) }}<span class="slider-value">{{ saturation }}</span>
        </h5>
        <ColorSlider v-model:value="saturation" :get-color="(v: number) => getCSSColorString([hue, v, brightness])" />
      </div>
      <div class="slider-wrapper">
        <h5 class="slider-title">
          {{ $t({ en: 'Brightness: ', zh: '亮度：' }) }}<span class="slider-value">{{ brightness }}</span>
        </h5>
        <ColorSlider v-model:value="brightness" :get-color="(v: number) => getCSSColorString([hue, saturation, v])" />
      </div>
    </section>
    <UIDivider />
    <section class="inputs">
      <!-- TODO: Eyedropper -->
      <UINumberInput v-model:value="hue" class="input" :min="0" :max="100" :step="1" @keyup.enter="emit('submit')">
        <template #prefix>H</template>
      </UINumberInput>
      <UINumberInput
        v-model:value="saturation"
        class="input"
        :min="0"
        :max="100"
        :step="1"
        @keyup.enter="emit('submit')"
      >
        <template #prefix>S</template>
      </UINumberInput>
      <UINumberInput
        v-model:value="brightness"
        class="input"
        :min="0"
        :max="100"
        :step="1"
        @keyup.enter="emit('submit')"
      >
        <template #prefix>B</template>
      </UINumberInput>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.spx-color-input {
  width: 312px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-title {
  font-size: 12px;
  .slider-value {
    color: var(--ui-color-title);
  }
}

.inputs {
  display: flex;
  gap: 8px;
}

.input {
  flex: 1 1 0;
}
</style>
