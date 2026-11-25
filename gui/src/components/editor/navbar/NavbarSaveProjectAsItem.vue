<template>
  <UIMenuItem :disabled="state == null || !isOnline" @click="handleSaveAs">
    <template #icon><UIIcon type="copy" /></template>
    {{ $t({ en: 'Save as my project...', zh: '另存为我的项目...' }) }}
  </UIMenuItem>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { getOwnProjectEditorRoute } from '@/apps/xbuilder/router'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useEnsureSignedIn } from '@/utils/user'
import { useSaveProjectAs } from '@/components/project'
import { UIIcon, UIMenuItem } from '@/components/ui'
import { EditingMode } from '../editing'
import type { EditorState } from '../editor-state'

const props = defineProps<{ state: EditorState | null }>()
const router = useRouter()
const { t } = useI18n()
const { isOnline } = useNetwork()
const ensureSignedIn = useEnsureSignedIn()
const saveProjectAs = useSaveProjectAs()

const handleSaveAs = useMessageHandle(
  async () => {
    const state = props.state
    if (state == null) return
    await ensureSignedIn()
    const snapshot = await state.project.export(state.project.getSignal())
    const name = await saveProjectAs(
      snapshot,
      t({
        en: 'Your copy will open in the editor after you save it.',
        zh: '保存后，编辑器会打开你的项目副本。'
      })
    )
    if (state.editing.mode === EditingMode.EffectFree) state.editing.resetDirty()
    await router.push(getOwnProjectEditorRoute(name))
  },
  { en: 'Failed to save project', zh: '保存项目失败' }
).fn
</script>
