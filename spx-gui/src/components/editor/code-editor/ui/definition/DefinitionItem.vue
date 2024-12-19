<script setup lang="ts">
import DefinitionOverviewWrapper from './DefinitionOverviewWrapper.vue'
import DefinitionDetail from './DefinitionDetail.vue'

const props = defineProps<{
  defId: string
  overview: string
}>()
</script>

<template>
  <div class="definition-item">
    <DefinitionOverviewWrapper>{{ props.overview }}</DefinitionOverviewWrapper>
    <DefinitionDetail :def-id="props.defId"><slot></slot></DefinitionDetail>
  </div>
</template>

<style lang="scss" scoped>
.definition-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
