<script setup lang="ts">
import { computed } from 'vue'
import { getResourceModel } from '../../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import ResourceItem from '../resource/ResourceItem.vue'

const props = defineProps<{
  /** URI of the resource, e.g., `spx://resources/sprites/<name>` */
  resource: string
}>()

const codeEditorCtx = useCodeEditorUICtx()
const resourceModel = computed(() => getResourceModel(codeEditorCtx.ui.project, { uri: props.resource }))
</script>

<template>
  <!-- TODO: Design specially for `ResourcePreview`, instead of using the same `ResourceItem` as `ResourceSelector` -->
  <ResourceItem v-if="resourceModel != null" :resource="resourceModel" autoplay />
</template>

<style lang="scss" scoped></style>
