<script lang="ts" setup>
import { UIDivider, UITooltip, type IconType } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import { headingToLeftRight, leftRightToHeading, RotationStyle, type Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { wrapUpdateHandler } from '@/components/editor/common/config/utils'
import type { LocaleMessage } from '@/utils/i18n'
import ConfigItem from '../common/ConfigItem.vue'
import ZOrderConfigItem, { moveActionNames } from '../common/ZOrderConfigItem.vue'

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

async function moveZorder(direction: keyof typeof moveActionNames) {
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
          <ConfigItem
            :class="{ active: props.sprite.rotationStyle === key }"
            :icon="value.icon"
            @click="handleRotationStyleUpdate(key)"
          />
        </template>
      </UITooltip>
      <UIDivider vertical />
      <ZOrderConfigItem type="sprite" @move-zorder="moveZorder"></ZOrderConfigItem>
    </div>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.default-config-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
