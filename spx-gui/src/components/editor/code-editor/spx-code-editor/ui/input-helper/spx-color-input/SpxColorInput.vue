<script lang="ts">
export function getDefaultValue(): ColorValue {
  return {
    constructor: 'HSB',
    args: [50, 100, 100]
  }
}

function spxColor2HSBA(value: ColorValue): BuilderHSBA {
  switch (value.constructor) {
    case 'HSB':
      return [...(value.args as BuilderHSB), 100]
    case 'HSBA':
      return value.args as BuilderHSBA
    case 'RGB': {
      const hsb = builderRGB2BuilderHSB(value.args as BuilderRGB)
      return [...hsb, 100]
    }
    case 'RGBA': {
      const hsba = builderRGBA2BuilderHSBA(value.args as BuilderRGBA)
      return hsba
    }
    default:
      throw new Error(`Unsupported color constructor: ${value.constructor}`)
  }
}
</script>

<script setup lang="ts">
import { debounce } from 'lodash'
import { onMounted, ref, watch } from 'vue'
import { type ColorValue } from '@/utils/spx'
import { UINumberInput, UIDivider, UIIcon, UIButton } from '@/components/ui'
import {
  builderHSB2CSSColorString,
  type BuilderHSB,
  type BuilderHSBA,
  builderRGB2BuilderHSB,
  type BuilderRGB,
  builderRGBA2BuilderHSBA,
  type BuilderRGBA,
  hex2rgb,
  rgb2builderHSB
} from '@/utils/color'
import ColorSlider from './ColorSlider.vue'
import { useEyeDropper } from '@/utils/dom'

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

const { isSupported: isEyeDropperSupported, open: openEyeDropper } = useEyeDropper()

onMounted(() => {
  const [h, s, b, a] = spxColor2HSBA(props.value)
  hue.value = h
  saturation.value = s
  brightness.value = b
  alpha.value = a
})

const onChange = debounce(() => {
  const [h, s, b, a] = [hue.value, saturation.value, brightness.value, alpha.value]
  let value: ColorValue = {
    constructor: 'HSB',
    args: [h, s, b]
  }
  if (a < 100) {
    value = {
      constructor: 'HSBA',
      args: [h, s, b, a]
    }
  }
  emit('update:value', value)
}, 300)

watch([hue, saturation, brightness, alpha], onChange)

async function handleOpenEyeDropper() {
  const sRGBHex = await openEyeDropper()
  ;[hue.value, saturation.value, brightness.value] = rgb2builderHSB(hex2rgb(sRGBHex))
}

function handleSubmit() {
  onChange.flush()
  emit('submit')
}
</script>

<template>
  <div class="w-78 flex flex-col gap-3">
    <section class="flex flex-col gap-2">
      <div class="slider-wrapper">
        <h5 class="text-xs">
          {{ $t({ en: 'Hue: ', zh: '色相：' }) }}<span class="text-title">{{ hue }}</span>
        </h5>
        <ColorSlider
          v-model:value="hue"
          :get-color="(v: number) => builderHSB2CSSColorString([v, saturation, brightness])"
        />
      </div>
      <div class="slider-wrapper">
        <h5 class="text-xs">
          {{ $t({ en: 'Saturation: ', zh: '饱和度：' }) }}<span class="text-title">{{ saturation }}</span>
        </h5>
        <ColorSlider
          v-model:value="saturation"
          :get-color="(v: number) => builderHSB2CSSColorString([hue, v, brightness])"
        />
      </div>
      <div class="slider-wrapper">
        <h5 class="text-xs">
          {{ $t({ en: 'Brightness: ', zh: '亮度：' }) }}<span class="text-title">{{ brightness }}</span>
        </h5>
        <ColorSlider
          v-model:value="brightness"
          :get-color="(v: number) => builderHSB2CSSColorString([hue, saturation, v])"
        />
      </div>
    </section>
    <UIDivider />
    <section class="flex gap-2">
      <UIButton v-if="isEyeDropperSupported" type="neutral" shape="square" @click="handleOpenEyeDropper">
        <template #icon>
          <UIIcon type="eyedrop" />
        </template>
      </UIButton>
      <UINumberInput v-model:value="hue" class="flex-[1_1_0]" :min="0" :max="100" :step="1" @keyup.enter="handleSubmit">
        <template #prefix>H</template>
      </UINumberInput>
      <UINumberInput
        v-model:value="saturation"
        class="flex-[1_1_0]"
        :min="0"
        :max="100"
        :step="1"
        @keyup.enter="handleSubmit"
      >
        <template #prefix>S</template>
      </UINumberInput>
      <UINumberInput
        v-model:value="brightness"
        class="flex-[1_1_0]"
        :min="0"
        :max="100"
        :step="1"
        @keyup.enter="handleSubmit"
      >
        <template #prefix>B</template>
      </UINumberInput>
    </section>
  </div>
</template>
