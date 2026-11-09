<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'

import { cancelBubble } from './common'

const props = defineProps<{
  name: string | null
  anchor: { x: number; y: number } | null
  selected: boolean
  mapScale: number
}>()

const emit = defineEmits<{
  click: [name: string]
}>()

const visible = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const layout = computed(() => {
  const { name, anchor, selected, mapScale } = props
  if (name == null || anchor == null || (!selected && !visible.value)) return null
  const fontSize = 12 / mapScale
  const textNode = new Konva.Text({ text: name, fontFamily: 'Inter', fontSize })
  const width = textNode.width() + 12 / mapScale
  return { x: anchor.x, y: anchor.y, width, height: 20 / mapScale, fontSize, text: name, scale: mapScale }
})

function show() {
  if (hideTimer != null) clearTimeout(hideTimer)
  hideTimer = null
  visible.value = true
}

function hide() {
  if (props.selected) return
  if (hideTimer != null) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    visible.value = false
    hideTimer = null
  }, 120)
}

function handleClick(e: KonvaEventObject<MouseEvent>) {
  cancelBubble(e)
  if (props.name != null) emit('click', props.name)
}

onUnmounted(() => {
  if (hideTimer != null) clearTimeout(hideTimer)
})

defineExpose({ show, hide })
</script>

<template>
  <v-group
    v-if="layout != null"
    :config="{ x: layout.x, y: layout.y, offsetX: layout.width / 2 }"
    @mouseenter="show"
    @mouseleave="hide"
    @click="handleClick"
  >
    <v-rect
      :config="{
        width: layout.width,
        height: layout.height,
        fill: 'rgba(0, 0, 0, 0.3)',
        cornerRadius: 4 / layout.scale
      }"
    />
    <v-text
      :config="{
        text: layout.text,
        y: 1 / layout.scale,
        width: layout.width,
        height: layout.height,
        align: 'center',
        verticalAlign: 'middle',
        fontFamily: 'Inter',
        fontSize: layout.fontSize,
        fill: '#fff'
      }"
    />
  </v-group>
</template>
