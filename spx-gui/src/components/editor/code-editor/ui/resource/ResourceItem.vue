<script setup lang="ts">
import type { ResourceModel } from '@/models/common/resource-model'
import { Animation } from '@/models/animation'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import { isWidget } from '@/models/widget'
import AnimationItem from '@/components/editor/sprite/AnimationItem.vue'
import CostumeItem from '@/components/editor/sprite/CostumeItem.vue'
import SoundItem from '@/components/editor/sound/SoundItem.vue'
import SpriteItem from '@/components/editor/sprite/SpriteItem.vue'
import BackdropItem from '@/components/editor/stage/backdrop/BackdropItem.vue'
import WidgetItem from '@/components/editor/stage/widget/WidgetItem.vue'

withDefaults(
  defineProps<{
    resource: ResourceModel
    selectable?: false | { selected: boolean }
    autoplay?: boolean
  }>(),
  {
    selectable: false,
    autoplay: false
  }
)
</script>

<template>
  <AnimationItem
    v-if="resource instanceof Animation"
    :animation="resource"
    :selectable="selectable"
    color="primary"
    :autoplay="autoplay"
  />
  <BackdropItem
    v-else-if="resource instanceof Backdrop"
    :backdrop="resource"
    :selectable="selectable"
    color="primary"
  />
  <CostumeItem v-else-if="resource instanceof Costume" :costume="resource" :selectable="selectable" color="primary" />
  <SoundItem v-else-if="resource instanceof Sound" :sound="resource" :selectable="selectable" color="primary" />
  <SpriteItem
    v-else-if="resource instanceof Sprite"
    :sprite="resource"
    :selectable="selectable"
    color="primary"
    :autoplay="autoplay"
  />
  <WidgetItem v-else-if="isWidget(resource)" :widget="resource" :selectable="selectable" color="primary" />
</template>

<style lang="scss" scoped></style>
