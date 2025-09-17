<script setup lang="ts">
import { ref } from 'vue'

import { type Project } from '@/models/project'
import { headingToLeftRight, LeftRight, leftRightToHeading, RotationStyle, type Sprite } from '@/models/sprite'

import SpriteConfigItem, { wrapUpdateHandler } from './SpriteConfigItem.vue'
import AnglePicker from '@/components/editor/common/AnglePicker.vue'
import { UIButtonGroup, UIButtonGroupItem, UIDropdown, UINumberInput, UITooltip } from '@/components/ui'
import rotateIcon from './rotate.svg?raw'
import leftRightIcon from './left-right.svg?raw'
import noRotateIcon from './no-rotate.svg?raw'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const rotateDropdownVisible = ref(false)

const spriteContext = () => ({
  sprite: props.sprite,
  project: props.project
})

const rotationStyleTips = {
  normal: {
    en: 'Normal: the sprite can be rotated to any heading',
    zh: '正常旋转：精灵可以被旋转到任意方向'
  },
  leftRight: {
    en: 'Left-Right: the sprite can only be flipped horizontally',
    zh: '左右翻转：精灵只可以在水平方向翻转'
  },
  none: {
    en: "Don't Rotate: the sprite will not be rotated",
    zh: '不旋转：精灵不会被旋转'
  }
}

const handleRotationStyleUpdate = wrapUpdateHandler(
  (style: RotationStyle) => {
    props.sprite.setRotationStyle(style)
    if (style === RotationStyle.none) props.sprite.setHeading(90)
    if (style === RotationStyle.leftRight) {
      // normalize heading to 90 / -90
      const normalizedHeading = leftRightToHeading(headingToLeftRight(props.sprite.heading))
      props.sprite.setHeading(normalizedHeading)
    }
  },
  spriteContext,
  false
)
const handleHeadingUpdate = wrapUpdateHandler((h: number | null) => props.sprite.setHeading(h ?? 0), spriteContext)
</script>

<!-- eslint-disable vue/no-v-html -->
<template>
  <SpriteConfigItem>
    <p class="with-label">
      {{ $t({ en: 'Rotation', zh: '旋转' }) }}:
      <UIButtonGroup
        v-radar="{ name: 'Rotation style control', desc: 'Control to set sprite rotation style' }"
        :value="sprite.rotationStyle"
        @update:value="(v) => handleRotationStyleUpdate(v as RotationStyle)"
      >
        <UITooltip>
          {{ $t(rotationStyleTips.normal) }}
          <template #trigger>
            <UIButtonGroupItem :value="RotationStyle.normal">
              <i class="rotation-icon" v-html="rotateIcon"></i>
            </UIButtonGroupItem>
          </template>
        </UITooltip>
        <UITooltip>
          {{ $t(rotationStyleTips.leftRight) }}
          <template #trigger>
            <UIButtonGroupItem :value="RotationStyle.leftRight">
              <i class="rotation-icon" v-html="leftRightIcon"></i>
            </UIButtonGroupItem>
          </template>
        </UITooltip>
        <UITooltip>
          {{ $t(rotationStyleTips.none) }}
          <template #trigger>
            <UIButtonGroupItem :value="RotationStyle.none">
              <i class="rotation-icon" v-html="noRotateIcon"></i>
            </UIButtonGroupItem>
          </template>
        </UITooltip>
      </UIButtonGroup>
    </p>
    <UIDropdown
      v-if="sprite.rotationStyle !== RotationStyle.leftRight"
      trigger="manual"
      placement="top"
      :visible="rotateDropdownVisible"
      :disabled="sprite.rotationStyle === RotationStyle.none"
      @click-outside="rotateDropdownVisible = false"
    >
      <template #trigger>
        <UINumberInput
          v-radar="{ name: 'Heading input', desc: 'Input to set sprite heading angle' }"
          :disabled="sprite.rotationStyle === RotationStyle.none"
          :min="-180"
          :max="180"
          :value="sprite.heading"
          @update:value="handleHeadingUpdate"
          @focus="rotateDropdownVisible = true"
        >
          <template #prefix>
            {{
              $t({
                en: 'Heading',
                zh: '朝向'
              })
            }}:
          </template>
        </UINumberInput>
      </template>
      <div class="rotation-heading-container">
        <div>{{ $t({ en: 'Heading', zh: '朝向' }) }}</div>
        <AnglePicker :model-value="sprite.heading" @update:model-value="handleHeadingUpdate" />
      </div>
    </UIDropdown>
    <UIButtonGroup
      v-show="sprite.rotationStyle === RotationStyle.leftRight"
      v-radar="{ name: 'Direction control', desc: 'Control to set sprite left or right direction' }"
      type="text"
      :value="headingToLeftRight(sprite.heading)"
      @update:value="(v) => handleHeadingUpdate(leftRightToHeading(v as LeftRight))"
    >
      <UIButtonGroupItem :value="LeftRight.left">
        {{ $t({ en: 'Left', zh: '左' }) }}
      </UIButtonGroupItem>
      <UIButtonGroupItem :value="LeftRight.right">
        {{ $t({ en: 'Right', zh: '右' }) }}
      </UIButtonGroupItem>
    </UIButtonGroup>
  </SpriteConfigItem>
</template>

<style lang="scss">
.with-label {
  display: flex;
  gap: 4px;
  align-items: center;
  word-break: keep-all;
}

.rotation-heading-container {
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.rotation-icon {
  display: flex;
  width: 16px;
  height: 16px;
  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}
</style>
