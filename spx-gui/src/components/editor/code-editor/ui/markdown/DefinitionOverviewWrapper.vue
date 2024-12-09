<script setup lang="ts">
import type { DefinitionKind } from '../../common'
import CodeView from './CodeView.vue'
import DefinitionIcon from './icon/DefinitionIcon.vue'

defineProps<{
  kind?: DefinitionKind
}>()
</script>

<template>
  <h4 class="definition-overview-wrapper">
    <DefinitionIcon v-if="kind != null" class="icon" :kind="kind" />
    <CodeView><slot></slot></CodeView>
  </h4>
</template>

<style lang="scss" scoped>
.definition-overview-wrapper {
  color: var(--ui-color-title);
}

.icon {
  margin-top: 2px;
  margin-right: 4px;
}
</style>
