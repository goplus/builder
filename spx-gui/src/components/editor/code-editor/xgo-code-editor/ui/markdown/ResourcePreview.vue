<script setup lang="ts">
import { computed } from 'vue'
import type { ResourceIdentifier } from '../../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'

const props = defineProps<{
  /** URI of the resource, e.g., `spx://resources/sprites/<name>` */
  resource: string
}>()

const codeEditorCtx = useCodeEditorUICtx()
const provider = codeEditorCtx.ui.resourceProvider
const resourceIdentifier = computed<ResourceIdentifier>(() => ({
  uri: props.resource
}))
</script>

<template>
  <!-- TODO: Design specially for `ResourcePreview`, instead of using the same `ResourceItem` as `ResourceSelector` -->
  <component :is="provider?.provideResourceItemRenderer()" :resource="resourceIdentifier" autoplay />
</template>

<style lang="scss" scoped></style>
