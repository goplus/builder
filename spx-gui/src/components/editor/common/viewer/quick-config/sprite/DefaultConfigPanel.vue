<script lang="ts" setup>
import { UIDivider, UITooltip, type IconType } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import { headingToLeftRight, leftRightToHeading, RotationStyle } from '@/models/sprite'
import type { Project } from '@/models/project'
import type { LocaleMessage } from '@/utils/i18n'
import ConfigItem from '../common/ConfigItem.vue'
import ZorderConfigItem, { moveActionNames, type MoveAction } from '../common/ZorderConfigItem.vue'
import type { SpriteLocalConfig } from '../utils'

const props = defineProps<{
  localConfig: SpriteLocalConfig
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

async function moveZorder(direction: MoveAction) {
  await props.project.history.doAction({ name: moveActionNames[direction] }, () => {
    const { localConfig, project } = props
    if (direction === 'up') {
      project.upSpriteZorder(localConfig.id)
    } else if (direction === 'down') {
      project.downSpriteZorder(localConfig.id)
    } else if (direction === 'top') {
      project.topSpriteZorder(localConfig.id)
    } else if (direction === 'bottom') {
      project.bottomSpriteZorder(localConfig.id)
    }
  })
}
</script>

<template>
  <ConfigPanel
    v-radar="{
      name: 'Sprite Quick Config Panel',
      desc: 'Quick config for sprite rotation style, layer order, and more'
    }"
  >
    <div class="default-config-wrapper">
      <UITooltip v-for="(value, key) in rotationStyleTips" :key="key">
        {{ $t(value.tips) }}
        <template #trigger>
          <ConfigItem
            :class="{ active: props.localConfig.rotationStyle === key }"
            :icon="value.icon"
            @click="handleRotationStyleUpdate(key)"
          />
        </template>
      </UITooltip>
      <UIDivider vertical />
      <ZorderConfigItem type="sprite" @move-zorder="moveZorder" />
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
