<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIFullScreenModal, UIFullScreenModalHeader } from '@/components/ui'
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
    <UIFullScreenModalHeader @close="emit('cancelled')">
      <h2 class="title">
        {{
          $t({
            en: 'Edit map',
            zh: '编辑地图'
          })
        }}
      </h2>
    </UIFullScreenModalHeader>
    <div class="body">
      <div class="main">
        <MapViewer :project="project" :selected-sprite="selectedSprite" @update:selected-sprite="handleSpriteSelect" />
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
  </UIFullScreenModal>
</template>

<style lang="scss" scoped>
.title {
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.body {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
  padding: var(--ui-gap-middle);
  gap: var(--ui-gap-middle);
}
.main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.sider {
  flex: 0 0 304px; // 3 columns for sprite list
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}
.sprite-list {
  flex: 1 1 0;
}
.footer {
  flex: 0 0 auto;
}
</style>
