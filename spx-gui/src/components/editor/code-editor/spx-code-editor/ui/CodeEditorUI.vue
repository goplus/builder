<!--
  @desc SPX wrapper around XGo's CodeEditorUI component.

  Currently, extending the XGo code editor from SPX requires two separate extension points:
  1. The `CodeEditor` class (in spx-code-editor/context.ts) — for logic-level extensions such as
     providers, LSP client, and project adapter.
  2. This `CodeEditorUI` component — for UI-level extensions that need to supply spx-specific
     props/handlers to XGo's CodeEditorUI (e.g. `renameResourceHandler`, `goToResourceHandler`).

  Ideally these two extension points would be merged into one so that consumers only need to
  extend in a single place. However, combining them is non-trivial because the logic layer
  (CodeEditor class) and the view layer (CodeEditorUI component) have different lifecycles and
  different dependency graphs. This is worth revisiting as the architecture matures.

  TODO: Investigate merging the two extension points so SPX (and future frameworks) only need
  a single integration site when building on top of xgo-code-editor.
-->
<script setup lang="ts">
import { Sprite } from '@/models/spx/sprite'
import { Sound } from '@/models/spx/sound'
import { Costume } from '@/models/spx/costume'
import { Animation } from '@/models/spx/animation'
import { Backdrop } from '@/models/spx/backdrop'
import { isWidget } from '@/models/spx/widget'
import {
  useRenameAnimation,
  useRenameBackdrop,
  useRenameCostume,
  useRenameSound,
  useRenameSprite,
  useRenameWidget
} from '@/components/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { type ResourceIdentifier, CodeEditorUI as XGoCodeEditorUI } from '../../xgo-code-editor'
import { getResourceModel } from '../common'

const props = defineProps<{
  codeFilePath: string
}>()

const editorCtx = useEditorCtx()
const renameSprite = useRenameSprite()
const renameSound = useRenameSound()
const renameCostume = useRenameCostume()
const renameBackdrop = useRenameBackdrop()
const renameAnimation = useRenameAnimation()
const renameWidget = useRenameWidget()

async function renameResource(resourceId: ResourceIdentifier): Promise<void> {
  const model = getResourceModel(editorCtx.project, resourceId)
  if (model == null) throw new Error(`Resource (${resourceId.uri}) not found`)
  if (model instanceof Sprite) return renameSprite(model)
  if (model instanceof Sound) return renameSound(model)
  if (model instanceof Backdrop) return renameBackdrop(model)
  if (model instanceof Costume) return renameCostume(model)
  if (model instanceof Animation) return renameAnimation(model)
  if (isWidget(model)) return renameWidget(model)
  throw new Error(`Rename resource (${resourceId.uri}) not supported`)
}

async function goToResource(resourceId: ResourceIdentifier): Promise<void> {
  const model = getResourceModel(editorCtx.project, resourceId)
  if (model == null) throw new Error(`Resource not found: ${resourceId.uri}`)
  editorCtx.state.selectResource(model)
}
</script>

<template>
  <XGoCodeEditorUI
    :code-file-path="props.codeFilePath"
    :rename-resource-handler="renameResource"
    :go-to-resource-handler="goToResource"
  />
</template>
