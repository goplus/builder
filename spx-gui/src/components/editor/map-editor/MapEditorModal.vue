<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIButton, UIFullScreenModal } from '@/components/ui'
import type { Project } from '@/models/project'
import MapViewer from './map-viewer/MapViewer.vue'
import SpriteList from './SpriteList.vue'
import SpriteBasicConfig from './SpriteBasicConfig.vue'
import MapBasicConfig from './MapBasicConfig.vue'
import type { Sprite } from '@/models/sprite'

const props = defineProps<{
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  resolved: []
  cancelled: []
}>()

const selectedSpriteId = ref<string | null>(null)
const selectedSprite = computed(() => props.project.sprites.find((s) => s.id === selectedSpriteId.value) ?? null)

function handleSpriteSelect(sprite: Sprite | null) {
  selectedSpriteId.value = sprite?.id ?? null
}
</script>

<template>
  <UIFullScreenModal :visible="visible" @update:visible="emit('cancelled')">
    <div class="wrapper">
      <div class="header">
        Map editor for project: {{ project.name }}
        <UIButton icon="close" @click="emit('cancelled')"></UIButton>
      </div>
      <div class="body">
        <div class="main">
          <MapViewer
            :project="project"
            :selected-sprite="selectedSprite"
            @update:selected-sprite="handleSpriteSelect"
          />
        </div>
        <div class="sider">
          <SpriteList
            class="sprite-list"
            :project="project"
            :selected-sprite="selectedSprite"
            @update:selected-sprite="handleSpriteSelect"
          />
          <div class="footer">
            <SpriteBasicConfig v-if="selectedSprite != null" :sprite="selectedSprite" :project="project" />
            <MapBasicConfig v-else :project="project" />
          </div>
        </div>
      </div>
    </div>
  </UIFullScreenModal>
</template>

<style lang="scss" scoped>
.wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--ui-color-grey-100);
}
.header {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  padding: 0.5em 1em;
  border-bottom: 1px solid var(--ui-color-grey-900);
}
.body {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
}
.main {
  flex: 1;
  background: var(--ui-color-grey-200);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1em;
}
.sider {
  width: 328px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--ui-color-grey-900);
}
.sprite-list {
  flex: 1 1 0;
}
.footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--ui-color-grey-900);
}
</style>
