<script setup lang="ts">
import DefinitionOverviewWrapper from './DefinitionOverviewWrapper.vue'
import DefinitionDetail from './DefinitionDetail.vue'

const props = defineProps<{
  defId: string
  overview: string
}>()
</script>

<template>
  <div class="flex flex-col [&+&]:mt-2">
    <DefinitionOverviewWrapper>{{ props.overview }}</DefinitionOverviewWrapper>
    <DefinitionDetail :def-id="props.defId"><slot></slot></DefinitionDetail>
  </div>
</template>
