<script setup lang="ts">
import { computedShallowReactive, useComputedDisposable } from '@/utils/utils'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useMessageHandle } from '@/utils/exception'
import type { Sprite } from '@/models/spx/sprite'
import type { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { useSignedIn } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import { provideLocalEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { EditorState } from '@/components/editor/editor-state'
import type { ILocalCache } from '@/components/editor/editing'
import { UIButton } from '@/components/ui'
import SpriteGenPhaseSettings from './SpriteGenPhaseSettings.vue'
import SpriteGenPhaseContent from './SpriteGenPhaseContent.vue'

const props = defineProps<{
  gen: SpriteGen
  descriptionPlaceholder?: string
  librarySearchEnabled?: boolean
}>()

const emit = defineEmits<{
  collapse: []
  resolved: [Sprite]
}>()

const prepareContent = useMessageHandle(() => props.gen.prepareContent(), {
  en: 'Failed to generate sprite content',
  zh: '生成精灵内容失败'
})
const i18n = useI18n()
const signedIn = useSignedIn()
const { isOnline } = useNetwork()
// Local cache is not really used in sprite gen, so a dummy implementation is sufficient.
const localCache: ILocalCache = {
  load: () => Promise.reject(new Error('Not implemented')),
  save: () => Promise.reject(new Error('Not implemented')),
  clear: () => Promise.reject(new Error('Not implemented'))
}
// We should override the state to avoid history operations caused by animation / costume changes within sprite gen.
const editorStateInGen = useComputedDisposable(
  () => new EditorState(i18n, props.gen.previewProject, isOnline, signedIn, cloudHelpers, localCache)
)
const editorCtxInGen = computedShallowReactive(() => ({
  project: props.gen.previewProject,
  state: editorStateInGen.value
}))

provideLocalEditorCtx(editorCtxInGen)
</script>

<template>
  <SpriteGenPhaseSettings
    v-if="gen.isPreparePhase"
    :gen="gen"
    :description-placeholder="descriptionPlaceholder"
    :library-search-enabled="librarySearchEnabled"
    @resolved="emit('resolved', $event)"
  >
    <template #submit="{ disabled }">
      <UIButton
        v-radar="{ name: 'next', desc: 'Continue generating sprite content' }"
        type="primary"
        size="large"
        :disabled="disabled"
        :loading="prepareContent.isLoading.value"
        @click="prepareContent.fn"
      >
        {{ $t({ en: 'Next', zh: '下一步' }) }}
      </UIButton>
    </template>
  </SpriteGenPhaseSettings>
  <SpriteGenPhaseContent v-else :gen="gen" @collapse="emit('collapse')" @resolved="emit('resolved', $event)" />
</template>
