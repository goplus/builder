<script lang="ts" setup>
import { ref } from 'vue'
import { debounce } from 'lodash'
import {
  UIButtonGroup,
  UIButtonGroupItem,
  UIDivider,
  UIDropdown,
  UINumberInput,
  UITooltip,
  type IconType,
  UIIcon
} from '@/components/ui'
import AnglePicker from '@/components/editor/common/AnglePicker.vue'
import ConfigPanel from '../common/ConfigPanel.vue'
import ConfigItem from '../common/ConfigItem.vue'
import { headingToLeftRight, LeftRight, leftRightToHeading, RotationStyle } from '@/models/spx/sprite'
import type { SpriteLocalConfig } from '../utils'
import type { LocaleMessage } from '@/utils/i18n'

const props = defineProps<{
  localConfig: SpriteLocalConfig
  onBack: () => void
}>()

const rotateDropdownVisible = ref(false)

const rotationStyleItems = [
  {
    style: RotationStyle.Normal,
    icon: 'rotateAround',
    tips: {
      en: 'Normal: the sprite can be rotated to any heading',
      zh: '正常旋转：精灵可以被旋转到任意方向'
    }
  },
  {
    style: RotationStyle.LeftRight,
    icon: 'leftRight',
    tips: {
      en: 'Left-Right: the sprite can only be flipped horizontally',
      zh: '左右翻转：精灵只可以在水平方向翻转'
    }
  },
  {
    style: RotationStyle.None,
    icon: 'notRotate',
    tips: {
      en: "Don't Rotate: the sprite will not be rotated",
      zh: '不旋转：精灵不会被旋转'
    }
  }
] satisfies Array<{ style: RotationStyle; icon: IconType; tips: LocaleMessage }>

function handleRotationStyleUpdate(style: RotationStyle) {
  const localConfig = props.localConfig
  localConfig.setRotationStyle(style)
  if (style === RotationStyle.None) {
    localConfig.setHeading(90)
  }
  if (style === RotationStyle.LeftRight) {
    // normalize heading to 90 / -90
    const normalizedHeading = leftRightToHeading(headingToLeftRight(localConfig.heading))
    localConfig.setHeading(normalizedHeading)
  }
  localConfig.sync()
}

function handleUpdateHeading(heading: number) {
  props.localConfig.setHeading(heading)
  props.localConfig.sync()
}
const handleUpdateHeadingDebounced = debounce(handleUpdateHeading, 300)
</script>

<template>
  <ConfigPanel
    v-radar="{
      name: 'Sprite Rotation Config Panel',
      desc: 'Quick config for sprite rotation style and values'
    }"
  >
    <div class="rotation-config-wrapper">
      <UIButtonGroup
        v-radar="{ name: 'Rotation style control', desc: 'Control to set sprite rotation style' }"
        :value="localConfig.rotationStyle"
        @update:value="(value) => handleRotationStyleUpdate(value as RotationStyle)"
      >
        <UITooltip v-for="item in rotationStyleItems" :key="item.style">
          {{ $t(item.tips) }}
          <template #trigger>
            <UIButtonGroupItem :value="item.style">
              <UIIcon :type="item.icon" />
            </UIButtonGroupItem>
          </template>
        </UITooltip>
      </UIButtonGroup>
      <UIDropdown
        v-if="localConfig.rotationStyle === RotationStyle.Normal"
        trigger="manual"
        placement="top"
        :visible="rotateDropdownVisible"
        @click-outside="rotateDropdownVisible = false"
      >
        <template #trigger>
          <UINumberInput
            v-radar="{ name: 'Heading input', desc: 'Input to set sprite heading angle' }"
            class="heading-input"
            :min="-180"
            :max="180"
            :value="localConfig.heading"
            @update:value="handleUpdateHeadingDebounced($event ?? 0)"
            @focus="rotateDropdownVisible = true"
          >
            <template #prefix>{{ $t({ en: 'Heading', zh: '朝向' }) }}</template>
          </UINumberInput>
        </template>
        <div class="heading-picker-container">
          <AnglePicker :model-value="localConfig.heading" @update:model-value="handleUpdateHeading($event ?? 0)" />
        </div>
      </UIDropdown>
      <UIButtonGroup
        v-else-if="localConfig.rotationStyle === RotationStyle.LeftRight"
        v-radar="{ name: 'Direction control', desc: 'Control to set sprite left or right direction' }"
        type="text"
        :value="headingToLeftRight(localConfig.heading)"
        @update:value="(v) => handleUpdateHeading(leftRightToHeading(v as LeftRight))"
      >
        <UIButtonGroupItem :value="LeftRight.left">
          {{ $t({ en: 'Left', zh: '左' }) }}
        </UIButtonGroupItem>
        <UIButtonGroupItem :value="LeftRight.right">
          {{ $t({ en: 'Right', zh: '右' }) }}
        </UIButtonGroupItem>
      </UIButtonGroup>
      <UIDivider vertical />
      <UITooltip>
        {{ $t({ en: 'Back', zh: '返回' }) }}
        <template #trigger>
          <ConfigItem class="rotation-back" icon="back" @click="props.onBack" />
        </template>
      </UITooltip>
    </div>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.rotation-config-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.heading-input {
  width: 130px;
}

.heading-picker-container {
  padding: 12px;
  width: max-content;
}
</style>
