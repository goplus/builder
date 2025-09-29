<script setup lang="ts">
import { computed, ref } from 'vue'
import { UICard, UICardHeader, UIFullScreenModal, UIFullScreenModalHeader, UIIcon } from '@/components/ui'
import type { Project } from '@/models/project'
import MapViewer from './map-viewer/MapViewer.vue'
import SpriteList from './SpriteList.vue'
import SpriteBasicConfig from './SpriteBasicConfig.vue'
import MapBasicConfig from './MapBasicConfig.vue'
import type { Sprite } from '@/models/sprite'

const props = defineProps<{
  visible: boolean
  project: Project
  selectedSpriteId: string | null
}>()

const emit = defineEmits<{
  resolved: []
  cancelled: []
}>()

const selectedSpriteId = ref(props.selectedSpriteId)
const selectedSprite = computed(() => props.project.sprites.find((s) => s.id === selectedSpriteId.value) ?? null)

const collapsed = ref(false)

function handleSpriteSelect(sprite: Sprite | null) {
  selectedSpriteId.value = sprite?.id ?? null
  collapsed.value = sprite == null ? collapsed.value : true
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
        <UICard class="collapse-card">
          <UICardHeader>
            {{
              $t({
                en: 'Global Configuration',
                zh: '全局配置'
              })
            }}
            <UIIcon
              class="collapse-icon"
              :class="{ collapsed }"
              type="doubleArrowDown"
              @click="collapsed = !collapsed"
            />
          </UICardHeader>
          <Transition>
            <MapBasicConfig v-if="!collapsed" :project="project" />
          </Transition>
        </UICard>
        <SpriteList
          class="sprite-list"
          :project="project"
          :selected-sprite="selectedSprite"
          @update:selected-sprite="handleSpriteSelect"
        />
        <div class="footer">
          <SpriteBasicConfig v-if="selectedSprite" :sprite="selectedSprite" :project="project" />
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
  flex: 0 0 400px; // todo temp
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);

  .collapse-icon {
    transition: transform 0.3s;
    margin-left: 8px;
    cursor: pointer;

    &.collapsed {
      transform: rotate(-180deg);
    }
  }

  .v-enter-active {
    transition: opacity ease-in 0.2s;
  }
  .v-leave-active {
    transition: opacity ease-out 0.2s;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
}
.sprite-list {
  flex: 1 1 0;
}
.footer {
  flex: 0 0 auto;
}
</style>
