<script setup lang="ts">
import { computed } from 'vue'
import { getResourceModel } from '../../common'
import { useCodeEditorCtx } from '../CodeEditorUI.vue'
import ResourceItem from '../resource/ResourceItem.vue'

const props = defineProps<{
  /** URI of the resource, e.g., `spx://resources/sprites/<name>` */
  resource: string
}>()

const codeEditorCtx = useCodeEditorCtx()
const resourceModel = computed(() => getResourceModel(codeEditorCtx.ui.project, { uri: props.resource }))
</script>

<template>
  <!-- TODO: disable hover effect -->
  <ResourceItem v-if="resourceModel != null" :resource="resourceModel" :selected="false" />
</template>

<style lang="scss" scoped></style>
