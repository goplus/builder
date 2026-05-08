<script setup lang="ts">
import { computed } from 'vue'
import type { ResourceIdentifier } from '../../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'

const props = defineProps<{
  /** URI of the resource, e.g., `spx://resources/sprites/<name>` */
  resource: string
}>()

const codeEditorCtx = useCodeEditorUICtx()
const itemRenderer = computed(() => codeEditorCtx.ui.codeEditor.resourceAdapter.provideResourceItemRenderer())
const resourceIdentifier = computed<ResourceIdentifier>(() => ({
  uri: props.resource
}))
</script>

<!-- TODO: Design specially for `ResourcePreview`, instead of using the same `ResourceItem` as `ResourceSelector` -->
<template>
  <component :is="itemRenderer" :resource="resourceIdentifier" autoplay />
</template>
