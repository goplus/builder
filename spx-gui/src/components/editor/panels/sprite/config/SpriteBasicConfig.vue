<script setup lang="ts">
import { computed, ref } from 'vue'
import { UINumberInput, UIIcon, UITooltip, UIButtonGroup, UIButtonGroupItem, UIDropdown } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { round } from '@/utils/utils'
import { debounce } from 'lodash'
import { RotationStyle, LeftRight, headingToLeftRight, leftRightToHeading, type Sprite } from '@/models/sprite'
import { type Project } from '@/models/project'
import { useRenameSprite } from '@/components/asset'
import AssetName from '@/components/asset/AssetName.vue'
import AnglePicker from '@/components/editor/common/AnglePicker.vue'
import rotateIcon from './rotate.svg?raw'
import leftRightIcon from './left-right.svg?raw'
import noRotateIcon from './no-rotate.svg?raw'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const emit = defineEmits<{
  collapse: []
}>()

const rotateDropdownVisible = ref(false)

const renameSprite = useRenameSprite()

const handleNameEdit = useMessageHandle(() => renameSprite(props.sprite), {
  en: 'Failed to rename sprite',
  zh: '重命名精灵失败'
}).fn

const handleXUpdate = wrapUpdateHandler((x: number | null) => props.sprite.setX(x ?? 0))
const handleYUpdate = wrapUpdateHandler((y: number | null) => props.sprite.setY(y ?? 0))

// use `round` to avoid `0.07 * 100 = 7.000000000000001`
// TODO: use some 3rd-party tool like [Fraction.js](https://github.com/rawify/Fraction.js)
const sizePercent = computed(() => round(props.sprite.size * 100))

const handleSizePercentUpdate = wrapUpdateHandler((sizeInPercent: number | null) => {
  if (sizeInPercent == null) return
  props.sprite.setSize(round(sizeInPercent / 100, 2))
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

const handleRotationStyleUpdate = wrapUpdateHandler((style: RotationStyle) => {
  props.sprite.setRotationStyle(style)
  if (style === RotationStyle.none) props.sprite.setHeading(90)
  if (style === RotationStyle.leftRight) {
    // normalize heading to 90 / -90
    const normalizedHeading = leftRightToHeading(headingToLeftRight(props.sprite.heading))
    props.sprite.setHeading(normalizedHeading)
  }
})

const handleHeadingUpdate = wrapUpdateHandler((h: number | null) => props.sprite.setHeading(h ?? 0))
const handleVisibleUpdate = wrapUpdateHandler((visible: boolean) => props.sprite.setVisible(visible), false)

function wrapUpdateHandler<Args extends any[]>(
  handler: (...args: Args) => unknown,
  withDebounce = true
): (...args: Args) => void {
  const sname = props.sprite.name
  const action = { name: { en: `Configure sprite ${sname}`, zh: `修改精灵 ${sname} 配置` } }
  const wrapped = (...args: Args) => props.project.history.doAction(action, () => handler(...args))
  return withDebounce ? debounce(wrapped, 300) : wrapped
}
</script>

<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="line name">
    <AssetName>{{ sprite.name }}</AssetName>
    <UIIcon
      v-radar="{ name: 'Rename button', desc: 'Button to rename the sprite' }"
      class="icon"
      :title="$t({ en: 'Rename', zh: '重命名' })"
      type="edit"
      @click="handleNameEdit"
    />
    <div class="spacer" />
    <UITooltip>
      <template #trigger>
        <UIIcon
          v-radar="{ name: 'Collapse button', desc: 'Button to collapse the sprite basic configuration panel' }"
          class="icon"
          type="doubleArrowDown"
          @click="emit('collapse')"
        />
      </template>
      {{
        $t({
          en: 'Collapse',
          zh: '收起'
        })
      }}
    </UITooltip>
  </div>
  <div class="line">
    <UINumberInput
      v-radar="{ name: 'X position input', desc: 'Input to set sprite X position' }"
      :value="sprite.x"
      @update:value="handleXUpdate"
    >
      <template #prefix>X:</template>
    </UINumberInput>
    <UINumberInput
      v-radar="{ name: 'Y position input', desc: 'Input to set sprite Y position' }"
      :value="sprite.y"
      @update:value="handleYUpdate"
    >
      <template #prefix>Y:</template>
    </UINumberInput>
    <UINumberInput
      v-radar="{ name: 'Size input', desc: 'Input to set sprite size percentage' }"
      :min="0"
      :value="sizePercent"
      @update:value="handleSizePercentUpdate"
    >
      <template #prefix> {{ $t({ en: 'Size', zh: '大小' }) }}: </template>
      <template #suffix>%</template>
    </UINumberInput>
  </div>
  <div class="line">
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
  </div>
  <div class="line">
    <p class="with-label">
      {{ $t({ en: 'Show', zh: '显示' }) }}:
      <UIButtonGroup
        v-radar="{ name: 'Visibility control', desc: 'Control to toggle sprite visibility' }"
        :value="sprite.visible ? 'visible' : 'hidden'"
        @update:value="(v) => handleVisibleUpdate(v === 'visible')"
      >
        <UIButtonGroupItem value="visible">
          <UIIcon type="eye" />
        </UIButtonGroupItem>
        <UIButtonGroupItem value="hidden">
          <UIIcon type="eyeSlash" />
        </UIButtonGroupItem>
      </UIButtonGroup>
    </p>
  </div>
</template>

<style scoped lang="scss">
.line {
  display: flex;
  gap: 12px;
  align-items: center;
}

.name {
  height: 28px;
  color: var(--ui-color-title);
}

.icon {
  cursor: pointer;
  color: var(--ui-color-grey-900);
  &:hover {
    color: var(--ui-color-grey-800);
  }
  &:active {
    color: var(--ui-color-grey-1000);
  }
}

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

.spacer {
  flex: 1;
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
