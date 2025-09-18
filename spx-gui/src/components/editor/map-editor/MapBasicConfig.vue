<script setup lang="ts">
import type { Project } from '@/models/project'
import { UICard, UICardHeader } from '@/components/ui'

import MapSizeInput from './MapSizeInput.vue'
import MapPhysicsInput from './MapPhysicsInput.vue'

defineProps<{
  project: Project
}>()
</script>

<template>
  <UICard>
    <UICardHeader>
      {{
        $t({
          en: 'Global Configuration',
          zh: '全局配置'
        })
      }}
    </UICardHeader>
    <div class="main">
      <MapSizeInput :project="project" />
      <MapPhysicsInput :project="project" />
    </div>
  </UICard>
</template>

<style lang="scss" scoped>
.main {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
  padding: 16px;
}
</style>
