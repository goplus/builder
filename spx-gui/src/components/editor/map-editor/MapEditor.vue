<script setup lang="ts">
import { computed, ref } from 'vue'
import { UICard, UICardHeader, UIIcon, UITooltip } from '@/components/ui'
import type { SpxProject } from '@/models/spx/project'
import MapViewer from './map-viewer/MapViewer.vue'
import SpritesPanel from './SpritesPanel.vue'
import MapBasicConfig from './MapBasicConfig.vue'
import type { Sprite } from '@/models/spx/sprite'

const props = defineProps<{
  project: SpxProject
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
  <div class="flex-[1_1_0] flex flex-row gap-xl">
    <div class="flex-1 w-0 min-w-0 flex items-center justify-center">
      <MapViewer :project="project" :selected-sprite="selectedSprite" @update:selected-sprite="handleSpriteSelect" />
    </div>
    <div class="flex-[0_0_400px] flex flex-col gap-xl desktop-large:basis-124">
      <UICard>
        <UICardHeader>
          <div class="w-full flex items-center justify-between">
            {{
              $t({
                en: 'Global Config',
                zh: '全局配置'
              })
            }}
            <UITooltip>
              <template #trigger>
                <UIIcon
                  class="ml-2 cursor-pointer transition-transform duration-300"
                  :class="collapsed ? '-rotate-180' : ''"
                  type="doubleArrowDown"
                  @click="collapsed = !collapsed"
                />
              </template>
              {{ $t({ en: collapsed ? 'Expand' : 'Collapse', zh: collapsed ? '展开' : '收起' }) }}
            </UITooltip>
          </div>
        </UICardHeader>
        <MapBasicConfig v-if="!collapsed" class="p-4" :project="project" />
      </UICard>
      <SpritesPanel
        class="flex-auto min-h-0"
        :project="project"
        :selected-sprite="selectedSprite"
        @update:selected-sprite="handleSpriteSelect"
      />
    </div>
  </div>
</template>
