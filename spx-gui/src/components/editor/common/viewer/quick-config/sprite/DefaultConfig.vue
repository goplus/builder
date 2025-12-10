<script lang="ts" setup>
import { UIDropdown, UIIcon, UIMenu, UIMenuItem, UITooltip, type IconType } from '@/components/ui'
import ConfigPanel from '../ConfigPanel.vue'
import { headingToLeftRight, leftRightToHeading, RotationStyle, type Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { wrapUpdateHandler } from '@/components/editor/common/config/utils'
import type { LocaleMessage } from '@/utils/i18n'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const rotationStyleTips = {
  [RotationStyle.Normal]: {
    icon: 'rotateAround',
    tips: {
      en: 'Normal: the sprite can be rotated to any heading',
      zh: '正常旋转：精灵可以被旋转到任意方向'
    }
  },
  [RotationStyle.LeftRight]: {
    icon: 'leftRight',
    tips: {
      en: 'Left-Right: the sprite can only be flipped horizontally',
      zh: '左右翻转：精灵只可以在水平方向翻转'
    }
  },
  [RotationStyle.None]: {
    icon: 'notRotate',
    tips: {
      en: "Don't Rotate: the sprite will not be rotated",
      zh: '不旋转：精灵不会被旋转'
    }
  }
} satisfies Record<RotationStyle, { icon: IconType; tips: LocaleMessage }>

const spriteContext = () => ({
  sprite: props.sprite,
  project: props.project
})

const handleRotationStyleUpdate = wrapUpdateHandler(
  (style: RotationStyle) => {
    props.sprite.setRotationStyle(style)
    if (style === RotationStyle.None) props.sprite.setHeading(90)
    if (style === RotationStyle.LeftRight) {
      // normalize heading to 90 / -90
      const normalizedHeading = leftRightToHeading(headingToLeftRight(props.sprite.heading))
      props.sprite.setHeading(normalizedHeading)
    }
  },
  spriteContext,
  false
)

const moveActionNames = {
  up: { en: 'Bring forward', zh: '向前移动' },
  top: { en: 'Bring to front', zh: '移到最前' },
  down: { en: 'Send backward', zh: '向后移动' },
  bottom: { en: 'Send to back', zh: '移到最后' }
}

async function moveZorder(direction: 'up' | 'down' | 'top' | 'bottom') {
  await props.project.history.doAction({ name: moveActionNames[direction] }, () => {
    const { sprite, project } = props
    if (direction === 'up') {
      project.upSpriteZorder(sprite.id)
    } else if (direction === 'down') {
      project.downSpriteZorder(sprite.id)
    } else if (direction === 'top') {
      project.topSpriteZorder(sprite.id)
    } else if (direction === 'bottom') {
      project.bottomSpriteZorder(sprite.id)
    }
  })
}
</script>

<!-- eslint-disable vue/no-v-html -->
<template>
  <ConfigPanel v-radar="{ name: 'Rotation style control', desc: 'Control to set sprite rotation style' }">
    <div class="default-config-wrapper">
      <UITooltip v-for="(value, key) in rotationStyleTips" :key="key">
        {{ $t(value.tips) }}
        <template #trigger>
          <div
            class="config-item"
            :class="{ active: props.sprite.rotationStyle === key }"
            @click="handleRotationStyleUpdate(key)"
          >
            <UIIcon class="icon" :type="value.icon" />
          </div>
        </template>
      </UITooltip>
      <UIDropdown trigger="click" placement="top">
        <template #trigger>
          <div class="config-item">
            <UIIcon class="icon" type="layer" />
          </div>
        </template>
        <UIMenu>
          <UIMenuItem
            v-radar="{ name: 'Move up', desc: 'Click to move sprite up in z-order' }"
            @click="moveZorder('up')"
            >{{ $t(moveActionNames.up) }}</UIMenuItem
          >
          <UIMenuItem
            v-radar="{ name: 'Move to top', desc: 'Click to move sprite to top in z-order' }"
            @click="moveZorder('top')"
            >{{ $t(moveActionNames.top) }}</UIMenuItem
          >
          <UIMenuItem
            v-radar="{ name: 'Move down', desc: 'Click to move sprite down in z-order' }"
            @click="moveZorder('down')"
            >{{ $t(moveActionNames.down) }}</UIMenuItem
          >
          <UIMenuItem
            v-radar="{ name: 'Move to bottom', desc: 'Click to move sprite to bottom in z-order' }"
            @click="moveZorder('bottom')"
            >{{ $t(moveActionNames.bottom) }}</UIMenuItem
          >
        </UIMenu>
      </UIDropdown>
    </div>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.default-config-wrapper {
  display: flex;
  gap: 4px;

  .config-item {
    width: 32px;
    height: 32px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    cursor: pointer;

    &:hover,
    &.active {
      background: var(--ui-color-turquoise-200);

      .icon {
        color: var(--ui-color-turquoise-500);
      }
    }
  }
}
</style>
