<script setup lang="ts">
import { computed } from 'vue'
import { computedShallowReactive, useComputedDisposable } from '@/utils/utils'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import type { AssetData } from '@/apis/asset'
import type { SpriteGen } from '@/models/spx/gen/sprite-gen'
import type { Sprite } from '@/models/spx/sprite'
import { getSignedInUsername } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import { provideLocalEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { EditorState } from '@/components/editor/editor-state'
import type { ILocalCache } from '@/components/editor/editing'
import SpriteGenPhaseSettings from './SpriteGenPhaseSettings.vue'
import SpriteGenPhaseContent from './SpriteGenPhaseContent.vue'

const props = defineProps<{
  gen: SpriteGen
  descriptionPlaceholder?: string
  enableLibrarySearch?: boolean
}>()

const emit = defineEmits<{
  collapse: []
  finished: [Sprite]
  assetPicked: [AssetData]
}>()

const i18n = useI18n()
const signedInUsername = computed(() => getSignedInUsername())
const { isOnline } = useNetwork()
// Local cache is not really used in sprite gen, so a dummy implementation is sufficient.
const localCache: ILocalCache = {
  load: () => Promise.reject(new Error('Not implemented')),
  save: () => Promise.reject(new Error('Not implemented')),
  clear: () => Promise.reject(new Error('Not implemented'))
}
// We should override the state to avoid history operations caused by animation / costume changes within sprite gen.
const editorStateInGen = useComputedDisposable(
  () => new EditorState(i18n, props.gen.previewProject, isOnline, signedInUsername.value, cloudHelpers, localCache)
)
const editorCtxInGen = computedShallowReactive(() => ({
  project: props.gen.previewProject,
  state: editorStateInGen.value
}))

provideLocalEditorCtx(editorCtxInGen)
</script>

<template>
  <SpriteGenPhaseContent
    v-if="gen.contentPreparingState.status === 'finished'"
    :gen="gen"
    @collapse="emit('collapse')"
    @finished="emit('finished', $event)"
  />
  <SpriteGenPhaseSettings
    v-else
    :gen="gen"
    :description-placeholder="descriptionPlaceholder"
    :enable-library-search="enableLibrarySearch"
    @asset-picked="emit('assetPicked', $event)"
  />
</template>

<style lang="scss" scoped></style>
