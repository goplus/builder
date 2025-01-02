<script setup lang="ts">
import type { ResourceModel } from '@/models/common/resource-model'
import { Animation } from '@/models/animation'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { Sound } from '@/models/sound'
import { Sprite } from '@/models/sprite'
import { isWidget } from '@/models/widget'
import AnimationItem from './AnimationItem.vue'
import BackdropItem from './BackdropItem.vue'
import CostumeItem from './CostumeItem.vue'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import WidgetItem from './WidgetItem.vue'

withDefaults(
  defineProps<{
    resource: ResourceModel
    /** If `selected` not provided, the item is considered as non-interactive */
    selected?: boolean
  }>(),
  {
    selected: undefined
  }
)
</script>

<template>
  <AnimationItem v-if="resource instanceof Animation" :item="resource" :selected="selected" />
  <BackdropItem v-else-if="resource instanceof Backdrop" :item="resource" :selected="selected" />
  <CostumeItem v-else-if="resource instanceof Costume" :item="resource" :selected="selected" />
  <SoundItem v-else-if="resource instanceof Sound" :item="resource" :selected="selected" />
  <SpriteItem v-else-if="resource instanceof Sprite" :item="resource" :selected="selected" />
  <WidgetItem v-else-if="isWidget(resource)" :item="resource" :selected="selected" />
</template>

<style lang="scss" scoped></style>
