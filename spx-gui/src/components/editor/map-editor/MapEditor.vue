<script setup lang="ts">
import { computed, ref } from 'vue'
import { UICard, UICardHeader, UIIcon, UITooltip } from '@/components/ui'
import type { Project } from '@/models/project'
import MapViewer from './map-viewer/MapViewer.vue'
import SpriteList from './SpriteList.vue'
import MapBasicConfig from './MapBasicConfig.vue'
import type { Sprite } from '@/models/sprite'

const props = defineProps<{
  project: Project
  selectedSpriteId: string | null
}>()

const emits = defineEmits<{
  'update:selectedSpriteId': [string | null]
}>()

const collapsed = ref(false)

const selectedSprite = computed(() => props.project.sprites.find((s) => s.id === props.selectedSpriteId) ?? null)

function handleSpriteSelect(sprite: Sprite | null) {
  emits('update:selectedSpriteId', sprite?.id ?? null)
}
</script>

<template>
  <div class="body">
    <div class="main">
      <MapViewer :project="project" :selected-sprite="selectedSprite" @update:selected-sprite="handleSpriteSelect" />
    </div>
    <div class="sider">
      <UICard>
        <UICardHeader>
          <div class="collapse-header">
            {{
              $t({
                en: 'Global Config',
                zh: '全局配置'
              })
            }}
            <UITooltip>
              <template #trigger>
                <UIIcon
                  class="collapse-icon"
                  :class="{ collapsed }"
                  type="doubleArrowDown"
                  @click="collapsed = !collapsed"
                />
              </template>
              {{ $t({ en: collapsed ? 'Expand' : 'Collapse', zh: collapsed ? '展开' : '收起' }) }}
            </UITooltip>
          </div>
        </UICardHeader>
        <MapBasicConfig v-if="!collapsed" class="map-config" :project="project" />
      </UICard>
      <SpriteList
        class="sprite-list"
        :project="project"
        :selected-sprite="selectedSprite"
        @update:selected-sprite="handleSpriteSelect"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '@/components/ui/responsive';

.body {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
  gap: var(--ui-gap-middle);
}
.main {
  flex: 1;
  width: 0;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.sider {
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);

  @include responsive(desktop-large) {
    flex-basis: 494px;
  }

  .collapse-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .collapse-icon {
    transition: transform 0.3s;
    margin-left: 8px;
    cursor: pointer;

    &.collapsed {
      transform: rotate(-180deg);
    }
  }

  .map-config {
    padding: 16px;
  }
}
.sprite-list {
  flex: 1 1 0;
}
</style>
