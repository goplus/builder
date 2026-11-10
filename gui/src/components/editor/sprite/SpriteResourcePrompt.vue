<script setup lang="ts">
import { ref } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { Costume } from '@/models/spx/costume'
import type { Sprite } from '@/models/spx/sprite'
import { useEditSprite } from '@/components/asset'
import { UIButton } from '@/components/ui'
import SettingsInput from '@/components/asset/gen/common/SettingsInput.vue'
import { useResourceWorkspace } from './resource-workspace'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{ sprite: Sprite; resource: Costume }>()
const editorCtx = useEditorCtx()
const workspace = useResourceWorkspace()
const instruction = workspace?.instruction ?? ref('')
const editSprite = useEditSprite()
const activate = useMessageHandle(
  async (localEdit: boolean) => {
    const text = instruction.value
    const edit = await editSprite(props.sprite, props.resource)
    const item = edit.selectedItem
    if (item?.type !== 'costume') return
    edit.setCostumeInstruction(item.id, text)
    if (localEdit) {
      if (editorCtx.state.spriteState != null) editorCtx.state.spriteState.aiCommenting = true
      return
    }
    await edit.editCostume(item.id, text)
  },
  { en: 'Failed to edit with AI', zh: '使用 AI 编辑失败' }
)
</script>

<template>
  <SettingsInput
    v-model:description="instruction"
    v-radar="{ name: 'AI edit prompt', desc: 'Describe edits to this resource' }"
    :placeholder="$t({ en: 'Describe changes to this costume', zh: '描述对当前造型的修改' })"
    :enrichable="false"
    :disabled="activate.isLoading.value"
  >
    <template #extra>
      <UIButton
        v-radar="{ name: 'Local edit tool', desc: 'Select locations and describe changes to them' }"
        type="white"
        icon="position"
        class="gap-1.5 px-2 text-sm"
        :disabled="activate.isLoading.value"
        @click="activate.fn(true)"
      >
        {{ $t({ en: 'Local edit', zh: '局部修改' }) }}
      </UIButton>
    </template>
    <template #submit>
      <UIButton
        v-radar="{ name: 'Edit resource', desc: 'Generate changes to this resource with AI' }"
        type="primary"
        shape="square"
        icon="publish"
        :title="$t({ en: 'Generate changes', zh: '生成修改' })"
        :disabled="instruction.trim() === ''"
        :loading="activate.isLoading.value"
        @click="activate.fn(false)"
      >
      </UIButton>
    </template>
  </SettingsInput>
</template>
